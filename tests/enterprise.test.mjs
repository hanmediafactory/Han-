import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, randomUUID, createHmac } from "node:crypto";

const directory = mkdtempSync(join(tmpdir(), "han-enterprise-api-"));
process.env.HAN_DB_PATH = join(directory, "test_enterprise.sqlite");

const { app } = await import("../server/app.mjs");
const { db, hashPassword } = await import("../server/db.mjs");
await import("../server/seed.mjs");

const password = randomBytes(24).toString("hex");
db.prepare("UPDATE users SET password_hash=?").run(hashPassword(password));

const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

async function login(id) {
  const response = await fetch(`${origin}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: id, password }),
  });
  assert.equal(response.status, 200);
  return {
    cookie: response.headers.get("set-cookie").split(";")[0],
    csrf: (await response.json()).csrf,
  };
}

async function call(session, path, method = "GET", body, withCsrf = true, extraHeaders = {}) {
  const response = await fetch(`${origin}/api/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(session
        ? {
            Cookie: session.cookie,
            ...(withCsrf ? { "X-CSRF-Token": session.csrf } : {}),
          }
        : {}),
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const isJson = response.headers.get("content-type")?.includes("application/json");
  return {
    status: response.status,
    headers: response.headers,
    data: isJson ? await response.json() : await response.text(),
  };
}

const owner = await login("user-1");

test("Enhanced /api/health returns database table metrics and active stream stats", async () => {
  const publicHealth = await call(null, "health");
  assert.equal(publicHealth.data.database.counts, undefined);
  assert.equal((await call(null, "health/details")).status, 401);
  const health = await call(owner, "health/details");
  assert.equal(health.status, 200);
  assert.equal(health.data.status, "ok");
  assert.ok(health.data.database.counts.users >= 3);
  assert.equal(typeof health.data.activeStreams, "number");
});

test("Enterprise Search (/api/search) searches across multi-entity records with relevance scoring", async () => {
  // Create test items
  const task = await call(owner, "tasks", "POST", {
    title: "Enterprise Deployment Strategy",
    assignedUserId: "user-1",
    date: "2026-10-10",
  });
  assert.equal(task.status, 201);

  const lead = await call(owner, "leads", "POST", {
    name: "Enterprise Global Corp",
    category: "Corporate",
    status: "Interested",
    assignedUserId: "user-1",
  });
  assert.equal(lead.status, 201);

  const searchRes = await call(owner, "search?q=Enterprise");
  assert.equal(searchRes.status, 200);
  assert.ok(searchRes.data.results.length >= 2);
  assert.ok(searchRes.data.results.some(r => r.title.includes("Enterprise Deployment Strategy")));
  assert.ok(searchRes.data.results.some(r => r.title.includes("Enterprise Global Corp")));

  const filteredSearch = await call(owner, "search?q=Enterprise&type=tasks");
  assert.equal(filteredSearch.status, 200);
  assert.ok(filteredSearch.data.results.every(r => r.table === "tasks"));
});

test("Business Intelligence Analytics (/api/analytics) returns structured workspace velocity", async () => {
  const res = await call(owner, "analytics");
  assert.equal(res.status, 200);
  assert.ok(res.data.tasks.total >= 1);
  assert.ok(res.data.leads.total >= 1);
  assert.ok(res.data.finance !== null);
  assert.equal(typeof res.data.finance.netProfit, "number");
});

test("Bulk Batch API (/api/batch) updates status for multiple tasks and leads atomically", async () => {
  const t1 = await call(owner, "tasks", "POST", { title: "Bulk Task 1", assignedUserId: "user-1", date: "2026-10-06" });
  const t2 = await call(owner, "tasks", "POST", { title: "Bulk Task 2", assignedUserId: "user-1", date: "2026-10-06" });
  assert.equal(t1.status, 201);
  assert.equal(t2.status, 201);

  const batchRes = await call(owner, "batch", "POST", {
    action: "bulk_task_status",
    taskIds: [t1.data.id, t2.data.id],
    status: "COMPLETED",
  });
  assert.equal(batchRes.status, 200);
  assert.equal(batchRes.data.count, 2);

  const state = (await call(owner, "state")).data;
  assert.equal(state.tasks.find(t => t.id === t1.data.id).status, "COMPLETED");
  assert.equal(state.tasks.find(t => t.id === t2.data.id).status, "COMPLETED");
});

test("Session Management API (/api/sessions) lists active sessions and revokes other sessions", async () => {
  const extraSession = await login("user-1");
  const sessions = await call(extraSession, "sessions");
  assert.equal(sessions.status, 200);
  assert.ok(sessions.data.sessions.length >= 2);

  const revokeRes = await call(extraSession, "sessions/others", "DELETE");
  assert.equal(revokeRes.status, 200);
  assert.ok(revokeRes.data.revokedCount >= 1);

  const afterSessions = await call(extraSession, "sessions");
  assert.equal(afterSessions.data.sessions.length, 1);
  assert.ok(afterSessions.data.sessions[0].isCurrent);

  // Restore owner session for remaining tests
  const freshOwner = await login("user-1");
  owner.cookie = freshOwner.cookie;
  owner.csrf = freshOwner.csrf;
});

test("Webhooks Integration API (/api/webhooks) creates and deletes webhook listeners", async () => {
  process.env.HAN_WEBHOOK_ALLOWED_ORIGINS = "https://hooks.example.invalid";
  const createHook = await call(owner, "webhooks", "POST", {
    url: "https://hooks.example.invalid/integration",
    events: ["tasks.created", "leads.updated"],
  });
  assert.equal(createHook.status, 201);
  assert.ok(createHook.data.secret.length > 10);

  const listHooks = await call(owner, "webhooks");
  assert.equal(listHooks.status, 200);
  assert.equal(listHooks.data.webhooks.length, 1);

  const deleteHook = await call(owner, `webhooks/${createHook.data.id}`, "DELETE");
  assert.equal(deleteHook.status, 200);

  const listHooksAfter = await call(owner, "webhooks");
  assert.equal(listHooksAfter.data.webhooks.length, 0);
  delete process.env.HAN_WEBHOOK_ALLOWED_ORIGINS;
});

test("Member search, analytics, exports and integrations preserve workspace privacy", async () => {
  const member = await login("user-3");
  const search = await call(member, "search?q=Enterprise");
  assert.equal(search.data.total, 0);
  const analytics = await call(member, "analytics");
  assert.ok(analytics.data.finance);
  assert.equal((await call(member, "reports/csv?table=income")).data, "No matching records found");
  assert.equal((await call(member, "health/details")).status, 403);
  assert.equal((await call(member, "webhooks")).status, 403);
  assert.equal((await call(member, "webhooks", "POST", { url: "https://example.com/hook" })).status, 403);
  assert.equal((await call(member, "webhooks/missing", "DELETE")).status, 403);
  assert.ok(!(await call(member, "sessions")).data.sessions.some(s => s.csrfPrefix));
  assert.equal((await call(owner, "search?q=test&limit=invalid")).status, 400);
});

test("Bulk retries are idempotent, notify assignees once, and roll back denied or missing tasks", async () => {
  const member = await login("user-2");
  const a = await call(owner, "tasks", "POST", { title: "Batch own task", assignedUserId: "user-1", date: "2026-10-10" });
  const b = await call(owner, "tasks", "POST", { title: "Batch member task", assignedUserId: "user-2", date: "2026-10-10" });
  const body = { action: "bulk_task_status", taskIds: [a.data.id, b.data.id], status: "COMPLETED" };
  const headers = { "Idempotency-Key": randomUUID() };
  const first = await call(owner, "batch", "POST", body, true, headers);
  assert.equal(first.status, 200);
  const notificationCount = db.prepare("SELECT count(*) AS n FROM notifications").get().n;
  const auditCount = db.prepare("SELECT count(*) AS n FROM activity_logs").get().n;
  assert.deepEqual((await call(owner, "batch", "POST", body, true, headers)).data, first.data);
  assert.equal(db.prepare("SELECT count(*) AS n FROM notifications").get().n, notificationCount);
  assert.equal(db.prepare("SELECT count(*) AS n FROM activity_logs").get().n, auditCount);
  assert.equal((await call(owner, "batch", "POST", { ...body, status: "TODO" }, true, headers)).status, 409);
  assert.equal((await call(owner, "batch", "POST", { ...body, taskIds: [a.data.id, a.data.id] })).status, 400);
  assert.equal((await call(member, "batch", "POST", { ...body, taskIds: [b.data.id, a.data.id], status: "TODO" })).status, 403);
  assert.equal((await call(owner, "batch", "POST", { ...body, taskIds: [a.data.id, "missing"], status: "TODO" })).status, 404);
  assert.equal(JSON.parse(db.prepare("SELECT data FROM tasks WHERE id=?").get(a.data.id).data).status, "COMPLETED");
  assert.equal(JSON.parse(db.prepare("SELECT data FROM tasks WHERE id=?").get(b.data.id).data).status, "COMPLETED");
  const memberState = (await call(member, "state")).data;
  assert.ok(memberState.notifications.some(n => n.targetId === b.data.id && /completed/i.test(n.title)));
});

test("Webhook destinations are explicitly trusted and transaction rollback emits no delivery", async () => {
  const { webhookDestinationAllowed, processWebhookOutbox } = await import("../server/webhooks.mjs");
  delete process.env.HAN_WEBHOOK_ALLOWED_ORIGINS;
  assert.equal((await call(owner, "webhooks", "POST", { url: "https://hooks.example.invalid/events" })).status, 400);
  process.env.HAN_WEBHOOK_ALLOWED_ORIGINS = "https://hooks.example.invalid";
  assert.equal(webhookDestinationAllowed("https://hooks.example.invalid.attacker.invalid/"), false);
  assert.equal(webhookDestinationAllowed("https://name:secret@hooks.example.invalid/"), false);
  assert.equal(webhookDestinationAllowed("http://127.0.0.1/"), false);
  assert.equal((await call(owner, "webhooks", "POST", { url: "https://hooks.example.invalid/", events: ["task.created"] })).status, 400);
  const hook = await call(owner, "webhooks", "POST", { url: "https://hooks.example.invalid/events", events: ["income.created", "expenses.created"] });
  assert.equal(hook.status, 201);
  assert.equal((await call(owner, "expenses", "POST", { title: "Rollback hook", amount: 9999999999, category: "Test", date: "2026-10-10" })).status, 409);
  assert.equal(db.prepare("SELECT count(*) AS n FROM webhook_outbox").get().n, 0);
  const income = await call(owner, "income", "POST", { title: "Committed hook", amount: 100, category: "Test", date: "2026-10-10" });
  assert.equal(income.status, 201);
  const job = db.prepare("SELECT * FROM webhook_outbox").get();
  assert.ok(job);
  const originalFetch = globalThis.fetch;
  const deliveries = [];
  try {
    globalThis.fetch = async () => new Response(null, { status: 503 });
    await processWebhookOutbox();
    const retained = db.prepare("SELECT * FROM webhook_outbox").get();
    assert.equal(retained.id, job.id);
    assert.equal(retained.attempts, 1);
    assert.ok(retained.next_attempt > Date.now());
    db.prepare("UPDATE webhook_outbox SET next_attempt=0").run();
    globalThis.fetch = async (url, options) => { deliveries.push({ url, options }); return new Response(null, { status: 200 }); };
    await processWebhookOutbox();
  } finally { globalThis.fetch = originalFetch; }
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].options.redirect, "error");
  assert.equal(deliveries[0].options.headers["X-HAN-Delivery-ID"], job.id);
  assert.equal(deliveries[0].options.headers["X-HAN-Signature"], `sha256=${createHmac("sha256", hook.data.secret).update(job.body).digest("hex")}`);
  assert.equal(db.prepare("SELECT count(*) AS n FROM webhook_outbox").get().n, 0);
  await call(owner, `webhooks/${hook.data.id}`, "DELETE");
  delete process.env.HAN_WEBHOOK_ALLOWED_ORIGINS;
});

test("CSV export neutralizes spreadsheet formulas and validates inclusive date ranges", async () => {
  await call(owner, "tasks", "POST", { title: '=HYPERLINK("https://example.invalid")', assignedUserId: "user-1", date: "2026-10-10" });
  const csv = await call(owner, "reports/csv?table=tasks&startDate=2026-10-10&endDate=2026-10-10");
  assert.ok(csv.data.includes("'=HYPERLINK"));
  assert.equal((await call(owner, "reports/csv?startDate=bad")).status, 400);
  assert.equal((await call(owner, "reports/csv?startDate=2026-10-11&endDate=2026-10-10")).status, 400);
});

test("CSV Report Export (/api/reports/csv) exports valid CSV data with header row", async () => {
  const csvRes = await call(owner, "reports/csv?table=tasks");
  assert.equal(csvRes.status, 200);
  assert.ok(csvRes.headers.get("content-type").includes("text/csv"));
  assert.ok(csvRes.data.includes("title"));
  assert.ok(csvRes.data.includes("Enterprise Deployment Strategy"));
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
  rmSync(directory, { recursive: true, force: true });
});

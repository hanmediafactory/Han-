import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
const directory = mkdtempSync(join(tmpdir(), "han-api-"));
process.env.HAN_DB_PATH = join(directory, "test.sqlite");
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
async function call(session, path, method = "GET", body, withCsrf = true) {
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
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
}
const owner = await login("user-1"),
  member = await login("user-2"),
  other = await login("user-3");
let projectId, taskId;
test("Unauthenticated access and CSRF writes are rejected", async () => {
  assert.equal((await call(null, "state")).status, 401);
  assert.equal(
    (await call(owner, "leads", "POST", { name: "Test" }, false)).status,
    403,
  );
  assert.equal(
    (
      await call(null, "login", "POST", {
        userId: "user-1",
        password: "incorrect",
      })
    ).status,
    401,
  );
});
test("Initial identities hide secrets and the single owner is protected", async () => {
  const identities = await call(null, "identities");
  assert.equal(identities.data.length, 4);
  assert.ok(!JSON.stringify(identities.data).includes(password));
  assert.throws(
    () =>
      db
        .prepare(
          "INSERT INTO users(id,name,role,created_at,updated_at) VALUES (?,?,?,?,?)",
        )
        .run("fourth-owner", "Fourth", "OWNER", "now", "now"),
    /UNIQUE/,
  );
  const data = {
    name: "Harsha",
    role: "MEMBER",
    active: true,
    permissions: [],
  };
  assert.equal((await call(owner, "users/user-1", "PATCH", data)).status, 409);
  assert.equal((await call(member, "users/user-1", "PATCH", data)).status, 403);
});
test("Project membership controls reads and owner CRUD", async () => {
  const created = await call(owner, "projects", "POST", {
    name: "Persistent project",
    deadline: "2026-10-12",
    memberIds: ["user-1", "user-2"],
  });
  assert.equal(created.status, 201);
  projectId = created.data.id;
  const memberState = (await call(member, "state")).data,
    otherState = (await call(other, "state")).data;
  assert.ok(memberState.projects.some((p) => p.id === projectId));
  assert.ok(!otherState.projects.some((p) => p.id === projectId));
  assert.equal(
    (
      await call(member, `projects/${projectId}`, "PATCH", {
        name: "Forbidden",
      })
    ).status,
    403,
  );
  assert.equal(
    (await call(owner, `projects/${projectId}`, "PATCH", { archived: true }))
      .status,
    200,
  );
  assert.equal(
    (await call(owner, `projects/${projectId}`, "PATCH", { archived: false }))
      .status,
    200,
  );
});
test("Assigned task completion updates progress, metrics data, notifications and activity atomically", async () => {
  const task = await call(owner, "tasks", "POST", {
    title: "Assigned task",
    projectId,
    assignedUserId: "user-2",
    date: "2026-10-04",
  });
  assert.equal(task.status, 201);
  taskId = task.data.id;
  assert.equal(
    (await call(other, `tasks/${taskId}`, "PATCH", { status: "COMPLETED" }))
      .status,
    403,
  );
  assert.equal(
    (
      await call(member, `tasks/${taskId}`, "PATCH", {
        status: "COMPLETED",
        assignedUserId: "user-3",
      })
    ).status,
    400,
  );
  assert.equal(
    (await call(member, `tasks/${taskId}`, "PATCH", { status: "COMPLETED" }))
      .status,
    200,
  );
  const state = (await call(owner, "state")).data;
  assert.equal(state.projects.find((p) => p.id === projectId).progress, 100);
  assert.equal(state.tasks.find((t) => t.id === taskId).completedBy, "user-2");
  assert.ok(state.activity_logs.some((a) => a.entity_id === taskId));
  assert.ok((await call(member, "state")).data.notifications.length > 0);
  assert.equal(
    (
      await call(owner, `projects/${projectId}`, "PATCH", {
        memberIds: ["user-1"],
      })
    ).status,
    409,
  );
});
test("Finance permissions, amounts, schema and URL validation", async () => {
  assert.equal(
    (
      await call(member, "expenses", "POST", {
        title: "Bad",
        amount: 10,
        category: "General",
        date: "2026-10-04",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(owner, "expenses", "POST", {
        title: "Bad",
        amount: -10,
        category: "General",
        date: "2026-10-04",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(owner, "income", "POST", {
        title: "Payment",
        amount: 1000.25,
        category: "Revenue",
        date: "2026-10-04",
      })
    ).status,
    201,
  );
  assert.equal((await call(member, "state")).data.transactions.length, 1);
  assert.equal(
    (
      await call(owner, `projects/${projectId}`, "PATCH", {
        previewUrl: "javascript:alert(1)",
      })
    ).status,
    400,
  );
});
test("Funnel steps persist, events scoped, and a separate process reads saved data", async () => {
  const funnel = await call(owner, "funnels", "POST", {
    title: "Pipeline",
    steps: [{ id: 1, title: "Outreach", status: "Completed" }],
  });
  assert.equal(funnel.status, 201);
  assert.equal(
    db
      .prepare("SELECT count(*) AS count FROM funnel_steps WHERE funnel_id=?")
      .get(funnel.data.id).count,
    1,
  );
  const event = await call(owner, "calendar_events", "POST", {
    title: "Private event",
    date: "2026-10-04",
    assignedUserId: "user-2",
  });
  assert.equal(event.status, 201);
  assert.ok(
    !(await call(other, "state")).data.calendar_events.some(
      (e) => e.id === event.data.id,
    ),
  );
  const child = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "import {DatabaseSync} from 'node:sqlite'; const db=new DatabaseSync(process.env.HAN_DB_PATH); console.log(db.prepare('SELECT count(*) AS count FROM projects').get().count)",
    ],
    { env: process.env, encoding: "utf8" },
  );
  assert.equal(child.status, 0);
  assert.ok(Number(child.stdout.trim()) >= 5);
});
test("Lead details and all outcomes survive updates and reload", async () => {
  const data = { name: "Persistent client", category: "General", status: "Won", email: "client@example.com", phone: "+91 9000000000", dealValue: 1234.56, source: "Referral", followUpDate: "2026-10-15", assignedUserId: "user-2", nextAction: "Send proposal" };
  const created = await call(owner, "leads", "POST", data);
  assert.equal(created.status, 201);
  const persisted = (await call(owner, "state")).data.leads.find(item => item.id === created.data.id);
  for (const [key, value] of Object.entries(data)) assert.equal(persisted[key], value);
  assert.equal((await call(owner, `leads/${created.data.id}`, "PATCH", { status: "Lost" })).status, 200);
  assert.equal((await call(member, "state")).data.leads.length, 0);
  assert.equal((await call(owner, "leads", "POST", { ...data, email: "not-an-email" })).status, 400);
  assert.equal((await call(owner, "leads", "POST", { ...data, dealValue: 0.001 })).status, 400);
});

test("Idempotent writes replay one result and reject reused keys with different data", async () => {
  const data = { title: "Exactly once", amount: 42, category: "General", date: "2026-10-06" };
  const key = randomBytes(20).toString("hex");
  const send = body => fetch(`${origin}/api/expenses`, { method: "POST", headers: { Cookie: owner.cookie, "X-CSRF-Token": owner.csrf, "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(body) });
  const first = await send(data), second = await send(data);
  assert.equal(first.status, 201); assert.equal(second.status, 201);
  assert.deepEqual(await first.json(), await second.json());
  assert.equal((await call(owner, "state")).data.transactions.filter(item => item.title === "Exactly once").length, 1);
  assert.equal((await send({ ...data, amount: 99 })).status, 409);
});

test("Stale edits are rejected without overwriting another device", async () => {
  const state = (await call(owner, "state")).data;
  const lead = state.leads[0];
  const first = await call(owner, `leads/${lead.id}`, "PATCH", { source: "Changed elsewhere" });
  assert.equal(first.status, 200);
  const response = await fetch(`${origin}/api/leads/${lead.id}`, { method: "PATCH", headers: { Cookie: owner.cookie, "X-CSRF-Token": owner.csrf, "Content-Type": "application/json", "If-Unmodified-Since": lead.updated_at }, body: JSON.stringify({ source: "Stale edit" }) });
  assert.equal(response.status, 409);
  assert.equal((await call(owner, "state")).data.leads.find(item => item.id === lead.id).source, "Changed elsewhere");
});

test("Assignment validation rejects inactive users and inconsistent dates", async () => {
  assert.equal((await call(owner, "tasks", "POST", { title: "Invalid", assignedUserId: "missing-user", date: "2026-10-06" })).status, 400);
  assert.equal((await call(owner, "tasks", "POST", { title: "Invalid", assignedUserId: "user-1", date: "2026-10-06", startDate: "2026-10-08" })).status, 400);
  assert.equal((await call(owner, "projects", "POST", { name: "Invalid owner", ownerId: "user-2", memberIds: ["user-1"] })).status, 400);
});

test("Manual progress survives task cancellation and uses completed tasks when present", async () => {
  const project = await call(owner, "projects", "POST", { name: "Estimated progress", progress: 35, memberIds: ["user-1"] });
  assert.equal(project.status, 201);
  const task = await call(owner, "tasks", "POST", { title: "Cancelled", projectId: project.data.id, assignedUserId: "user-1", date: "2026-10-06", status: "CANCELLED" });
  assert.equal(task.status, 201);
  let saved = (await call(owner, "state")).data.projects.find(item => item.id === project.data.id);
  assert.equal(saved.progress, 35); assert.equal(saved.progressSource, "manual"); assert.equal(saved.deadline, "");
  await call(owner, `tasks/${task.data.id}`, "PATCH", { status: "COMPLETED" });
  saved = (await call(owner, "state")).data.projects.find(item => item.id === project.data.id);
  assert.equal(saved.progress, 100); assert.equal(saved.progressSource, "tasks");
});

test("Additional member accounts, permissions, password changes and disablement revoke sessions", async () => {
  const created = await call(owner, "users", "POST", { name: "New member", password: `${password}-new`, permissions: ["leads.manage"] });
  assert.equal(created.status, 201);
  const response = await call(null, "login", "POST", { userId: created.data.id, password: `${password}-new` });
  assert.equal(response.status, 200);
  const fresh = await fetch(`${origin}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: created.data.id, password: `${password}-new` }) });
  const session = { cookie: fresh.headers.get("set-cookie").split(";")[0], csrf: (await fresh.json()).csrf };
  assert.ok((await call(session, "state")).data.leads.length > 0);
  assert.equal((await call(session, "users", "POST", { name: "Forbidden", password })).status, 403);
  assert.equal((await call(owner, `users/${created.data.id}`, "PATCH", { name: "New member", role: "MEMBER", active: false, permissions: [] })).status, 200);
  assert.equal((await call(session, "state")).status, 401);
  assert.equal((await call(null, "login", "POST", { userId: created.data.id, password: `${password}-new` })).status, 401);
});

test("Notifications are system generated, isolated and immutable except read state", async () => {
  assert.equal((await call(owner, "notifications", "POST", { title: "Fake" })).status, 403);
  const notification = (await call(member, "state")).data.notifications[0];
  assert.ok(notification);
  assert.equal((await call(other, `notifications/${notification.id}`, "PATCH", { read: true })).status, 403);
  assert.equal((await call(member, `notifications/${notification.id}`, "PATCH", { read: true, userId: "user-3" })).status, 400);
  assert.equal((await call(member, `notifications/${notification.id}`, "PATCH", { read: true })).status, 200);
  assert.ok((await call(owner, "state")).data.notifications.every(item => item.userId === "user-1"));
});

test("Untrusted origins are rejected and unconfigured push is reported honestly", async () => {
  for (const developmentOrigin of ["http://localhost:5174", "http://127.0.0.1:5174"]) {
    const response = await fetch(`${origin}/api/session`, { headers: { Cookie: owner.cookie, Origin: developmentOrigin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), developmentOrigin);
  }
  for (const badOrigin of ["https://attacker.example", "http://localhost.evil.example", "http://127.0.0.1.evil.example"]) {
    const response = await fetch(`${origin}/api/state`, { headers: { Cookie: owner.cookie, Origin: badOrigin } });
    assert.equal(response.status, 403); assert.equal(response.headers.get("access-control-allow-origin"), null);
  }
  assert.equal((await call(owner, "push/config")).data.enabled, false);
  assert.equal((await call(owner, "push/test", "POST", {})).status, 503);
});

test("Backup downloads restore into an isolated SQLite database with integrity intact", async () => {
  const response = await fetch(`${origin}/api/backup`, { headers: { Cookie: owner.cookie } });
  assert.equal(response.status, 200);
  const { writeFileSync } = await import("node:fs");
  const backupPath = join(directory, "restored.sqlite");
  writeFileSync(backupPath, Buffer.from(await response.arrayBuffer()));
  const { DatabaseSync } = await import("node:sqlite");
  const restored = new DatabaseSync(backupPath);
  assert.equal(restored.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  assert.equal(restored.prepare("PRAGMA foreign_key_check").all().length, 0);
  assert.equal(restored.prepare("SELECT count(*) AS count FROM leads").get().count, db.prepare("SELECT count(*) AS count FROM leads").get().count);
  restored.close();
  assert.equal((await call(member, "backup")).status, 403);
});

test("Shared project membership does not reveal another member's assigned tasks", async () => {
  const task = await call(owner, "tasks", "POST", { title: "Private assignment", assignedUserId: "user-2", projectId: "proj-1", date: "2026-10-06" });
  assert.equal(task.status, 201);
  assert.ok((await call(member, "state")).data.tasks.some(item => item.id === task.data.id));
  assert.ok(!(await call(other, "state")).data.tasks.some(item => item.id === task.data.id));
});

test("Deadline polling deduplicates reminder notifications", async () => {
  const first = (await call(owner, "state")).data.notifications.filter(item => item.iconType === "deadline").length;
  const second = (await call(owner, "state")).data.notifications.filter(item => item.iconType === "deadline").length;
  assert.equal(first, second); assert.ok(first > 0);
});

test("A restored database boots the application and serves the same persisted records", async () => {
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import assert from 'node:assert/strict';
    import { app } from './server/app.mjs';
    import { db } from './server/db.mjs';
    const server = app.listen(0,'127.0.0.1');
    await new Promise(resolve => server.once('listening',resolve));
    const root = 'http://127.0.0.1:' + server.address().port;
    const login = await fetch(root+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:'user-1',password:process.env.HAN_TEST_PASSWORD})});
    assert.equal(login.status,200);
    const state = await fetch(root+'/api/state',{headers:{Cookie:login.headers.get('set-cookie').split(';')[0]}});
    assert.ok((await state.json()).leads.some(item=>item.name==='Persistent client'));
    await new Promise(resolve=>server.close(resolve)); db.close(); console.log('restore verified');
  `], { env: { ...process.env, HAN_DB_PATH: join(directory, "restored.sqlite"), HAN_TEST_PASSWORD: password }, encoding: "utf8", timeout: 15000 });
  assert.equal(child.status, 0, child.stderr); assert.match(child.stdout, /restore verified/);
});

test("Production cookies are secure and published example credentials are refused", async () => {
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import assert from 'node:assert/strict';
    import { app } from './server/app.mjs';
    import { db,hashPassword } from './server/db.mjs';
    const server = app.listen(0,'127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    const root='http://127.0.0.1:'+server.address().port;
    const login=await fetch(root+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:'user-1',password:process.env.HAN_TEST_PASSWORD})});
    assert.equal(login.status,200);
    assert.match(login.headers.get('set-cookie'),/HttpOnly/); assert.match(login.headers.get('set-cookie'),/Secure/); assert.match(login.headers.get('set-cookie'),/SameSite=Strict/);
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword('HarshaPass2026!'),'user-1');
    const denied=await fetch(root+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:'user-1',password:'HarshaPass2026!'})});
    assert.equal(denied.status,401);
    await new Promise(resolve=>server.close(resolve)); db.close(); console.log('production auth verified');
  `], { env: { ...process.env, NODE_ENV: "production", HAN_DB_PATH: join(directory, "restored.sqlite"), HAN_TEST_PASSWORD: password }, encoding: "utf8", timeout: 15000 });
  assert.equal(child.status, 0, child.stderr); assert.match(child.stdout, /production auth verified/);
});

test("Deletion cascades and logout invalidates the session", async () => {
  assert.equal((await call(member, `tasks/${taskId}`, "DELETE")).status, 403);
  assert.equal(
    (await call(owner, `projects/${projectId}`, "DELETE")).status,
    200,
  );
  assert.equal(
    db.prepare("SELECT id FROM tasks WHERE id=?").get(taskId),
    undefined,
  );
  assert.equal((await call(member, "logout", "POST")).status, 200);
  assert.equal((await call(member, "state")).status, 401);
});
test("Savings move funds into a protected balance and cannot be withdrawn through edits or deletes", async () => {
  const before = (await call(owner, "state")).data.finance;
  const income = await call(owner, "income", "POST", { title: "Funds for ledger test", amount: 10000, category: "Revenue", date: "2026-10-06" });
  assert.equal(income.status, 201);
  const reserve = await call(owner, "savings_entries", "POST", { title: "Protected reserve", amount: 2000, date: "2026-10-06" });
  assert.equal(reserve.status, 201);
  const after = (await call(owner, "state")).data.finance;
  assert.equal(after.savings - before.savings, 2000);
  assert.equal(after.funds - before.funds, 8000);
  assert.equal(after.expenses, before.expenses);
  assert.equal((await call(owner, `savings_entries/${reserve.data.id}`, "PATCH", { amount: 1 })).status, 409);
  assert.equal((await call(owner, `savings_entries/${reserve.data.id}`, "DELETE")).status, 409);
  assert.equal((await call(owner, `income/${income.data.id}`, "DELETE")).status, 409);
});

test("Manual salary payment atomically deducts funds once and is private to finance accounts", async () => {
  const before = (await call(owner, "state")).data;
  const key = crypto.randomUUID();
  const pay = async () => {
    const response = await fetch(`${origin}/api/salary_payments`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: owner.cookie, "X-CSRF-Token": owner.csrf, "Idempotency-Key": key }, body: JSON.stringify({ name: "Nihaal", amount: 750.25, date: "2026-10-06", notes: "Chosen manually" }) });
    return { status: response.status, data: await response.json() };
  };
  const first = await pay(), replay = await pay();
  assert.equal(first.status, 201); assert.deepEqual(replay, first);
  const after = (await call(owner, "state")).data;
  assert.equal(after.salary_payments.length - before.salary_payments.length, 1);
  assert.equal(after.finance.funds, before.finance.funds - 750.25);
  assert.equal(after.finance.expenses, before.finance.expenses + 750.25);
  assert.equal(after.finance.savings, before.finance.savings);
  assert.equal(after.transactions.filter(item => item.salaryPaymentId === first.data.id).length, 1);
  assert.equal((await call(owner, `expenses/${first.data.expenseId}`, "DELETE")).status, 409);
  const freshMember = await login("user-2");
  assert.equal((await call(freshMember, "salary_payments", "POST", { name: "Member", amount: 1, date: "2026-10-06" })).status, 403);
  const transparentState = (await call(freshMember, "state")).data;
  assert.ok(transparentState.finance); assert.ok(transparentState.salary_payments.length > 0);
});

test("Overspending, salary retries and conflicting concurrent spending cannot consume savings", async () => {
  const before = (await call(owner, "state")).data;
  const over = before.finance.funds + 0.01;
  assert.equal((await call(owner, "salary_payments", "POST", { name: "Too much", amount: over, date: "2026-10-06" })).status, 409);
  assert.equal((await call(owner, "expenses", "POST", { title: "Savings not spendable", amount: 1, account: "savings", category: "General", date: "2026-10-06" })).status, 400);
  const unchanged = (await call(owner, "state")).data;
  assert.equal(unchanged.salary_payments.length, before.salary_payments.length);
  assert.equal(unchanged.transactions.length, before.transactions.length);
  const attempts = await Promise.all([1, 2].map(index => call(owner, "expenses", "POST", { title: `Concurrent payment ${index}`, amount: before.finance.funds, category: "General", date: "2026-10-06" })));
  assert.deepEqual(attempts.map(item => item.status).sort(), [201, 409]);
  const after = (await call(owner, "state")).data.finance;
  assert.equal(after.funds, 0); assert.equal(after.savings, before.finance.savings);
});

test("Salary corrections update the linked expense atomically and cannot edit it separately", async () => {
  const salary = (await call(owner, "state")).data.salary_payments[0];
  assert.equal((await call(owner, `salary_payments/${salary.id}`, "PATCH", { amount: salary.amount - 100 })).status, 200);
  const corrected = (await call(owner, "state")).data;
  assert.equal(corrected.transactions.find(item => item.salaryPaymentId === salary.id).amount, salary.amount - 100);
  assert.equal(corrected.finance.funds, 100);
  assert.equal((await call(owner, `salary_payments/${salary.id}`, "PATCH", { amount: salary.amount + 1000 })).status, 409);
  assert.equal((await call(owner, `expenses/${salary.expenseId}`, "PATCH", { amount: 1 })).status, 409);
  assert.equal((await call(owner, `salary_payments/${salary.id}`, "DELETE")).status, 200);
  const after = (await call(owner, "state")).data;
  assert.ok(!after.transactions.some(item => item.id === salary.expenseId));
  assert.ok(!after.salary_payments.some(item => item.id === salary.id));
  assert.equal(after.finance.funds, salary.amount);
});

test("Funds exhaustion creates a scoped alert once per ledger state", async () => {
  const current = (await call(owner, "state")).data.finance;
  assert.equal((await call(owner, "expenses", "POST", { title: "Drain spendable funds", amount: current.funds, category: "Operations", date: "2026-10-06" })).status, 201);
  const first = (await call(owner, "state")).data.notifications.filter(item => item.title === "Spendable funds need replenishing").length;
  const second = (await call(owner, "state")).data.notifications.filter(item => item.title === "Spendable funds need replenishing").length;
  assert.equal(second, first); assert.ok(first > 0);
  const restricted = (await call(await login("user-2"), "state")).data;
  assert.ok(!restricted.notifications.some(item => item.title === "Spendable funds need replenishing"));
});

test("Live synchronization requires authentication and broadcasts no private record content", async () => {
  assert.equal((await call(null, "events")).status, 401);
  const controller = new AbortController();
  const response = await fetch(`${origin}/api/events`, { headers: { Cookie: owner.cookie }, signal: controller.signal });
  assert.equal(response.headers.get("content-type"), "text/event-stream; charset=utf-8");
  const reader = response.body.getReader();
  try {
    assert.match(new TextDecoder().decode((await reader.read()).value), /event: workspace\ndata: \{\}/);
    await call(owner, "tasks", "POST", { title: "Secret task details must not enter event stream", assignedUserId: "user-1", date: "2026-10-06" });
    const update = new TextDecoder().decode((await reader.read()).value);
    assert.match(update, /event: workspace/); assert.ok(!update.includes("Secret"));
  } finally { controller.abort(); await reader.cancel().catch(() => {}); }
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
  rmSync(directory, { recursive: true, force: true });
});

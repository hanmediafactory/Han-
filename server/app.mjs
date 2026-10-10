import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { backup } from "node:sqlite";
import {
  db,
  hashToken,
  hashPassword,
  verifyPassword,
  transaction,
  permissionIds,
} from "./db.mjs";
import { schemas, money } from "./validation.mjs";
import { z } from "zod";
import { pushEnabled, webPushEnabled, nativePushEnabled, processPushOutbox } from "./push.mjs";
import { knownDefaults, requireProductionPassword } from "./security.mjs";
import { financeSummary, protectFunds, computeEqualAllocations } from "./finance.mjs";
import { EventEmitter } from "node:events";
import { enqueueWebhooks, webhookDestinationAllowed } from "./webhooks.mjs";
const changes = new EventEmitter();
changes.setMaxListeners(0);
const streams = new Map();
const eventResponses = new Set();
export const closeWorkspaceStreams = () => { for (const response of eventResponses) response.end(); };

export const app = express();
const production = process.env.NODE_ENV === "production";
const sessionCookie = process.env.HAN_DEMO === "1" ? "han_demo_session" : "han_session";
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
app.disable("x-powered-by");
const allowedOrigins = new Set((process.env.HAN_ALLOWED_ORIGINS || (production ? "" : "http://localhost:5173,http://127.0.0.1:5173")).split(",").map(v => v.trim()).filter(Boolean));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", "data:"],
        "font-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "connect-src": ["'self'", ...Array.from(allowedOrigins)],
      },
    },
  }),
);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const ownOrigin = `${req.protocol}://${req.get("host")}`;
  if (origin && origin !== ownOrigin && !allowedOrigins.has(origin)) return res.status(403).json({ error: "Origin not allowed." });
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, X-CSRF-Token, Idempotency-Key, If-Unmodified-Since",
    );
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "128kb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: process.env.NODE_ENV === "test" ? 1000 : 240,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  const id = randomUUID();
  const start = Date.now();
  res.set("X-Request-ID", id);
  if (production) res.on("finish", () => console.log(JSON.stringify({ event: "api_request", id, method: req.method, status: res.statusCode, durationMs: Date.now() - start })));
  next();
});
const publicUser = (row) => ({
  id: row.id,
  name: row.name,
  role: row.role,
  active: !!row.active,
  permissions: JSON.parse(row.permissions),
});
const fail = (status, message) => Object.assign(new Error(message), { status });
const rows = (table) =>
  db
    .prepare(`SELECT * FROM ${table} ORDER BY created_at DESC,id`)
    .all()
    .map((row) => ({
      ...JSON.parse(row.data),
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    }));
const owner = (user) => user.role === "OWNER";
const can = (user, permission) =>
  owner(user) || JSON.parse(user.permissions).includes(permission);
const projectAccess = (user, id) =>
  owner(user) ||
  !!db
    .prepare("SELECT 1 FROM project_members WHERE project_id=? AND user_id=?")
    .get(id, user.id);
function permitted(user, table, item, write = false) {
  if (table === "notifications") return item.userId === user.id;
  if (owner(user)) return true;
  if (table === "projects") {
    return write
      ? can(user, "projects.manage")
      : (can(user, "projects.manage") || projectAccess(user, item?.id));
  }
  if (table === "tasks") {
    return write
      ? can(user, "tasks.manage")
      : (can(user, "tasks.manage") || (item && item.assignedUserId === user.id));
  }
  if (["expenses", "income", "settlements"].includes(table)) {
    return write ? can(user, "finance.manage") : (can(user, "finance.view") || !write);
  }
  if (["savings_entries", "salary_payments"].includes(table)) {
    return write ? (owner(user) || can(user, "finance.manage")) : (can(user, "finance.view") || !write);
  }
  if (table === "leads") return can(user, "leads.manage");
  if (table === "funnels") return can(user, "funnels.manage");
  if (table === "calendar_events")
    return write
      ? (owner(user) || can(user, "calendar.manage"))
      : (can(user, "calendar.manage") || item?.assignedUserId === user.id);
  if (table === "team_members" || table === "categories") {
    return write ? (owner(user) || can(user, "projects.manage")) : true;
  }
  return !write;
}
function audit(user, table, id, action, details = null) {
  const now = new Date().toISOString();
  try {
    db.prepare("INSERT INTO activity_logs (id, entity, entity_id, action, created_at, created_by, details) VALUES (?,?,?,?,?,?,?)").run(
      randomUUID(),
      table,
      id,
      action,
      now,
      user.id,
      details ? (typeof details === "string" ? details : JSON.stringify(details)) : null,
    );
  } catch {
    db.prepare("INSERT INTO activity_logs (id, entity, entity_id, action, created_at, created_by) VALUES (?,?,?,?,?,?)").run(
      randomUUID(),
      table,
      id,
      action,
      now,
      user.id,
    );
  }
}
function validateRelationships(table, data) {
  const users = table === "projects" ? [data.ownerId, ...data.memberIds] : ["tasks", "calendar_events", "leads"].includes(table) ? [data.assignedUserId] : table === "settlements" ? [data.payerId, data.recipientId] : table === "expenses" && data.paidBy ? [data.paidBy] : [];
  for (const userId of users) if (!db.prepare("SELECT id FROM users WHERE id=? AND active=1").get(userId)) throw fail(400, "Assigned accounts must be active.");
  if (table === "projects" && !data.memberIds.includes(data.ownerId)) throw fail(400, "The project owner must be an assigned member.");
  if (table === "tasks" && data.startDate && data.startDate > data.date) throw fail(400, "Start date must not be after the due date.");
  if (table === "settlements") {
    if (data.payerId === data.recipientId) throw fail(400, "Payer and recipient must be different accounts.");
  }
  if (table === "expenses") {
    if (['custom', 'percentage'].includes(data.splitType) && (!Array.isArray(data.allocations) || data.allocations.length === 0)) throw fail(400, 'Custom splits require explicit allocations that reconcile with the expense amount.');
    if (Array.isArray(data.allocations) && data.allocations.length > 0) {
      const userSet = new Set();
      for (const alloc of data.allocations) {
        if (!db.prepare("SELECT id FROM users WHERE id=? AND active=1").get(alloc.userId)) {
          throw fail(400, "Allocated accounts must be active.");
        }
        if (userSet.has(alloc.userId)) {
          throw fail(400, "Duplicate founder allocation for the same transaction.");
        }
        userSet.add(alloc.userId);
      }
      if (data.status !== "void") {
        const allocCents = data.allocations.reduce((sum, a) => sum + Math.round(a.amount * 100), 0);
        const expCents = Math.round(data.amount * 100);
        if (allocCents !== expCents) {
          throw fail(400, `Allocation amounts sum to ₹${(allocCents / 100).toFixed(2)}, which does not reconcile with total amount ₹${(expCents / 100).toFixed(2)}.`);
        }
      }
    }
  }
}
function validateSettlementAmount(data, existing = null) {
  const pairs = financeSummary().pairwise;
  const forward = pairs.find(pair => pair.debtorId === data.payerId && pair.creditorId === data.recipientId)?.amount || 0;
  const reverse = pairs.find(pair => pair.debtorId === data.recipientId && pair.creditorId === data.payerId)?.amount || 0;
  let availableCents = Math.round(forward * 100) - Math.round(reverse * 100);
  // Undo the prior contribution when validating a correction to the same pair.
  if (existing?.payerId === data.payerId && existing.recipientId === data.recipientId) availableCents += Math.round(existing.amount * 100);
  if (existing?.payerId === data.recipientId && existing.recipientId === data.payerId) availableCents -= Math.round(existing.amount * 100);
  availableCents = Math.max(0, availableCents);
  if (Math.round(data.amount * 100) > availableCents) throw fail(400, `Settlement amount exceeds outstanding debt of ₹${(availableCents / 100).toFixed(2)}.`);
}
function recalculate(projectId, user) {
  if (!projectId) return;
  const projectRow = db
    .prepare("SELECT data,updated_at FROM projects WHERE id=?")
    .get(projectId);
  if (!projectRow) return;
  const project = JSON.parse(projectRow.data);
  const tasks = db
    .prepare("SELECT data FROM tasks WHERE project_id=?")
    .all(projectId)
    .map((r) => JSON.parse(r.data))
    .filter((t) => t.status !== "CANCELLED");
  project.progress = tasks.length
    ? Math.round(
        (tasks.filter((t) => t.status === "COMPLETED").length / tasks.length) *
          100,
      )
    : (project.manualProgress ?? project.progress ?? 0);
  if (tasks.length) project.category = project.progress === 100 ? "Completed" : "Active";
  project.progressSource = tasks.length ? "tasks" : "manual";
  db.prepare(
    "UPDATE projects SET data=?,updated_at=?,updated_by=? WHERE id=?",
  ).run(JSON.stringify(project), new Date(Math.max(Date.now(), Date.parse(projectRow.updated_at) + 1)).toISOString(), user.id, projectId);
}
function store(table, id, data, user, exists = false) {
  if (table === "projects") data.manualProgress = data.manualProgress ?? data.progress;
  if (table === "expenses") {
    if (!data.paidBy) data.paidBy = user.id;
    if (!Array.isArray(data.allocations) || data.allocations.length === 0) {
      if (data.splitType === "individual") {
        data.allocations = [{ userId: data.paidBy, amount: data.amount, percentage: 100 }];
      } else {
        const founderIds = db.prepare("SELECT id FROM users WHERE active=1 ORDER BY id").all().map((u) => u.id);
        data.allocations = computeEqualAllocations(data.amount, founderIds);
      }
    }
  }
  const previous = exists ? db.prepare(`SELECT updated_at FROM ${table} WHERE id=?`).get(id)?.updated_at : null;
  const now = new Date(Math.max(Date.now(), previous ? Date.parse(previous) + 1 : 0)).toISOString();
  if (exists)
    db.prepare(
      `UPDATE ${table} SET data=?,updated_at=?,updated_by=? WHERE id=?`,
    ).run(JSON.stringify(data), now, user.id, id);
  else {
    const extra =
      table === "tasks"
        ? ["project_id", "assigned_user"]
        : table === "notifications"
          ? ["user_id"]
          : table === "calendar_events"
            ? ["assigned_user"]
            : [];
    const values =
      table === "tasks"
        ? [data.projectId || null, data.assignedUserId]
        : table === "notifications"
          ? [data.userId]
          : table === "calendar_events"
            ? [data.assignedUserId]
            : [];
    const fields = [
      "id",
      "data",
      "created_at",
      "updated_at",
      "created_by",
      "updated_by",
      ...extra,
    ];
    db.prepare(
      `INSERT INTO ${table} (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`,
    ).run(id, JSON.stringify(data), now, now, user.id, user.id, ...values);
  }
  if (table === "tasks")
    db.prepare("UPDATE tasks SET project_id=?,assigned_user=? WHERE id=?").run(
      data.projectId || null,
      data.assignedUserId,
      id,
    );
  if (table === "calendar_events")
    db.prepare("UPDATE calendar_events SET assigned_user=? WHERE id=?").run(
      data.assignedUserId,
      id,
    );
  if (table === "notifications")
    db.prepare("UPDATE notifications SET user_id=? WHERE id=?").run(
      data.userId,
      id,
    );
  if (table === "projects") {
    data.manualProgress = data.manualProgress ?? data.progress;
    db.prepare("DELETE FROM project_members WHERE project_id=?").run(id);
    for (const member of data.memberIds)
      db.prepare("INSERT INTO project_members VALUES (?,?)").run(id, member);
  }
  if (table === "funnels") {
    db.prepare("DELETE FROM funnel_steps WHERE funnel_id=?").run(id);
    for (const step of data.steps)
      db.prepare("INSERT INTO funnel_steps VALUES (?,?,?,?,?,?,?)").run(
        `${id}:${step.id}`,
        id,
        JSON.stringify(step),
        now,
        now,
        user.id,
        user.id,
      );
  }
  if (table !== "notifications") {
    audit(user, table, id, exists ? "updated" : "created");
    enqueueWebhooks(`${table}.${exists ? "updated" : "created"}`, { id, table, data });
  }
}
function notify(user, table, id) {
  const category =
    table === "tasks"
      ? "Tasks"
      : table === "projects"
        ? "Projects"
        : ["expenses", "income", "savings_entries", "salary_payments", "settlements"].includes(table)
          ? "Payments"
          : "General";
  for (const recipient of db
    .prepare("SELECT * FROM users WHERE active=1")
    .all()) {
    const item = rows(table).find((r) => r.id === id);
    if (!item) continue;
    const isFinancial = ["expenses", "income", "settlements"].includes(table);
    if (!isFinancial && !permitted(recipient, table, item)) continue;

    let title = "Workspace updated";
    let subtitle = item.title || item.name || id;

    if (table === "savings_entries") {
      title = "Savings protected 🛡️";
    } else if (table === "salary_payments") {
      title = "Salary recorded 💵";
    } else if (table === "settlements") {
      const payer = db.prepare("SELECT name FROM users WHERE id=?").get(item.payerId)?.name || item.payerId;
      const rec = db.prepare("SELECT name FROM users WHERE id=?").get(item.recipientId)?.name || item.recipientId;
      title = "Reimbursement settled 🤝";
      subtitle = `${payer} settled ₹${Number(item.amount).toLocaleString("en-IN")} with ${rec}`;
    } else if (table === "expenses") {
      title = item.status === "void" ? "Expense voided 🚫" : "Expense recorded 💳";
      subtitle = `${user.name || "A team member"} recorded ₹${Number(item.amount).toLocaleString("en-IN")} for ${item.category || "Expenses"}`;
    } else if (table === "tasks") {
      if (item.status === "COMPLETED") {
        title = "Task completed ✅";
        subtitle = `"${item.title}" completed`;
      } else if (item.assignedUserId === recipient.id && user.id !== recipient.id) {
        title = "Work assigned to you! 📋";
        subtitle = `"${item.title}" assigned by ${user.name || "Admin"}`;
      } else {
        title = "Task updated 📝";
      }
    } else if (table === "projects") {
      if (Array.isArray(item.memberIds) && item.memberIds.includes(recipient.id) && user.id !== recipient.id) {
        title = "Assigned to project 🚀";
        subtitle = `You were assigned to "${item.name}"`;
      } else {
        title = "Project updated 📁";
      }
    } else {
      title = { income: "Income updated 💰", leads: "Lead updated 🎯", funnels: "Funnel updated 📊", calendar_events: "Calendar updated 📅", team_members: "Team profile updated 👥" }[table] || "Workspace updated";
    }

    const data = {
      title,
      subtitle,
      timestamp: new Date().toISOString(),
      category,
      read: false,
      iconType:
        table === "tasks"
          ? "task"
          : table === "projects"
            ? "project"
            : category === "Payments"
              ? "payment"
              : "team",
      userId: recipient.id,
      targetScreen: category === "Payments" ? "money" : table === "calendar_events" ? "calendar" : table === "team_members" ? "team" : table,
      targetId: id,
    };
    const notificationId = randomUUID();
    store("notifications", notificationId, data, user);
    if (pushEnabled) db.prepare("INSERT INTO push_outbox (id,user_id,payload,next_attempt,created_at) VALUES (?,?,?,?,?)").run(notificationId, recipient.id, JSON.stringify({ id: notificationId, title: data.title, body: data.subtitle, deepLink: `/#${data.targetScreen}` }), Date.now(), Date.now());
  }
}
function healthResponse(res, detailed = false) {
  let dbOk = false;
  let counts = {};
  let pendingPush = 0;
  try {
    db.prepare("SELECT 1").get();
    dbOk = true;
    if (detailed) counts = {
      users: db.prepare("SELECT count(*) AS c FROM users").get()?.c || 0,
      projects: db.prepare("SELECT count(*) AS c FROM projects").get()?.c || 0,
      tasks: db.prepare("SELECT count(*) AS c FROM tasks").get()?.c || 0,
      leads: db.prepare("SELECT count(*) AS c FROM leads").get()?.c || 0,
    };
    if (detailed) pendingPush = db.prepare("SELECT count(*) AS c FROM push_outbox WHERE next_attempt<=?").get(Date.now())?.c || 0;
  } catch {
    dbOk = false;
  }
  const uptime = Math.floor(process.uptime());
  const memory = process.memoryUsage();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? "ok" : "degraded",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptimeSeconds: uptime,
    database: { connected: dbOk, ...(detailed ? { counts } : {}) },
    ...(detailed ? { activeStreams: eventResponses.size, pendingPushQueue: pendingPush } : {}),
    memory: {
      rssMb: Math.round(memory.rss / (1024 * 1024)),
      heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
      heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
    },
  });
}
app.get("/api/health", (_req, res) => healthResponse(res));

app.get("/api/identities", (_req, res) =>
  res.json(
    db
      .prepare(
        "SELECT id,name,role,password_hash FROM users WHERE active=1 ORDER BY id",
      )
      .all()
      .map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        ready: !!u.password_hash,
        demo: process.env.HAN_DEMO === "1",
      })),
  ),
);

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
app.get("/api/ready", (_req, res) => {
  try {
    const ready = !!db.prepare("SELECT id FROM users WHERE role='OWNER' AND active=1 AND password_hash IS NOT NULL").get();
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "requires_provisioning" });
  } catch { res.status(503).json({ status: "unavailable" }); }
});
app.post("/api/login", loginLimiter, (req, res) => {
  const { userId, password } = z
    .object({ userId: z.string().max(100), password: z.string().max(200) })
    .parse(req.body);
  const user = db
    .prepare("SELECT * FROM users WHERE id=? AND active=1")
    .get(userId);
  const valid = verifyPassword(password, user?.password_hash);
  if (production && knownDefaults.has(password)) throw fail(401, "This credential must be replaced by the server administrator before production use.");
  if (!user?.password_hash || !valid)
    throw fail(401, "Incorrect identity or password.");
  const token = randomBytes(32).toString("hex");
  const csrf = randomBytes(32).toString("hex");
  db.prepare("DELETE FROM sessions WHERE expires_at<?").run(Date.now());
  db.prepare("INSERT INTO sessions VALUES (?,?,?,?)").run(
    hashToken(token),
    user.id,
    csrf,
    Date.now() + 7 * 86400_000,
  );
  res.cookie(sessionCookie, token, {
    httpOnly: true,
    secure: production,
    sameSite: process.env.HAN_COOKIE_SAMESITE || "strict",
    maxAge: 7 * 86400_000,
    path: "/",
  });
  res.json({ user: publicUser(user), csrf, expiresAt: Date.now() + 7 * 86400_000 });
  changes.emit("change");
});
app.use("/api", (req, res, next) => {
  const token = (req.headers.cookie || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${sessionCookie}=`))
    ?.slice(sessionCookie.length + 1);
  const session =
    token &&
    db
      .prepare("SELECT * FROM sessions WHERE token_hash=? AND expires_at>?")
      .get(hashToken(token), Date.now());
  const user =
    session &&
    db
      .prepare("SELECT * FROM users WHERE id=? AND active=1")
      .get(session.user_id);
  if (!user) return res.status(401).json({ error: "Please sign in." });
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.headers["x-csrf-token"] !== session.csrf
  )
    return res.status(403).json({ error: "Invalid session action token." });
  req.user = user;
  req.session = session;
  res.on("finish", () => { if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && res.statusCode < 300) changes.emit("change"); });
  next();
});
app.use("/api", (req, res, next) => {
  const key = req.get("Idempotency-Key");
  if (!key || !["POST", "PATCH", "DELETE"].includes(req.method)) return next();
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key)) return res.status(400).json({ error: "Invalid mutation identifier." });
  const fingerprint = hashToken(JSON.stringify([req.method, req.path, req.body, req.get("If-Unmodified-Since")]));
  const receipt = db.prepare("SELECT * FROM mutation_receipts WHERE user_id=? AND key=?").get(req.user.id, key);
  if (receipt) {
    if (receipt.fingerprint !== fingerprint) return res.status(409).json({ error: "Mutation identifier already used for different data." });
    return res.status(receipt.status).json(JSON.parse(receipt.response));
  }
  req.receipt = { key, fingerprint };
  next();
});
app.get("/api/events", (req, res) => {
  if ((streams.get(req.user.id) || 0) >= 8) return res.status(429).json({ error: "Too many open workspaces." });
  streams.set(req.user.id, (streams.get(req.user.id) || 0) + 1);
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-store", "X-Accel-Buffering": "no", Connection: "keep-alive" });
  res.flushHeaders();
  eventResponses.add(res);
  const send = () => res.write("event: workspace\ndata: {}\n\n");
  send();
  changes.on("change", send);
  const heartbeat = setInterval(() => {
    if (!db.prepare("SELECT token_hash FROM sessions WHERE token_hash=? AND expires_at>?").get(req.session.token_hash, Date.now())) { res.write("event: revoked\ndata: {}\n\n"); res.end(); }
    else res.write(": heartbeat\n\n");
  }, 15000);
  res.on("close", () => { eventResponses.delete(res); clearInterval(heartbeat); changes.off("change", send); streams.set(req.user.id, Math.max(0, (streams.get(req.user.id) || 1) - 1)); });
});
app.get("/api/session", (req, res) =>
  res.json({ user: publicUser(req.user), csrf: req.session.csrf, expiresAt: req.session.expires_at }),
);

app.get("/api/health/details", (req, res) => {
  if (!owner(req.user) && !can(req.user, "projects.manage")) throw fail(403, "Owner access required.");
  healthResponse(res, true);
});

app.get("/api/search", (req, res) => {
  const query = (req.query.q || "").toString().trim().toLowerCase();
  if (!query) return res.json({ query: "", total: 0, results: [] });
  const typeFilter = (req.query.type || "all").toString();
  const limit = z.coerce.number().int().min(1).max(100).default(50).parse(req.query.limit);
  const results = [];

  const searchCollection = (table, fields, targetScreen, getTitle, getSubtitle) => {
    if (typeFilter !== "all" && typeFilter !== table && !(typeFilter === "transactions" && ["expenses", "income"].includes(table))) return;
    const items = rows(table);
    for (const item of items) {
      if (!permitted(req.user, table, item)) continue;
      let matchScore = 0;
      let matchedField = null;
      for (const f of fields) {
        const val = (item[f] || "").toString().toLowerCase();
        if (val.includes(query)) {
          matchScore += val === query ? 10 : val.startsWith(query) ? 5 : 2;
          if (!matchedField) matchedField = f;
        }
      }
      if (matchScore > 0) {
        results.push({
          id: item.id,
          table,
          title: getTitle(item),
          subtitle: getSubtitle(item),
          category: item.category || table,
          matchedField,
          targetScreen,
          updated_at: item.updated_at,
          score: matchScore,
        });
      }
    }
  };

  searchCollection("projects", ["name", "subtitle", "description", "notes"], "projects", p => p.name, p => p.subtitle || p.category);
  searchCollection("tasks", ["title", "description", "notes", "timeSlot"], "tasks", t => t.title, t => `Status: ${t.status} • Due: ${t.date}`);
  searchCollection("leads", ["name", "category", "email", "phone", "source", "nextAction"], "leads", l => l.name, l => `${l.status} • ${l.category}`);
  searchCollection("expenses", ["title", "category", "notes"], "money", e => e.title, e => `Expense: ₹${e.amount} • ${e.date}`);
  searchCollection("income", ["title", "category", "notes"], "money", i => i.title, i => `Income: ₹${i.amount} • ${i.date}`);
  searchCollection("calendar_events", ["title", "notes"], "calendar", c => c.title, c => c.date);
  searchCollection("team_members", ["name", "role", "initials"], "team", tm => tm.name, tm => tm.role);

  results.sort((a, b) => b.score - a.score || Date.parse(b.updated_at) - Date.parse(a.updated_at));
  res.json({ query, total: results.length, results: results.slice(0, limit) });
});

app.get("/api/analytics", (req, res) => {
  const allTasks = rows("tasks").filter(t => permitted(req.user, "tasks", t));
  const allProjects = rows("projects").filter(p => permitted(req.user, "projects", p));
  const allLeads = rows("leads").filter(l => permitted(req.user, "leads", l));

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === "COMPLETED").length;
  const inProgressTasks = allTasks.filter(t => t.status === "IN_PROGRESS").length;
  const todoTasks = allTasks.filter(t => t.status === "TODO").length;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: process.env.HAN_TIMEZONE || "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const overdueTasks = allTasks.filter(t => t.date < today && !["COMPLETED", "CANCELLED"].includes(t.status)).length;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalLeads = allLeads.length;
  const wonLeads = allLeads.filter(l => l.status === "Won");
  const lostLeads = allLeads.filter(l => l.status === "Lost");
  const pipelineLeads = allLeads.filter(l => !["Won", "Lost"].includes(l.status));
  const totalPipelineValue = pipelineLeads.reduce((acc, l) => acc + (l.dealValue || 0), 0);
  const totalWonValue = wonLeads.reduce((acc, l) => acc + (l.dealValue || 0), 0);
  const leadWinRate = (wonLeads.length + lostLeads.length) ? Math.round((wonLeads.length / (wonLeads.length + lostLeads.length)) * 100) : 0;

  const totalProjects = allProjects.length;
  const completedProjects = allProjects.filter(p => p.category === "Completed" || p.progress === 100).length;
  const activeProjects = totalProjects - completedProjects;
  const avgProjectProgress = totalProjects ? Math.round(allProjects.reduce((acc, p) => acc + (p.progress || 0), 0) / totalProjects) : 0;

  let financeData = null;
  {
    const summary = financeSummary();
    const expensesList = rows("expenses");
    const incomeList = rows("income");
    const totalExpenses = expensesList.reduce((acc, e) => acc + e.amount, 0);
    const totalIncome = incomeList.reduce((acc, i) => acc + i.amount, 0);
    const netProfit = Math.round((totalIncome - totalExpenses) * 100) / 100;
    const savingsRatio = totalIncome ? Math.round((summary.savings / totalIncome) * 100) : 0;

    financeData = {
      ...summary,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit,
      savingsRatio,
      runwayMonths: null
    };
  }

  res.json({
    tasks: { total: totalTasks, completed: completedTasks, inProgress: inProgressTasks, todo: todoTasks, overdue: overdueTasks, completionRate },
    leads: { total: totalLeads, won: wonLeads.length, lost: lostLeads.length, pipelineValue: Math.round(totalPipelineValue * 100) / 100, wonValue: Math.round(totalWonValue * 100) / 100, winRate: leadWinRate },
    projects: { total: totalProjects, active: activeProjects, completed: completedProjects, avgProgress: avgProjectProgress },
    finance: financeData,
    generatedAt: new Date().toISOString()
  });
});

app.post("/api/batch", (req, res) => {
  const schema = z.discriminatedUnion("action", [
    z.object({
      action: z.literal("bulk_task_status"),
      taskIds: z.array(z.string().min(1).max(100)).min(1).max(50).refine(ids => new Set(ids).size === ids.length, "Task IDs must be unique"),
      status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
    }),
    z.object({
      action: z.literal("bulk_task_reassign"),
      taskIds: z.array(z.string().min(1).max(100)).min(1).max(50).refine(ids => new Set(ids).size === ids.length, "Task IDs must be unique"),
      assignedUserId: z.string().trim().min(1).max(100),
    }),
    z.object({
      action: z.literal("bulk_lead_status"),
      leadIds: z.array(z.string().min(1).max(100)).min(1).max(50).refine(ids => new Set(ids).size === ids.length, "Lead IDs must be unique"),
      status: z.enum(["New", "Contacted", "Interested", "Follow Up", "Won", "Lost"]),
    }),
  ]);

  const body = schema.parse(req.body);
  const updatedIds = [];

  transaction(() => {
    if (body.action === "bulk_task_status") {
      const affectedProjects = new Set();
      for (const id of body.taskIds) {
        const existing = rows("tasks").find(t => t.id === id);
        if (!existing) throw fail(404, `Task ${id} not found.`);
        if (!owner(req.user) && !can(req.user, "tasks.manage") && existing.assignedUserId !== req.user.id) throw fail(403, `Permission denied for task ${id}.`);
        const completedBy = body.status === "COMPLETED" ? (existing.status === "COMPLETED" ? existing.completedBy : req.user.id) : null;
        const completedAt = body.status === "COMPLETED" ? (existing.status === "COMPLETED" ? existing.completedAt : new Date().toISOString()) : null;
        const updated = { ...existing, status: body.status, completedBy, completedAt };
        store("tasks", id, updated, req.user, true);
        notify(req.user, "tasks", id);
        if (existing.projectId) affectedProjects.add(existing.projectId);
        updatedIds.push(id);
      }
      for (const projId of affectedProjects) recalculate(projId, req.user);
    } else if (body.action === "bulk_task_reassign") {
      if (!owner(req.user) && !can(req.user, "tasks.manage")) throw fail(403, "Permission required to bulk reassign tasks.");
      if (!db.prepare("SELECT id FROM users WHERE id=? AND active=1").get(body.assignedUserId)) throw fail(400, "Assigned user must be active.");
      for (const id of body.taskIds) {
        const existing = rows("tasks").find(t => t.id === id);
        if (!existing) throw fail(404, `Task ${id} not found.`);
        if (existing.projectId && !db.prepare("SELECT 1 FROM project_members WHERE project_id=? AND user_id=?").get(existing.projectId, body.assignedUserId)) {
          throw fail(400, `User must be a member of project ${existing.projectId}.`);
        }
        const updated = { ...existing, assignedUserId: body.assignedUserId };
        store("tasks", id, updated, req.user, true);
        notify(req.user, "tasks", id);
        updatedIds.push(id);
      }
    } else if (body.action === "bulk_lead_status") {
      if (!can(req.user, "leads.manage")) throw fail(403, "Permission denied for leads management.");
      for (const id of body.leadIds) {
        const existing = rows("leads").find(l => l.id === id);
        if (!existing) throw fail(404, `Lead ${id} not found.`);
        const updated = { ...existing, status: body.status };
        store("leads", id, updated, req.user, true);
        notify(req.user, "leads", id);
        updatedIds.push(id);
      }
    }
    receipt(req, 200, { ok: true, count: updatedIds.length, updatedIds });
  });
  res.json({ ok: true, count: updatedIds.length, updatedIds });
});

app.get("/api/sessions", (req, res) => {
  const activeSessions = db.prepare("SELECT token_hash, csrf, expires_at FROM sessions WHERE user_id=? AND expires_at>?").all(req.user.id, Date.now());
  const formatted = activeSessions.map(s => ({
    isCurrent: s.token_hash === req.session.token_hash,
    expiresAt: new Date(s.expires_at).toISOString(),
  }));
  res.json({ sessions: formatted });
});

app.delete("/api/sessions/others", (req, res) => {
  let response;
  transaction(() => {
    const result = db.prepare("DELETE FROM sessions WHERE user_id=? AND token_hash!=?").run(req.user.id, req.session.token_hash);
    audit(req.user, "sessions", req.user.id, "revoked other sessions");
    response = { ok: true, revokedCount: result.changes };
    receipt(req, 200, response);
  });
  res.json(response);
});

app.get("/api/webhooks", (req, res) => {
  if (!owner(req.user) && !can(req.user, "projects.manage")) throw fail(403, "Integrations permission required.");
  const hooks = db.prepare("SELECT id, url, events, active, created_at, updated_at FROM webhooks WHERE user_id=?").all(req.user.id).map(h => ({ ...h, events: JSON.parse(h.events), active: !!h.active }));
  res.json({ webhooks: hooks });
});

app.post("/api/webhooks", (req, res) => {
  if (!owner(req.user) && !can(req.user, "projects.manage")) throw fail(403, "Integrations permission required.");
  const data = z.object({
    url: z.string().url().max(2048).refine(webhookDestinationAllowed, "Use an HTTPS destination explicitly allowed by the server operator"),
    events: z.array(z.enum(["*", ...[...Object.keys(schemas), "salary_payments"].filter(t => t !== "notifications").flatMap(t => [`${t}.created`, `${t}.updated`])])).min(1).max(50).default(["*"]),
  }).parse(req.body);
  if (db.prepare("SELECT count(*) AS count FROM webhooks WHERE user_id=?").get(req.user.id).count >= 20) throw fail(409, "Maximum integrations reached. Remove an unused integration first.");
  const id = randomUUID();
  const secret = randomBytes(24).toString("hex");
  const now = new Date().toISOString();
  const result = { id, url: data.url, secret, events: data.events, created_at: now };
  transaction(() => {
    db.prepare("INSERT INTO webhooks (id, user_id, url, secret, events, active, created_at, updated_at) VALUES (?,?,?,?,?,1,?,?)").run(id, req.user.id, data.url, secret, JSON.stringify(data.events), now, now);
    audit(req.user, "webhooks", id, "created");
    receipt(req, 201, result);
  });
  res.status(201).json(result);
});

app.delete("/api/webhooks/:id", (req, res) => {
  if (!owner(req.user) && !can(req.user, "projects.manage")) throw fail(403, "Integrations permission required.");
  const hook = db.prepare("SELECT id FROM webhooks WHERE id=? AND user_id=?").get(req.params.id, req.user.id);
  if (!hook) throw fail(404, "Webhook integration not found.");
  transaction(() => {
    db.prepare("DELETE FROM webhooks WHERE id=?").run(req.params.id);
    audit(req.user, "webhooks", req.params.id, "deleted");
    receipt(req, 200, { ok: true });
  });
  res.json({ ok: true });
});

app.get("/api/reports/csv", (req, res) => {
  const table = (req.query.table || "tasks").toString();
  if (!["tasks", "leads", "expenses", "income", "projects", "activity_logs", "settlements"].includes(table)) throw fail(400, "Invalid export table selection.");
  let items = table === "activity_logs" 
    ? db.prepare("SELECT * FROM activity_logs ORDER BY rowid DESC LIMIT 500").all().filter(a => owner(req.user) || can(req.user, "projects.manage") || a.created_by === req.user.id)
    : rows(table).filter(i => permitted(req.user, table, i));

  if (table === "expenses") {
    items = items.map(item => ({
      ...item,
      allocations_summary: Array.isArray(item.allocations) ? item.allocations.map(a => `${a.userId}:${a.amount}`).join("; ") : "",
    }));
  }

  const startDate = req.query.startDate ? z.iso.date().parse(req.query.startDate) : null;
  const endDate = req.query.endDate ? z.iso.date().parse(req.query.endDate) : null;
  if (startDate && endDate && startDate > endDate) throw fail(400, "Start date must be before end date.");

  if (startDate) items = items.filter(i => (i.date || i.created_at).slice(0, 10) >= startDate);
  if (endDate) items = items.filter(i => (i.date || i.created_at).slice(0, 10) <= endDate);

  if (!items.length) return res.status(200).send("No matching records found");

  const keys = Object.keys(items[0]).filter(k => typeof items[0][k] !== "object");
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const raw = String(val);
    // Control prefixes must also be detected to prevent spreadsheet formula execution.
    // eslint-disable-next-line no-control-regex
    const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(raw) ? `'${raw}` : raw;
    const str = safe.replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows = [keys.join(",")];
  for (const item of items) {
    csvRows.push(keys.map(k => escapeCsv(item[k])).join(","));
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="han-${table}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csvRows.join("\r\n"));
});
function receipt(req, status, response) {
  if (req.receipt) db.prepare("INSERT INTO mutation_receipts VALUES (?,?,?,?,?,?)").run(req.user.id, req.receipt.key, req.receipt.fingerprint, status, JSON.stringify(response), Date.now());
}
app.get("/api/push/config", (req, res) => res.json({ enabled: webPushEnabled, nativeEnabled: nativePushEnabled, publicKey: webPushEnabled ? process.env.VAPID_PUBLIC_KEY : null, subscribed: !!db.prepare("SELECT id FROM push_subscriptions WHERE user_id=? LIMIT 1").get(req.user.id), nativeSubscribed: !!db.prepare("SELECT token FROM native_push_tokens WHERE user_id=? LIMIT 1").get(req.user.id) }));
app.post("/api/push/native-subscribe", (req, res) => {
  if (!nativePushEnabled) throw fail(503, "Android push is not configured on this server.");
  const { token } = z.object({ token: z.string().min(30).max(4096) }).strict().parse(req.body);
  const existing = db.prepare("SELECT user_id FROM native_push_tokens WHERE token=?").get(token);
  if (existing && existing.user_id !== req.user.id) throw fail(409, "This device belongs to another notification account. Disable alerts there first.");
  if (db.prepare("SELECT count(*) AS count FROM native_push_tokens WHERE user_id=?").get(req.user.id).count >= 10 && !existing) throw fail(409, "Maximum registered devices reached.");
  db.prepare("INSERT INTO native_push_tokens VALUES (?,?,?) ON CONFLICT(token) DO UPDATE SET updated_at=excluded.updated_at").run(token, req.user.id, Date.now());
  db.prepare("INSERT INTO notification_preferences VALUES (?,1) ON CONFLICT(user_id) DO UPDATE SET enabled=1").run(req.user.id);
  res.json({ ok: true });
});
app.post("/api/push/preferences", (req, res) => {
  const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
  db.prepare("INSERT INTO notification_preferences VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled").run(req.user.id, Number(enabled));
  if (!enabled) db.prepare("DELETE FROM push_subscriptions WHERE user_id=?").run(req.user.id);
  if (!enabled) db.prepare("DELETE FROM native_push_tokens WHERE user_id=?").run(req.user.id);
  res.json({ ok: true });
});
app.post("/api/logout", (req, res) => {
  db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
    req.session.token_hash,
  );
  res.clearCookie(sessionCookie, {
    path: "/",
    httpOnly: true,
    secure: production,
    sameSite: "strict",
  });
  res.json({ ok: true });
});
app.post("/api/push/subscribe", (req, res) => {
  if (!webPushEnabled) throw fail(503, "Background web push is not configured on this server.");
  const schema = z.object({
    endpoint: z.string().url().max(1000).refine(value => { const url = new URL(value); return url.protocol === "https:" && ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com", "wns2-db5p.notify.windows.com"].includes(url.hostname); }, "Unsupported push provider"),
    p256dh: z.string().min(20).max(200),
    auth: z.string().min(10).max(100),
    platform: z.enum(["web", "android", "ios"]).default("web"),
  });
  const data = schema.parse(req.body);
  if (db.prepare("SELECT count(*) AS count FROM push_subscriptions WHERE user_id=?").get(req.user.id).count >= 10 && !db.prepare("SELECT id FROM push_subscriptions WHERE endpoint=? AND user_id=?").get(data.endpoint, req.user.id)) throw fail(409, "Maximum browser subscriptions reached. Disable unused subscriptions first.");
  const existingSubscription = db.prepare("SELECT user_id FROM push_subscriptions WHERE endpoint=?").get(data.endpoint);
  if (existingSubscription && existingSubscription.user_id !== req.user.id) throw fail(409, "This browser subscription belongs to another account. Disable it for that account first.");
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, platform, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      platform = excluded.platform,
      updated_at = excluded.updated_at
  `).run(randomUUID(), req.user.id, data.endpoint, data.p256dh || null, data.auth || null, data.platform, now, now);
  db.prepare("INSERT INTO notification_preferences VALUES (?,1) ON CONFLICT(user_id) DO UPDATE SET enabled=1").run(req.user.id);
  res.json({ ok: true, message: "Push subscription registered." });
});
app.post("/api/push/unsubscribe", (req, res) => {
  const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body);
  db.prepare("DELETE FROM push_subscriptions WHERE endpoint=? AND user_id=?").run(endpoint, req.user.id);
  res.json({ ok: true });
});
app.post("/api/push/test", (req, res) => {
  if (!pushEnabled) throw fail(503, "Background push is not configured on this server.");
  const data = {
    title: "Test Notification",
    subtitle: "This is an in-app test. Background delivery depends on your browser subscription.",
    timestamp: new Date().toISOString(),
    category: "General",
    read: false,
    iconType: "project",
    userId: req.user.id,
  };
  store("notifications", randomUUID(), data, req.user);
  const id = randomUUID();
  db.prepare("INSERT INTO push_outbox (id,user_id,payload,next_attempt,created_at) VALUES (?,?,?,?,?)").run(id, req.user.id, JSON.stringify({ id, title: "HAN test", body: "Background notification delivery test", deepLink: "/#notifications" }), Date.now(), Date.now());
  void processPushOutbox();
  res.json({ ok: true, message: "Test submitted. Check your device to confirm delivery." });
});

app.post("/api/password", (req, res) => {
  const { currentPassword, password } = z
    .object({
      currentPassword: z.string().max(200),
      password: z.string().min(12).max(200),
    })
    .parse(req.body);
  if (!verifyPassword(currentPassword, req.user.password_hash))
    throw fail(401, "Current password is incorrect.");
  requireProductionPassword(password);
  transaction(() => {
    db.prepare(
      "UPDATE users SET password_hash=?,updated_at=?,updated_by=? WHERE id=?",
    ).run(
      hashPassword(password),
      new Date().toISOString(),
      req.user.id,
      req.user.id,
    );
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(req.user.id);
    audit(req.user, "users", req.user.id, "password changed");
  });
  res.clearCookie(sessionCookie, { path: "/" });
  res.json({ ok: true });
});
app.get("/api/state", (req, res) => {
  scheduleReminders();
  const state = {};
  for (const table of Object.keys(schemas))
    state[table] = rows(table).filter((item) =>
      permitted(req.user, table, item),
    );
  const users = db.prepare("SELECT * FROM users ORDER BY id").all();
  state.users = users.map(publicUser);
  state.projects = state.projects.map((p) => ({
    ...p,
    teamMembers: p.memberIds.map(
      (id) => users.find((u) => u.id === id)?.name || id,
    ),
  }));
  state.tasks = state.tasks.map((t) => ({
    ...t,
    completed: t.status === "COMPLETED",
    projectName: state.projects.find((p) => p.id === t.projectId)?.name,
  }));
  state.funnels = state.funnels.map((f) => ({
    ...f,
    completedDaysOrSteps: f.steps.filter((s) => s.status === "Completed")
      .length,
    totalDaysOrSteps: f.steps.length || 1,
  }));
  state.transactions = [
    ...state.expenses.map((e) => ({ ...e, type: "expense" })),
    ...state.income.map((e) => ({ ...e, type: "income" })),
  ];
  const canViewSharedActivity = owner(req.user) || can(req.user, "finance.view") || can(req.user, "projects.manage") || can(req.user, "tasks.manage");
  state.activity_logs = db
    .prepare("SELECT * FROM activity_logs ORDER BY rowid DESC LIMIT 100")
    .all()
    .filter((a) => canViewSharedActivity || a.created_by === req.user.id);
  state.permissionIds = permissionIds;
  state.finance = financeSummary();
  state.salary_payments = rows("salary_payments");
  state.demo = process.env.HAN_DEMO === "1";
  state.viewerId = req.user.id;
  res.json(state);
});
export function scheduleReminders() {
  let created = false;
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: process.env.HAN_TIMEZONE || "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const due = [...rows("tasks").filter(task => task.date <= date && !["COMPLETED", "CANCELLED"].includes(task.status)).map(task => ({ ...task, table: "tasks", date: task.date })), ...rows("projects").filter(project => !project.archived && project.category !== "Completed" && project.deadline && project.deadline <= date).map(project => ({ ...project, table: "projects", date: project.deadline })), ...rows("leads").filter(lead => lead.followUpDate && lead.followUpDate <= date && !["Won", "Lost"].includes(lead.status)).map(lead => ({ ...lead, table: "leads", date: lead.followUpDate }))];
  const accounts = db.prepare("SELECT * FROM users WHERE active=1").all();
  transaction(() => {
    for (const item of due) for (const recipient of accounts) {
      if (!permitted(recipient, item.table, item)) continue;
      const key = `${recipient.id}:${item.table}:${item.id}:${item.date}:${date}`;
      if (db.prepare("SELECT key FROM reminder_receipts WHERE key=?").get(key)) continue;
      const id = randomUUID();
      const notification = { title: item.date < date ? "Overdue work needs attention" : "Work due today", subtitle: item.title || item.name, timestamp: new Date().toISOString(), category: item.table === "tasks" ? "Tasks" : item.table === "projects" ? "Projects" : "General", read: false, iconType: "deadline", userId: recipient.id, targetScreen: item.table, targetId: item.id };
      store("notifications", id, notification, recipient);
      created = true;
      db.prepare("INSERT INTO reminder_receipts VALUES (?,?)").run(key, Date.now());
      if (pushEnabled) db.prepare("INSERT INTO push_outbox (id,user_id,payload,next_attempt,created_at) VALUES (?,?,?,?,?)").run(id, recipient.id, JSON.stringify({ id, title: "HAN reminder", body: "Open HAN to review work that needs attention.", deepLink: `/#${item.table}` }), Date.now(), Date.now());
    }
    const finance = financeSummary();
    if (finance.income > 0 && finance.funds <= 0) {
      const ledgerVersion = hashToken(JSON.stringify([rows("income").map(item => [item.id, item.updated_at]), rows("expenses").map(item => [item.id, item.updated_at]), rows("savings_entries").map(item => item.id)]));
      for (const recipient of accounts.filter(user => can(user, "finance.view"))) {
        const key = `${recipient.id}:funds:${ledgerVersion}`;
        if (db.prepare("SELECT key FROM reminder_receipts WHERE key=?").get(key)) continue;
        const id = randomUUID();
        store("notifications", id, { title: "Spendable funds need replenishing", subtitle: "Funds are exhausted. Protected savings remain unavailable for payments.", timestamp: new Date().toISOString(), category: "Payments", read: false, iconType: "payment", userId: recipient.id, targetScreen: "money" }, recipient);
        db.prepare("INSERT INTO reminder_receipts VALUES (?,?)").run(key, Date.now());
        if (pushEnabled) db.prepare("INSERT INTO push_outbox (id,user_id,payload,next_attempt,created_at) VALUES (?,?,?,?,?)").run(id, recipient.id, JSON.stringify({ id, title: "HAN funds alert", body: "Open HAN to review your funds.", deepLink: "/#money" }), Date.now(), Date.now());
        created = true;
      }
    }
  });
  if (created) changes.emit("change");
}
app.get("/api/export", (req, res) => {
  if (!owner(req.user) && !can(req.user, "projects.manage")) throw fail(403, "Export access required.");
  const exportData = {};
  for (const table of Object.keys(schemas)) {
    exportData[table] = rows(table);
  }
  exportData.activity_logs = db
    .prepare("SELECT * FROM activity_logs ORDER BY rowid DESC LIMIT 200")
    .all();
  exportData.salary_payments = rows("salary_payments");
  exportData.finance = financeSummary();
  exportData.exported_at = new Date().toISOString();
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=han-export-${new Date().toISOString().slice(0, 10)}.json`,
  );
  res.json(exportData);
});
app.get("/api/backup", rateLimit({ windowMs: 60_000, limit: 2, standardHeaders: "draft-8", legacyHeaders: false }), async (req, res) => {
  if (!owner(req.user)) throw fail(403, "Owner access required.");
  const directory = mkdtempSync(join(tmpdir(), "han-backup-"));
  const path = join(directory, "han.sqlite");
  try {
    await backup(db, path);
    res.download(path, `han-backup-${new Date().toISOString().slice(0, 10)}.sqlite`, () => rmSync(directory, { recursive: true, force: true }));
  } catch (error) { rmSync(directory, { recursive: true, force: true }); throw error; }
});
app.patch("/api/users/:id", (req, res) => {
  if (!owner(req.user) && !can(req.user, "projects.manage")) throw fail(403, "Owner permission required.");
  const existing = db
    .prepare("SELECT * FROM users WHERE id=?")
    .get(req.params.id);
  if (!existing) throw fail(404, "Account slot not found.");
  const data = z
    .object({
      name: z.string().trim().min(1).max(100),
      role: z.enum(["OWNER", "MEMBER"]),
      active: z.boolean(),
      permissions: z.array(z.enum(permissionIds)).max(permissionIds.length),
      password: z.string().min(12).max(200).optional(),
    })
    .parse(req.body);
  if (existing.role === "OWNER" && (!data.active || data.role !== "OWNER"))
    throw fail(409, "The owner account must remain active.");
  if (existing.role !== "OWNER" && data.role === "OWNER")
    throw fail(409, "Only one owner is allowed.");
  if (data.password) requireProductionPassword(data.password);
  transaction(() => {
    db.prepare(
      "UPDATE users SET name=?,role=?,active=?,permissions=?,password_hash=?,updated_at=?,updated_by=? WHERE id=?",
    ).run(
      data.name,
      data.role,
      Number(data.active),
      JSON.stringify(data.permissions),
      data.password ? hashPassword(data.password) : existing.password_hash,
      new Date().toISOString(),
      req.user.id,
      existing.id,
    );
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(existing.id);
    if (data.password || !data.active) {
      db.prepare("DELETE FROM push_subscriptions WHERE user_id=?").run(existing.id);
      db.prepare("DELETE FROM native_push_tokens WHERE user_id=?").run(existing.id);
    }
    audit(req.user, "users", existing.id, "updated");
  });
  res.json({ ok: true });
});
app.post("/api/users", (req, res) => {
  if (!owner(req.user) && !can(req.user, "projects.manage")) throw fail(403, "Owner permission required.");
  const data = z.object({ name: z.string().trim().min(1).max(100), password: z.string().min(12).max(200), permissions: z.array(z.enum(permissionIds)).max(permissionIds.length).default([]), active: z.boolean().default(true), role: z.literal("MEMBER").default("MEMBER") }).strict().parse(req.body);
  if (db.prepare("SELECT id FROM users WHERE lower(name)=lower(?)").get(data.name)) throw fail(409, "An account already uses that name.");
  const id = randomUUID();
  transaction(() => {
    const now = new Date().toISOString();
    requireProductionPassword(data.password);
    db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?)").run(id, data.name, "MEMBER", hashPassword(data.password), JSON.stringify(data.permissions), Number(data.active), now, now, req.user.id, req.user.id);
    audit(req.user, "users", id, "created");
    receipt(req, 201, { id });
  });
  res.status(201).json({ id });
});
app.post("/api/notifications/read", (req, res) => {
  transaction(() => {
    for (const row of rows("notifications").filter(
      (n) => n.userId === req.user.id,
    ))
      store("notifications", row.id, { ...row, read: true }, req.user, true);
  });
  res.json({ ok: true });
});
app.post("/api/salary_payments", (req, res) => {
  if (!owner(req.user) && !can(req.user, "finance.manage")) throw fail(403, "Permission required to record salary payments.");
  const data = z.object({ name: z.string().trim().min(1).max(250), amount: money, date: z.iso.date(), notes: z.string().max(10000).default("") }).strict().parse(req.body);
  const id = randomUUID(), expenseId = randomUUID();
  transaction(() => {
    store("salary_payments", id, { ...data, expenseId }, req.user);
    store("expenses", expenseId, { title: `Salary · ${data.name}`, amount: data.amount, date: data.date, category: "Salary", notes: data.notes, salaryPaymentId: id }, req.user);
    protectFunds();
    notify(req.user, "salary_payments", id);
    receipt(req, 201, { id, expenseId });
  });
  res.status(201).json({ id, expenseId });
});
app.patch("/api/salary_payments/:id", (req, res) => {
  if (!owner(req.user) && !can(req.user, "finance.manage")) throw fail(403, "Permission required to correct salary records.");
  const existing = rows("salary_payments").find(item => item.id === req.params.id);
  if (!existing) throw fail(404, "Salary record not found.");
  if (req.get("If-Unmodified-Since") && req.get("If-Unmodified-Since") !== existing.updated_at) throw fail(409, "This salary record changed. Refresh and review your edit.");
  const data = z.object({ name: z.string().trim().min(1).max(250), amount: money, date: z.iso.date(), notes: z.string().max(10000).default("") }).parse({ ...existing, ...req.body });
  transaction(() => {
    const previousFunds = financeSummary().funds;
    store("salary_payments", existing.id, { ...data, expenseId: existing.expenseId }, req.user, true);
    store("expenses", existing.expenseId, { title: `Salary · ${data.name}`, amount: data.amount, date: data.date, category: "Salary", notes: data.notes, salaryPaymentId: existing.id }, req.user, true);
    protectFunds(previousFunds);
    notify(req.user, "salary_payments", existing.id);
    receipt(req, 200, { ok: true });
  });
  res.json({ ok: true });
});
app.delete("/api/salary_payments/:id", (req, res) => {
  if (!owner(req.user) && !can(req.user, "finance.manage")) throw fail(403, "Permission required to delete salary records.");
  const existing = rows("salary_payments").find(item => item.id === req.params.id);
  if (!existing) throw fail(404, "Salary record not found.");
  if (req.get("If-Unmodified-Since") && req.get("If-Unmodified-Since") !== existing.updated_at) throw fail(409, "This salary record changed. Refresh before deleting.");
  transaction(() => {
    db.prepare("DELETE FROM expenses WHERE id=?").run(existing.expenseId);
    db.prepare("DELETE FROM salary_payments WHERE id=?").run(existing.id);
    audit(req.user, "salary_payments", existing.id, "deleted");
    receipt(req, 200, { ok: true });
  });
  res.json({ ok: true });
});
app.post("/api/expenses/:id/void", (req, res) => {
  if (!owner(req.user) && !can(req.user, "finance.manage"))
    throw fail(403, "You do not have permission to void expenses.");
  const existing = rows("expenses").find((r) => r.id === req.params.id);
  if (!existing) throw fail(404, "Expense not found.");
  if (existing.salaryPaymentId) throw fail(409, 'Salary payment expenses cannot be voided directly. Use salary payment management.');
  if (existing.status === "void") throw fail(409, "Expense is already voided.");
  const body = z.object({ reason: z.string().trim().min(1).max(500).default("Voided by user") }).parse(req.body || {});
  transaction(() => {
    const updated = {
      ...existing,
      status: "void",
      voidReason: body.reason,
      voidedAt: new Date().toISOString(),
      voidedBy: req.user.id,
    };
    store("expenses", existing.id, updated, req.user, true);
    audit(req.user, "expenses", existing.id, "voided", { reason: body.reason });
    notify(req.user, "expenses", existing.id);
  });
  res.json({ ok: true });
});
app.post("/api/:table", (req, res) => {
  const table = req.params.table;
  if (!Object.hasOwn(schemas, table)) throw fail(404, "Unknown collection.");
  if (table === "notifications") throw fail(403, "Notifications are generated by workspace activity.");
  const data = schemas[table].parse(req.body);
  if (!permitted(req.user, table, data, true))
    throw fail(403, "You do not have permission to create this record.");
  validateRelationships(table, data);
  if (
    table === "tasks" &&
    data.projectId &&
    !db.prepare("SELECT id FROM projects WHERE id=?").get(data.projectId)
  )
    throw fail(400, "Project not found.");
  if (
    table === "tasks" &&
    data.projectId &&
    !db
      .prepare("SELECT 1 FROM project_members WHERE project_id=? AND user_id=?")
      .get(data.projectId, data.assignedUserId)
  )
    throw fail(400, "Assign the user to the project first.");
  const id = randomUUID();
  if(table==='tasks'){
    data.completedBy=data.status==='COMPLETED'?req.user.id:null;
    data.completedAt=data.status==='COMPLETED'?new Date().toISOString():null;
  }
  transaction(() => {
    const previousFunds = financeSummary().funds;
    if (table === 'settlements') validateSettlementAmount(data);
    store(table, id, data, req.user);
    if (["income", "expenses", "savings_entries"].includes(table)) protectFunds(table === "income" ? previousFunds : 0);
    if (table === "tasks") recalculate(data.projectId, req.user);
    if (!["notifications", "settings", "categories"].includes(table))
      notify(req.user, table, id);
    receipt(req, 201, { id });
  });
  res.status(201).json({ id });
});
app.patch("/api/:table/:id", (req, res) => {
  const { table, id } = req.params;
  if (!Object.hasOwn(schemas, table)) throw fail(404, "Unknown collection.");
  const existing = rows(table).find((r) => r.id === id);
  if (!existing) throw fail(404, "Record not found.");
  if (table === "savings_entries" || existing.salaryPaymentId) throw fail(409, "Protected savings and recorded salary payments cannot be edited or withdrawn.");
  if (table === "expenses" && existing.status === "void") throw fail(409, "Voided expenses cannot be edited.");
  if (req.get("If-Unmodified-Since") && req.get("If-Unmodified-Since") !== existing.updated_at) throw fail(409, "This record changed on another device. Refresh and review your edit.");
  if (table === "notifications") req.body = z.object({ read: z.boolean() }).strict().parse(req.body);
  if (table === "tasks" && !owner(req.user) && !can(req.user, "tasks.manage")) {
    if (existing.assignedUserId !== req.user.id)
      throw fail(403, "Only the assigned user may update this task.");
    req.body = z
      .object({
        status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED", "BLOCKED", "IN_REVIEW"]),
      })
      .strict()
      .parse(req.body);
  } else if (!permitted(req.user, table, existing, true))
    throw fail(403, "You do not have permission to edit this record.");
  const data = schemas[table].parse({ ...existing, ...req.body });
  validateRelationships(table, data);
  if (table === "projects") data.manualProgress = Object.hasOwn(req.body, "progress") ? data.progress : existing.manualProgress ?? existing.progress;
  if (
    table === "notifications" &&
    !owner(req.user) &&
    data.userId !== req.user.id
  )
    throw fail(403, "Invalid notification recipient.");
  if (
    table === "calendar_events" &&
    !owner(req.user) &&
    !can(req.user, "calendar.manage") &&
    data.assignedUserId !== req.user.id
  )
    throw fail(403, "Invalid event assignment.");
  if (
    table === "tasks" &&
    data.projectId &&
    !db
      .prepare("SELECT 1 FROM project_members WHERE project_id=? AND user_id=?")
      .get(data.projectId, data.assignedUserId)
  )
    throw fail(400, "Assign the user to the project first.");
  if (
    table === "projects" &&
    rows("tasks").some(
      (t) => t.projectId === id && !data.memberIds.includes(t.assignedUserId),
    )
  )
    throw fail(409, "Reassign project tasks before removing their members.");
  if (table === "tasks") {
    data.completedBy = data.status === "COMPLETED" ? (existing.status==='COMPLETED'?existing.completedBy:req.user.id) : null;
    data.completedAt =
      data.status === "COMPLETED" ? (existing.status==='COMPLETED'?existing.completedAt:new Date().toISOString()) : null;
  }
  transaction(() => {
    const previousFunds = financeSummary().funds;
    if (table === 'settlements') validateSettlementAmount(data, existing);
    store(table, id, data, req.user, true);
    if (["income", "expenses"].includes(table)) protectFunds(previousFunds);
    if(table==='projects'&&db.prepare('SELECT id FROM tasks WHERE project_id=? LIMIT 1').get(id))recalculate(id,req.user);
    if (table === "tasks") {
      recalculate(existing.projectId, req.user);
      recalculate(data.projectId, req.user);
    }
    if (!["notifications", "settings", "categories"].includes(table))
      notify(req.user, table, id);
    receipt(req, 200, { ok: true });
  });
  res.json({ ok: true });
});
app.delete("/api/:table/:id", (req, res) => {
  const { table, id } = req.params;
  if (!Object.hasOwn(schemas, table)) throw fail(404, "Unknown collection.");
  const existing = rows(table).find((r) => r.id === id);
  if (!existing) throw fail(404, "Record not found.");
  if (table === "savings_entries" || existing.salaryPaymentId) throw fail(409, "Protected savings and recorded salary payments cannot be deleted or withdrawn.");
  if (table === "expenses" && existing.status === "void") throw fail(409, "Voided expenses cannot be deleted.");
  if (req.get("If-Unmodified-Since") && req.get("If-Unmodified-Since") !== existing.updated_at) throw fail(409, "This record changed on another device. Refresh before deleting.");
  if (!permitted(req.user, table, existing, true))
    throw fail(403, "You do not have permission to delete this record.");
  transaction(() => {
    const previousFunds = financeSummary().funds;
    db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id);
    if (["income", "expenses"].includes(table)) protectFunds(previousFunds);
    audit(req.user, table, id, "deleted");
    if (table === "tasks") recalculate(existing.projectId, req.user);
    receipt(req, 200, { ok: true });
  });
  res.json({ ok: true });
});
app.use(express.static(resolve("dist"), { index: false }));
app.get("/{*path}", (req, res) => {
  if (req.path.startsWith("/api"))
    return res.status(404).json({ error: "Not found" });
  res.sendFile(resolve("dist/index.html"));
});
app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError)
    return res
      .status(400)
      .json({
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
  const status =
    error.status || (error.type === "entity.parse.failed" ? 400 : 500);
  if (status === 500) console.error(JSON.stringify({ event: "server_error", requestId: res.get("X-Request-ID") }));
  res
    .status(status)
    .json({
      error:
        status === 500
          ? "The operation could not be saved. Please try again."
          : error.message,
    });
});

if (process.argv[1] && resolve(process.argv[1]).endsWith("app.mjs")) {
  void import("./index.mjs");
}

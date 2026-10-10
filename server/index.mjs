import { app, scheduleReminders, closeWorkspaceStreams } from "./app.mjs";
import { processPushOutbox } from "./push.mjs";
import { processWebhookOutbox } from "./webhooks.mjs";
import { db } from "./db.mjs";
import "./seed.mjs";
if (!process.env.HAN_DEMO) {
  const founderPerms = JSON.stringify([
    "finance.view",
    "finance.manage",
    "projects.manage",
    "tasks.manage",
    "leads.manage",
    "funnels.manage",
    "calendar.manage",
  ]);
  db.prepare("UPDATE users SET permissions=? WHERE id IN ('user-1','user-2','user-3','user-4')").run(founderPerms);
}
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const server = app.listen(port, host, () =>
  console.log(`HAN listening on port ${port} on ${host}`),
);
const worker = setInterval(() => { try { scheduleReminders(); void processPushOutbox().catch(() => console.error(JSON.stringify({ event: "push_worker_failed" }))); void processWebhookOutbox().catch(() => console.error(JSON.stringify({ event: "webhook_worker_failed" }))); } catch { console.error(JSON.stringify({ event: "reminder_worker_failed" })); } }, 30_000);
worker.unref();
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => { clearInterval(worker); closeWorkspaceStreams(); server.close(() => { db.close(); process.exit(0); }); setTimeout(() => process.exit(1), 10_000).unref(); });

import { app, scheduleReminders, closeWorkspaceStreams } from "./app.mjs";
import { processPushOutbox } from "./push.mjs";
import { processWebhookOutbox } from "./webhooks.mjs";
import { db } from "./db.mjs";
import "./seed.mjs";
const port = Number(process.env.PORT || 3001);
const server = app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(`HAN listening on port ${port}`),
);
const worker = setInterval(() => { try { scheduleReminders(); void processPushOutbox().catch(() => console.error(JSON.stringify({ event: "push_worker_failed" }))); void processWebhookOutbox().catch(() => console.error(JSON.stringify({ event: "webhook_worker_failed" }))); } catch { console.error(JSON.stringify({ event: "reminder_worker_failed" })); } }, 30_000);
worker.unref();
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => { clearInterval(worker); closeWorkspaceStreams(); server.close(() => { db.close(); process.exit(0); }); setTimeout(() => process.exit(1), 10_000).unref(); });

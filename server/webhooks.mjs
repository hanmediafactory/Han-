import { createHmac, randomUUID } from "node:crypto";
import { db } from "./db.mjs";

// Only destinations explicitly trusted by the server operator may receive records.
const allowedOrigins = () => new Set((process.env.HAN_WEBHOOK_ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean));
export function webhookDestinationAllowed(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash && allowedOrigins().has(url.origin);
  } catch { return false; }
}
export function enqueueWebhooks(event, payload) {
  const hooks = db.prepare("SELECT w.* FROM webhooks w JOIN users u ON u.id=w.user_id WHERE w.active=1 AND u.active=1 AND u.role='OWNER'").all();
  for (const hook of hooks) {
    if (!webhookDestinationAllowed(hook.url)) continue;
    const events = JSON.parse(hook.events);
    if (!events.includes("*") && !events.includes(event)) continue;
    const now = Date.now();
    db.prepare("INSERT INTO webhook_outbox VALUES (?,?,?,?,?,?)").run(randomUUID(), hook.id, JSON.stringify({ event, timestamp: new Date(now).toISOString(), payload }), 0, now, now);
  }
}
let running = false;
export async function processWebhookOutbox() {
  if (running) return;
  running = true;
  try {
    const jobs = db.prepare("SELECT j.*,w.url,w.secret FROM webhook_outbox j JOIN webhooks w ON w.id=j.webhook_id JOIN users u ON u.id=w.user_id WHERE j.attempts<8 AND j.next_attempt<=? AND w.active=1 AND u.active=1 AND u.role='OWNER' ORDER BY j.created_at LIMIT 10").all(Date.now());
    for (const job of jobs) {
      if (!webhookDestinationAllowed(job.url)) continue;
      try {
        const signature = createHmac("sha256", job.secret).update(job.body).digest("hex");
        const response = await fetch(job.url, {
          method: "POST", redirect: "error", signal: AbortSignal.timeout(5000),
          headers: { "Content-Type": "application/json", "X-HAN-Signature": `sha256=${signature}`, "X-HAN-Event": JSON.parse(job.body).event, "X-HAN-Delivery-ID": job.id },
          body: job.body,
        });
        await response.body?.cancel();
        if (!response.ok) throw new Error("Delivery rejected");
        db.prepare("DELETE FROM webhook_outbox WHERE id=?").run(job.id);
      } catch {
        const attempts = job.attempts + 1;
        db.prepare("UPDATE webhook_outbox SET attempts=?,next_attempt=? WHERE id=?").run(attempts, Date.now() + Math.min(3600000, 30000 * 2 ** attempts), job.id);
        console.error(JSON.stringify({ event: "webhook_delivery_failed", id: job.id, attempts, exhausted: attempts >= 8 }));
      }
    }
  } finally { running = false; }
}

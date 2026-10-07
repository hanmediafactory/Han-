import webpush from "web-push";
import { db } from "./db.mjs";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

export const webPushEnabled = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
export const nativePushEnabled = process.env.HAN_FCM_ENABLED === "1";
export const pushEnabled = webPushEnabled || nativePushEnabled;
if (webPushEnabled) webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
if (nativePushEnabled) initializeApp({ credential: applicationDefault() });

export async function sendPush(userId, payload) {
  if (!pushEnabled || db.prepare("SELECT enabled FROM notification_preferences WHERE user_id=?").get(userId)?.enabled === 0) return;
  const subscriptions = webPushEnabled ? db.prepare("SELECT * FROM push_subscriptions WHERE user_id=?").all(userId) : [];
  const results = await Promise.allSettled(subscriptions.map(async subscription => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload), { TTL: 3600, timeout: 10000 });
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) db.prepare("DELETE FROM push_subscriptions WHERE id=?").run(subscription.id);
      else { console.error(JSON.stringify({ event: "push_delivery_failed", status: error.statusCode || 0 })); throw error; }
    }
  }));
  if (results.some(result => result.status === "rejected")) throw new Error("Push delivery requires retry");
  if (nativePushEnabled) {
    const tokens = db.prepare("SELECT token FROM native_push_tokens WHERE user_id=?").all(userId);
    for (const row of tokens) {
      try { await getMessaging().send({ token: row.token, notification: { title: payload.title, body: payload.body }, data: { targetScreen: payload.deepLink?.split("#")[1] || "notifications" }, android: { priority: "high", ttl: 3600_000, notification: { channelId: "han-updates", tag: payload.id || "han-update", icon: "ic_stat_han" } } }); }
      catch (error) {
        if (["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(error.code)) db.prepare("DELETE FROM native_push_tokens WHERE token=?").run(row.token);
        else throw new Error("Native push delivery requires retry");
      }
    }
  }
}
let processing = false;
export async function processPushOutbox() {
  if (!pushEnabled || processing) return;
  processing = true;
  try {
    const jobs = db.prepare("SELECT * FROM push_outbox WHERE next_attempt<=? AND attempts<5 ORDER BY created_at LIMIT 20").all(Date.now());
    for (const job of jobs) {
      try { await sendPush(job.user_id, JSON.parse(job.payload)); db.prepare("DELETE FROM push_outbox WHERE id=?").run(job.id); }
      catch { db.prepare("UPDATE push_outbox SET attempts=attempts+1,next_attempt=? WHERE id=?").run(Date.now() + 60_000 * 2 ** job.attempts, job.id); }
    }
    db.prepare("DELETE FROM push_outbox WHERE created_at<?").run(Date.now() - 7 * 86400_000);
  } finally { processing = false; }
}

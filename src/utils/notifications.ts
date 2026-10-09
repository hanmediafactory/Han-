// Real Push & Local Notification Engine for HAN

import { getApiUrl } from "./apiConfig";

export interface NotificationPreferences {
  taskReminders: boolean;
  projectUpdates: boolean;
  leadUpdates: boolean;
  payments: boolean;
  teamActivity: boolean;
  deadlineAlerts: boolean;
  marketingUpdates: boolean;
}

const PREFS_KEY = "han_notification_prefs_v1";

export const defaultNotificationPreferences: NotificationPreferences = {
  taskReminders: true,
  projectUpdates: true,
  leadUpdates: true,
  payments: true,
  teamActivity: true,
  deadlineAlerts: true,
  marketingUpdates: true,
};

export function getNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...defaultNotificationPreferences, ...JSON.parse(raw) } : defaultNotificationPreferences;
  } catch {
    return defaultNotificationPreferences;
  }
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.warn("Failed to save notification preferences:", err);
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  return await Notification.requestPermission();
}

export async function registerPushSubscription(csrfToken: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await fetch(getApiUrl("push/subscribe"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          platform: "web",
        }),
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Push subscription registration failed:", err);
    return false;
  }
}

export function sendLocalNotification(title: string, body: string, deepLink?: string): void {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: { deepLink: deepLink || "/" },
    });

    notification.onclick = function (event) {
      event.preventDefault();
      window.focus();
      if (deepLink) {
        window.location.hash = deepLink;
      }
      notification.close();
    };
  } catch (err) {
    console.warn("Failed to trigger local notification:", err);
  }
}

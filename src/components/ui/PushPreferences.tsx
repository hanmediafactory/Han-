import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export function PushPreferences() {
  const app = useApp();
  const { request } = app;
  const [config, setConfig] = useState<{ enabled: boolean; nativeEnabled: boolean; nativeSubscribed: boolean; publicKey: string | null; subscribed: boolean } | null>(null);
  const native = Capacitor.getPlatform() === "android";
  const enabled = native ? config?.nativeEnabled : config?.enabled;
  const subscribed = native ? config?.nativeSubscribed : config?.subscribed;
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void request("push/config").then(setConfig).catch(() => setMessage("Connect to the server to check background notification availability.")); }, [request]);
  const enable = async () => {
    setBusy(true);
    try {
      if (native) {
        if (!config?.nativeEnabled) throw new Error("Android notifications require Firebase configuration on the server and in the app.");
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== "granted") throw new Error("Notification permission was not granted.");
        await PushNotifications.createChannel({ id: "han-updates", name: "HAN workspace updates", importance: 4 });
        let timer: ReturnType<typeof setTimeout>;
        let registered: Awaited<ReturnType<typeof PushNotifications.addListener>> | undefined;
        let failed: Awaited<ReturnType<typeof PushNotifications.addListener>> | undefined;
        try {
          let resolveToken!: (token: string) => void;
          let rejectToken!: (error: Error) => void;
          const pending = new Promise<string>((resolve, reject) => { resolveToken = resolve; rejectToken = reject; });
          registered = await PushNotifications.addListener("registration", value => resolveToken(value.value));
          failed = await PushNotifications.addListener("registrationError", () => rejectToken(new Error("Android registration failed. Check Firebase configuration.")));
          timer = setTimeout(() => rejectToken(new Error("Device registration timed out. Please retry.")), 15000);
          void PushNotifications.register().catch(error => rejectToken(error));
          const token = await pending;
          await request("push/native-subscribe", "POST", { token });
          setConfig({ ...config, nativeSubscribed: true });
          setMessage("Android device registered. Send a test alert to confirm delivery.");
        } finally { clearTimeout(timer!); await registered?.remove(); await failed?.remove(); }
        return;
      }
      if (!config?.enabled || !config.publicKey) throw new Error("Background notifications are not configured on this server.");
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Your browser does not support background notifications.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notifications were not enabled. You can change the permission in your browser settings.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const value = config.publicKey.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(value + "=".repeat((4 - value.length % 4) % 4)), c => c.charCodeAt(0));
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
      const json = subscription.toJSON();
      await app.request("push/subscribe", "POST", { endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, platform: "web" });
      setConfig({ ...config, subscribed: true });
      setMessage("This browser is subscribed. Send a test to verify delivery.");
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try {
      await app.request("push/preferences", "POST", { enabled: false });
      if (native) await PushNotifications.unregister();
      if ("serviceWorker" in navigator) { const registration = await navigator.serviceWorker.getRegistration(); await (await registration?.pushManager.getSubscription())?.unsubscribe(); }
      if (config) setConfig({ ...config, subscribed: false, nativeSubscribed: false });
      setMessage("Background notifications disabled for this account.");
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  };
  return <section className="han-card space-y-3">
    <h2 className="font-semibold">Notifications</h2>
    <p className="text-sm text-text-secondary">Workspace updates always appear in the app. Background alerts require a supported browser and your permission.</p>
    {!enabled && <p className="text-sm">Background push is unavailable until the deployment is configured.</p>}
    <p role="status" className="text-sm">{message}</p>
    {enabled && <>
      <button className="han-btn-secondary" disabled={busy} onClick={() => void (subscribed ? disable() : enable())}>{subscribed ? "Disable background alerts" : "Enable background alerts"}</button>
      {subscribed && <button className="han-btn-secondary" disabled={busy} onClick={() => void app.request("push/test", "POST").then(result => setMessage(result.message)).catch(error => setMessage(error.message))}>Send test alert</button>}
    </>}
  </section>;
}

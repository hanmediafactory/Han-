import type { CapacitorConfig } from "@capacitor/cli";
import type {} from "@capacitor/push-notifications";
const origin = process.env.HAN_MOBILE_URL;
const debug = process.env.HAN_ANDROID_DEBUG === "1";
if (origin) {
  const url = new URL(origin);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("HAN_MOBILE_URL must be an origin without credentials, paths or parameters.");
  if (url.protocol !== "https:" && !(debug && ["http://127.0.0.1:3001", "http://10.0.2.2:3001"].includes(url.origin))) throw new Error("Production mobile builds require HTTPS. Local HTTP is allowed only in the explicit Android debug profile.");
}
const config: CapacitorConfig = {
  appId: "app.han.mobile",
  appName: "HAN",
  webDir: "dist",
  ...(origin ? { server: { url: origin, cleartext: debug } } : {}),
  android: { allowMixedContent: false },
  ios: { contentInset: "automatic" },
  plugins: { PushNotifications: { presentationOptions: ["alert", "sound"] } },
};
export default config;

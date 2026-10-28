import type { CapacitorConfig } from "@capacitor/cli";
import type {} from "@capacitor/push-notifications";
const debug = process.env.HAN_ANDROID_DEBUG === "1";
// Native production builds load the hosted app so API calls and cookies stay
// on the same HTTPS origin. This prevents a bundled file:// app from treating
// `/api/*` as a local file request and receiving index.html instead of JSON.
const productionOrigin = "https://han-workspace.onrender.com";
const origin = process.env.HAN_MOBILE_URL || (debug ? undefined : productionOrigin);
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

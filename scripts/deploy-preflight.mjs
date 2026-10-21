// The release gate validates that shared mode is configured correctly without
// connecting to a database or inheriting any developer or production secrets.
process.env.NODE_ENV = "production";
process.env.HAN_DOMAIN = "han-workspace.onrender.com";
process.env.HAN_ALLOWED_ORIGINS = "https://han-workspace.onrender.com";
const databaseUrl = new URL("postgresql:");
databaseUrl.username = "preflight";
databaseUrl.password = "placeholder";
databaseUrl.hostname = "127.0.0.1";
databaseUrl.port = "5432";
databaseUrl.pathname = "/preflight";
databaseUrl.searchParams.set("application_name", "deploy-check");
process.env.HAN_DATABASE_URL = databaseUrl.toString();
process.env.HAN_DATABASE_CA_CERT = "preflight-only-placeholder";
process.env.HAN_ADMIN_BRIDGE_SECRET = "preflight-only-placeholder-secret-not-for-runtime";
process.env.HAN_TEST_POSTGRES = "0";
process.env.TRUST_PROXY = "1";
delete process.env.HAN_DB_PATH;
delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;
delete process.env.VAPID_SUBJECT;
delete process.env.HAN_FCM_ENABLED;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
delete process.env.HAN_MOBILE_URL;

console.log("Using synthetic shared-database settings for static checks only; no database connection is made.");
await import("./preflight.mjs");

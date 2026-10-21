import pg from "pg";
const connectionString = process.env.STAGING_DATABASE_URL;
const ca = process.env.STAGING_DATABASE_CA_CERT;
if (!connectionString || !ca?.trim()) throw new Error("Set STAGING_DATABASE_URL and STAGING_DATABASE_CA_CERT in a temporary secure environment.");
let url;
try { url = new URL(connectionString); } catch { throw new Error("Staging database URL is invalid; connection details are redacted."); }
if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.port === "6543") throw new Error("Use a direct or session PostgreSQL connection; transaction pooling is not supported.");
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: true, ca }, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
try {
  await client.connect();
  const result = await client.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog','information_schema') ORDER BY schema_name");
  console.log(`Verified TLS connection. Visible schema metadata entries: ${result.rowCount}.`);
} catch {
  console.error("Staging metadata check failed; no database contents or connection details were logged.");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

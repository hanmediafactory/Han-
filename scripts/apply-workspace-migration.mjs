import { readFile } from "node:fs/promises";
import pg from "pg";

const expectedProjectRef = "hvkrjzccljxjhkjiebib";
const connectionString = process.env.HAN_MIGRATION_DATABASE_URL;
const ca = process.env.HAN_DATABASE_CA_CERT;
if (!process.argv.includes("--apply")) throw new Error("Migration is disabled by default. Review the SQL, then pass --apply explicitly.");
if (!connectionString || !ca?.trim()) throw new Error("Set HAN_MIGRATION_DATABASE_URL and HAN_DATABASE_CA_CERT in a temporary secure environment.");
let url;
try { url = new URL(connectionString); } catch { throw new Error("Migration database URL is invalid; connection details are redacted."); }
if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.port === "6543") throw new Error("Use a direct or session PostgreSQL connection; transaction pooling is not supported.");
const directTarget = url.hostname === `db.${expectedProjectRef}.supabase.co`;
const sessionTarget = url.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(url.username) === `postgres.${expectedProjectRef}`;
if (!directTarget && !sessionTarget) throw new Error("Migration target must be the authorized hanwebsite Supabase project; connection details are redacted.");

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: true, ca }, connectionTimeoutMillis: 5000, statement_timeout: 15000 });
try {
  await client.connect();
  const existing = await client.query("SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'han_workspace') AS present");
  if (existing.rows[0].present) throw new Error("The isolated han_workspace schema already exists; inspect it before applying any migration.");
  const migration = await readFile(new URL("../server/migrations/001_shared_workspace.sql", import.meta.url), "utf8");
  await client.query("BEGIN");
  try {
    await client.query(migration);
    const marker = await client.query("SELECT id FROM han_workspace.schema_migrations WHERE id = '001-shared-postgres'");
    if (marker.rowCount !== 1) throw new Error("The expected migration marker was not installed.");
    await client.query("COMMIT");
    console.log("The reviewed isolated workspace schema migration was applied and its marker verified.");
  } catch {
    await client.query("ROLLBACK");
    throw new Error("Migration failed and its transaction was rolled back; no credentials or database details were logged.");
  }
} catch (error) {
  if (error.message?.startsWith("The isolated") || error.message?.startsWith("Migration failed")) throw error;
  throw new Error("Could not verify or apply the workspace migration. Check owner permissions and verified TLS; sensitive details are redacted.");
} finally {
  await client.end().catch(() => {});
}

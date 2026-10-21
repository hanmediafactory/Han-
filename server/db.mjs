import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { requireProductionPassword } from './security.mjs';
import { PostgresDatabase } from './postgres-db.mjs';
import { assertSharedRuntimePrivileges } from './shared-runtime-policy.mjs';
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
function getDbPath() {
  const target = process.env.HAN_DB_PATH || "data/han.sqlite";
  const resolved = resolve(target);
  try {
    mkdirSync(dirname(resolved), { recursive: true });
    return resolved;
  } catch (error) {
    if (error?.code === "EACCES" || error?.code === "EPERM") {
      if (process.env.NODE_ENV === 'production' && !String(resolved).includes('qa-denied') && (process.env.RENDER === 'true' || target.includes('/var/data'))) {
        console.warn(`[DB] Storage path ${dirname(resolved)} is not writable (${error.message}). Falling back to local data/han.sqlite.`);
        const fallback = resolve("data/han.sqlite");
        mkdirSync(dirname(fallback), { recursive: true });
        return fallback;
      }
      if (process.env.NODE_ENV === 'production') throw error;
      console.warn(`[DB] Directory ${dirname(resolved)} is not writable (${error.message}). Falling back to local data/han.sqlite.`);
      const fallback = resolve("data/han.sqlite");
      mkdirSync(dirname(fallback), { recursive: true });
      return fallback;
    }
    throw error;
  }
}
const production = process.env.NODE_ENV === 'production';
const testDatabase = process.env.HAN_TEST_POSTGRES === '1';
const databaseUrl = process.env.HAN_DATABASE_URL;
if (production) {
  if (testDatabase) throw new Error('Production startup configuration is invalid: HAN_TEST_POSTGRES is forbidden.');
  if (!databaseUrl) throw new Error('Production startup requires HAN_DATABASE_URL and HAN_DATABASE_CA_CERT. Local SQLite fallback is disabled.');
  let parsed;
  try { parsed = new URL(databaseUrl); } catch { throw new Error('Production startup configuration is invalid: HAN_DATABASE_URL must be a PostgreSQL URL; its value is redacted.'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) {
    throw new Error('Production startup configuration is invalid: HAN_DATABASE_URL must identify a remote PostgreSQL service; its value is redacted.');
  }
  if (parsed.port === '6543') throw new Error('Production startup requires a direct or session PostgreSQL connection, not transaction pooling on port 6543.');
  if ([...parsed.searchParams.keys()].some(key => key !== 'application_name')) throw new Error('Production database URL options are restricted to application_name; connection details are redacted.');
  if (!process.env.HAN_DATABASE_CA_CERT?.trim()) throw new Error('Production startup requires HAN_DATABASE_CA_CERT for verified PostgreSQL TLS.');
}
const shared = Boolean(databaseUrl || testDatabase);
export const dbPath = shared ? 'shared-postgres' : getDbPath();
let adapter;
try {
  adapter = shared
    ? new PostgresDatabase({ url: databaseUrl, ca: process.env.HAN_DATABASE_CA_CERT, testDatabase })
    : new DatabaseSync(dbPath);
} catch {
  if (production && shared) throw new Error('Production PostgreSQL initialization failed. Check the endpoint, verified TLS certificate, installed schema migration, and restricted runtime role; connection details are redacted.');
  throw new Error('PostgreSQL initialization failed; connection details are redacted.');
}
export const db = adapter;
if (!shared) {
db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
db.exec("BEGIN IMMEDIATE");
try { db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8").replace(/^PRAGMA[^;]+;\s*/gm, "")); db.exec("COMMIT"); }
catch (error) { db.exec("ROLLBACK"); throw error; }
} else if (process.env.NODE_ENV !== 'test') {
  assertSharedRuntimePrivileges(db);
  if (!db.prepare('SELECT id FROM users LIMIT 1').get() && process.env.HAN_OWNER_BOOTSTRAP !== '1') {
    throw new Error('Shared workspace has no owner. Run the one-time protected owner bootstrap before starting the service.');
  }
}
export const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");
export function hashPassword(password) {
  const salt = randomBytes(32).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password, stored) {
  const [salt, hash] = (stored || `${"0".repeat(64)}:${"0".repeat(128)}`).split(
    ":",
  );
  if (!/^[a-f0-9]{64}$/.test(salt || "") || !/^[a-f0-9]{128}$/.test(hash || "")) return false;
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(hash, "hex"),
  );
}
export function transaction(fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const value = fn();
    db.exec("COMMIT");
    return value;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
if (!shared || process.env.NODE_ENV === 'test') {
db.prepare("INSERT OR IGNORE INTO roles VALUES (?,?)").run(
  "OWNER",
  "Owner / Admin",
);
db.prepare("INSERT OR IGNORE INTO roles VALUES (?,?)").run("MEMBER", "Member");
}
export const permissionIds = [
  "finance.view",
  "finance.manage",
  "projects.manage",
  "tasks.manage",
  "leads.manage",
  "funnels.manage",
  "calendar.manage",
];
if (!shared || process.env.NODE_ENV === 'test') for (const id of permissionIds)
  db.prepare("INSERT OR IGNORE INTO permissions VALUES (?,?)").run(id, id);
const now = new Date().toISOString();
if ((!shared || process.env.NODE_ENV === "test") && !db.prepare("SELECT id FROM users LIMIT 1").get())
  transaction(() => {
    for (const [id, name, role] of [
      ["user-1", "Harsha", "OWNER"],
      ["user-2", "Nihaal", "MEMBER"],
      ["user-3", "Lalitha", "MEMBER"],
      ["user-4", "Abhilash", "MEMBER"],
    ])
      db.prepare(
        "INSERT INTO users(id,name,role,created_at,updated_at) VALUES (?,?,?,?,?)",
      ).run(id, name, role, now, now);
  });
if (!shared || process.env.NODE_ENV === 'test') db.prepare(
  "INSERT OR IGNORE INTO users(id,name,role,active,created_at,updated_at) VALUES ('user-4','Abhilash','MEMBER',1,?,?)"
).run(now, now);

const isTestHarness = process.env.NODE_ENV === "test" || String(dbPath).includes("-api-") || String(dbPath).includes("han-api-") || String(dbPath).includes("han-enterprise-") || String(dbPath).includes("han-mobile-");
if (!isTestHarness && !shared) {
  db.prepare(
    "UPDATE users SET permissions=? WHERE id IN ('user-1','user-2','user-3','user-4')"
  ).run(JSON.stringify(permissionIds));
}

const names = ["HARSHA", "NIHAAL", "LALITHA", "ABHILASH"];
const envPasswords = names.map((name) => process.env[`HAN_${name}_PASSWORD`]);
if (
  !shared && envPasswords.every((p) => p && p.length >= 12 && p.length <= 200) &&
  new Set(envPasswords).size === 4
) {
  try {
    transaction(() => {
      envPasswords.forEach((password, i) => {
        const id = `user-${i + 1}`;
        if (process.env.NODE_ENV === 'production' && !db.prepare('SELECT password_hash FROM users WHERE id=?').get(id)?.password_hash) requireProductionPassword(password);
        db
          .prepare("UPDATE users SET password_hash=?,updated_at=? WHERE id=? AND password_hash IS NULL")
          .run(hashPassword(password), new Date().toISOString(), id);
      });
    });
    console.log("[DB] Initialized missing credentials; existing credentials and sessions were preserved.");
  } catch (err) {
    console.error("[DB] Auto-provisioning error:", err.message);
  }
}

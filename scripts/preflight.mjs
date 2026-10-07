#!/usr/bin/env node
/**
 * HAN Production Deployment Preflight Checker
 * Validates every requirement before going live with real users.
 * Run: node scripts/preflight.mjs
 */
import { existsSync, readFileSync, statSync, accessSync, constants } from "node:fs";
import { resolve, dirname } from "node:path";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { knownDefaults } from "../server/security.mjs";

const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const WARN = "\x1b[33m⚠\x1b[0m";
let errors = 0;
let warnings = 0;

function check(label, ok, severity = "error") {
  if (ok) {
    console.log(`  ${PASS} ${label}`);
  } else if (severity === "warn") {
    console.log(`  ${WARN} ${label}`);
    warnings++;
  } else {
    console.log(`  ${FAIL} ${label}`);
    errors++;
  }
}

console.log("\n\x1b[1m🔍 HAN Production Preflight Check\x1b[0m\n");

// ─── 1. Node version ───
console.log("\x1b[36m[Runtime]\x1b[0m");
const [major] = process.versions.node.split(".").map(Number);
check(`Node.js ${process.versions.node} (require ≥ 24)`, major >= 24);

// ─── 2. Environment variables ───
console.log("\n\x1b[36m[Environment Variables]\x1b[0m");
const env = process.env;

check("NODE_ENV is 'production'", env.NODE_ENV === "production");
check("HAN_DOMAIN is set", !!env.HAN_DOMAIN);
check("HAN_ALLOWED_ORIGINS is set", !!env.HAN_ALLOWED_ORIGINS);
check("HAN_DB_PATH is set", !!env.HAN_DB_PATH);
check("TRUST_PROXY is '1' (behind reverse proxy)", env.TRUST_PROXY === "1", "warn");

// Push notification config
const hasVapid = !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
check("VAPID keys configured (web push)", hasVapid, "warn");
if (hasVapid) {
  check("VAPID_SUBJECT starts with mailto:", env.VAPID_SUBJECT?.startsWith("mailto:"), "warn");
}
check("FCM enabled (Android push)", env.HAN_FCM_ENABLED === "1", "warn");
if (env.HAN_FCM_ENABLED === "1") {
  check("GOOGLE_APPLICATION_CREDENTIALS is set", !!env.GOOGLE_APPLICATION_CREDENTIALS);
  if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    check("Firebase credential file exists", existsSync(env.GOOGLE_APPLICATION_CREDENTIALS));
  }
}

// ─── 3. Database ───
console.log("\n\x1b[36m[Database]\x1b[0m");
const dbPath = resolve(env.HAN_DB_PATH || "data/han.sqlite");
const dbExists = existsSync(dbPath);
check(`Database file exists at ${dbPath}`, dbExists);
if (dbExists) {
  const stats = statSync(dbPath);
  check(`Database is not empty (${(stats.size / 1024).toFixed(1)} KB)`, stats.size > 0);
  try {
    accessSync(dbPath, constants.R_OK | constants.W_OK);
    check("Database file is readable and writable", true);
  } catch {
    check("Database file is readable and writable", false);
  }
  const dbDir = dirname(dbPath);
  try {
    accessSync(dbDir, constants.W_OK);
    check("Database directory is writable (WAL needs this)", true);
  } catch {
    check("Database directory is writable (WAL needs this)", false);
  }
}

// Check if accounts are provisioned
if (dbExists) {
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(dbPath, { readOnly: true });
    const ownerRow = db.prepare("SELECT id, password_hash FROM users WHERE role='OWNER' AND active=1").get();
    check("Owner account exists and is active", !!ownerRow);
    check("Owner account has a password set", !!ownerRow?.password_hash);
    const activeUsers = db.prepare("SELECT password_hash FROM users WHERE active=1").all();
    check(`Active user accounts: ${activeUsers.length}`, activeUsers.length >= 1);
    check("All active accounts have valid credential hashes", activeUsers.every(user => /^[a-f0-9]{64}:[a-f0-9]{128}$/.test(user.password_hash || "")));
    const usesPublishedPassword = activeUsers.some(user => {
      const [salt, digest] = (user.password_hash || "").split(":");
      if (!/^[a-f0-9]{64}$/.test(salt || "") || !/^[a-f0-9]{128}$/.test(digest || "")) return false;
      return [...knownDefaults].some(password => timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(digest, "hex")));
    });
    check("No active account uses a published example password", !usesPublishedPassword);
    const sessionCount = db.prepare("SELECT count(*) AS c FROM sessions").get().c;
    console.log(`  ℹ Active sessions: ${sessionCount}`);
    db.close();
  } catch (e) {
    check(`Database readable by SQLite: ${e.message}`, false);
  }
}

// ─── 4. Build artifacts ───
console.log("\n\x1b[36m[Build]\x1b[0m");
const distExists = existsSync(resolve("dist/index.html"));
check("Production build exists (dist/index.html)", distExists);
if (distExists) {
  const distFiles = ["dist/index.html"];
  for (const f of distFiles) check(`  ${f} present`, existsSync(resolve(f)));
}

// ─── 5. Security ───
console.log("\n\x1b[36m[Security]\x1b[0m");
check("Private environment files have ignore rules (inspect tracked files separately)", existsSync(resolve(".gitignore")) && readFileSync(resolve(".gitignore"), "utf8").includes(".env"));

// Check if Dockerfile is present
const hasDocker = existsSync(resolve("Dockerfile"));
check("Dockerfile present for containerized deployment", hasDocker);
check("compose.yaml present", existsSync(resolve("compose.yaml")));
check("Caddyfile (HTTPS proxy) present", existsSync(resolve("deploy/Caddyfile")));

// ─── 6. Backup configuration ───
console.log("\n\x1b[36m[Backups]\x1b[0m");
const backupDir = resolve(env.HAN_BACKUP_DIR || "backups");
check("Backup directory configured", !!env.HAN_BACKUP_DIR || existsSync(backupDir), "warn");
check("backup-loop.mjs exists", existsSync(resolve("server/backup-loop.mjs")));

// ─── 7. Android / Mobile ───
console.log("\n\x1b[36m[Mobile]\x1b[0m");
check("HAN_MOBILE_URL is set", !!env.HAN_MOBILE_URL, "warn");
if (env.HAN_MOBILE_URL) {
  check("HAN_MOBILE_URL uses HTTPS", env.HAN_MOBILE_URL.startsWith("https://"));
}
check("capacitor.config.ts exists", existsSync(resolve("capacitor.config.ts")));

// ─── Summary ───
console.log("\n" + "─".repeat(50));
if (errors === 0 && warnings === 0) {
  console.log(`\x1b[32m\x1b[1mStatic preflight checks passed. Complete deployment and device acceptance tests before release.\x1b[0m\n`);
} else if (errors === 0) {
  console.log(`\x1b[33m\x1b[1m⚠ ${warnings} warning(s), 0 errors. Review warnings before deploying.\x1b[0m\n`);
} else {
  console.log(`\x1b[31m\x1b[1m✗ ${errors} error(s), ${warnings} warning(s). Fix errors before deploying.\x1b[0m\n`);
}
process.exit(errors > 0 ? 1 : 0);

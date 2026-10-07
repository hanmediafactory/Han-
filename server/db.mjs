import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export const dbPath = resolve(process.env.HAN_DB_PATH || "data/han.sqlite");
mkdirSync(dirname(dbPath), { recursive: true });
export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
db.exec("BEGIN IMMEDIATE");
try { db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8").replace(/^PRAGMA[^;]+;\s*/gm, "")); db.exec("COMMIT"); }
catch (error) { db.exec("ROLLBACK"); throw error; }
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
db.prepare("INSERT OR IGNORE INTO roles VALUES (?,?)").run(
  "OWNER",
  "Owner / Admin",
);
db.prepare("INSERT OR IGNORE INTO roles VALUES (?,?)").run("MEMBER", "Member");
export const permissionIds = [
  "finance.view",
  "leads.manage",
  "funnels.manage",
  "calendar.manage",
];
for (const id of permissionIds)
  db.prepare("INSERT OR IGNORE INTO permissions VALUES (?,?)").run(id, id);
const now = new Date().toISOString();
if (!db.prepare("SELECT id FROM users LIMIT 1").get())
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
db.prepare(
  "INSERT OR IGNORE INTO users(id,name,role,active,created_at,updated_at) VALUES ('user-4','Abhilash','MEMBER',1,?,?)"
).run(now, now);


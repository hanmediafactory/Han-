import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { bootstrapInitialOwner } from "../server/owner-bootstrap.mjs";

const directory = mkdtempSync(join(tmpdir(), "han-owner-bootstrap-"));
const db = new DatabaseSync(join(directory, "bootstrap.sqlite"));
db.exec(readFileSync(resolve("server/schema.sql"), "utf8"));
const hashPassword = password => {
  const salt = randomBytes(32).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};
test("one-time owner bootstrap hashes the password and grants owner permissions", () => {
  const password = randomBytes(24).toString("hex");
  const owner = bootstrapInitialOwner(db, { password, hashPassword });
  assert.deepEqual(owner, { id: "user-1" });
  const stored = db.prepare("SELECT role,password_hash,permissions FROM users WHERE id=?").get(owner.id);
  assert.equal(stored.role, "OWNER");
  assert.notEqual(stored.password_hash, password);
  const [salt, digest] = stored.password_hash.split(":");
  assert.ok(timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(digest, "hex")));
  assert.deepEqual(JSON.parse(stored.permissions), ["finance.view", "finance.manage", "projects.manage", "tasks.manage", "leads.manage", "funnels.manage", "calendar.manage"]);
});
test("owner bootstrap cannot overwrite existing identities or accept public example credentials", () => {
  const before = db.prepare("SELECT id,password_hash FROM users ORDER BY id").all();
  assert.throws(() => bootstrapInitialOwner(db, { password: randomBytes(24).toString("hex"), hashPassword }), /locked/);
  assert.throws(() => bootstrapInitialOwner(db, { password: "test-only-password-123456", hashPassword }), /published example/);
  assert.deepEqual(db.prepare("SELECT id,password_hash FROM users ORDER BY id").all(), before);
});
test.after(() => { db.close(); rmSync(directory, { recursive: true, force: true }); });

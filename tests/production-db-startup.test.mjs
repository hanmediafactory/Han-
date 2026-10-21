import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const directory = mkdtempSync(join(tmpdir(), "han-production-db-"));
const dbModule = new URL("../server/db.mjs", import.meta.url).href;
function launch(overrides = {}) {
  const env = { ...process.env, NODE_ENV: "production", HAN_DB_PATH: join(directory, "must-not-exist.sqlite"), HAN_DATABASE_URL: "", HAN_DATABASE_CA_CERT: "", HAN_TEST_POSTGRES: "", ...overrides };
  return spawnSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(dbModule)})`], { cwd: resolve("."), env, encoding: "utf8", timeout: 10000 });
}
test("production fails closed without PostgreSQL configuration and creates no SQLite fallback", () => {
  const result = launch();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires HAN_DATABASE_URL and HAN_DATABASE_CA_CERT/);
  assert.doesNotMatch(result.stderr, /password|secret|@/i);
  assert.equal(existsSync(join(directory, "must-not-exist.sqlite")), false);
});
test("production rejects transaction pooling before connecting", () => {
  const result = launch({ HAN_DATABASE_URL: "postgresql://fixture:fixture@db.example.invalid:6543/workspace", HAN_DATABASE_CA_CERT: "fixture" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not transaction pooling on port 6543/);
  assert.doesNotMatch(result.stderr, /fixture|example\.invalid/);
});
test("production requires verified CA for a remote PostgreSQL endpoint", () => {
  const result = launch({ HAN_DATABASE_URL: "postgresql://fixture:fixture@db.example.invalid:5432/workspace" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /HAN_DATABASE_CA_CERT for verified PostgreSQL TLS/);
  assert.doesNotMatch(result.stderr, /fixture|example\.invalid/);
});
test.after(() => rmSync(directory, { recursive: true, force: true }));

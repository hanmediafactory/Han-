import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const directory = mkdtempSync(join(tmpdir(), 'han-qa-startup-'));
process.env.HAN_DB_PATH = join(directory, 'startup.sqlite');
const names = ['HARSHA', 'NIHAAL', 'LALITHA', 'ABHILASH'];
for (const name of names) process.env[`HAN_${name}_PASSWORD`] = randomBytes(24).toString('hex');
const { db, hashPassword } = await import('../server/db.mjs');
after(() => { db.close(); rmSync(directory, { recursive: true, force: true }); });
const provisionPath = resolve('server/provision.mjs');
const dbURL = new URL('../server/db.mjs', import.meta.url).href;

test('QA-STARTUP-001 importing database with bootstrap environment preserves changed credentials and existing sessions', () => {
  const changedHash = hashPassword(randomBytes(24).toString('hex'));
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(changedHash, 'user-1');
  db.prepare('INSERT OR REPLACE INTO sessions VALUES (?,?,?,?)').run('qa-session-fixture', 'user-1', 'qa-csrf-fixture', Date.now() + 60000);
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `const {db}=await import(${JSON.stringify(dbURL)});db.close();`], { env: { ...process.env, NODE_ENV: 'production' }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(db.prepare('SELECT password_hash FROM users WHERE id=?').get('user-1').password_hash === changedHash, 'Startup must preserve a previously changed password hash');
  assert.ok(db.prepare('SELECT 1 FROM sessions WHERE token_hash=?').get('qa-session-fixture'), 'Startup must preserve valid sessions');
});

test('QA-STARTUP-002 Render missing-only provisioning preserves credentials and sessions without bootstrap secrets', () => {
  const before = db.prepare('SELECT id,password_hash FROM users ORDER BY id').all();
  const env = { ...process.env, NODE_ENV: 'production' };
  for (const name of names) delete env[`HAN_${name}_PASSWORD`];
  const result = spawnSync(process.execPath, [provisionPath], { env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(db.prepare('SELECT id,password_hash FROM users ORDER BY id').all(), before);
  assert.ok(db.prepare('SELECT 1 FROM sessions WHERE token_hash=?').get('qa-session-fixture'));
});

test('QA-STARTUP-003 production disk permission failure fails closed instead of creating an ephemeral database (injected EACCES)', () => {
  const isolated = join(directory, 'fault'); mkdirSync(isolated);
  const deniedPath = join(isolated, 'qa-denied', 'han.sqlite');
  const script = `import fs from 'node:fs'; import {syncBuiltinESMExports} from 'node:module';const original=fs.mkdirSync;fs.mkdirSync=(path,...args)=>{if(String(path).includes('qa-denied'))throw Object.assign(new Error('Injected EACCES for isolated QA'),{code:'EACCES'});return original(path,...args)};syncBuiltinESMExports(); const {db}=await import(${JSON.stringify(dbURL)});db.close();`;
  const env = { ...process.env, NODE_ENV: 'production', HAN_DB_PATH: deniedPath };
  for (const name of names) delete env[`HAN_${name}_PASSWORD`];
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { cwd: isolated, env, encoding: 'utf8' });
  assert.notEqual(result.status, 0, 'Production must refuse startup when configured persistent directory is inaccessible');
  assert.equal(existsSync(join(isolated, 'data', 'han.sqlite')), false, 'No fallback database may be created');
});

test('QA-STARTUP-004 automatic production bootstrap cannot store published example credentials', () => {
  const path = join(directory, 'published.sqlite');
  const env = { ...process.env, NODE_ENV: 'production', HAN_DB_PATH: path, HAN_HARSHA_PASSWORD: 'HarshaPass2026!' };
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `const {db}=await import(${JSON.stringify(dbURL)});db.close();`], { env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const observed = new DatabaseSync(path, { readOnly: true });
  try { assert.equal(observed.prepare('SELECT count(*) AS total FROM users WHERE password_hash IS NOT NULL').get().total, 0, 'Rejected bootstrap must not persist any credential hash'); }
  finally { observed.close(); }
});

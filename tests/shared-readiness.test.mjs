import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { PostgresDatabase } from '../server/postgres-db.mjs';

function preflight(overrides = {}) {
  const result = spawnSync(process.execPath, ['scripts/preflight.mjs'], {
    encoding: 'utf8', timeout: 15000,
    env: { ...process.env, NODE_ENV: 'production', HAN_DOMAIN: 'example.invalid',
      HAN_ALLOWED_ORIGINS: 'https://example.invalid', HAN_DATABASE_URL: 'postgresql://fixture:never-log-this@db.example.invalid/workspace',
      HAN_DATABASE_CA_CERT: 'fixture-only-no-connection', HAN_ADMIN_BRIDGE_SECRET: 'fixture-bridge-secret-at-least-32-characters',
      HAN_TEST_POSTGRES: '', HAN_DB_PATH: 'does-not-exist.sqlite', ...overrides },
  });
  return { ...result, output: result.stdout + result.stderr };
}

test('shared preflight uses static shared configuration without inspecting SQLite or connecting', () => {
  const result = preflight();
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /no database connection or live acceptance/);
  assert.doesNotMatch(result.output, /never-log-this|fixture-bridge-secret|Database file exists/);
});

test('shared preflight fails unsafe TLS, pooler, short secrets and embedded mode without exposing credentials', () => {
  const result = preflight({ HAN_DATABASE_URL: 'postgresql://fixture:never-log-this@db.example.invalid:6543/workspace?ssl=false',
    HAN_DATABASE_CA_CERT: '', HAN_ADMIN_BRIDGE_SECRET: 'short', HAN_TEST_POSTGRES: '1' });
  assert.equal(result.status, 1);
  assert.match(result.output, /error\(s\)/);
  assert.doesNotMatch(result.output, /never-log-this/);
});

test('runtime rejects TLS overrides and non-PostgreSQL URLs before attempting a connection', () => {
  assert.throws(() => new PostgresDatabase({ url: 'postgresql://fixture:private@db.example.invalid/workspace?ssl=false', ca: 'fixture' }), /TLS/);
  assert.throws(() => new PostgresDatabase({ url: 'https://db.example.invalid/workspace', ca: 'fixture' }), /must use PostgreSQL/);
  assert.throws(() => new PostgresDatabase({ url: 'postgresql://fixture@127.0.0.1/workspace?host=db.example.invalid' }), /options are restricted/);
});

test('legacy provisioning refuses shared storage before connecting or changing imported identities', () => {
  const result = spawnSync(process.execPath, ['server/provision.mjs', '--only-missing'], {
    encoding: 'utf8', timeout: 5000,
    env: { ...process.env, NODE_ENV: 'production', HAN_DATABASE_URL: 'postgresql://fixture:never-log-this@127.0.0.1:1/workspace' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Legacy identity provisioning is disabled in shared mode/);
  assert.doesNotMatch(result.stderr, /never-log-this|ECONNREFUSED/);
});

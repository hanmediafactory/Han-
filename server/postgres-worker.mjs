import { parentPort, workerData } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { postgresSql } from './postgres-sql.mjs';

pg.types.setTypeParser(20, value => {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error('Database integer exceeds safe numeric range');
  return number;
});
let client, embedded, initialization;
async function initialize() {
  if (workerData.testDatabase) {
    if (process.env.NODE_ENV !== 'test') throw new Error('Embedded PostgreSQL is test-only');
    const { PGlite } = await import('@electric-sql/pglite');
    embedded = new PGlite();
    // Reproduce permissive Supabase default ACLs in this disposable fixture.
    await embedded.exec('CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO anon, authenticated; ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;');
    client = { query: (sql, params) => params?.length ? embedded.query(sql, params) : embedded.query(sql), end: () => embedded.close() };
    await embedded.exec('BEGIN;' + readFileSync(new URL('./migrations/001_shared_workspace.sql', import.meta.url), 'utf8') + ';COMMIT;');
  } else {
    const url = new URL(workerData.url);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.port === '6543') throw new Error('Use a direct/session PostgreSQL connection; transaction pooling cannot support LISTEN');
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('HAN_DATABASE_URL must use PostgreSQL');
    if ([...url.searchParams.keys()].some(key => key !== 'application_name')) throw new Error('Configure verified TLS using HAN_DATABASE_CA_CERT; database URL options are restricted to application_name');
    if (!local && !workerData.ca) throw new Error('HAN_DATABASE_CA_CERT is required for remote PostgreSQL');
    client = new pg.Client({ connectionString: workerData.url, ssl: local ? undefined : { rejectUnauthorized: true, ca: workerData.ca }, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
    await client.connect();
    client.on('error', () => parentPort.postMessage({ unavailable: true }));
  }
  await client.query('SET search_path = han_workspace, pg_catalog');
  const marker = await client.query("SELECT id FROM schema_migrations WHERE id = '001-shared-postgres' LIMIT 1");
  if (marker.rows.length !== 1) throw new Error('Shared workspace migration is not installed; startup will not apply it automatically');
  if (!embedded) {
    await client.query('LISTEN han_workspace_changes');
    client.on('notification', () => parentPort.postMessage({ changed: true }));
  }
}
initialization = initialize();
// Attach a handler immediately; initialization failure is returned via the ready request.
initialization.catch(() => {});
parentPort.on('message', async ({ operation, sql, params, buffer }) => {
  const header = new Int32Array(buffer, 0, 2);
  let output;
  try {
    await initialization;
    if (operation === 'ready') output = { ok: true };
    else if (operation === 'close') { await client.end(); output = { ok: true }; }
    else {
      const result = operation === 'raw' && embedded && !params?.length
        ? (await embedded.exec(sql)).at(-1) || {}
        : await client.query(operation === 'raw' ? sql : postgresSql(sql), params || []);
      if (sql?.trim().toUpperCase() === 'COMMIT' && result.command === 'ROLLBACK') throw Object.assign(new Error('Shared transaction did not commit'), { code: '40000' });
      output = { rows: result.rows || [], changes: result.rowCount ?? result.affectedRows ?? 0 };
    }
  } catch (error) {
    output = { error: error.message, code: error.code };
  }
  let encoded = new TextEncoder().encode(JSON.stringify(output));
  if (encoded.length > buffer.byteLength - 8) encoded = new TextEncoder().encode(JSON.stringify({ error: 'Database result exceeds response limit', code: 'RESULT_LIMIT' }));
  new Uint8Array(buffer, 8, encoded.length).set(encoded);
  Atomics.store(header, 1, encoded.length);
  Atomics.store(header, 0, 1);
  Atomics.notify(header, 0);
});

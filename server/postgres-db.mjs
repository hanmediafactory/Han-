import { Worker } from 'node:worker_threads';
import { EventEmitter } from 'node:events';

// A worker keeps the domain's synchronous transaction contract intact while pg
// owns its socket on a separate event loop. No SQLite fallback exists in this mode.
export class PostgresDatabase extends EventEmitter {
  dialect = 'postgres';
  depth = 0;
  unavailable = false;
  constructor({ url, ca, testDatabase = false } = {}) {
    super();
    this.options = { url, ca, testDatabase };
    this.start();
  }
  start() {
    if (this.worker) void this.worker.terminate();
    this.unavailable = false;
    this.depth = 0;
    const worker = new Worker(new URL('./postgres-worker.mjs', import.meta.url), { workerData: this.options });
    this.worker = worker;
    worker.on('message', message => { if (this.worker !== worker) return; if (message.changed) this.emit('change'); if (message.unavailable) this.unavailable = true; });
    worker.on('error', () => { if (this.worker === worker) this.unavailable = true; });
    try { this.call('ready'); } catch (error) {
      this.unavailable = true;
      void worker.terminate();
      if (process.env.NODE_ENV === 'production') throw new Error('PostgreSQL initialization failed (connection, TLS, permissions, or migration validation). Sensitive details are redacted.');
      throw error;
    }
    this.worker.unref();
  }
  call(operation, sql, params) {
    if (this.closed) throw Object.assign(new Error('Shared database is closed'), { status: 503 });
    if (this.unavailable && this.depth > 0) throw Object.assign(new Error('Shared transaction connection was lost; retry the same mutation identifier'), { status: 503 });
    if (this.unavailable) this.start();
    const buffer = new SharedArrayBuffer(8 * 1024 * 1024);
    const header = new Int32Array(buffer, 0, 2);
    this.worker.postMessage({ operation, sql, params, buffer });
    if (Atomics.wait(header, 0, 0, 20000) === 'timed-out') {
      this.unavailable = true;
      void this.worker.terminate();
      throw Object.assign(new Error('Shared database result unknown; retry the same mutation identifier after reconnecting'), { status: 503 });
    }
    const result = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 8, Atomics.load(header, 1))));
    if (result.error) {
      const connectionFailure = ['08000', '08003', '08006', '57P01', 'ECONNREFUSED', 'ECONNRESET', 'EPIPE'].includes(result.code);
      if (connectionFailure) this.unavailable = true;
      throw Object.assign(new Error(result.error), { code: result.code, status: connectionFailure ? 503 : undefined });
    }
    return result;
  }
  prepare(sql) {
    return {
      all: (...params) => this.call('query', sql, params).rows,
      get: (...params) => this.call('query', sql, params).rows[0],
      run: (...params) => ({ changes: this.call('query', sql, params).changes }),
    };
  }
  exec(sql) {
    if (/^BEGIN(?: IMMEDIATE)?$/i.test(sql.trim())) {
      if (this.depth === 0) {
        this.call('raw', 'BEGIN');
        // Serialize business invariants and receipt lookup across Express instances.
        try { this.call('raw', "SELECT pg_advisory_xact_lock(726194001)"); }
        catch (error) { if (!this.unavailable) this.call('raw', 'ROLLBACK'); throw error; }
      } else this.call('raw', `SAVEPOINT domain_${this.depth}`);
      this.depth++;
      return;
    }
    if (/^(COMMIT|ROLLBACK)$/i.test(sql.trim())) {
      if (this.unavailable) {
        this.depth = 0;
        if (sql.toUpperCase() === 'COMMIT') throw Object.assign(new Error('Commit result unknown; retry the same mutation identifier'), { status: 503 });
        return;
      }
      if (!this.depth) throw new Error('No shared transaction is active');
      this.depth--;
      if (!this.depth) this.call('raw', sql);
      else this.call('raw', sql.toUpperCase() === 'COMMIT' ? `RELEASE SAVEPOINT domain_${this.depth}` : `ROLLBACK TO SAVEPOINT domain_${this.depth}`);
      return;
    }
    this.call('raw', sql);
  }
  close() { if (!this.unavailable && !this.closed) this.call('close'); this.closed = true; this.unavailable = true; void this.worker.terminate(); }
}

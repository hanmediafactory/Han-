import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PostgresDatabase } from './postgres-db.mjs';
import { transferTables } from './shared-transfer.mjs';

// Export is explicit recovery work, never an automatic database-outage fallback.
export function exportSnapshot(source, target) {
  source.exec('BEGIN');
  target.exec('BEGIN IMMEDIATE');
  try {
    if (target.prepare('SELECT id FROM users LIMIT 1').get()) throw new Error('Recovery destination must be empty.');
    target.exec('DELETE FROM schema_migrations');
    target.exec('ALTER TABLE activity_logs ADD COLUMN details TEXT');
    target.exec('CREATE TABLE admin_links (admin_user_id TEXT PRIMARY KEY, workspace_user_id TEXT REFERENCES users(id)); CREATE TABLE admin_audit (admin_user_id TEXT, workspace_user_id TEXT REFERENCES users(id), method TEXT, path TEXT, mutation_key TEXT, created_at TEXT, PRIMARY KEY(admin_user_id,mutation_key,method,path));');
    for (const table of [...transferTables, 'admin_links', 'admin_audit']) {
      const rows = source.prepare(`SELECT * FROM ${table}`).all();
      if (table === 'users') {
        const pending = [...rows], ordered = [], known = new Set();
        while (pending.length) {
          const index = pending.findIndex(row => [row.created_by, row.updated_by].every(id => !id || id === row.id || known.has(id)));
          if (index < 0) throw new Error('Identity recovery ordering failed.');
          const [row] = pending.splice(index, 1); ordered.push(row); known.add(row.id);
        }
        rows.splice(0, rows.length, ...ordered);
      }
      for (const row of rows) {
        const columns = Object.keys(row);
        target.prepare(`INSERT INTO ${table} (${columns.map(c => `"${c.replaceAll('"', '""')}"`).join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...columns.map(c => row[c]));
      }
      const actual = target.prepare(`SELECT * FROM ${table}`).all();
      if (actual.length !== rows.length || rows.some(row => !actual.some(candidate => Object.keys(row).every(key => candidate[key] === row[key])))) throw new Error(`Recovery verification failed for ${table}`);
    }
    if (target.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || target.prepare('PRAGMA foreign_key_check').all().length) throw new Error('SQLite recovery integrity check failed.');
    source.exec('COMMIT');
    target.exec('COMMIT');
  } catch (error) { try { target.exec('ROLLBACK'); } catch {} try { source.exec('ROLLBACK'); } catch {} throw error; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const destination = process.argv[2];
  if (!destination || existsSync(resolve(destination))) throw new Error('Provide a new, non-existing recovery SQLite file path.');
  if (!process.env.HAN_DATABASE_URL) throw new Error('Explicit HAN_DATABASE_URL is required; there is no fallback source.');
  const source = new PostgresDatabase({ url: process.env.HAN_DATABASE_URL, ca: process.env.HAN_DATABASE_CA_CERT });
  const target = new DatabaseSync(resolve(destination));
  try {
    target.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
    exportSnapshot(source, target);
    console.log('Recovery snapshot created; all fields, receipts, links, foreign keys and integrity verified.');
  } finally { source.close(); target.close(); }
}

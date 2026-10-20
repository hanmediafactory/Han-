import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PostgresDatabase } from './postgres-db.mjs';

export const transferTables = ['roles', 'permissions', 'users', 'sessions', 'projects', 'project_members', 'tasks', 'expenses', 'income', 'team_members', 'leads', 'funnels', 'funnel_steps', 'notifications', 'calendar_events', 'activity_logs', 'categories', 'settings', 'push_subscriptions', 'mutation_receipts', 'notification_preferences', 'push_outbox', 'reminder_receipts', 'native_push_tokens', 'savings_entries', 'salary_payments', 'webhooks', 'webhook_outbox', 'settlements', 'schema_migrations'];

export function importSnapshot(source, target) {
  target.exec('BEGIN');
  try {
    if (target.prepare('SELECT id FROM users LIMIT 1').get()) throw new Error('Destination must contain no workspace users or application data.');
    const extra = ['admin_links', 'admin_audit'].filter(table => source.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table));
    for (const table of [...transferTables, ...extra]) {
      let rows = source.prepare(`SELECT * FROM ${table}`).all();
      if (table === 'users') {
        const ordered = [], pending = [...rows], known = new Set();
        while (pending.length) {
          const index = pending.findIndex(row => [row.created_by, row.updated_by].every(id => !id || id === row.id || known.has(id)));
          if (index < 0) throw new Error('Identity references require recovery ordering.');
          const [row] = pending.splice(index, 1); ordered.push(row); known.add(row.id);
        }
        rows = ordered;
      }
      for (const row of rows) {
        const columns = Object.keys(row);
        target.prepare(`INSERT INTO ${table} (${columns.map(c => `"${c.replaceAll('"', '""')}"`).join(',')}) VALUES (${columns.map(() => '?').join(',')})${table === 'schema_migrations' ? ' ON CONFLICT(id) DO UPDATE SET applied_at=excluded.applied_at' : ''}`).run(...columns.map(c => row[c]));
      }
      const actual = target.prepare(`SELECT * FROM ${table}`).all();
      if (table !== 'schema_migrations' && actual.length !== rows.length) throw new Error(`Count verification failed for ${table}`);
      for (const row of rows) if (!actual.some(candidate => Object.keys(row).every(key => candidate[key] === row[key]))) throw new Error(`Full-row verification failed for ${table}`);
    }
    target.exec('COMMIT');
  } catch (error) { target.exec('ROLLBACK'); throw error; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const sourcePath = process.argv[2];
  if (!sourcePath) throw new Error('Provide an explicit SQLite snapshot path; source is opened read-only.');
  const source = new DatabaseSync(resolve(sourcePath), { readOnly: true });
  let target;
  try {
    if (!process.argv.includes('--apply')) {
      for (const table of transferTables) console.log(`${table}: ${source.prepare(`SELECT count(*) AS count FROM ${table}`).get().count} rows`);
      console.log('Read-only inventory complete. No destination was opened or modified.');
    } else {
      if (!process.env.HAN_DATABASE_URL) throw new Error('Explicit HAN_DATABASE_URL is required; there is no fallback destination.');
      target = new PostgresDatabase({ url: process.env.HAN_DATABASE_URL, ca: process.env.HAN_DATABASE_CA_CERT });
      importSnapshot(source, target);
      console.log('Snapshot imported and every source field verified in one transaction.');
    }
  } catch { console.error('Workspace transfer failed. No credentials or payloads were printed; inspect schema and authorization before retrying.'); process.exitCode = 1; }
  finally { source.close(); target?.close(); }
}

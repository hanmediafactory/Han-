import sqlite3 from 'node:sqlite';

const db = new sqlite3.DatabaseSync('data/han.sqlite', { open: true, readOnly: true });

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables count:', tables.length);

for (const t of tables) {
  const count = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get().c;
  if (count > 0) {
    console.log(`Table ${t.name}: ${count} rows`);
  }
}
db.close();

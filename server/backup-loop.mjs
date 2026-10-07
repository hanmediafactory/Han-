import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync, readdirSync, unlinkSync, lstatSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
const source = resolve(process.env.HAN_DB_PATH || "data/han.sqlite");
const directory = resolve(process.env.HAN_BACKUP_DIR || "backups");
if (directory === dirname(source)) throw new Error("Backups must use a separate directory.");
mkdirSync(directory, { recursive: true, mode: 0o700 });
const retention = Math.max(2, Number(process.env.HAN_BACKUP_RETENTION || 14));
async function snapshot() {
  const database = new DatabaseSync(source, { readOnly: true });
  try {
    const path = join(directory, `han-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`);
    await backup(database, path);
    const files = readdirSync(directory).filter(name => /^han-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.sqlite$/.test(name)).sort().reverse();
    for (const name of files.slice(retention)) { const candidate = resolve(directory, name); if (dirname(candidate) === directory && lstatSync(candidate).isFile() && !lstatSync(candidate).isSymbolicLink()) unlinkSync(candidate); }
    console.log(JSON.stringify({ event: "database_backup_created" }));
  } finally { database.close(); }
}
await snapshot();
const interval = Math.max(60, Number(process.env.HAN_BACKUP_INTERVAL_SECONDS || 86400)) * 1000;
setInterval(() => void snapshot().catch(() => console.error(JSON.stringify({ event: "database_backup_failed" }))), interval);

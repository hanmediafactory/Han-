import { backup } from "node:sqlite";
import { resolve } from "node:path";
if (process.env.HAN_DATABASE_URL || process.env.HAN_TEST_POSTGRES === '1') throw new Error('Shared PostgreSQL mode requires an authorized database-native backup; SQLite backup is disabled.');
const destination = process.argv[2];
if (!destination)
  throw new Error(
    "Provide a backup file path outside the application data directory.",
  );
const { db } = await import('./db.mjs');
await backup(db, resolve(destination));
console.log("Consistent database backup created.");
db.close();

import { backup } from "node:sqlite";
import { db } from "./db.mjs";
import { resolve } from "node:path";
const destination = process.argv[2];
if (!destination)
  throw new Error(
    "Provide a backup file path outside the application data directory.",
  );
await backup(db, resolve(destination));
console.log("Consistent database backup created.");
db.close();

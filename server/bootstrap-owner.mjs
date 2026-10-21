import { requireProductionPassword } from "./security.mjs";
import { bootstrapInitialOwner } from "./owner-bootstrap.mjs";

const password = process.env.HAN_INITIAL_OWNER_PASSWORD;
if (!process.env.HAN_DATABASE_URL || !process.env.HAN_DATABASE_CA_CERT?.trim()) {
  throw new Error("Set HAN_DATABASE_URL and HAN_DATABASE_CA_CERT for the isolated workspace database before bootstrapping.");
}
if (!password || password.length < 16 || password.length > 200) {
  throw new Error("Set HAN_INITIAL_OWNER_PASSWORD temporarily to a unique 16 to 200 character password.");
}
requireProductionPassword(password);
process.env.HAN_OWNER_BOOTSTRAP = "1";
const { db, hashPassword } = await import("./db.mjs");
try {
  if (db.dialect !== "postgres") throw new Error("Owner bootstrap requires the shared PostgreSQL adapter.");
  bootstrapInitialOwner(db, { password, hashPassword });
  console.log("Initial owner created. Remove HAN_INITIAL_OWNER_PASSWORD from the environment now.");
} catch {
  console.error("Owner bootstrap failed. No credentials or database details were logged; verify the migration and restricted runtime role.");
  process.exitCode = 1;
} finally {
  db.close();
  delete process.env.HAN_INITIAL_OWNER_PASSWORD;
}

import { requireProductionPassword } from "./security.mjs";

const OWNER_ID = "user-1";
const OWNER_NAME = "Harsha";
const OWNER_PERMISSIONS = [
  "finance.view", "finance.manage", "projects.manage", "tasks.manage",
  "leads.manage", "funnels.manage", "calendar.manage",
];

export function bootstrapInitialOwner(db, { password, hashPassword }) {
  if (typeof password !== "string" || password.length < 16 || password.length > 200) {
    throw new Error("Initial owner password must be 16 to 200 characters.");
  }
  requireProductionPassword(password);
  if (typeof hashPassword !== "function") throw new Error("A password hashing function is required.");
  if (db.prepare("SELECT id FROM users LIMIT 1").get()) {
    throw new Error("Owner bootstrap is locked because workspace users already exist.");
  }

  db.exec("BEGIN");
  try {
    db.prepare("INSERT INTO roles(id,name) VALUES (?,?) ON CONFLICT(id) DO NOTHING").run("OWNER", "Owner / Admin");
    db.prepare("INSERT INTO roles(id,name) VALUES (?,?) ON CONFLICT(id) DO NOTHING").run("MEMBER", "Member");
    for (const permission of OWNER_PERMISSIONS) {
      db.prepare("INSERT INTO permissions(id,description) VALUES (?,?) ON CONFLICT(id) DO NOTHING").run(permission, permission);
    }
    db.prepare(`INSERT INTO users(id,name,role,password_hash,permissions,active,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?)`).run(
      OWNER_ID, OWNER_NAME, "OWNER", hashPassword(password), JSON.stringify(OWNER_PERMISSIONS), 1,
      new Date().toISOString(), new Date().toISOString(),
    );
    if (!db.prepare("SELECT id FROM users WHERE id=? AND role='OWNER' AND active=1 AND password_hash IS NOT NULL").get(OWNER_ID)) {
      throw new Error("Initial owner verification failed.");
    }
    db.exec("COMMIT");
    return { id: OWNER_ID };
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch {}
    throw error;
  }
}

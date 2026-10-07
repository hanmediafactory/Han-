import { db, hashPassword, transaction } from "./db.mjs";
import { requireProductionPassword } from "./security.mjs";
const id = process.argv[2];
const password = process.env.HAN_RECOVERY_PASSWORD;
if (!id || !password || password.length < 12 || password.length > 200) throw new Error("Provide an account ID and HAN_RECOVERY_PASSWORD (12–200 characters).");
requireProductionPassword(password);
if (!db.prepare("SELECT id FROM users WHERE id=?").get(id)) throw new Error("Account not found.");
transaction(() => {
  db.prepare("UPDATE users SET password_hash=?,updated_at=? WHERE id=?").run(hashPassword(password), new Date().toISOString(), id);
  db.prepare("DELETE FROM sessions WHERE user_id=?").run(id);
  db.prepare("DELETE FROM push_subscriptions WHERE user_id=?").run(id);
  db.prepare("DELETE FROM native_push_tokens WHERE user_id=?").run(id);
});
db.close();
console.log("Credential replaced and sessions revoked. No credential was printed.");

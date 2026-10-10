import { db, hashPassword } from "./db.mjs";
import { requireProductionPassword } from "./security.mjs";
const names = ["HARSHA", "NIHAAL", "LALITHA", "ABHILASH"];
// Startup provisioning is idempotent, including deployments with an older start command.
// Credential replacement must be an explicit administrative operation.
const onlyMissing = !process.argv.includes('--reset-existing');
const targets = names.map((name, i) => ({ name, id: `user-${i + 1}`, index: i }))
  .filter(target => !onlyMissing || !db.prepare('SELECT password_hash FROM users WHERE id=?').get(target.id)?.password_hash);
if (targets.length === 0) {
  console.log('Existing identity credentials and sessions preserved; no provisioning required.');
} else {
const passwords = names.map((name) => process.env[`HAN_${name}_PASSWORD`]);
if (passwords.some((p) => !p || p.length < 12 || p.length > 200))
  throw new Error(
    "Set HAN_HARSHA_PASSWORD, HAN_NIHAAL_PASSWORD, HAN_LALITHA_PASSWORD and HAN_ABHILASH_PASSWORD to distinct passwords of 12 to 200 characters.",
  );
if (new Set(passwords).size !== 4)
  throw new Error("Use different passwords for the four identities.");
passwords.forEach(requireProductionPassword);
db.exec("BEGIN IMMEDIATE");
try {
  targets.forEach(({ id, index }) =>
    db
      .prepare("UPDATE users SET password_hash=?,updated_at=? WHERE id=?")
      .run(hashPassword(passwords[index]), new Date().toISOString(), id),
  );
  if (!onlyMissing) db.prepare('DELETE FROM sessions').run();
  db.exec('COMMIT');
  console.log(
    "Four identities provisioned (Harsha, Nihaal, Lalitha, Abhilash). Passwords were not printed or saved as plaintext.",
  );

} catch (error) {
  db.exec("ROLLBACK");
  throw error;
}
}
db.close();

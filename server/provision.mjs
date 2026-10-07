import { db, hashPassword } from "./db.mjs";
import { requireProductionPassword } from "./security.mjs";
const names = ["HARSHA", "NIHAAL", "LALITHA", "ABHILASH"];
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
  passwords.forEach((password, i) =>
    db
      .prepare("UPDATE users SET password_hash=?,updated_at=? WHERE id=?")
      .run(hashPassword(password), new Date().toISOString(), `user-${i + 1}`),
  );
  db.exec("DELETE FROM sessions; COMMIT");
  console.log(
    "Four identities provisioned (Harsha, Nihaal, Lalitha, Abhilash). Passwords were not printed or saved as plaintext.",
  );

} catch (error) {
  db.exec("ROLLBACK");
  throw error;
}

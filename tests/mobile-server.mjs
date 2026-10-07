import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const directory = mkdtempSync(join(tmpdir(), "han-mobile-"));
process.env.NODE_ENV = "test";
process.env.HAN_DB_PATH = join(directory, "test.sqlite");
const { app } = await import("../server/app.mjs");
const { db, hashPassword } = await import("../server/db.mjs");
await import("../server/seed.mjs");
// Isolated, temporary test accounts only. Never used by the application database.
db.prepare("UPDATE users SET password_hash=?").run(
  hashPassword("test-only-password-123456"),
);
const server = app.listen(3101, "127.0.0.1");
process.on("SIGTERM", () =>
  server.close(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
    process.exit(0);
  }),
);

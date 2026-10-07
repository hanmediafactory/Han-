PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS permissions (id TEXT PRIMARY KEY, description TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL REFERENCES roles(id),
 password_hash TEXT, permissions TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT REFERENCES users(id), updated_by TEXT REFERENCES users(id)
);
CREATE TRIGGER IF NOT EXISTS user_limit BEFORE INSERT ON users
 WHEN (SELECT count(*) FROM users) >= 3 BEGIN SELECT RAISE(ABORT, 'Only three account slots are allowed'); END;
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
 id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS project_members (project_id TEXT REFERENCES projects(id) ON DELETE CASCADE, user_id TEXT REFERENCES users(id), PRIMARY KEY(project_id,user_id));
CREATE TABLE IF NOT EXISTS tasks (
 id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
 assigned_user TEXT NOT NULL REFERENCES users(id), data TEXT NOT NULL CHECK(json_valid(data)),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS income (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE VIEW IF NOT EXISTS transactions AS SELECT *, 'expense' AS type FROM expenses UNION ALL SELECT *, 'income' AS type FROM income;
CREATE TABLE IF NOT EXISTS team_members (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS funnels (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS funnel_steps (id TEXT PRIMARY KEY, funnel_id TEXT NOT NULL REFERENCES funnels(id) ON DELETE CASCADE, data TEXT NOT NULL CHECK(json_valid(data)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), data TEXT NOT NULL CHECK(json_valid(data)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS calendar_events (id TEXT PRIMARY KEY, assigned_user TEXT NOT NULL REFERENCES users(id), data TEXT NOT NULL CHECK(json_valid(data)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS activity_logs (id TEXT PRIMARY KEY, entity TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT,
  auth TEXT,
  platform TEXT NOT NULL DEFAULT 'web',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_assigned_idx ON tasks(assigned_user);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS activity_logs_user_idx ON activity_logs(created_by);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);
CREATE TABLE IF NOT EXISTS mutation_receipts (
 user_id TEXT NOT NULL REFERENCES users(id), key TEXT NOT NULL, fingerprint TEXT NOT NULL,
 status INTEGER NOT NULL, response TEXT NOT NULL CHECK(json_valid(response)), created_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,key)
);
CREATE TABLE IF NOT EXISTS notification_preferences (
 user_id TEXT PRIMARY KEY REFERENCES users(id), enabled INTEGER NOT NULL DEFAULT 1
);
INSERT OR IGNORE INTO schema_migrations VALUES ('002-reliable-mutations-notifications', datetime('now'));
DROP TRIGGER IF EXISTS user_limit;
CREATE UNIQUE INDEX IF NOT EXISTS single_owner_idx ON users(role) WHERE role='OWNER';
CREATE TRIGGER IF NOT EXISTS protected_owner_delete BEFORE DELETE ON users WHEN OLD.role='OWNER' BEGIN SELECT RAISE(ABORT, 'Owner account is protected'); END;
CREATE TRIGGER IF NOT EXISTS protected_owner_update BEFORE UPDATE OF role,active ON users WHEN OLD.role='OWNER' AND (NEW.role!='OWNER' OR NEW.active!=1) BEGIN SELECT RAISE(ABORT, 'Owner account is protected'); END;
INSERT OR IGNORE INTO schema_migrations VALUES ('003-expand-member-accounts', datetime('now'));
CREATE TABLE IF NOT EXISTS push_outbox (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), payload TEXT NOT NULL CHECK(json_valid(payload)), attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS reminder_receipts (key TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
INSERT OR IGNORE INTO schema_migrations VALUES ('004-push-outbox-reminders', datetime('now'));
CREATE TABLE IF NOT EXISTS native_push_tokens (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), updated_at INTEGER NOT NULL);
INSERT OR IGNORE INTO schema_migrations VALUES ('005-android-fcm', datetime('now'));
CREATE TABLE IF NOT EXISTS savings_entries (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS salary_payments (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
INSERT OR IGNORE INTO schema_migrations VALUES ('006-protected-savings-salaries', datetime('now'));
CREATE TABLE IF NOT EXISTS webhooks (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 url TEXT NOT NULL,
 secret TEXT NOT NULL,
 events TEXT NOT NULL DEFAULT '["*"]',
 active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
INSERT OR IGNORE INTO schema_migrations VALUES ('007-webhooks-integration', datetime('now'));
CREATE TABLE IF NOT EXISTS webhook_outbox (
 id TEXT PRIMARY KEY, webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
 body TEXT NOT NULL CHECK(json_valid(body)), attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS webhook_outbox_retry_idx ON webhook_outbox(next_attempt);
INSERT OR IGNORE INTO schema_migrations VALUES ('008-durable-webhooks', datetime('now'));

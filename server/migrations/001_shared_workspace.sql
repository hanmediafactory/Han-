-- Shared mobile domain: preserves the existing Express payload and identity contract.
-- Apply explicitly in a transaction after backup and authorization; never at app startup.
CREATE SCHEMA IF NOT EXISTS han_workspace;
SET LOCAL search_path = han_workspace, pg_catalog;
CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS permissions (id TEXT PRIMARY KEY, description TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL REFERENCES roles(id),
 password_hash TEXT, permissions TEXT NOT NULL DEFAULT '[]', active BIGINT NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT REFERENCES users(id), updated_by TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
 id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(data::json IS NOT NULL),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS project_members (project_id TEXT REFERENCES projects(id) ON DELETE CASCADE, user_id TEXT REFERENCES users(id), PRIMARY KEY(project_id,user_id));
CREATE TABLE IF NOT EXISTS tasks (
 id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
 assigned_user TEXT NOT NULL REFERENCES users(id), data TEXT NOT NULL CHECK(data::json IS NOT NULL),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(data::json IS NOT NULL), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS income (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(data::json IS NOT NULL), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE OR REPLACE VIEW transactions AS SELECT *, 'expense' AS type FROM expenses UNION ALL SELECT *, 'income' AS type FROM income;
CREATE TABLE IF NOT EXISTS team_members (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(data::json IS NOT NULL), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(data::json IS NOT NULL), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS funnels (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(data::json IS NOT NULL), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS funnel_steps (id TEXT PRIMARY KEY, funnel_id TEXT NOT NULL REFERENCES funnels(id) ON DELETE CASCADE, data TEXT NOT NULL CHECK(data::json IS NOT NULL), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), data TEXT NOT NULL CHECK(data::json IS NOT NULL), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS calendar_events (id TEXT PRIMARY KEY, assigned_user TEXT NOT NULL REFERENCES users(id), data TEXT NOT NULL CHECK(data::json IS NOT NULL), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS activity_logs (id TEXT PRIMARY KEY, entity TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id));
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS details TEXT;
CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(data::json IS NOT NULL), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(data::json IS NOT NULL), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
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
 status BIGINT NOT NULL, response TEXT NOT NULL CHECK(response::json IS NOT NULL), created_at BIGINT NOT NULL,
 PRIMARY KEY(user_id,key)
);
CREATE TABLE IF NOT EXISTS notification_preferences (
 user_id TEXT PRIMARY KEY REFERENCES users(id), enabled BIGINT NOT NULL DEFAULT 1
);
INSERT INTO schema_migrations VALUES ('002-reliable-mutations-notifications', CURRENT_TIMESTAMP::text) ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS single_owner_idx ON users(role) WHERE role='OWNER';


INSERT INTO schema_migrations VALUES ('003-expand-member-accounts', CURRENT_TIMESTAMP::text) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS push_outbox (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), payload TEXT NOT NULL CHECK(payload::json IS NOT NULL), attempts BIGINT NOT NULL DEFAULT 0, next_attempt BIGINT NOT NULL, created_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS reminder_receipts (key TEXT PRIMARY KEY, created_at BIGINT NOT NULL);
INSERT INTO schema_migrations VALUES ('004-push-outbox-reminders', CURRENT_TIMESTAMP::text) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS native_push_tokens (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), updated_at BIGINT NOT NULL);
INSERT INTO schema_migrations VALUES ('005-android-fcm', CURRENT_TIMESTAMP::text) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS savings_entries (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(data::json IS NOT NULL), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS salary_payments (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(data::json IS NOT NULL), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id));
INSERT INTO schema_migrations VALUES ('006-protected-savings-salaries', CURRENT_TIMESTAMP::text) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS webhooks (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 url TEXT NOT NULL,
 secret TEXT NOT NULL,
 events TEXT NOT NULL DEFAULT '["*"]',
 active BIGINT NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
INSERT INTO schema_migrations VALUES ('007-webhooks-integration', CURRENT_TIMESTAMP::text) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS webhook_outbox (
 id TEXT PRIMARY KEY, webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
 body TEXT NOT NULL CHECK(body::json IS NOT NULL), attempts BIGINT NOT NULL DEFAULT 0,
 next_attempt BIGINT NOT NULL, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS webhook_outbox_retry_idx ON webhook_outbox(next_attempt);
INSERT INTO schema_migrations VALUES ('008-durable-webhooks', CURRENT_TIMESTAMP::text) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL CHECK(data::json IS NOT NULL),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id)
);
INSERT INTO schema_migrations VALUES ('009-founder-financial-ledger-settlements', CURRENT_TIMESTAMP::text) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL CHECK(data::json IS NOT NULL),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS client_followups (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL CHECK(data::json IS NOT NULL),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS client_calls (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL CHECK(data::json IS NOT NULL),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS client_emails (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL CHECK(data::json IS NOT NULL),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL CHECK(data::json IS NOT NULL),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id)
);
INSERT INTO schema_migrations VALUES ('010-crm-operations-parity', CURRENT_TIMESTAMP::text) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION han_workspace.protect_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  IF OLD.role = 'OWNER' AND (TG_OP = 'DELETE' OR NEW.role <> 'OWNER' OR NEW.active <> 1) THEN
    RAISE EXCEPTION 'Owner account is protected';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TABLE IF NOT EXISTS han_workspace.admin_links (
  admin_user_id UUID PRIMARY KEY,
  workspace_user_id TEXT NOT NULL REFERENCES han_workspace.users(id)
);
CREATE TABLE IF NOT EXISTS han_workspace.admin_audit (
  admin_user_id UUID NOT NULL, workspace_user_id TEXT NOT NULL REFERENCES han_workspace.users(id),
  method TEXT NOT NULL, path TEXT NOT NULL, mutation_key TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY (admin_user_id, mutation_key, method, path)
);
DROP TRIGGER IF EXISTS protected_owner_update ON han_workspace.users;
CREATE TRIGGER protected_owner_update BEFORE UPDATE OR DELETE ON han_workspace.users
FOR EACH ROW EXECUTE FUNCTION han_workspace.protect_owner();

CREATE OR REPLACE FUNCTION han_workspace.notify_change() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  PERFORM pg_notify('han_workspace_changes', 'changed');
  RETURN NULL;
END $$;

DO $$
DECLARE t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'han_workspace_server') THEN
    CREATE ROLE han_workspace_server NOLOGIN;
  END IF;
  REVOKE ALL ON SCHEMA han_workspace FROM PUBLIC;
  GRANT USAGE ON SCHEMA han_workspace TO han_workspace_server;
  FOREACH t IN ARRAY ARRAY['schema_migrations','roles','permissions','users','sessions','projects',
    'project_members','tasks','expenses','income','team_members','leads','funnels','funnel_steps',
    'notifications','calendar_events','activity_logs','categories','settings','push_subscriptions',
    'mutation_receipts','notification_preferences','push_outbox','reminder_receipts','native_push_tokens',
    'savings_entries','salary_payments','webhooks','webhook_outbox','settlements','admin_links','admin_audit'] LOOP
    EXECUTE format('ALTER TABLE han_workspace.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON han_workspace.%I FROM PUBLIC', t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON han_workspace.%I FROM anon', t);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON han_workspace.%I FROM authenticated', t);
    END IF;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON han_workspace.%I TO han_workspace_server', t);
    EXECUTE format('DROP POLICY IF EXISTS server_access ON han_workspace.%I', t);
    EXECUTE format('CREATE POLICY server_access ON han_workspace.%I TO han_workspace_server USING (true) WITH CHECK (true)', t);
    IF t NOT IN ('schema_migrations','roles','permissions','sessions','mutation_receipts','push_outbox','reminder_receipts','webhook_outbox','admin_links','admin_audit') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS workspace_changed ON han_workspace.%I', t);
      EXECUTE format('CREATE TRIGGER workspace_changed AFTER INSERT OR UPDATE OR DELETE ON han_workspace.%I FOR EACH STATEMENT EXECUTE FUNCTION han_workspace.notify_change()', t);
    END IF;
  END LOOP;
  REVOKE ALL ON han_workspace.transactions FROM PUBLIC;
  GRANT SELECT ON han_workspace.transactions TO han_workspace_server;
  REVOKE INSERT, UPDATE, DELETE ON han_workspace.admin_links FROM han_workspace_server;
  REVOKE UPDATE, DELETE ON han_workspace.admin_audit FROM han_workspace_server;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SCHEMA han_workspace FROM anon;
    REVOKE ALL ON han_workspace.transactions FROM anon;
    REVOKE ALL ON FUNCTION han_workspace.protect_owner(), han_workspace.notify_change() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON SCHEMA han_workspace FROM authenticated;
    REVOKE ALL ON han_workspace.transactions FROM authenticated;
    REVOKE ALL ON FUNCTION han_workspace.protect_owner(), han_workspace.notify_change() FROM authenticated;
  END IF;
END $$;
ALTER VIEW han_workspace.transactions SET (security_invoker = true);
REVOKE ALL ON FUNCTION han_workspace.protect_owner(), han_workspace.notify_change() FROM PUBLIC;
INSERT INTO han_workspace.schema_migrations VALUES ('001-shared-postgres', CURRENT_TIMESTAMP::text) ON CONFLICT DO NOTHING;

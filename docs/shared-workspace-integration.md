# Shared Supabase PostgreSQL workspace

This is a prepared implementation. No live migration, import, secret rotation, deployment, commit, or push was performed by the local verification work.

## Runtime contract

Express continues to own the mobile business rules, cookie/CSRF authentication, permission checks, finance allocations, task progress, audit, and mutation receipts. Fastify continues to own website/admin authentication, MFA, CRM and portfolio. Both apps operate on the **same `han_workspace` PostgreSQL records** through Express when shared mode is enabled. Public portfolio records and CRM follow-ups are not used for mobile projects/tasks.

The actual mobile contract has text identities (`user-1`), JSON domain payloads, MEDIUM priorities, optional task projects, COMPLETED/CANCELLED task states, expense allocations, protected savings and salaries. The website's older `008_mobile_sync_alignment.sql` proposal does not express that contract and is not the shared-mode runtime schema. It was reviewed separately; do not treat its SQL fixtures as proof of mobile compatibility.

`server/migrations/001_shared_workspace.sql` preserves the existing domain in a separate schema to avoid collisions with website users, sessions, projects and tasks. Backend identities are explicitly linked; no email inference or synthetic accounts bridge the two systems.

Set `HAN_DATABASE_URL` to opt in. When set, the server reads/writes PostgreSQL and never falls back to SQLite after a connection error. When unset, the existing SQLite mode remains available. Browser/Capacitor offline caching and queued mutation storage remain on the client in both modes.

The PostgreSQL driver uses a worker to preserve the existing synchronous domain transaction contract. Business transactions and complete workspace snapshots acquire a PostgreSQL transaction advisory lock. Nested domain transactions use savepoints. Entity changes, receipts, audit and notifications commit before success is sent. Lost/unknown commit responses return 503; replaying the original receipt resolves whether the write committed.

PostgreSQL `LISTEN/NOTIFY` sends content-free invalidations to every Express instance, which preserves the existing authenticated SSE client contract. The admin workspace view refreshes while visible. Existing Supabase Realtime publication coverage in the website's 008 proposal is retained; native Supabase Realtime delivery has not been tested live. The mobile runtime previously used SSE, not Supabase Realtime subscriptions.

## Before an authorized cutover

1. Inventory the live Supabase schemas, table/function owners, roles, grants, existing publication and migration history. Resolve any objects already created by the original 008 before applying changes. Review the shared schema independently of that older proposal.
2. Rotate compromised credentials through the authorized process. Use distinct backend credentials and a fresh backend-only bridge secret. Do not reuse a browser publishable key as a bridge secret.
3. Freeze source writes, create and verify a complete backup, and rehearse import/recovery on disposable infrastructure. Live migration and import require Harsha's explicit authorization.
4. Apply the shared migration as the database migration owner **inside a transaction**, with stop-on-error enabled. The app will not apply this migration on startup. A typical authorized invocation is `psql --single-transaction -v ON_ERROR_STOP=1 -f server/migrations/001_shared_workspace.sql`; connection credentials belong in protected environment/configuration, not a command argument.
5. Import an explicit consistent SQLite snapshot with `node server/shared-transfer.mjs <snapshot.sqlite> --apply`. Without `--apply`, the tool performs a read-only row inventory and never opens the destination. Import refuses an occupied destination and verifies source fields and counts transactionally. Use an appropriately privileged import identity, not the restricted runtime login.
6. Grant only `han_workspace_server` to the dedicated Express login. That role has no schema creation or blanket public privileges; admin links are read-only and bridge audit is append-only for the runtime role. Migration ownership must remain separate from the login.

   Shared HTTP startup verifies that the current account is a member of this role, cannot bypass RLS or create schema objects, cannot inherit ownership of the shared objects, cannot change identity links, and cannot delete bridge audit. Maintenance import/export tools use separate privileged connections explicitly.
7. Insert reviewed `han_workspace.admin_links` rows mapping the real website user UUID to an existing mobile user ID. This is an explicit authorization decision; no mapping is automatically generated. The linked mobile account's active status and permissions remain authoritative.
8. Configure Express `HAN_DATABASE_URL`, `HAN_DATABASE_CA_CERT` (trusted CA PEM for remote TLS), and `HAN_ADMIN_BRIDGE_SECRET` (at least 32 characters). Use a **direct or session** Supabase connection; transaction pooling is unsupported because LISTEN needs a persistent session. Connection-string SSL overrides are rejected so they cannot disable certificate verification.

   Database URL query parameters are limited to `application_name`; host, user, port and TLS options cannot override the parsed connection target. Configure TLS in the documented backend settings.
9. Configure Fastify `WORKSPACE_API_URL` (private Express HTTPS endpoint) and matching `WORKSPACE_BRIDGE_SECRET`. These values never reach the frontend. Configure the admin's actual origin in its existing `ALLOWED_ORIGINS` setting.
10. Test live authentication/MFA, account linking, permission denial, both write directions, receipts, conflicts, reconnect, multiple backend processes, and rollback recovery. Only then consider any production cutover, separately authorized.

## Security boundaries

- `han_workspace` tables use RLS and explicit server-role grants. PUBLIC, anon and authenticated have no direct schema/table access, including on permissive Supabase default ACLs. The schema need not be exposed through PostgREST.
- Fastify requires a valid FULL Owner/Admin session for every workspace route. Express requires the private bridge secret, an explicit identity link, an active linked account, and the existing mobile permissions. Login/password/session-management and arbitrary URLs are not forwarded. Writes require a receipt identifier. Bridge audit retains the website actor UUID without exposing credentials.
- Provider/password verification alone does not establish website MFA. New Supabase-backed local sessions are PRE_MFA; the admin completes enrollment or a durable one-use challenge before administrative APIs become available. Existing local role demotions are not overwritten by stale provider metadata. Live provider behavior remains a verification gate.
- No blanket public-table/sequence grants are introduced. Trigger functions run as invoker with pinned search paths; their direct execution grants are revoked.
- Neither webhooks nor native/web push configuration is enabled by this change.

## Recovery and operational limits

For the supplied container setup, shared mode uses `docker compose -f compose.yaml -f compose.shared.yaml up -d` only after cutover authorization. The override requires shared credentials and disables the SQLite backup service by assigning it to the opt-in `sqlite-only` profile. Do not enable that profile in shared mode. The base configuration now forwards shared settings and also forwards the database-mode marker to the backup service so it refuses misleading SQLite backups if the override is omitted. Database-native backups and a restore rehearsal remain mandatory. Docker is unavailable locally, so container deployment is not verified.

`npm run preflight` validates the selected mode without opening a shared database connection. Shared mode checks URL/TLS/pooler configuration, the backend bridge secret and absence of embedded test mode, and skips SQLite file/account checks. Passing it does not verify database grants, migration state, account links or live connectivity.

Use `npm start` for the shared Express service after importing the authorized snapshot. The legacy Render blueprint runs `server/provision.mjs --only-missing` and is not a shared-mode staging deployment specification. That script now refuses shared mode before opening a database, because its legacy permission reset would overwrite imported authorization. Shared production startup also skips role/permission seeding and environment-based credential initialization. Preserve imported identities and make subsequent credential/permission changes explicitly.

Keep the original SQLite snapshot until a verified recovery window has passed. After new PostgreSQL writes, switching an environment variable back to an old SQLite file loses those newer writes. Do not do that as a rollback.

`node server/shared-export.mjs <new-recovery.sqlite>` creates a new SQLite recovery artifact from a transactionally consistent shared snapshot. It refuses an existing destination, preserves all domain fields, credentials/hashes, receipts, identity links and bridge audit, and checks counts, values, foreign keys and SQLite integrity. This is explicit recovery work; it is never an automatic outage fallback. Protect the exported file as sensitive data. Native PostgreSQL/Supabase backups remain necessary; the existing SQLite backup command and scheduler explicitly refuse shared mode.

The existing source snapshot import and new recovery export were tested on disposable fixtures. Real Supabase backups/restores, physical multi-connection locking, LISTEN delivery and credential revocation have not been verified. The worker has one connection per Express process and an 8 MiB response bound; live latency, dataset size and multi-instance throughput need a load rehearsal. A lost connection fails the active transaction; a later request can establish a fresh worker/connection and replay its receipt.

## Local verification commands

- `npm test`: existing SQLite/API/security regression suite.
- `npm run build`: mobile TypeScript and Vite build.
- `npm run lint`: includes the pre-existing linked QR project, whose warnings are separate.
- Set `HAN_ADMIN_REPO` to the built website repository and `HAN_BROWSER_TEST=1`, then run `npm run test:shared`. It uses disposable PGlite, real Express and Fastify requests, and headless Chrome. The separate website build must exist first. This does not prove live Supabase behavior.
- With `NODE_ENV=test`, `HAN_TEST_POSTGRES=1` and `CI=1`, run `npx playwright test` for the isolated mobile browser fixture. `HAN_TEST_POSTGRES` is rejected outside test mode. Its SQL auth/database fixtures are never installed into a live environment.

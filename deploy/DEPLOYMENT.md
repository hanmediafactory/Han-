# HAN release and operations

> [!TIP]
> **Host Everything 100% Free ($0/mo)**: Read [`deploy/FREE_HOSTING.md`](file:///c:/Users/Rakesh/Desktop/HAN%20TO%20DO%20LIST/deploy/FREE_HOSTING.md) for step-by-step guides using **Oracle Cloud Always Free**, **Render + Vercel**, or **Cloudflare Tunnels**.

## Verified scope
The application uses React/Vite, Express, SQLite and Capacitor. Tests run against disposable databases. Existing installations migrate without replacing user records. Android is the first target. A browser test is not a physical-device test.

## Local use
Node 24 is required. Run `npm ci`, `npm run build`, then `npm start`. Open http://127.0.0.1:3001. Development also uses `npm run dev` on port 5173. The existing local accounts were preserved. Published example passwords are blocked when NODE_ENV=production. Replace them before deployment.

## Backend deployment for Android
A shared Android app needs a reachable server. A phone's 127.0.0.1 is the phone, not the development computer. Production native configuration must use your real HTTPS origin through HAN_MOBILE_URL. The current native shell loads that same HTTPS origin so cookies and API calls share an origin. First-load offline behavior of that remote shell requires device verification; browser offline verification alone does not establish native offline readiness.

Use one application instance with durable SQLite storage. Do not run several replicas over a shared SQLite file. Supply HAN_DOMAIN and run `docker compose up -d --build`. The supplied Caddy proxy terminates HTTPS; only Caddy publishes ports. TRUST_PROXY=1 is appropriate only behind this single trusted proxy. Configure HAN_ALLOWED_ORIGINS as a comma-separated list of exact trusted origins. Arbitrary HTTPS origins are rejected.

On a fresh deployment, provision the initial accounts using a private temporary environment file containing four distinct random passwords of at least 12 characters (HAN_HARSHA_PASSWORD, HAN_NIHAAL_PASSWORD, HAN_LALITHA_PASSWORD, HAN_ABHILASH_PASSWORD), then run `docker compose run --rm --env-file /private/accounts.env han node server/provision.mjs`. Remove the secret file afterward. Do not use the published example passwords. Do not commit private environment files.

Check /api/health for database availability and /api/ready for owner provisioning. Verify HTTPS login, Secure/HttpOnly/SameSite cookies, logout, and direct API permission denial on the deployed origin. A local passing suite does not verify your proxy, TLS, storage permissions or device networking.

## Accounts and recovery
The owner is protected at both API and database level. You -> Team & accounts supports additional member accounts; disabling an account or changing its permissions/password revokes all its sessions. Create new accounts for replacements instead of reusing historical identities. Team profiles are descriptive records and do not grant sign-in access.

Users can change their passwords. An owner can reset a member password. Server administrators can recover an account with `HAN_RECOVERY_PASSWORD` in a private environment and `node server/recover-account.mjs user-1` (substitute the appropriate ID). Recovery revokes sessions and push subscriptions and never prints credentials.

## Offline and conflicts

Live updates use an authenticated event stream that carries no record data; each client fetches its permission-scoped state after an update. Visibility/focus refresh and a 15-second visible-page fallback handle reconnects and unsupported streaming proxies. Keep /api/events streaming enabled through your proxy. Sessions are checked during stream heartbeats and streams close on revocation or server shutdown. Financial protection and salary actions require connectivity; ordinary income/expense changes may queue and remain subject to the current server balance when replayed.
The public app shell is cached by the service worker. Authenticated API responses never enter CacheStorage. Workspace snapshots and mutations are partitioned by account. Expired sessions cannot reopen a cached workspace on reload. Logout clears the current account's snapshot. Cached data is private device data: protect shared devices and their browser profiles.

Offline queueable actions are project/task/lead/funnel/calendar and income/expense creates or updates. Deletions, account/security changes and configuration require connectivity. Offline changes appear only after the server confirms them. Idempotency keys prevent retry duplication. Updates carry the last observed record timestamp: conflicts are rejected rather than overwriting another device's edits. Conflicts/validation failures stop the queue and appear under You -> Pending changes. Preserve the rejected change for recovery, discard it explicitly, refresh and reapply deliberately. Logout is blocked while unsynced changes remain.

Unscoped legacy queues are quarantined in local storage under han_legacy_queue_recovery; they are never replayed under a different account. Export and reconcile them manually if needed.

## Notifications

Foreground alerts appear for other users' updates and new reminders, with a per-account toggle under You. In-app records remain available independently of background push configuration. Deadline reminders deduplicate within each day; exhausted funds create a scoped payment alert once for each affected ledger state. There is no automatic salary schedule or automatic payment.
Task/project/lead reminders and workspace activity create in-app notifications. Delivery targets are permission-scoped. Reminder receipts prevent repeated polling from generating duplicates. Notification messages on device lock screens contain generic text, not financial/contact details.

Web push is optional: configure VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT. Generate a VAPID key pair with the web-push CLI and keep the private key in the backend secret environment. Users explicitly enable notifications under You. The server stores keys, removes expired subscriptions and retries transient delivery errors through a durable outbox. A subscription or successful provider request does not prove device display; test the actual device.

Android push uses Firebase Cloud Messaging, not browser PushManager. Register app.han.mobile in your own Firebase project. Put google-services.json in android/app/ before packaging. Configure backend HAN_FCM_ENABLED=1 and Firebase application-default credentials (GOOGLE_APPLICATION_CREDENTIALS can point to a private service-account file mounted on the server). Do not bundle service-account credentials in the APK or commit them. Android 13+ notification permission is requested only when the user enables alerts. Verify foreground/background/killed-app notification behavior and tap routing on a real phone. No Firebase project or credentials were supplied in this task, so native delivery is not verified.

## Android builds
A portable JDK 21 and Android Platform 36 / Build Tools 36 are prepared in the Codex work directory. The SDK license was accepted with the user's explicit approval. Do not commit the tools or generated local.properties.

## Funds, savings and manual salaries

All recorded income adds to funds. Expenses, including salaries, deduct funds. A savings transfer moves funds into a protected balance and does not count as an expense. Spendable funds = income − expenses − protected savings. The server rejects overspending, including concurrent requests, and blocks edits/deletes that would require spending savings. Existing negative balances are preserved but new spending is blocked; income and corrections can improve them.

Savings entries are intentionally permanent in the app: the owner confirms the transfer before saving and no withdrawal/edit/delete action is provided. This is an application bookkeeping rule, not a bank lock. Salary payments are recorded only when the owner chooses; they create one linked expense in the same transaction. Corrections/deletions from salary history update that expense and funds together and are audited. HAN does not send bank payments. Record only payments actually made.

## Local demo workspace

After building, run npm run demo and open http://127.0.0.1:3102. Demo data lives separately in work/demo/han-demo.sqlite and never replaces the normal data/han.sqlite file. Its session cookie is separate from the real workspace cookie. Demo login uses DemoOnly2026! for all four accounts; this password is forbidden in production. The script refuses NODE_ENV=production. The demo is local only and contains assignments, completed/overdue/cancelled tasks, project progress, finances, protected savings, a manual salary, leads, calendar events and team profiles. Changes in the demo persist across restarts.

## Android packaging commands

For production, set HAN_MOBILE_URL to your deployed HTTPS origin, run `npm run mobile:sync`, then use android/gradlew.bat bundleRelease. Supply HAN_KEYSTORE_PATH, HAN_KEYSTORE_PASSWORD, HAN_KEY_ALIAS, HAN_KEY_PASSWORD privately. Release builds intentionally refuse missing signing settings or a non-HTTPS synced origin. Keep the keystore and backups securely; losing it can prevent updates.

The local debug APK uses http://127.0.0.1:3001 and requires a running development backend plus USB debugging: run `adb reverse tcp:3001 tcp:3001` for the connected phone. This cleartext exception exists only in the explicit debug profile. It is not a deployable production APK. An emulator can use http://10.0.2.2:3001 with HAN_ANDROID_DEBUG=1 instead. Verify app launch, login, offline/reconnect, Android back, foreground refresh, keyboard/safe areas, and notifications before release.

## Backups, migration and rollback
You -> Download System Backup downloads a consistent SQLite snapshot (including sensitive records and password hashes). Keep it private. The JSON /api/export endpoint is a data export, not a full restore image.

`node server/backup.mjs /private/backups/han-YYYY-MM-DD.sqlite` produces a consistent backup. The Compose backup service takes daily snapshots and retains 14 local copies in a separate volume. Local copies are not disaster recovery: configure encrypted off-host storage and alerting for failed backups. Monitor database_backup_failed and push_delivery_failed structured log events.

Before upgrades: take a backup, retain the previous application image/source, and run checks in staging. Migrations are transactional and additive; accounts/records are preserved. To roll back, stop the service, retain the entire current data directory, restore the prior database snapshot with matching application code, and restart. Avoid replacing only a live SQLite main file while old WAL/SHM files are active. Never remove the database volume during an ordinary upgrade.

For a restore drill, copy the snapshot to a NEW isolated directory, run PRAGMA integrity_check and foreign_key_check, boot the app against that database and verify sign-in and records. Restored snapshots contain sessions: revoke restored sessions and push subscriptions before making a recovered instance public. Automated tests verify snapshot integrity and record preservation; disaster recovery in your hosting environment remains to be tested.

## Verification
`npm run lint`
`npm test`
`npm run build`
`npm run test:mobile`
`npm audit --omit=dev`
Android: `gradlew.bat assembleDebug lintDebug --no-daemon` with JAVA_HOME and ANDROID_HOME configured.

The tests cover assigned task access, owner protection, CSRF, untrusted origins, amounts/URLs/dates, persistence, lead details/outcomes, additional accounts, disabled sessions, idempotency, stale edits, manual/calculated progress, scoped notifications, snapshot integrity, mobile widths, desktop fit, keyboard/focus, offline reload/sync, failed-save handling and cache isolation. CI runs these checks against Node 24.

## Release gates
A production release still needs your HTTPS backend destination, unique real credentials, Firebase configuration, release signing key, and real-device QA. Google Play publication also requires your Play Console account and store disclosures. These cannot be established by changing code on this computer. Do not describe the debug APK as store-ready or claim native push delivery without evidence.

## Owner integrations and API extensions

Search (/api/search), analytics (/api/analytics), batch actions (/api/batch), session management (/api/sessions), and date-filtered CSV reports (/api/reports/csv) require an authenticated session and respect account permissions. Writes also require CSRF. Use Idempotency-Key for retryable batch actions and integration creation/deletion. These APIs are available for integrations; there are no new dedicated mobile screens for them. Detailed health metrics are available only to the owner at /api/health/details. Analytics runwayMonths is null until an evidence-based burn calculation is implemented.

Webhooks are owner-managed and disabled unless HAN_WEBHOOK_ALLOWED_ORIGINS lists exact trusted HTTPS origins. Adding an origin authorizes that destination to receive workspace record payloads, including financial/contact fields for selected events; configure only destinations you control and intend to receive these records. No destination has been supplied in this task. Registration accepts events such as tasks.created, tasks.updated and leads.updated, or *. A durable transactional outbox prevents rolled-back changes from being delivered. The worker retries at most eight times with bounded requests; after exhaustion, jobs remain in webhook_outbox for review. Alert on webhook_delivery_failed and webhook_worker_failed. Signatures use HMAC-SHA256 over the exact body. Verify X-HAN-Signature and deduplicate X-HAN-Delivery-ID at the receiver; delivery is at least once, not exactly once. Redirects are refused, and removing a trusted origin pauses its jobs. Deleting a hook removes its pending jobs.

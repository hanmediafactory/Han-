# HAN QA master report — 10 October 2026

Release verdict: **deployment blocked; locally validated release candidate**. The current live app is an older build. No commit, push or deployment was performed because the observed Render Free service lacks verified durable database storage. Do not describe this release as production-ready yet.

## Executed evidence

- Backend: 58 passed, 0 failed.
- Browser: 25 passed, 0 failed; five phone viewport sizes plus desktop, Chromium browser only.
- 83 automated scenarios passed. This is 100% of the executed automated scenarios, not 100% of the application or control coverage.
- Four existing production accounts signed in and reached their own dashboards. Owner task/project shortcut separation and project detail navigation passed live.
- Lint and TypeScript/Vite production build passed. Dependency audit reported zero known vulnerabilities at execution time.
- Production public health and readiness endpoints returned 200, unauthenticated state returned 401, and /tasks served the SPA.

## Baseline and repairs

Original browser suite: 8 passed, 10 failed. Failures included a real floating-control pointer obstruction and outdated finance labels/privacy assertions. Finance is intentionally readable by authenticated team members; management permissions remain enforced. Updated tests verify that contract and continue to test writes, persistence, cache isolation and access boundaries. New integrity tests first reproduced salary void, zero-debt settlement, malformed custom splits, settlement edits and credential-reset faults, then passed after repairs. Source-only observations are never reported as executed passes.

Antigravity was signed in, received the requested audit/change prompt and completed an independent backend review. Its read-only findings were independently reproduced before fixes. Its older “zero defects” report is not accepted as proof. Existing uncommitted founder-ledger changes were preserved and included in local verification.

## Scope and inventory

Discovered 151 source control candidates, 38 route declarations and 30 schema tables. Eleven runtime control inventories cover main screens and observed editors. Source candidates are explicitly NOT TESTED until each contextual interaction and alternative is mapped to runtime evidence. A conditional source candidate can overlap an executed scenario; conservative candidate statuses prevent inflated coverage. The CSV includes every discovered candidate and executed scenario. Row totals: {"PASS":88,"BLOCKED":4,"NOT TESTED":154}. These mix scenarios and candidates and must not be used as a single coverage percentage.

API coverage includes authentication, CSRF, schemas, permissions, project/task/lead/funnel/calendar operations, idempotency, stale edits, separate-process persistence, backups, payroll/expenses/splits/settlements, notifications, search, analytics, batch, export and webhook controls. Browser coverage includes task/project creation, all four permitted founders in isolated fixtures, finance reconciliation/reload, cross-session sync, offline queued writes/reconnect, validation retention, account switching, search, main navigation, calendar, notification read state and keyboard focus. Local fixture permission grants were restored; real production account permissions were not changed.

## Remaining production acceptance

1. Before a Render plan change/redeploy, create and verify a backup of the current ephemeral SQLite database, preserving password hashes and all records. A CSV or /api/state snapshot is not a full recovery backup.
2. Obtain approval for hosting cost, attach a persistent disk at /var/data, restore the verified backup, set HAN_DB_PATH and confirm actual service settings. render.yaml alone does not prove a manually created service uses these settings.
3. Deploy the candidate; verify all four sign-ins, record counts, finance reconciliation, project/task routes, and persistence after restart. Keep a verified rollback backup.
4. Configure background push and backup retention; execute supported browser/native delivery and recovery tests.
5. Complete Android/iOS physical-device, virtual keyboard, landscape and all conditional-control/alternative-state coverage. No Android device was attached; iOS cannot run on this Windows host.

Production data was not created, edited or deleted during this audit. Supplied credentials are omitted from artifacts. Tests use disposable databases. EACCES coverage is an explicitly injected fault, not a real production disk failure. Existing APK was not rebuilt and is excluded from the web source candidate.

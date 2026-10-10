# HAN defects and disposition

All repaired defects remain FIXED LOCALLY until production deployment acceptance.

| ID | Severity | Finding | Status | Evidence | Repair / next action |
|---|---|---|---|---|---|
| HAN-001 | High | Floating quick actions intercepted sign-out and low screen controls | FIXED LOCALLY | Original browser baseline pointer interception; final five viewport/logout tests pass | Reserve content space above fixed navigation |
| HAN-002 | Medium | Ctrl+K did not open command search; dialog focus was not managed | FIXED LOCALLY | qa-audit keyboard scenario passed | Global shortcut, dialog labels, Escape, focus trap and focus restoration |
| HAN-003 | High | Restricted members could open creation editors from home and quick actions | FIXED LOCALLY | Live member task editor had only Status; local permission regression passed | Gate creation actions by actual management permissions; preserve shared finance reads |
| HAN-004 | High | Direct void could invalidate a salary-linked expense | FIXED LOCALLY | QA-LEDGER-001 reproduced failure then passed | Reject linked expense void with 409 |
| HAN-005 | High | Zero-debt settlement created reverse debt; edits could overpay | FIXED LOCALLY | QA-LEDGER-002 and 004 reproduced then passed | Validate directed pairwise debt transactionally on create/edit |
| HAN-006 | High | Empty custom allocations silently became equal splits | FIXED LOCALLY | QA-LEDGER-003 reproduced then passed | Require explicit nonempty reconciled allocations |
| HAN-007 | High | Startup provisioning reset existing credentials and deleted sessions | FIXED LOCALLY | QA-STARTUP-001/002 reproduced then passed | Initialize only missing credentials; explicit --reset-existing for recovery |
| HAN-008 | High | Production storage permission failure could fall back to ephemeral data | FIXED LOCALLY | Injected EACCES QA-STARTUP-003 passed | Fail startup on inaccessible configured production storage |
| HAN-009 | Medium | Permission editor rejected all seven valid permission keys | FIXED LOCALLY | QA-PERM-002 and four-founder browser fixture passed | Validate array length against canonical permission set |
| HAN-010 | High | Live Render service is on Free plan without verified durable SQLite storage | OPEN / RELEASE BLOCKER | Observed live Render dashboard and old commit | Back up current DB before any plan change; provision disk, restore, deploy and restart acceptance |
| HAN-011 | Medium | Background push unavailable in production | OPEN / CONFIGURATION BLOCKER | Production profile explicitly says deployment not configured | Configure intended push provider and verify delivery on supported devices |

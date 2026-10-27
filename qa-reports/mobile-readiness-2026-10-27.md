# HAN mobile readiness check — 27 October 2026

Result: core mobile workflows are verified in an isolated workspace. This is not a guarantee of zero defects or sign-off on the live deployment or the actual user's account.

## Browser verification

Used the connected in-app browser to inspect the real local login, then a separate temporary test workspace for authenticated actions. Created a task through the UI, reloaded, searched, and confirmed the saved task remained. Inspected task forms, navigation, finance controls and runtime errors. No browser console errors appeared in the manually inspected test flow. The suggested password for the real Harsha account was rejected once; no real credentials were changed and no business test records were added to the actual database.

Phone automation covers widths 320, 360, 375, 390, 393, 400 and 430 pixels, including a 498px short viewport. The new phone test enables mobile/touch emulation. It checks login reachability, all five navigation destinations, Light/Dark views, four creation forms, bottom Save visibility, Quick Actions, task creation and progress touch targets. Theme coverage also includes tablet/desktop widths and System appearance.

Workflow coverage includes projects, tasks, completion, income, savings, salaries, overspend rejection, settlements, custom expense splits, all founder accounts, restricted members, leads, funnels, calendar, reload persistence, cross-session sync, offline queue recovery, lost acknowledgement replay and account cache separation. Tests use temporary databases, never the real account's data.

## Fixes made during this check

- Restarted the stopped local backend and frontend; the login now reaches HAN and the health endpoint reports OK.
- Corrected the malformed selected navigation colour variable.
- Made the bottom navigation follow the theme, restoring Light-mode contrast.
- Increased mobile target filters and percentage progress controls to at least 44px touch targets.
- Moved the privacy banner clear of phone navigation/Quick Actions, gave it a higher stacking level and bounded scrolling.
- Restored arrow/Home/End keyboard selection for login identities.
- Removed the nonfunctional Remember me checkbox; session lifetime remains controlled by the existing server.
- Restored desktop header creation/settings/more actions that were lost in the newer header integration.
- Removed a production database fallback that silently opened another local database when persistent storage was inaccessible. Production now fails closed; the test uses Render mode and a generic denied path, without a special QA-path exception.
- Updated browser selectors to match current labels, made phone sizing the test default and stopped automatic reuse of a stale test server. Routine workflow tests preserve an already-made essential-cookie preference; the phone test explicitly exercises the first-visit preference control.

## Validation and evidence

- Production build: passed (readiness-build-2026-10-27.log).
- Backend: 61 passed after the storage fix (readiness-backend-final-2026-10-27.log).
- Shared PostgreSQL test suite: 12 passed, 2 skipped (readiness-shared-2026-10-27.log). The skipped tests concern real admin/mobile integration and browser MFA. These results do not verify a live Supabase/hosted deployment.
- Browser results: readiness-final-mobile-2026-10-27.log and readiness-final-regressions-2026-10-27.log. Initial failures exposed the keyboard/header issues and test-cookie setup; repeating tests against an already-used temporary database also caused duplicate fixture names. Final runs use a fresh temporary database.
- Focused app/server lint: no errors; existing Sidebar date-render and unused bridge parameter warnings remain. Full repository lint is not clean: an unrelated untracked take_shot.js is not valid UTF-8 and there are warnings in the separate qr-review-generator project. Those files were not rewritten.
- Screenshots: work/mobile-readiness-2026-10-27, including saved-task-320.png and phone/theme screenshots.

## Still required before calling everything ready

1. Confirm the correct real-account password and complete an authenticated real-workspace acceptance check. The guessed demo password did not authenticate.
2. Google SSO remains disabled by configuration (the local config endpoint reports enabled:false).
3. Verify the actual hosted HTTPS URL used on the phone, persistent storage/backups and deployment configuration. http://127.0.0.1:5174 points to this computer only and is not a phone-accessible production URL.
4. Real iPhone/Android keyboard, safe-area, installation and push behavior remain untested on physical devices. Chromium mobile emulation does not establish iOS Safari/native app acceptance.

Existing local work and unrelated files were preserved. No new push or deployment was performed by this check. Fixes are local until released.

Final browser total: all 29 distinct checks passed across the final runs (18 completed before the interrupted combined run, followed by 11 successful regression/theme checks). The regression run completed with 11 passed in 1.4 minutes. git diff --check passed.

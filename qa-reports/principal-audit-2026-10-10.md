# HAN principal product audit — 10 October 2026

## Acceptance status

Fixes implemented and independently tested. Full real-account production acceptance is **pending**, not complete. The referenced Harsha credential was not supplied in the available conversation or attachments. No credentials were guessed, extracted from local configuration, reset, or hardcoded. Real workspace records were not created, edited, or deleted. Authenticated checks used the existing isolated temporary test database and its normal login interface.

Real application: http://127.0.0.1:5174/

The live backend originally returned HTTP 403 with `Origin not allowed.` when sent the development application's Origin header. After identifying its standard server entry point, I restarted the local backend and verified that the same request now returns the expected HTTP 401 `Please sign in.` with the exact 5174 allow-origin header. Normal unauthenticated session requests return 401 by design; React StrictMode can duplicate development mount requests. These are separate from the confirmed and corrected origin rejection.

## Defects and fixes

| Defect | Root cause | Implemented correction |
|---|---|---|
| Login writes rejected on 5174 | Development origin allowlist included only 5173 | Explicit loopback 5174 development origins; production and configured allowlists retain their existing behavior; Vite now uses 5174 with strict port selection |
| Invalid Dark colors | Semantic tokens referenced themselves | Concrete obsidian, white, silver and border values; missing interactive and overdue tokens defined |
| Unreadable Light inputs and surfaces | Light elevated surfaces and primary button text used dark text token | White surfaces and contrasting button text |
| Theme classes and dark utilities disagreed | Tailwind dark variant used system preference rather than selected class | Class-driven dark variant and centralized theme application |
| System theme stopped tracking OS changes | Theme handler ran only on selection | Media-query change listener; cross-tab preference updates |
| Light Home/header/navigation unreadable | Fixed black backgrounds and fixed white active labels | Semantic surfaces, text and navigation colors |
| Quick Actions, command search, pipeline and dialog controls unreadable | Hardcoded charcoal/light surfaces paired with theme-dependent text | Targeted semantic component updates, including 44px dialog close control |
| Creation shortcut could cancel its own form opening | Timer cleanup ran after clearing creation flag changed effect dependencies | Initialize editing state from creation intent and clear consumed flag separately |
| State hydration could still crash | Array normalization accepted non-array values; notification processing preceded normalization | Normalize array fields before notifications and derived lists |
| Misleading dashboard numbers | Empty pipeline fell back to 24 leads, 33% conversion and ₹4.2L; financial percentages were literal strings | Real counts, zero empty values, accurate all-time income labels; remove fabricated percentage trends |
| Expense reporting included voids | Client sum included all expense rows | Use authoritative finance totals and exclude voids from fallback sums |
| Analytics omitted valid stages | Analytics used Qualified/Proposal instead of Interested/Follow Up | Canonical pipeline stages |
| Login controls advertised unsupported persistence | Remember me checkbox had no effect on login API/session | Remove misleading option and provide appearance selector |
| Short login layout risked shrinking/clipping | Flex child shrink and full-height minimum | Non-shrinking form content and natural constrained-height scrolling |
| Notification covered Quick Actions | Both floating surfaces occupied bottom 80px | Place notification above the shortcut; keep shortcut label on one line |

## Files changed in this pass

These are this pass's files, not an attribution of all existing uncommitted changes:

- `server/app.mjs`
- `vite.config.ts`
- `src/App.tsx`
- `src/main.tsx`
- `src/index.css`
- `src/styles/theme.css`
- `src/utils/theme.ts` (new)
- `src/context/AppContext.tsx`
- `src/screens/LoginScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/Workspace.tsx`
- `src/components/ui/BottomNavigation.tsx`
- `src/components/ui/ScreenHeader.tsx`
- `src/components/ui/ProjectCard.tsx`
- `src/components/ui/QuickActionHub.tsx`
- `src/components/ui/CommandPaletteModal.tsx`
- `src/components/ui/MoneyOverview.tsx`
- `src/components/ui/KanbanPipeline.tsx`
- `src/components/ui/Modal.tsx`
- `tests/api.test.mjs`
- `tests/mobile/theme-regression.spec.ts` (new)
- This audit report.

## Validation

- Production build passed on the final functional source.
- Lint passed without warnings on the final functional source.
- All 58 backend tests passed: authentication, session revocation, origin rejection, permissions, persistence, stale edits, idempotency, ledger protection, salary corrections, expense allocation, settlements and exports.
- Full browser suite passed all 27 tests after core fixes, using an isolated temporary database.
- Final targeted browser rerun passed all 12 tests covering finance, creation/navigation, command search, permissions, hydration, theme persistence, System preference changes and responsive screenshots. The final seven-test rerun after floating-alert and command-icon refinements also passed (26.2 seconds); output is retained in `qa-reports/principal-final-browser.log`.
- Final settled screenshot rerun passed both theme/hydration tests (17.4 seconds); captures disable transitions so the images show the committed appearance rather than an intermediate animation frame. Output is retained in `qa-reports/principal-final-themes.log`. Settled Appearance Dark, command icons, Home and constrained Money screenshots were inspected again.
- Final diff whitespace check passed.
- Login values survive Light/Dark/System changes. Input icon padding is 40px. Sign in can scroll fully into the 400×498 viewport. Selected radio labels remain readable.
- No previous development-module 500 error reproduced in successful builds or browser workflow checks.

### Viewport scope

Login and primary screen responsive checks: 320×568, 360×800, 375×812, 390×844, 400×498, 430×932, 768×1024, 1440×900. Existing owner create/save/reload workflows also ran at 393×852 and the five existing mobile sizes. The screenshot test checks document overflow and visible navigation; it is not a claim that every secondary screen and interaction was exercised at every dimension.

### Screenshot evidence

Files are in `work/principal-audit/`. Direct rendered inspection also used the actual 5174 login and the isolated 3101 authenticated app.

Manually inspected captured images include Light and Dark login, Home, Money, Work, Growth, You, New Project, New Lead and Quick Actions. Also inspected final `Project-Details-Light.png`, `Pipeline-Light.png`, `Appearance-Dark.png`, `Command-Search-Light.png`, `Home-Light-320.png`, and `Money-Dark-400.png`. Earlier screenshots revealed defects and were regenerated after fixes. Screenshots of authenticated screens use test records and must not be represented as Harsha's real business data.

## Remaining verification and limitations

1. Authenticate Harsha normally at http://127.0.0.1:5174/. The backend origin correction is now active; the account credential is still missing from this conversation.
2. Audit every real-account accessible route and record-specific workflow; the isolated suite cannot establish actual live account readiness, permissions/configuration or all production records.
3. Actual password changes, external push delivery, external SSO configuration, and native-device safe areas were not validated end to end. Google SSO and recovery currently show configuration/admin guidance.
4. Desktop retains the existing 480px mobile application layout. Desktop fit was tested; a broad desktop information architecture redesign was not performed.
5. Every secondary screen, empty/error/loading state and all touch interactions have not been visually reviewed at every viewport. Do not infer comprehensive production acceptance from passing automated tests.

Existing uncommitted changes were preserved. No commit, push or deployment was performed.

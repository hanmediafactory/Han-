# HAN test execution

From repository root, Node 24 or newer:

```powershell
npm ci
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:mobile
```

The Playwright config starts its isolated test server on port 3101; avoid another process on that port. Test databases are disposable and do not target the production URL. Founder browser tests temporarily grant permissions only to their test fixture, then restore them. Credential startup tests use random private test values.

Run production preflight only with the actual deployment environment; local preflight without deployment variables reported four errors and five warnings and does not characterize live settings. Read deploy/RENDER.md before migration. Do not run --reset-existing during ordinary startup.

Final logs: evidence/api-final.txt, evidence/browser-final.json and evidence/browser-final.txt. Build and lint passed. Deployment, physical devices and restore drill remain blocked/unexecuted as recorded in the master report.

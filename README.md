# HAN

Android-first team workspace for projects, tasks, finances and client follow-up.

Use Node 24. Install with npm ci; verify with npm run lint, npm test, npm run build and npm run test:mobile. Start the backend with npm start and the development frontend with npm run dev.

See deploy/DEPLOYMENT.md for Android packaging, secure account provisioning, Firebase push, offline behavior, backup/recovery, deployment and release gates. Tests use isolated temporary databases.

Local demo: build, run npm run demo, then open http://127.0.0.1:3102. Sign in to any demo account with DemoOnly2026!. Sample data is separate from the normal workspace and persists between demo runs. Never use demo credentials for production.

Money: income supplies funds; expenses and manually recorded salaries spend funds; confirmed savings transfers remain protected and cannot be spent. Salary corrections update their linked expense atomically. Live updates keep open workspaces synchronized.

Production release builds require a real HTTPS backend and your private signing configuration. A debug build is for local testing and is not a store-ready release.

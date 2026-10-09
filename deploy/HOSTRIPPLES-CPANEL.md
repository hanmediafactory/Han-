# Complete Deployment Guide for Hostripples cPanel Node.js

> **Target Domain**: `https://han.avml.in`  
> **Primary Domain**: `avml.in`  
> **Server IP Address**: `148.113.27.24`  
> **cPanel Home Directory**: `/home/avmlin`  
> **Application Root Path**: `/home/avmlin/han`  
> **Database File Location**: `/home/avmlin/han_data/han.sqlite` (Outside Public Root)  

---

## Architecture Overview

HAN Command Center operates as a **Single-Domain Application** (`https://han.avml.in`):
- **Frontend**: React static SPA served directly from `dist/` by the Express web server.
- **Backend API**: Express REST endpoints and real-time Server-Sent Events (SSE) served under `/api/*`.
- **Database**: Embedded SQLite engine (`node:sqlite`) with Write-Ahead Logging (WAL) enabled.
- **Benefits**: Eliminates cross-origin CORS complexity, secures session cookies with `HttpOnly` and `SameSite=Strict`, and simplifies SSL management under a single subdomain.

---

## PHASE 1 — DNS CONFIGURATION

1. Log in to your domain registrar or cPanel **Zone Editor** for `avml.in`.
2. Add a new **A Record** with the following exact details:
   - **Host / Name**: `han` *(this creates the subdomain `han.avml.in`)*
   - **Type**: `A`
   - **Record / IPv4 Address**: `148.113.27.24`
   - **TTL**: `3600` (1 Hour)
3. Save the DNS record. Allow up to 5 to 15 minutes for global DNS propagation.

---

## PHASE 2 — SSL / HTTPS CERTIFICATE

1. Log in to **cPanel** for `avml.in`.
2. Navigate to **Security** → **SSL/TLS Status** (or **Let's Encrypt SSL** / **AutoSSL**).
3. Find `han.avml.in` in the list of domains.
4. Click **Run AutoSSL** (or **Issue Certificate**).
5. Verify HTTPS is active by navigating to `https://han.avml.in` in a web browser once the Node.js application is created. A valid padlock icon will appear.

---

## PHASE 3 — CREATE NODE.JS APPLICATION IN cPANEL

1. In cPanel, navigate to **Software** → **Setup Node.js App**.
2. Click **Create Application** and fill out the fields:

| Field Name | Value to Enter |
| :--- | :--- |
| **Node.js Version** | **24.x** *(Fallback: **22.x LTS** if 24.x is not listed)* |
| **Application Mode** | **Production** |
| **Application Root** | `han` *(expands to `/home/avmlin/han`)* |
| **Application URL** | `han.avml.in` |
| **Application Startup File** | `server/app.mjs` |

3. Scroll down to **Environment variables** and click **Add Variable** for each entry:

| Variable Name | Value |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `HAN_DB_PATH` | `/home/avmlin/han_data/han.sqlite` |
| `HAN_DOMAIN` | `han.avml.in` |
| `HAN_ALLOWED_ORIGINS` | `https://han.avml.in` |
| `TRUST_PROXY` | `1` |

4. Click **Save** at the top right corner.

---

## PHASE 4 — UPLOAD APPLICATION FILES

Build the frontend on your local development machine first (Phase 7), then upload the code to `/home/avmlin/han/` via cPanel **File Manager**, FTP, or SSH.

### Upload Checklist:
- **Directories**:
  - `dist/` *(contains index.html and compiled JS/CSS assets)*
  - `server/` *(contains app.mjs, index.mjs, db.mjs, provision.mjs, schema.sql, etc.)*
  - `scripts/` *(contains backup and preflight tools)*
- **Files**:
  - `package.json`
  - `package-lock.json`
- **Do NOT Upload**:
  - `node_modules/` *(installed on server in Phase 6)*
  - `.git/`
  - `.env` *(environment variables are managed in cPanel App Manager)*

---

## PHASE 5 — DATABASE DIRECTORY & PERMISSIONS

In cPanel **Terminal** or SSH:

```bash
# Create database storage directory outside the web-accessible directory
mkdir -p /home/avmlin/han_data

# Set directory permissions so Node.js can write SQLite database and WAL files
chmod 755 /home/avmlin/han_data
```

> **Security Rule**: The SQLite database (`han.sqlite`) is placed inside `/home/avmlin/han_data/` which is **outside** `/public_html` and `/dist`, preventing public HTTP access to raw database files.

---

## PHASE 6 — INSTALL PRODUCTION DEPENDENCIES

In cPanel **Setup Node.js App**, click **Run npm Install** or execute in cPanel Terminal / SSH:

```bash
cd /home/avmlin/han
npm install --omit=dev
```

This installs production packages (`express`, `helmet`, `zod`, `express-rate-limit`, etc.) while skipping heavy dev toolchain packages.

---

## PHASE 7 — BUILD FRONTEND

Build the production frontend on your **local machine** before uploading to the server:

```powershell
# Run locally on dev machine:
npm run build
```

- This command runs `tsc -b && vite build` and generates the optimized production bundle in the local `dist/` directory.
- Once completed, upload the entire `dist/` folder to `/home/avmlin/han/dist/` on Hostripples cPanel.

---

## PHASE 8 — PROVISION DATABASE AND INITIAL USER ACCOUNTS

Execute account provisioning in cPanel **Terminal** or SSH:

```bash
cd /home/avmlin/han
HAN_HARSHA_PASSWORD="YourStrongPassword1!" \
HAN_NIHAAL_PASSWORD="YourStrongPassword2!" \
HAN_LALITHA_PASSWORD="YourStrongPassword3!" \
HAN_ABHILASH_PASSWORD="YourStrongPassword4!" \
node server/provision.mjs
```

### What Provisioning Does:
1. **Schema Initialization**: Automatically creates `/home/avmlin/han_data/han.sqlite` and applies table definitions from `server/schema.sql` if the database does not exist yet.
2. **Account Password Security**: Hashes individual passwords for all 4 default team accounts (`Harsha` [Owner], `Nihaal` [Member], `Lalitha` [Member], `Abhilash` [Member]) using `scrypt` with individual random 32-byte salts.
3. **Session Revocation**: Clears existing sessions so users must authenticate with their newly set passwords.
4. **Data Safety**: Does **not** drop or overwrite tasks, projects, leads, or financial records. It is 100% safe to run on a fresh production server or when updating user passwords.

---

## PHASE 9 — RESTART APPLICATION

1. Go to cPanel → **Software** → **Setup Node.js App**.
2. Locate the `han.avml.in` application entry.
3. Click **Restart Application**.
4. Open `https://han.avml.in` in your browser.

---

## PHASE 10 — PRODUCTION SMOKE-TEST CHECKLIST

After restarting, perform this complete validation procedure on `https://han.avml.in`:

- [ ] **HTTPS Verification**: Confirm browser shows secure SSL padlock icon.
- [ ] **Authentication**: Log in as `Harsha` using `HAN_HARSHA_PASSWORD`. Verify session token cookie `han_session` is set as `HttpOnly`, `Secure`, `SameSite=Strict`.
- [ ] **Dashboard**: Verify workspace summary widgets load cleanly without console errors.
- [ ] **Team**: Check team profile list and ensure active status displays correctly.
- [ ] **Projects**: Create a test project, assign team members, and check progress tracking.
- [ ] **Tasks**: Add a task under a project, mark status `COMPLETED`, and confirm progress recalculates.
- [ ] **Leads**: Add a new lead, update deal status, and verify pipeline value summary.
- [ ] **Income**: Add an income entry and check live total balance calculation.
- [ ] **Expenses**: Add an expense entry and verify net profit updates.
- [ ] **Savings**: Move spendable funds into protected savings and verify they are locked.
- [ ] **Salary Assignments**: Review team member salary configuration in admin settings.
- [ ] **Salary Payments**: Record a salary payment and verify atomic deduction from spendable funds and creation of matching expense item.
- [ ] **Analytics**: Open Business Intelligence screen (`/#analytics`) and review task completion rate and financial runway.
- [ ] **Notifications**: Verify system notification bell badge updates on workspace changes.
- [ ] **API Requests**: Verify relative requests to `/api/*` return HTTP status `200 OK` with `X-Request-ID` headers.
- [ ] **SSE / EventSource**: Verify live connection to `/api/events` establishes with status `200` (`text/event-stream`).
- [ ] **Role Restrictions**: Log in as a `MEMBER` (e.g. `Nihaal`) and verify admin settings and sensitive financial modifications are restricted.
- [ ] **Mobile Browser**: Open `https://han.avml.in` on a mobile device and test responsive menu navigation and touch interactions.
- [ ] **Database Persistence**: Restart the application in cPanel and confirm created projects and records remain intact.
- [ ] **Logout**: Click Logout and verify session cookie is cleared and redirected to identity selector.

---

## PHASE 11 — BACKUP PROCEDURE

SQLite uses Write-Ahead Logging (`PRAGMA journal_mode=WAL`), which produces `han.sqlite`, `han.sqlite-wal`, and `han.sqlite-shm` files during operation.

### Safe Backup Methods:

1. **Automated Server Cron Job** (Recommended):
   Set up a cPanel **Cron Job** running daily at 2:00 AM:
   ```bash
   node /home/avmlin/han/server/backup-loop.mjs
   ```
   *(This uses Node's native `DatabaseSync.prototype.backup()` API, creating point-in-time consistent SQLite snapshots without locking issues).*

2. **In-App Download (Owner Only)**:
   Log in as `Harsha` (Owner) → Go to **You** → Click **Download System Backup**.

---

## PHASE 12 — ROLLBACK PROCEDURE

If a deployment update fails or issues arise:

1. Go to cPanel → **Setup Node.js App** → Click **Stop Application**.
2. To restore code: Re-upload the previously known working `dist/` and `server/` folders.
3. To restore database: Replace `/home/avmlin/han_data/han.sqlite` with your latest backup `.sqlite` snapshot file.
4. Click **Start Application** / **Restart Application** in cPanel.

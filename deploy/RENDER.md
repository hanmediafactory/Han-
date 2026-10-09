# 🚀 Render Deployment Guide for HAN Workspace

This document provides the exact production procedures to deploy **HAN Workspace** to **Render** using a clean, persistent, single-service Web architecture.

---

## 1. Architecture Overview

- **Service Type**: Single Render **Web Service** (Node.js runtime).
- **Backend**: Node.js + Express (`server/index.mjs` / `server/app.mjs`).
- **Frontend**: Vite + React compiled to `dist/`, statically served directly by Express with SPA route fallback (`/{*path}`).
- **Database**: SQLite embedded engine (`node:sqlite`) stored on a **Render Persistent Disk**.
- **API Baseline**: `/api/*` relative routes.
- **Port & Host Binding**: Listens on `$PORT` (dynamically provided by Render) on host `0.0.0.0`.

```
                    ┌──────────────────────────────────────────────┐
                    │               Render Web Service             │
                    │                                              │
                    │   ┌──────────────────────────────────────┐   │
                    │   │        Express Backend (Node.js)     │   │
  Client Request ──►│   │  /api/* ──────► API Controllers      │   │
                    │   │  /*     ──────► Static dist/ index   │   │
                    │   └──────────────────┬───────────────────┘   │
                    │                      │                       │
                    └──────────────────────┼───────────────────────┘
                                           │
                                           ▼
                           ┌───────────────────────────────┐
                           │    Render Persistent Disk     │
                           │     /var/data/han.sqlite      │
                           └───────────────────────────────┘
```

---

## 2. SQLite Persistence on Render

### Ephemeral Filesystem Risk
Standard Render Web Service container filesystems are **ephemeral**. Every deployment, configuration change, or container restart replaces the container filesystem, which would wipe an un-mounted SQLite database file.

### Persistent Disk Solution
To ensure enterprise data safety, HAN relies on a **Render Persistent Disk**:
- **Mount Path**: `/var/data`
- **Database File**: `/var/data/han.sqlite`
- **Environment Variable**: `HAN_DB_PATH=/var/data/han.sqlite`
- **Single Instance Enforcement**: Render automatically restricts persistent-disk attached Web Services to **1 instance**. This prevents multi-node filesystem write contention.
- **WAL & Concurrency**: The application enables WAL mode (`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;`) in `server/db.mjs`. `node:sqlite` within the single Node process manages concurrent HTTP requests safely.
- **Auto-directory Creation**: `server/db.mjs` calls `mkdirSync(dirname(dbPath), { recursive: true })` on startup, ensuring `/var/data` is initialized automatically.

---

## 3. Render Configuration & Service Settings

### Method A: Automated Deployment via `render.yaml` (Recommended)

The repository includes a root `render.yaml` Blueprint file.

1. Connect your GitHub repository in the **Render Dashboard**.
2. Select **Blueprints** > **New Blueprint Instance**.
3. Render will auto-detect `render.yaml`.
4. Fill in the non-synced environment variables (`HAN_DOMAIN`, `HAN_ALLOWED_ORIGINS`, and user passwords).

### Method B: Manual Web Service Creation

If creating the Web Service manually via Render UI:

| Setting | Value |
|---|---|
| **Service Type** | Web Service |
| **Name** | `han-workspace` |
| **Environment** | `Node` |
| **Region** | Singapore (`ap-southeast-1`) or closest to users |
| **Branch** | `main` |
| **Root Directory** | `.` (Repository root) |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `node server/provision.mjs && npm start` |
| **Instance Type** | **Starter** or higher (Required for Persistent Disk support) |
| **Health Check Path** | `/api/health` |

---

## 4. Persistent Disk Setup

In the Render Web Service settings:
1. Navigate to **Disks** > **Add Disk**.
2. **Name**: `han-sqlite-data`
3. **Mount Path**: `/var/data`
4. **Size**: `1 GB` (or larger based on storage requirements).

---

## 5. Environment Variables Checklist

Configure the following environment variables under **Web Service > Environment**:

| Variable | Recommended Production Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production security, cookie flags, and logging |
| `NODE_VERSION` | `24.18.0` | Forces Node.js 24+ required by HAN preflight |
| `HOST` | `0.0.0.0` | Binds server to all container network interfaces |
| `TRUST_PROXY` | `1` | Enables reverse proxy protocol & secure cookie awareness |
| `HAN_DB_PATH` | `/var/data/han.sqlite` | Path to SQLite database file on persistent disk |
| `HAN_DOMAIN` | `han-workspace.onrender.com` | Primary production domain (update when attaching custom domain) |
| `HAN_ALLOWED_ORIGINS` | `https://han-workspace.onrender.com` | Allowed CORS origins (comma-separated if multiple) |
| `HAN_HARSHA_PASSWORD` | `<STRONG_PRODUCTION_SECRET>` | Initial password for Harsha (Owner account) |
| `HAN_NIHAAL_PASSWORD` | `<STRONG_PRODUCTION_SECRET>` | Initial password for Nihaal |
| `HAN_LALITHA_PASSWORD` | `<STRONG_PRODUCTION_SECRET>` | Initial password for Lalitha |
| `HAN_ABHILASH_PASSWORD` | `<STRONG_PRODUCTION_SECRET>` | Initial password for Abhilash |

> ⚠️ **SECURITY WARNING**: Never commit real production passwords or session secrets to Git. Always use distinct 12+ character strong passwords for production identities.

---

## 6. Health Check Endpoint

Render uses the health check path to monitor container readiness before routing traffic:

- **Path**: `/api/health`
- **HTTP Method**: `GET`
- **Expected Status**: `200 OK`
- **Response Format**:
  ```json
  {
    "status": "ok",
    "version": "1.0.0",
    "environment": "production",
    "database": { "connected": true }
  }
  ```

---

## 7. Custom Domain Setup (`han.avml.in`)

When ready to route `han.avml.in` to Render:

1. In Render Dashboard, go to **Web Service > Settings > Custom Domains**.
2. Click **Add Custom Domain** and enter `han.avml.in`.
3. In your DNS Provider for `avml.in`:
   - Create a `CNAME` record:
     - **Name**: `han`
     - **Target**: `han-workspace.onrender.com` (your Render service default URL).
4. Update Render Environment Variables:
   - `HAN_DOMAIN`: `han.avml.in`
   - `HAN_ALLOWED_ORIGINS`: `https://han.avml.in,https://han-workspace.onrender.com`
5. Render automatically issues and renews a free TLS certificate for `han.avml.in`.

---

## 8. Deployment Verification

After deployment completes:

1. **Verify Health Endpoint**:
   ```bash
   curl -i https://han-workspace.onrender.com/api/health
   ```
2. **Verify Readiness Endpoint**:
   ```bash
   curl -i https://han-workspace.onrender.com/api/ready
   ```
   Should return `{"status":"ready"}` with HTTP 200 once provisioned.
3. **Run Remote Preflight (Local Verification)**:
   ```powershell
   $env:NODE_ENV="production"; $env:HAN_DOMAIN="han-workspace.onrender.com"; $env:HAN_ALLOWED_ORIGINS="https://han-workspace.onrender.com"; $env:HAN_DB_PATH="/var/data/han.sqlite"; node scripts/preflight.mjs
   ```

---

## 9. Backup & Disaster Recovery

1. **In-App API Backup**:
   An Owner account can download a live hot-backup of the SQLite database at any time via:
   `GET /api/backup` (authenticated session required).
2. **Persistent Disk Snapshots**:
   Render provides automated disk snapshot capabilities for persistent volumes. Snapshots can be restored to a new volume if needed.

---

## 10. Rollback Considerations

- **Code Rollback**: Render allows instant rollback to previous successful build commits in the Render Dashboard (**Deploys** tab).
- **Database Schema**: Because database migrations in `server/seed.mjs` and `server/db.mjs` are forward-compatible and additive, rolling back code binaries will not corrupt existing data on the persistent disk.

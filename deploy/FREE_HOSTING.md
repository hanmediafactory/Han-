# 🎁 100% Free Hosting Guide for HAN ($0/Month Forever)

Deploy the entire HAN workspace app for Harsha, Nihaal, Lalitha, and your 4th team member **completely free** with zero monthly costs.

---

## 3 Ways to Host Everything 100% Free

| Method | Server Cost | DB / Storage Cost | Domain Cost | Uptime / Sleep | Best For |
|---|---|---|---|---|---|
| **1. Oracle Cloud Always Free VPS** ⭐ *(Recommended)* | **$0** | **$0** (200GB disk) | **$0** (DuckDNS / Free DNS) | 24/7 (Never sleeps) | Full Docker + SQLite stack with zero code changes |
| **2. Render + Vercel + Cloudflare R2** | **$0** | **$0** (10GB R2 free) | **$0** (`*.vercel.app` + `*.onrender.com`) | Render sleeps after 15 min inactivity (wakes in 30s) | No server setup / pure PaaS cloud deployment |
| **3. Cloudflare Tunnel (Home PC/Laptop)** | **$0** | **$0** (Local disk) | **$0** (`*.trycloudflare.com` or custom) | Runs when your PC is on | Zero signup, instant setup from your existing PC |

---

## Method 1: Oracle Cloud Always Free VPS (Recommended)

Oracle offers an **Always Free Tier** with incredible specs that comfortably hosts HAN for 100+ users without spending a cent.

### Specs Included Free Forever
- **CPU**: 4 Ampere ARM Cores
- **RAM**: 24 GB RAM
- **Storage**: 200 GB NVMe Disk
- **Bandwidth**: 10 TB/month

### Step 1: Create an Oracle Cloud Account
1. Go to [cloud.oracle.com/free](https://cloud.oracle.com/free) and register.
2. Provide credit card for identity verification (Oracle authorizes ~$1 and immediately refunds it).
3. Select your home region (e.g. `ap-mumbai-1` or closest to India/your location).

### Step 2: Create a Free Ampere Compute Instance
1. In Oracle Cloud Console, go to **Compute > Instances > Create Instance**.
2. **Image**: Select **Ubuntu 22.04 LTS (ARM aarch64)**.
3. **Shape**: Select **Ampere VM.Standard.A1.Flex** (Allocate 2 to 4 OCPUs and 12 to 24 GB RAM).
4. **Networking**: Create new VCN with Public IP.
5. **SSH Key**: Download or paste your public SSH key (`cat ~/.ssh/id_rsa.pub`).
6. Click **Create**.

### Step 3: Configure Firewall / Security List
In Oracle Cloud Console:
1. Go to **Networking > Virtual Cloud Networks > your VCN > Security Lists > Default Security List**.
2. Click **Add Ingress Rules**:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: TCP
   - **Destination Port Range**: `80, 443`
3. SSH into your instance:
   ```bash
   ssh ubuntu@YOUR_ORACLE_PUBLIC_IP
   ```
4. Open ports in Ubuntu `iptables`/`ufw`:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

### Step 4: Get a Free Domain (DuckDNS)
1. Go to [duckdns.org](https://www.duckdns.org) and log in.
2. Add a domain name, e.g. `han-workspace`.
3. Point it to your Oracle Public IP (`han-workspace.duckdns.org`).

### Step 5: Deploy Docker & HAN
On your Oracle VPS:
```bash
# Install Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker

# Clone repository or upload files
git clone YOUR_REPO_URL /opt/han
cd /opt/han

# Create production .env file
cat > .env << 'EOF'
HAN_DOMAIN=han-workspace.duckdns.org
HAN_TIMEZONE=Asia/Kolkata
NODE_ENV=production
HOST=0.0.0.0
TRUST_PROXY=1
HAN_DB_PATH=/app/data/han.sqlite
HAN_ALLOWED_ORIGINS=https://han-workspace.duckdns.org
EOF

# Build and start services
docker compose up -d --build
```
Caddy will automatically fetch a free HTTPS SSL certificate from Let's Encrypt for `han-workspace.duckdns.org`!

---

## Method 2: Render (Backend) + Vercel (Frontend) + Cloudflare R2 (Storage)

If you don't want to manage a VPS, use a free serverless PaaS combination.

### 1. Frontend on Vercel ($0)
1. Connect your GitHub repository to [vercel.com](https://vercel.com).
2. Set Build Command: `npm run build`
3. Output Directory: `dist`
4. Deploy! You get `https://han-todo.vercel.app` with free SSL and global CDN.

### 2. Backend on Render Free Web Service ($0)
1. Go to [render.com](https://render.com) and create a **Web Service**.
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Add Environment Variables:
   - `NODE_ENV=production`
   - `HAN_ALLOWED_ORIGINS=https://han-todo.vercel.app`
5. Render gives you `https://han-backend.onrender.com`.

---

## Method 3: Cloudflare Tunnel from your Home Computer ($0)

If you have a computer/laptop at home that stays running, host HAN directly on your computer and make it available worldwide for free using **Cloudflare Tunnels**.

### Step 1: Install Cloudflare Tunnel (`cloudflared`)
Download `cloudflared` on your machine:
- **Windows**: `winget install Cloudflare.cloudflared`
- **Mac**: `brew install cloudflared`
- **Linux**: `curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb && sudo dpkg -i cloudflared.deb`

### Step 2: Launch HAN Server Locally
Start HAN via Docker Compose or node on your PC:
```bash
docker compose up -d --build
```

### Step 3: Run Free Tunnel
```bash
cloudflared tunnel --url http://localhost:3001
```
Cloudflare will generate a public URL like:
`https://random-words-1234.trycloudflare.com`

Share this link with Harsha, Nihaal, and Lalitha. They can access the app from anywhere in the world on mobile or desktop with 100% free HTTPS!

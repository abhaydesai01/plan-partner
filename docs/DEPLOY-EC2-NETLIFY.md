# Deploy Plan Partner: Backend on AWS EC2 + Frontend on Netlify

Step-by-step guide to deploy:
- **Backend (Node/Express API)** → AWS EC2
- **Frontend (Vite/React)** → Netlify
- **MongoDB** → MongoDB Atlas (cloud)
- **Auth** → Supabase (unchanged)

---

## Part 1: Prerequisites

Before starting, ensure you have:

- [ ] **AWS account** (for EC2)
- [ ] **Netlify account** (free tier works)
- [ ] **MongoDB Atlas** cluster (free tier: https://cloud.mongodb.com)
- [ ] **Supabase** project (auth)
- [ ] **GitHub** repo with your code pushed

---

## Part 2: Deploy Backend to EC2

### Step 2.1: Launch an EC2 instance

1. Go to **AWS Console** → **EC2** → **Launch instance**.
2. **Name:** `plan-partner-api` (or any name).
3. **AMI:** Amazon Linux 2023 (or Ubuntu 22.04).
4. **Instance type:** `t2.micro` (free tier) or `t3.small` for better performance.
5. **Key pair:** Create new or select existing. **Download the `.pem` file** — you need it to SSH.
6. **Network settings:**
   - Create/select a security group.
   - **Inbound rules:** Add:
     - SSH (22) — from your IP (or 0.0.0.0/0 for testing; restrict in prod).
     - Custom TCP (3001) — from 0.0.0.0/0 (so Netlify can reach your API).
7. **Storage:** 8 GB default is fine.
8. Click **Launch instance**.

### Step 2.2: Connect to EC2 via SSH

```bash
# Make key readable (only you)
chmod 400 /path/to/your-key.pem

# SSH (replace with your instance's public IP or DNS)
ssh -i /path/to/your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

- **Amazon Linux:** user is `ec2-user`
- **Ubuntu:** user is `ubuntu`

### Step 2.3: Install Node.js on EC2

**Amazon Linux 2023:**
```bash
sudo dnf install -y nodejs npm
node -v   # Should show v18 or v20
```

**Ubuntu:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
```

### Step 2.4: Install PM2 (process manager)

```bash
sudo npm install -g pm2
pm2 -v
```

### Step 2.5: Clone your repo and build the server

```bash
# Clone (replace with your repo URL)
git clone https://github.com/YOUR_USERNAME/plan-partner.git
cd plan-partner/server

# Install dependencies and build
npm install
npm run build
```

### Step 2.6: Create `.env` on EC2 (required)

**The `.env` file is gitignored and is not deployed.** You must create it on the EC2 server.

SSH into your EC2 instance, then:

```bash
cd /home/ubuntu/plan-partner/server
nano .env
```

Paste (replace with your real values):

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/plan-partner?retryWrites=true&w=majority
JWT_SECRET=your-secret-at-least-32-characters-long
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional but recommended for notifications:
CRON_SECRET=your-cron-secret
VAPID_PUBLIC_KEY=your-vapid-public
VAPID_PRIVATE_KEY=your-vapid-private

# Optional: AI meal analysis
# GEMINI_API_KEY=your-gemini-key
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`.

**Or copy from your local machine:**
```bash
# From your local machine (replace with your key and EC2 IP):
scp -i your-key.pem server/.env ubuntu@YOUR_EC2_IP:/home/ubuntu/plan-partner/server/.env
```

**Important:** Never commit `.env` to git. Keep it only on the server.

### Step 2.7: Start the API with PM2

```bash
cd /home/ec2-user/plan-partner/server   # or your actual path
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # Follow the command it prints to enable auto-start on reboot
```

### Step 2.8: Verify the API is running

```bash
pm2 status
pm2 logs plan-partner-api
```

From your **local machine** (replace with your EC2 public IP):

```bash
curl http://YOUR_EC2_IP:3001/api/health
```

Expected: `{"ok":true}` or similar.

### Step 2.9: Note your EC2 URL

Your backend API base URL is: **`http://YOUR_EC2_PUBLIC_IP:3001`**

You will use this as `BACKEND_URL` in Netlify.

---

## Part 3: Deploy Frontend to Netlify

### Step 3.1: Connect the repo to Netlify

1. Go to [netlify.com](https://www.netlify.com) and sign in.
2. **Add new site** → **Import an existing project**.
3. Connect **GitHub** (or GitLab/Bitbucket).
4. Select your **plan-partner** repository.
5. Netlify will detect the build settings from `netlify.toml`.

### Step 3.2: Configure build settings

The repo has `netlify.toml`. Verify or set:

| Setting | Value |
|--------|--------|
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |
| **Functions directory** | `netlify/functions` |

### Step 3.3: Set environment variables

1. In Netlify: **Site settings** → **Environment variables** → **Add a variable** (or **Add variables** → **Add single**).
2. Add these variables:

| Key | Value | Scopes |
|-----|--------|--------|
| `VITE_API_URL` | `/.netlify/functions/api` | All |
| `BACKEND_URL` | `http://YOUR_EC2_PUBLIC_IP:3001` | All |

**Replace `YOUR_EC2_PUBLIC_IP`** with your actual EC2 public IP (e.g. `13.233.110.45`).

- **VITE_API_URL:** Frontend calls this (HTTPS). The Netlify function proxies to your EC2 backend.
- **BACKEND_URL:** No trailing slash. The proxy uses this to reach your API.

3. **Optional** (for push notifications, Supabase, etc.):

| Key | Value |
|-----|--------|
| `VITE_VAPID_PUBLIC_KEY` | Same as server `VAPID_PUBLIC_KEY` |
| `VITE_APP_URL` | `https://your-site.netlify.app` (or your custom domain) |
| `VITE_SUPABASE_URL` | Your Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon key |

4. Click **Save** (or **Create**).

### Step 3.4: Deploy

1. Click **Deploy site** (or push a commit; Netlify auto-deploys on push).
2. Wait for the build to finish (2–4 minutes).
3. Netlify will show a URL like `https://random-name-12345.netlify.app`.

### Step 3.5: Test the app

1. Open the Netlify URL.
2. Try logging in (patient or doctor).
3. If you see errors, check:
   - **Netlify function logs:** Site → Functions → api → Logs
   - **EC2 security group:** Port 3001 must allow inbound from 0.0.0.0/0 (or at least Netlify IPs)
   - **BACKEND_URL:** Correct EC2 IP, no trailing slash

---

## Part 4: Optional — Custom domain and HTTPS on EC2

Your frontend is HTTPS (Netlify). Your backend is HTTP. For production, consider:

### Option A: Use HTTP backend (simplest)

- Netlify proxy calls `http://EC2_IP:3001` from the server.
- Browsers never talk to EC2 directly (no Mixed Content).
- This works; many apps use this setup.

### Option B: HTTPS on EC2 (more secure)

1. Get a domain (e.g. `api.yourdomain.com`).
2. Point it to your EC2 IP (A record).
3. Use **Let's Encrypt** with Certbot to get a free SSL cert on EC2.
4. Run Nginx as reverse proxy: Nginx (HTTPS:443) → Node (HTTP:3001).
5. In Netlify, set `BACKEND_URL=https://api.yourdomain.com` (no port).

---

## Part 5: Redeploying

### Backend (EC2)

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
cd plan-partner
git pull
cd server
npm install
npm run build
pm2 restart plan-partner-api
pm2 save
```

### Frontend (Netlify)

- **Auto:** Push to your connected branch; Netlify deploys automatically.
- **Manual:** Netlify → Deploy site → Trigger deploy.

If you change `BACKEND_URL` or other env vars, trigger a new deploy after saving.

---

## Part 6: Troubleshooting

| Issue | What to check |
|-------|----------------|
| **"Production requires MONGODB_URI" / "Current value is localhost"** | `.env` does not exist on EC2 (it's gitignored). Create it in `server/` and add `MONGODB_URI`, `JWT_SECRET`, etc. Then `pm2 delete plan-partner-api && pm2 start ecosystem.config.cjs` |
| **"Set JWT_SECRET in production"** | Add `JWT_SECRET` to `.env` with a real secret (e.g. `openssl rand -base64 32`) |
| **502 Bad Gateway** from Netlify | EC2 API running? `pm2 status` · Port 3001 open in security group? · `BACKEND_URL` correct? |
| **Cannot connect to EC2** | Security group allows TCP 3001 from 0.0.0.0/0 · EC2 has public IP |
| **MongoDB connection failed** | Atlas Network Access: add EC2 IP or 0.0.0.0/0 · Connection string correct in `.env` |
| **Login fails** | Supabase URL and anon key correct · JWT_SECRET set on server |
| **Blank page** | Check browser console · `VITE_API_URL` = `/.netlify/functions/api` |

---

## Summary

| Component | Where | URL |
|-----------|-------|-----|
| **Backend API** | EC2 | `http://YOUR_EC2_IP:3001` (API at `/api`) |
| **Frontend** | Netlify | `https://your-site.netlify.app` |
| **Proxy** | Netlify function | `/.netlify/functions/api` → forwards to EC2 |
| **MongoDB** | Atlas | `MONGODB_URI` in EC2 `.env` |
| **Auth** | Supabase | `SUPABASE_*` in EC2 `.env` and Netlify env |

Flow: **Browser (HTTPS)** → **Netlify** → **Netlify function** → **EC2 (HTTP)** → **MongoDB / Supabase**

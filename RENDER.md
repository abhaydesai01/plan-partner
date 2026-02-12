# Deploy Backend to Render (Web Service)

Use these settings so Render detects an open port and the deploy succeeds.

---

## 1. Create a Web Service

- **Repository:** Connect your repo.
- **Type:** **Web Service** (not Background Worker).
- **Name:** e.g. `plan-partner-api`.

---

## 2. Build & start settings

Set these exactly:

| Setting | Value |
|--------|--------|
| **Root Directory** | `server` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

**Why Root Directory = `server`?**  
So Render runs all commands from the `server/` folder. That way `npm install` and `npm run build` use `server/package.json` and produce `server/dist/`, and `npm start` runs `node dist/index.js` from `server/`.

---

## 3. Environment variables

In **Environment** (or **Environment Variables**), add:

| Key | Value |
|-----|--------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |
| `NODE_ENV` | `production` |

Do **not** set `PORT` — Render sets it automatically. The app reads `PORT` and listens on it, and binds to `0.0.0.0` so Render’s health check can reach it.

---

## 4. Save and deploy

After saving, Render will:

1. **Build:** `cd server` → `npm install` → `npm run build` (creates `dist/`).
2. **Start:** `npm start` → `node dist/index.js` (listens on Render’s `PORT`).
3. **Health check:** Detect the open port and mark the deploy live.

Your API will be at: **`https://<your-service-name>.onrender.com`** (use **`/api`** for the API root, e.g. `https://....onrender.com/api`).

---

## If you still see “no open ports” or timeouts

- Confirm **Root Directory** is **`server`** (no trailing slash).
- Confirm **Start Command** is exactly **`npm start`** (no `cd server`).
- Check **Logs** after deploy: you should see “MongoDB connected” and “Server listening on 0.0.0.0:XXXX”. If the app crashes before that (e.g. bad `MONGODB_URI`), the port never opens.
- Ensure the service type is **Web Service**, not Background Worker.

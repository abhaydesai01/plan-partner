# Deploy Frontend to Netlify

Your **backend** is already running on EC2 (e.g. `http://YOUR_EC2_IP:3001`). This guide deploys the **Vite/React frontend** to Netlify and uses a **Netlify serverless function** to proxy API calls so the browser only makes HTTPS requests (no Mixed Content errors).

---

## 1. How the proxy fixes Mixed Content

- The backend is **HTTP** (e.g. `http://13.233.110.45:3001`). The Netlify site is **HTTPS**.
- Browsers block HTTPS pages from calling HTTP APIs (Mixed Content).
- The repo includes a **Netlify function** (`netlify/functions/api.js`) that runs on Netlify (HTTPS). The frontend calls this function; the function calls your HTTP backend and returns the response. All browser requests stay HTTPS.

---

## 2. Connect the repo to Netlify

1. Go to [netlify.com](https://www.netlify.com) and sign in.
2. **Add new site** → **Import an existing project**.
3. Connect **GitHub** (or GitLab/Bitbucket) and choose the **plan-partner** repository.
4. Netlify will show build settings. Use the values below.

---

## 3. Configure build settings

The repo has a `netlify.toml` that sets build command and publish directory. In Netlify’s **Build settings** you can leave defaults or set:

| Setting | Value |
|--------|--------|
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |
| **Functions directory** | `netlify/functions` (so the proxy function is deployed) |

---

## 4. Set environment variables (required)

1. In Netlify: **Site settings** → **Environment variables** → **Add a variable** (or **Edit variables**).
2. Add **both** of these:

| Key | Value | Scopes |
|-----|--------|--------|
| `VITE_API_URL` | `/.netlify/functions/api` | All (or Production) |
| `BACKEND_URL` | `http://YOUR_EC2_IP:3001` | All (or Production) |

- **VITE_API_URL** – Frontend calls this (HTTPS, same origin). No `/api` at the end.
- **BACKEND_URL** – The proxy uses this to call your EC2 backend. No trailing slash, no `/api` (the function adds `/api` to the path).

Example: if your EC2 IP is `13.233.110.45`, set `BACKEND_URL` = `http://13.233.110.45:3001`.

3. **Save**, then trigger a **new deploy** so the new env vars and the proxy function are used.

---

## 5. Deploy

1. Click **Deploy site** (or push a commit if you already connected the repo; Netlify will build and deploy).
2. Wait for the build to finish. The first deploy may take a couple of minutes.
3. Netlify will show a URL like `https://random-name-12345.netlify.app`. Open it to use the app.

---

## 6. (Optional) Custom domain and HTTPS

- **Custom domain:** Site settings → **Domain management** → **Add custom domain**.
- **HTTPS:** Netlify provides free SSL for your Netlify URL and for custom domains (Let’s Encrypt).

---

## 7. CORS

The proxy runs on Netlify, so the browser only talks to your Netlify domain (HTTPS). The proxy then calls your backend from the server; the backend’s CORS settings don’t affect that server-to-server call.

---

## Summary

| What | Where |
|------|--------|
| **Backend API** | EC2, e.g. `http://YOUR_EC2_IP:3001` (API at `/api`) |
| **Frontend** | Netlify, e.g. `https://your-site.netlify.app` |
| **Proxy** | Netlify function `/.netlify/functions/api` (HTTPS) |
| **Netlify env** | `VITE_API_URL` = `/.netlify/functions/api` · `BACKEND_URL` = `http://YOUR_EC2_IP:3001` |

After deploy, the app calls the proxy over HTTPS; the proxy calls your HTTP backend. No Mixed Content errors.

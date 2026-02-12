# Deploy Plan Partner to AWS (Step by Step)

This guide deploys:
- **Backend (Node/Express API)** → **AWS Elastic Beanstalk**
- **Frontend (Vite/React)** → **S3 + CloudFront**
- **MongoDB** → Keep using **MongoDB Atlas** (no change)
- **Auth** → Keep using **Supabase** (no change)

You need: an **AWS account**, and **MongoDB Atlas** + **Supabase** already set up.

---

## Part 1: Deploy the backend (Elastic Beanstalk)

### 1.1 Install AWS CLI and EB CLI

1. **AWS CLI** (if not installed):
   - Mac: `brew install awscli`
   - Or: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
2. **Elastic Beanstalk CLI**:
   ```bash
   pip install awsebcli
   ```
   Or: `brew install awsebcli`

### 1.2 Configure AWS credentials

```bash
aws configure
```

Enter:
- **AWS Access Key ID** and **Secret** (from AWS Console → IAM → Users → your user → Security credentials → Create access key)
- **Region** (e.g. `us-east-1`)

### 1.3 Build the server locally

From the **project root**:

```bash
cd server
npm ci
npm run build
cd ..
```

This creates `server/dist/`. The deploy zip must include this so EB can run `node dist/index.js` without building on the server.

### 1.4 Create the deploy zip (no node_modules, no .env)

The zip must contain **`package.json`**, **`package-lock.json`**, and the **`dist/`** folder (entire compiled output). Do **not** include `node_modules` or `.env` (EB will run `npm install` and you set env in the console).

From **project root**:

**macOS / Linux:**

```bash
cd server
zip -r ../server-deploy.zip package.json package-lock.json dist/
cd ..
```

**If you prefer to zip the whole server folder but exclude secrets and dev files:**

```bash
cd server
zip -r ../server-deploy.zip . -x "node_modules/*" -x ".env" -x ".env.*" -x ".git/*" -x "*.ts" -x "scripts/*" -x "tsconfig.json"
cd ..
```

**Windows (PowerShell):**

```powershell
cd server
# Build first (from server folder): npm run build
Compress-Archive -Path package.json, package-lock.json, dist -DestinationPath ..\server-deploy.zip -Force
cd ..
```

Then upload **`server-deploy.zip`** in the next step.

### 1.5 Create Elastic Beanstalk application and environment

1. **Console (first time):**
   - AWS Console → **Elastic Beanstalk** → **Create application**
   - **Application name:** e.g. `plan-partner`
   - **Platform:** Node.js 18 or 20 (recommended)
   - **Application code:** Upload your code (we’ll use the zip in the next step)
   - Create.

2. **Create environment:**
   - **Environment name:** e.g. `plan-partner-api`
   - **Domain:** leave default or set a CNAME (e.g. `plan-partner-api.us-east-1.elasticbeanstalk.com`)
   - **Create environment.**

3. **Upload and deploy:**
   - After the environment is created, go to the environment.
   - **Upload and deploy** → choose `server-deploy.zip` → Deploy.

4. **Set environment variables (required):**
   - In the same environment: **Configuration** → **Software** → **Edit** → **Environment properties**.
   - Add:

   | Name             | Value (your real values) |
   |------------------|--------------------------|
   | `MONGODB_URI`    | Your MongoDB Atlas URI (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/plan-partner`) |
   | `SUPABASE_URL`  | Your Supabase project URL |
   | `SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `NODE_ENV`       | `production` |

   - **Save.** Elastic Beanstalk will restart the app.

5. **Note the API URL:**  
   After deploy, the environment has a URL like:
   `https://plan-partner-api.us-east-1.elasticbeanstalk.com`  
   Your **API base URL** is: **`https://<that-host>/api`** (because your Express app mounts routes at `/api`).

---

## Part 2: Deploy the frontend (S3 + CloudFront)

### 2.1 Build the frontend with the API URL

Set the API URL to your **EB backend URL** (from Part 1):

```bash
# From project root
export VITE_API_URL=https://YOUR-EB-ENVIRONMENT-URL/api
npm ci
npm run build
```

Example if your EB URL is `https://plan-partner-api.us-east-1.elasticbeanstalk.com`:

```bash
export VITE_API_URL=https://plan-partner-api.us-east-1.elasticbeanstalk.com/api
npm run build
```

The built site is in **`dist/`**.

### 2.2 Create an S3 bucket for the site

1. AWS Console → **S3** → **Create bucket**.
2. **Bucket name:** e.g. `plan-partner-frontend` (must be globally unique).
3. **Region:** same as EB (e.g. `us-east-1`).
4. **Block Public Access:** *Uncheck* “Block all public access” (we’ll make the bucket public for the static site). Confirm.
5. Create bucket.

### 2.3 Enable static website hosting on the bucket

1. Open the bucket → **Properties**.
2. **Static website hosting** → **Edit**.
3. **Enable** static website hosting.
4. **Index document:** `index.html`
5. **Error document:** `index.html` (for client-side routing).
6. Save.

### 2.4 Set bucket policy (public read)

1. Bucket → **Permissions** → **Bucket policy** → **Edit**.
2. Use (replace `BUCKET_NAME`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::BUCKET_NAME/*"
    }
  ]
}
```

3. Save.

### 2.5 Upload the build

1. Bucket → **Objects** → **Upload**.
2. **Add folder** → select the entire **`dist`** folder (all files inside it).
3. **Upload**.

### 2.6 Get the website URL

1. Bucket → **Properties** → **Static website hosting**.
2. Note the **Bucket website endpoint** (e.g. `http://plan-partner-frontend.s3-website-us-east-1.amazonaws.com`).
3. Open that URL in a browser to test the app.

### 2.7 (Recommended) Add CloudFront for HTTPS and a friendly URL

1. **CloudFront** → **Create distribution**.
2. **Origin domain:** choose the **S3 website endpoint** (not the bucket name), e.g. `plan-partner-frontend.s3-website-us-east-1.amazonaws.com`.
3. **Origin path:** leave blank.
4. **Viewer protocol policy:** Redirect HTTP to HTTPS.
5. **Default root object:** `index.html`.
6. **Error pages (optional but good for SPA):**  
   Add custom error response: **HTTP error code** `403` and `404`, **Response page path** `/index.html`, **HTTP response code** `200`.
7. Create distribution.
8. Use the **Distribution domain name** (e.g. `d1234abcd.cloudfront.net`) as your app URL. It will be **HTTPS**.

---

## Part 3: CORS and API URL checklist

- **Backend (EB):** Your Express app uses `cors({ origin: true })`, so any origin is allowed. If you later restrict CORS, add your frontend origin (S3 website URL or CloudFront URL).
- **Frontend:** Every production build must use the correct **API base URL**:
  - Build with:  
    `VITE_API_URL=https://YOUR-EB-URL/api npm run build`  
  - Then upload the new `dist/` to S3 (and invalidate CloudFront cache if you use it).

---

## Part 4: Summary and redeploy

| What        | Where it runs | URL / note |
|------------|----------------|------------|
| Backend API | Elastic Beanstalk | `https://<env>.elasticbeanstalk.com` → API at `/api` |
| Frontend   | S3 (+ CloudFront) | S3 website URL or CloudFront URL |
| MongoDB    | MongoDB Atlas    | No change; `MONGODB_URI` in EB env |
| Auth       | Supabase          | No change; `SUPABASE_*` in EB env |

**Redeploy backend:** build server → zip (with `dist/`, no `node_modules`, no `.env`) → EB **Upload and deploy**.

**Redeploy frontend:** set `VITE_API_URL` → `npm run build` → upload `dist/` to S3 → optional: CloudFront invalidation (`/*`).

---

## Optional: Custom domain and HTTPS on EB

- **Custom domain:** Use **Route 53** (or another DNS) to point a domain to your EB environment or to CloudFront.
- **HTTPS on EB:** Add a certificate in **AWS Certificate Manager (ACM)** and attach it to the EB environment (EB will then serve HTTPS).
- **HTTPS on frontend:** CloudFront already serves HTTPS; you can attach the same (or another) ACM certificate to the CloudFront distribution and point your domain to it.

If you tell me your preferred domain (e.g. `app.planpartner.com`), I can outline exact steps for EB + CloudFront + Route 53.

---

## Troubleshooting

- **Backend returns 502/503:** Check EB **Logs** (Environment → Logs → Request full logs). Ensure `MONGODB_URI`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` are set in **Configuration → Software → Environment properties**.
- **PORT / NaN error:** Elastic Beanstalk sets `PORT` automatically. The server code falls back to `3001` if `PORT` is missing or invalid, so this should not happen on EB.
- **Frontend can’t reach API:** Confirm you built with `VITE_API_URL=https://YOUR-EB-URL/api`. If you use CloudFront for the frontend, CORS is already permissive (`origin: true`); if you lock CORS down later, add your CloudFront or S3 website URL.
- **Blank page or 403 on refresh (S3):** Use **Error document** `index.html` for the S3 website and, with CloudFront, add the custom error responses (403/404 → 200, `/index.html`) so the SPA router works.

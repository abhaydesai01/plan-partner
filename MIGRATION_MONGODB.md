# MongoDB Migration

This project has been migrated from **Supabase (PostgreSQL)** to **MongoDB** for database storage. Supabase is still used for **authentication** only.

## Architecture

- **Frontend (Vite + React)**: Uses Supabase for sign-in/sign-up/session. All data reads and writes go to the new **Node/Express API**.
- **API server** (`server/`): Express + Mongoose, validates Supabase JWT and serves REST endpoints. Data is stored in **MongoDB**.

## Setup

### 1. MongoDB

- Install MongoDB locally or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier).
- Create a database (e.g. `plan-partner`).

### 2. Server environment

In `server/` create a `.env` file (see `server/.env.example`):

```env
MONGODB_URI=mongodb://localhost:27017/plan-partner
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PORT=3001
```

Use the same `SUPABASE_URL` and `SUPABASE_ANON_KEY` (anon/public key) as in the frontend `.env` so the server can verify JWTs.

### 3. Install and run the API server

```bash
cd server
npm install
npm run dev
```

Server runs at `http://localhost:3001`. The frontend proxy sends `/api` to this server when using `npm run dev` in the project root.

### 4. Run the frontend

From the project root:

```env
VITE_API_URL=/api
```

Then:

```bash
npm run dev
```

Frontend runs at `http://localhost:8080` and proxies `/api` to the backend.

## API overview

- **Public (no auth)**  
  - `GET /api/patient-enroll?code=DOCTOR_CODE` – doctor info + programs for enrollment.  
  - `POST /api/patient-enroll` – create patient + optional enrollment (body: `doctor_code`, `full_name`, `phone`, etc.).

- **Authenticated (Bearer token from Supabase session)**  
  All other routes under `/api/` require `Authorization: Bearer <access_token>`.

  Examples:  
  - `GET/POST/PATCH /api/patients`, `GET/POST/PATCH /api/appointments`,  
  - `GET/POST/PATCH /api/enrollments`, `GET/POST /api/programs`,  
  - `GET/PATCH /api/alerts`, `GET/POST /api/vitals`, `GET/POST /api/lab_results`,  
  - `GET/POST/PATCH /api/clinics`, `GET/POST /api/clinic_members`, `GET/POST /api/clinic_invites`,  
  - `GET/POST/PATCH /api/doctor_availability`, `GET/POST /api/notifications`,  
  - `GET/POST /api/profiles`, `GET /api/user_roles`,  
  - and similar for `patient_documents`, `feedbacks`, `link_requests`, `patient_doctor_links`, `patient_vault_codes`, `food_logs`, etc.

- **Counts**  
  Many list endpoints support `?count=true` and return `{ count: number }` (e.g. `GET /api/patients?count=true`, `GET /api/vitals?patient_id=...&count=true`).

## Data migration from Supabase

Existing data in Supabase (PostgreSQL) is not automatically copied to MongoDB. To migrate:

1. Export data from Supabase (SQL or CSV per table).
2. Map tables to MongoDB collections (see `server/models/index.ts` for collection names and field shapes).
3. Write a one-off script or use the API to insert into MongoDB (e.g. create clinics, then profiles, then patients, then related entities, respecting foreign relationships).

New sign-ups and usage will create data only in MongoDB; ensure `user_roles` and `profiles` are created via the `POST /api/ensure-user` flow (called from the frontend when the role is missing).

## Notes

- **File storage**: Patient documents and feedback videos previously used Supabase Storage. The app can be extended with local file upload or S3 and store only file paths in MongoDB.
- **Realtime**: Supabase realtime subscriptions are no longer used for DB changes. The app uses polling/refetch where needed.
- **Edge functions**: Supabase Edge Functions (e.g. `check-alerts`, `manage-doctor-code`) are not run in this setup. Equivalent logic can be added as Express routes or background jobs if required.

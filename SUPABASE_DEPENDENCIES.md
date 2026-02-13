# Supabase Removed

Supabase has been **removed** from this project. Auth, data, and file storage now use:

- **Backend:** Express + MongoDB (JWT auth, Mongoose models)
- **Frontend:** `src/lib/api.ts` – JWT in `localStorage` (`plan_partner_token`), `Authorization: Bearer` on requests
- **AI:** Gemini via Express routes (e.g. `/analyze-meal-image`, `/chat/patient`, `/chat/doctor`, `/clinical-evidence`)

No Supabase env vars or `@supabase/supabase-js` dependency are required.

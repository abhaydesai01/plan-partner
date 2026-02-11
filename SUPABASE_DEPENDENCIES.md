# Supabase Dependencies

Yes. The app still **depends on Supabase** in several places. Below is where and for what.

---

## 1. Required (cannot remove without replacing)

### Authentication (frontend + server)

- **Frontend:** `src/hooks/useAuth.tsx` – sign up, sign in, sign out, session, `onAuthStateChange`.
- **Frontend:** `src/lib/api.ts` – gets session token for API calls via `supabase.auth.getSession()`.
- **Server:** `server/middleware/auth.ts` – verifies JWT with `supabase.auth.getUser(token)` (skipped in `NODE_ENV=test` with test token).
- **Server:** `server/routes/index.ts` – `POST /api/ensure-user` uses Supabase to read user metadata.

**Conclusion:** Login/signup and API auth are tied to Supabase Auth. To remove Supabase you’d need another auth provider (e.g. Auth0, Firebase Auth, or custom JWT).

---

## 2. Frontend – still using Supabase DB / Storage / Realtime

These use **Supabase** (Postgres tables or Storage), not the new MongoDB API:

| Area | File(s) | Usage |
|------|---------|--------|
| **Patient** | `PatientOverview.tsx` | patients, link_requests, enrollments, appointments, vitals, profiles |
| | `PatientVitals.tsx` | vitals select/insert |
| | `PatientLabResults.tsx` | lab_results select/insert |
| | `PatientDocuments.tsx` | patient_documents + **Storage** (patient-documents) |
| | `PatientAppointments.tsx` | patients, appointments, checkins, clinics, **realtime** channel, link_requests, profiles |
| | `PatientVault.tsx` | patient_vault_codes, patient_doctor_links, storage |
| | `PatientChat.tsx` | auth.getSession, profiles |
| **Doctor** | `DoctorVitals.tsx` | vitals, patients |
| | `DoctorLabResults.tsx` | lab_results, patients |
| | `DoctorDocuments.tsx` | patient_documents, patients + **Storage** (patient-documents) |
| | `DoctorAvailability.tsx` | doctor_availability |
| | `DoctorLinkRequests.tsx` | link_requests, patients, profiles |
| | `DoctorVaultAccess.tsx` | patient_doctor_links |
| | `DoctorFeedbacks.tsx` | (check file for exact usage) |
| | `ComplianceReports.tsx` | enrollments, patients, programs |
| **Clinic** | `ClinicSettings.tsx` | clinics, clinic_members, clinic_invites, auth.getSession |
| **Shared** | `NotificationCenter.tsx` | notifications (mark read) |
| | `DoctorCopilot.tsx` | auth.getSession |
| | `ChatVitalsForm.tsx` | vitals insert |
| | `ChatLabForm.tsx` | lab_results insert |
| **Public** | `PublicFeedback.tsx` | feedbacks fetch, profiles, clinics, **Storage** (feedback-videos), feedbacks insert |
| | `Contact.tsx` | (check – likely contact/email) |
| | `TestimonialsSection.tsx` | profiles, clinics |
| **Components** | `ContactDialog.tsx` | (check) |
| | `AppointmentCompletionModal.tsx` | (check) |
| **Hooks** | `usePatientRecord.ts` | (check) |

**Conclusion:** Until these are migrated to the Express/MongoDB API (and file storage to S3 or similar), they **depend on Supabase** (Postgres + optional Storage/Realtime).

---

## 3. Supabase Edge Functions (optional at runtime)

Under `supabase/functions/`:

- `patient-enroll` – replaced by API `POST /api/patient-enroll` (MongoDB).
- `send-contact-email`, `send-completion-email` – emails.
- `patient-chat`, `doctor-chat`, `clinical-evidence` – chat/AI.
- `parse-food-log` – food log parsing.
- `manage-doctor-code` – doctor code.
- `check-alerts` – alert generation.
- `seed-demo-users` – demo seeding.

If you don’t deploy or call these, the **main app** can run without them; chat/completion emails/alert checks will just not work unless you reimplement them elsewhere.

---

## 4. NPM packages

- **Root:** `package.json` → `"@supabase/supabase-js"`.
- **Server:** `package.json` → `"@supabase/supabase-js"`.

Both are required while auth and any of the above frontend/server code use the Supabase client.

---

## 5. Env vars

- **Frontend** (`.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (for auth and any direct Supabase usage).
- **Server** (`server/.env`): `SUPABASE_URL`, `SUPABASE_ANON_KEY` (for JWT verification and ensure-user).

---

## Summary

| Dependency type | Can remove? |
|-----------------|-------------|
| **Supabase Auth** (login, JWT) | No, unless you replace with another auth provider. |
| **Supabase DB** (tables) in frontend | Yes, by migrating each listed page/component to the MongoDB API. |
| **Supabase Storage** (files) | Yes, by migrating to another store (e.g. S3) and updating upload/download code. |
| **Supabase Edge Functions** | Yes, if you don’t use chat/emails/alert checks or reimplement them. |
| **@supabase/supabase-js** | Only after auth (and any remaining Supabase usage) is replaced. |

So: **there is still a strong dependency on Supabase**, mainly for auth and for all the frontend and component usage listed in the table above.

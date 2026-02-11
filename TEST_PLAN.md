# Plan Partner – Test Plan (Doctor, Patient, Clinic)

Use this checklist to test the product manually as **doctor**, **patient**, and **clinic**.  
Run API + frontend first: `npm run dev:all` (or `npm run dev:server` in one terminal and `npm run dev` in another).

---

## Prerequisites

- **MongoDB** running; server `.env` has `MONGODB_URI`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- **Seeded data** (optional but recommended): from `server/`: `npm run seed`.  
  Seed creates doctor code `MEDIM001` and sample patients, programs, appointments, alerts.
- **Supabase** project for auth: at least one **doctor** and one **patient** user (sign up with role doctor/patient).

---

## 1. Doctor flow

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Sign in as a **doctor** (role set in Supabase or at sign-up). | Redirect to `/dashboard`. |
| 1.2 | Open **Dashboard**. | Counts for patients, programs, enrollments, at-risk; recent appointments. |
| 1.3 | Open **Patients**. | List of patients (empty or seeded). |
| 1.4 | Click **Add patient** and create one. | New row in list. |
| 1.5 | Open a **patient detail** (click a row). | Patient header, overview, enrollments, appointments, tabs (Vitals, Labs, Documents, Alerts, Food). |
| 1.6 | **Programs** → create a program. | Program appears in list. |
| 1.7 | **Enrollments** → enroll a patient in a program. | Enrollment appears. |
| 1.8 | **Appointments** → create an appointment (patient, date, title). | Appointment appears. |
| 1.9 | **Alerts**. | List of alerts (filter by status if supported). |
| 1.10 | **Availability** (if implemented). | Set or view slots. |
| 1.11 | **Clinic** (Settings). | Clinic info and members (some data may still come from Supabase). |

**Note:** Dashboard, Patients, Patient Detail, Programs, Enrollments, Appointments, Alerts, Clinic Setup, Join Clinic use the **API (MongoDB)**. Clinic Settings, Availability, Vitals/Labs/Documents (doctor views), Compliance, Link Requests, Vault Access may still use **Supabase** in parts.

---

## 2. Clinic flow

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | Sign in as **doctor**. | — |
| 2.2 | Go to **Clinic setup** (`/clinic-setup`) if no clinic yet. | Multi-step form: name, address, phone, specialties, capacity. |
| 2.3 | Submit clinic creation. | Redirect to dashboard; clinic created in MongoDB. |
| 2.4 | **Join clinic** (`/join-clinic`): enter an **invite code** from another clinic. | If code valid: accept invite and become member. (Requires a pending invite from another doctor.) |
| 2.5 | **Dashboard → Clinic** (or **Clinic settings**). | View clinic details, members, invites (where implemented via API). |

**Public (no login):**

| Step | Action | Expected |
|------|--------|----------|
| 2.6 | Open `/enroll/MEDIM001` (or your doctor code). | Public enrollment page: doctor name, programs, form. |
| 2.7 | Submit enrollment (name, phone, optional program). | Success message; patient created in MongoDB; doctor gets notification. |

---

## 3. Patient flow

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | Sign in as a **patient** (role = patient). | Redirect to `/patient` (chat). |
| 3.2 | **Patient** → **Overview** (`/patient/overview`). | Overview: linked patient record, enrollments, upcoming appointments, recent vitals (or link-request form if not linked). |
| 3.3 | **Vitals**, **Lab results**, **Documents**. | Lists and add forms (some data may still come from Supabase). |
| 3.4 | **Appointments**. | List and ability to book/cancel (where implemented). |
| 3.5 | **Vault**. | Health vault view / access (where implemented). |
| 3.6 | **Chat**. | Chat UI loads (AI/backend may vary). |

**Note:** Several patient pages (Overview, Vitals, Lab results, Documents, Appointments) still use **Supabase** for data in the current codebase. Only the **API (MongoDB)** is covered by the automated API tests; full patient flows may require Supabase or future migration of those pages to the API.

---

## 4. Automated API tests (Doctor, Clinic, Public)

From the **server** folder:

```bash
cd server
npm run seed    # if not already done
npm run test:api
```

These tests use a test token (`test:doctor:<id>`) and **do not** require Supabase. They cover:

- **Doctor:** `GET /api/patients`, `GET /api/programs`, `GET /api/appointments`, `GET /api/enrollments`, `GET /api/alerts`, `GET /api/patients/:id`, and 401 without auth.
- **Clinic:** `GET /api/clinics`, `POST /api/clinics`.
- **Public:** `GET /api/patient-enroll?code=MEDIM001`, `GET` with bad code (404), `POST /api/patient-enroll`.

---

## 5. Quick reference

| Role   | Main entry after login | Key routes |
|--------|-------------------------|------------|
| Doctor | `/dashboard`            | `/dashboard/patients`, `/dashboard/programs`, `/dashboard/enrollments`, `/dashboard/appointments`, `/dashboard/alerts`, `/dashboard/clinic`, `/clinic-setup`, `/join-clinic` |
| Patient| `/patient`              | `/patient/overview`, `/patient/vitals`, `/patient/lab-results`, `/patient/documents`, `/patient/appointments`, `/patient/vault` |
| Clinic | Same as doctor          | `/clinic-setup`, `/join-clinic`, `/dashboard/clinic`, public `/enroll/:doctorCode` |

**Run full stack:** `npm run dev:all` (root).  
**Run API tests:** `cd server && npm run test:api`.

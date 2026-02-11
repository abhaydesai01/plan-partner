/**
 * API integration tests: doctor, clinic, and public flows.
 * Uses test token (Bearer test:doctor:<id>) when NODE_ENV=test; no Supabase needed.
 * Run: npm run test:api (from server folder). Ensure DB is seeded first (npm run seed).
 */
import "dotenv/config";
import mongoose from "mongoose";
import app from "../app.js";
import http from "http";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/plan-partner";
const TEST_DOCTOR_ID = process.env.SEED_DOCTOR_USER_ID || "e0697d5c-a726-4e3e-8da3-ee72b99f6999";
const AUTH = `Bearer test:doctor:${TEST_DOCTOR_ID}`;

let server: http.Server;
let baseUrl: string;

const PUBLIC_PATHS = ["/api/patient-enroll", "/api/clinic-invite-by-code"];

async function request(method: string, path: string, body?: unknown) {
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(path.startsWith("/api") && !isPublic ? { Authorization: AUTH } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function run() {
  process.env.NODE_ENV = "test";
  await mongoose.connect(MONGODB_URI);
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, () => resolve()));
  const a = server.address();
  const port = typeof a === "object" && a ? a.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;

  let passed = 0;
  let failed = 0;

  const ok = (name: string, cond: boolean) => {
    if (cond) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.log(`  ✗ ${name}`);
      failed++;
    }
  };

  console.log("\n--- Doctor flow ---\n");

  const [patientsRes, programsRes, appointmentsRes, enrollmentsRes, alertsRes] = await Promise.all([
    request("GET", "/api/patients"),
    request("GET", "/api/programs"),
    request("GET", "/api/appointments"),
    request("GET", "/api/enrollments"),
    request("GET", "/api/alerts"),
  ]);

  ok("GET /api/patients returns 200", patientsRes.status === 200);
  ok("GET /api/programs returns 200", programsRes.status === 200);
  ok("GET /api/appointments returns 200", appointmentsRes.status === 200);
  ok("GET /api/enrollments returns 200", enrollmentsRes.status === 200);
  ok("GET /api/alerts returns 200", alertsRes.status === 200);

  const patients = (patientsRes.data as { id?: string }[]) || [];
  ok("Patients is array", Array.isArray(patients));
  if (patients.length > 0) {
    const oneId = (patients[0] as { id: string }).id;
    const oneRes = await request("GET", `/api/patients/${oneId}`);
    ok("GET /api/patients/:id returns 200", oneRes.status === 200);
  }

  const noAuthStatus = await fetch(`${baseUrl}/api/patients`, { headers: { "Content-Type": "application/json" } }).then((r) => r.status);
  ok("GET /api/patients without auth returns 401", noAuthStatus === 401);

  console.log("\n--- Clinic flow ---\n");

  const clinicsRes = await request("GET", "/api/clinics");
  ok("GET /api/clinics returns 200", clinicsRes.status === 200);

  const createClinicRes = await request("POST", "/api/clinics", {
    name: "Test Clinic API",
    address: "123 Test St",
    phone: "+911234567890",
    email: "test@clinic.test",
    specialties: ["General Medicine"],
  });
  ok("POST /api/clinics returns 201", createClinicRes.status === 201);

  console.log("\n--- Public (no auth) ---\n");

  const enrollInfoRes = await fetch(`${baseUrl}/api/patient-enroll?code=MEDIM001`);
  const enrollInfo = await enrollInfoRes.json().catch(() => ({}));
  ok("GET /api/patient-enroll?code=MEDIM001 returns 200 and doctor info", enrollInfoRes.status === 200 && (enrollInfo as { doctor?: unknown }).doctor != null);

  const badCodeRes = await fetch(`${baseUrl}/api/patient-enroll?code=INVALID99`);
  ok("GET /api/patient-enroll with bad code returns 404", badCodeRes.status === 404);

  const enrollPostRes = await fetch(`${baseUrl}/api/patient-enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      doctor_code: "MEDIM001",
      full_name: "API Test Patient",
      phone: "+919999999999",
      age: "30",
      gender: "male",
    }),
  });
  ok("POST /api/patient-enroll creates patient (200 or 409 if exists)", enrollPostRes.status === 200 || enrollPostRes.status === 409);

  console.log("\n--- Summary ---\n");
  console.log(`Passed: ${passed}, Failed: ${failed}`);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Seeds a demo doctor login: doc@mediimate.in / DocDemo1234!
 * Also ensures the care plan seed's DOCTOR_ID maps to this user.
 * Run: cd server && npx tsx scripts/seed-demodoc.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  AuthUser,
  UserRole,
  Profile,
  Clinic,
  ClinicMember,
  Patient,
} from "../models/index.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/plan-partner";

// This matches the DOCTOR_ID used in seed-careplan.ts and seed-db.ts
const DOCTOR_USER_ID = "e0697d5c-a726-4e3e-8da3-ee72b99f6999";
const DEMO_DOC_EMAIL = "doc@mediimate.in";
const DEMO_DOC_PASSWORD = "DocDemo1234!";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const passwordHash = await bcrypt.hash(DEMO_DOC_PASSWORD, 10);

  // ─── 1. AuthUser — upsert so password is always current ───
  const existing = await AuthUser.findOne({ email: DEMO_DOC_EMAIL }).lean();
  if (existing) {
    await AuthUser.updateOne(
      { email: DEMO_DOC_EMAIL },
      { $set: { password_hash: passwordHash, email_verified: true, approval_status: "active", user_id: DOCTOR_USER_ID } }
    );
    console.log(`Demo doctor existed — credentials reset: ${DEMO_DOC_EMAIL}`);
  } else {
    await AuthUser.create({
      email: DEMO_DOC_EMAIL,
      password_hash: passwordHash,
      user_id: DOCTOR_USER_ID,
      email_verified: true,
      approval_status: "active",
    });
    console.log(`Created demo doctor auth: ${DEMO_DOC_EMAIL}`);
  }

  // ─── 2. Role ───
  await UserRole.findOneAndUpdate(
    { user_id: DOCTOR_USER_ID },
    { $set: { role: "doctor" } },
    { upsert: true }
  );

  // ─── 3. Profile ───
  await Profile.findOneAndUpdate(
    { user_id: DOCTOR_USER_ID },
    {
      $set: {
        full_name: "Dr. Suman Mehta",
        doctor_code: "MEDIM001",
        phone: "+919876500001",
        specialties: ["General Medicine", "Diabetology"],
      },
    },
    { upsert: true }
  );

  // ─── 4. Clinic ───
  let clinic = await Clinic.findOne({ created_by: DOCTOR_USER_ID });
  if (!clinic) {
    clinic = await Clinic.create({
      name: "Dr. Suman's Diabetes Clinic",
      address: "12 Health Avenue, Mumbai",
      phone: "+912212345678",
      email: "clinic@mediimate.in",
      created_by: DOCTOR_USER_ID,
      specialties: ["General Medicine", "Diabetology"],
      bed_count: 10,
      opd_capacity: 50,
    });
    console.log(`Created clinic: ${clinic.name}`);
  }

  const clinicId = clinic._id.toString();
  const existingMember = await ClinicMember.findOne({
    clinic_id: clinicId,
    user_id: DOCTOR_USER_ID,
  });
  if (!existingMember) {
    await ClinicMember.create({
      clinic_id: clinicId,
      user_id: DOCTOR_USER_ID,
      role: "owner",
    });
  }

  // ─── 5. Ensure demo patient is linked to this doctor ───
  // (seed-careplan creates the patient record with doctor_id = DOCTOR_USER_ID already)
  const demoPatient = await Patient.findOne({ patient_user_id: "86ecb2c2-f0ca-46c3-bc5c-f3f7420775e0" });
  if (demoPatient && (demoPatient as any).doctor_id !== DOCTOR_USER_ID) {
    await Patient.updateOne(
      { _id: (demoPatient as any)._id },
      { $set: { doctor_id: DOCTOR_USER_ID } }
    );
    console.log("Linked demo patient to demo doctor");
  }

  console.log("\n✅ Demo doctor seed complete!");
  console.log("   Email   : doc@mediimate.in");
  console.log("   Password: DocDemo1234!");
  console.log("   Name    : Dr. Suman Mehta");
  console.log("   Role    : doctor");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

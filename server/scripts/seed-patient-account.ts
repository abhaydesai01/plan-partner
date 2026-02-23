/**
 * Creates a patient account and seeds Mediimate case/enrollment data for it.
 * Run: cd server && npx tsx scripts/seed-patient-account.ts
 */
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/plan-partner";
const PATIENT_EMAIL = "abhay.patient@mediimate.com";
const PATIENT_PASSWORD = "Test1234!";
const PATIENT_NAME = "Abhay Desai";

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");
  const db = mongoose.connection.db!;

  // Check if already exists
  let auth = await db.collection("authusers").findOne({ email: PATIENT_EMAIL });
  let userId: string;

  if (auth) {
    userId = auth.user_id;
    console.log(`Patient account already exists: ${PATIENT_EMAIL}`);
  } else {
    userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(PATIENT_PASSWORD, 10);

    await db.collection("authusers").insertOne({
      email: PATIENT_EMAIL,
      password_hash: passwordHash,
      user_id: userId,
      email_verified: true,
      approval_status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.collection("profiles").insertOne({
      user_id: userId,
      full_name: PATIENT_NAME,
      phone: "+91-9876543210",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.collection("userroles").insertOne({
      user_id: userId,
      role: "patient",
    });

    console.log(`Created patient account: ${PATIENT_EMAIL} / ${PATIENT_PASSWORD}`);
  }

  // Ensure patient record exists
  let patient = await db.collection("patients").findOne({ patient_user_id: userId });
  if (!patient) {
    const result = await db.collection("patients").insertOne({
      patient_user_id: userId,
      doctor_id: userId,
      full_name: PATIENT_NAME,
      phone: "+91-9876543210",
      age: 45,
      gender: "Male",
      status: "active",
      country: "India",
      city: "Mumbai",
      preferred_treatment_location: "Mumbai",
      medical_condition_summary: "Cardiac assessment needed, knee osteoarthritis",
      conditions: ["Coronary Artery Disease", "Osteoarthritis"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    patient = await db.collection("patients").findOne({ _id: result.insertedId });
    console.log("Created patient record with Mediimate profile fields");
  }

  // Get hospitals
  const hospitals = await db.collection("clinics").find({ is_public_listed: true }).sort({ rating_avg: -1 }).toArray();
  if (hospitals.length === 0) {
    console.log("No public hospitals! Run seed-mediimate.ts first.");
    process.exit(1);
  }

  // Clean old data
  await db.collection("cases").deleteMany({ patient_user_id: userId });
  await db.collection("enrollments").deleteMany({ patient_id: { $in: [userId, patient!._id.toString()] } });

  // Create 4 cases in different statuses to show the full lifecycle
  const caseDocs = [
    {
      patient_user_id: userId,
      condition: "Cardiac Bypass Surgery (CABG)",
      condition_details: "Triple vessel coronary artery disease diagnosed via angiography. Requires CABG surgery. Looking for the best cardiac center with experienced surgeons and post-op care.",
      budget_min: 300000,
      budget_max: 800000,
      preferred_location: "Chennai",
      preferred_country: "India",
      status: "hospital_accepted",
      matched_clinic_id: hospitals[0]._id.toString(),
      matched_at: new Date(Date.now() - 3 * 86400000),
      accepted_at: new Date(Date.now() - 1 * 86400000),
      assigned_by: "admin",
      admin_notes: "Matched to Apollo based on cardiac specialty, rating, and budget.",
      treatment_plan: {
        description: "CABG triple vessel. Pre-op workup 2 days, surgery day 3, ICU 3 days, ward 5 days, discharge day 13.",
        estimated_cost: 550000,
        estimated_duration: "2 weeks",
        uploaded_by: "clinic",
        uploaded_at: new Date(Date.now() - 1 * 86400000),
      },
      createdAt: new Date(Date.now() - 7 * 86400000),
      updatedAt: new Date(),
    },
    {
      patient_user_id: userId,
      condition: "Knee Replacement - Both Knees",
      condition_details: "Severe osteoarthritis Grade 4 in both knees. Unable to walk without support. Need bilateral total knee replacement, preferably robotic-assisted.",
      budget_min: 400000,
      budget_max: 900000,
      preferred_location: "Bangalore",
      preferred_country: "India",
      status: "submitted",
      createdAt: new Date(Date.now() - 1 * 86400000),
      updatedAt: new Date(),
    },
    {
      patient_user_id: userId,
      condition: "Liver Transplant Evaluation",
      condition_details: "Chronic liver disease progressing to cirrhosis. MELD score 22. Living donor available (brother). Need transplant evaluation and surgery.",
      budget_min: 1500000,
      budget_max: 3000000,
      preferred_location: "Gurgaon",
      preferred_country: "India",
      status: "treatment_completed",
      matched_clinic_id: hospitals.length > 1 ? hospitals[1]._id.toString() : hospitals[0]._id.toString(),
      matched_at: new Date(Date.now() - 45 * 86400000),
      accepted_at: new Date(Date.now() - 43 * 86400000),
      treatment_start_date: new Date(Date.now() - 35 * 86400000),
      treatment_end_date: new Date(Date.now() - 10 * 86400000),
      treatment_plan: {
        description: "Living donor liver transplant. Donor evaluation 3 days, recipient prep 2 days, surgery, ICU 5 days, ward 10 days.",
        estimated_cost: 2200000,
        estimated_duration: "3 weeks",
        uploaded_by: "clinic",
        uploaded_at: new Date(Date.now() - 40 * 86400000),
      },
      assigned_by: "admin",
      admin_notes: "Fortis Gurgaon has top hepatology team. Urgent case prioritized.",
      createdAt: new Date(Date.now() - 50 * 86400000),
      updatedAt: new Date(),
    },
    {
      patient_user_id: userId,
      condition: "Spinal Disc Herniation",
      condition_details: "L4-L5 disc herniation causing sciatica. Conservative treatment failed after 6 months. Need micro-discectomy.",
      budget_min: 150000,
      budget_max: 400000,
      preferred_location: "Mumbai",
      preferred_country: "India",
      status: "hospital_matched",
      matched_clinic_id: hospitals.length > 2 ? hospitals[2]._id.toString() : hospitals[0]._id.toString(),
      matched_at: new Date(Date.now() - 1 * 86400000),
      assigned_by: "admin",
      admin_notes: "Manipal Bangalore has excellent neurosurgery dept.",
      createdAt: new Date(Date.now() - 3 * 86400000),
      updatedAt: new Date(),
    },
  ];

  await db.collection("cases").insertMany(caseDocs);
  console.log("Created 4 treatment cases:");
  console.log("  1. Cardiac Bypass - hospital_accepted (has treatment plan)");
  console.log("  2. Knee Replacement - submitted (waiting for admin)");
  console.log("  3. Liver Transplant - treatment_completed");
  console.log("  4. Spinal Disc - hospital_matched (waiting for hospital)");

  // Create enrollments
  const programs = await db.collection("programs").find({ is_active: true }).limit(2).toArray();
  if (programs.length > 0) {
    const enrollmentDocs: any[] = [
      {
        patient_id: patient!._id.toString(),
        program_id: programs[0]._id.toString(),
        doctor_id: userId,
        clinic_id: hospitals[0]._id.toString(),
        status: "active",
        adherence_pct: 78,
        enrolled_at: new Date(Date.now() - 10 * 86400000),
        created_at: new Date(Date.now() - 10 * 86400000),
      },
    ];
    if (programs.length > 1) {
      enrollmentDocs.push({
        patient_id: patient!._id.toString(),
        program_id: programs[1]._id.toString(),
        doctor_id: userId,
        clinic_id: hospitals.length > 1 ? hospitals[1]._id.toString() : hospitals[0]._id.toString(),
        status: "completed",
        adherence_pct: 95,
        enrolled_at: new Date(Date.now() - 90 * 86400000),
        completed_at: new Date(Date.now() - 5 * 86400000),
        created_at: new Date(Date.now() - 90 * 86400000),
      });
    }
    await db.collection("enrollments").insertMany(enrollmentDocs);
    console.log(`Created ${enrollmentDocs.length} program enrollment(s)`);
  } else {
    console.log("No programs found - create some in Admin > Programs first");
  }

  console.log("\n========================================");
  console.log("  PATIENT LOGIN CREDENTIALS");
  console.log("========================================");
  console.log(`  Email:    ${PATIENT_EMAIL}`);
  console.log(`  Password: ${PATIENT_PASSWORD}`);
  console.log("========================================");
  console.log("\nAfter login, open the sidebar (hamburger menu) and visit:");
  console.log("  'Find Hospitals' - 3 hospitals with doctors & reviews");
  console.log("  'My Cases'       - 4 cases in different statuses");
  console.log("  'My Programs'    - program enrollment progress");
  console.log("\nAlso check:");
  console.log("  Admin portal (admin@mediimate.com / Test1234!)");
  console.log("    > Cases - see all 4 cases, assign hospitals");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

/**
 * Seeds case + enrollment data for a specific patient user.
 * Run: cd server && npx tsx scripts/seed-patient-data.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/plan-partner";
const PATIENT_EMAIL = "abhay.desai0001@gmail.com";

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");
  const db = mongoose.connection.db!;

  // Find the patient
  const auth = await db.collection("authusers").findOne({ email: PATIENT_EMAIL });
  if (!auth) {
    console.error(`User ${PATIENT_EMAIL} not found!`);
    process.exit(1);
  }
  const userId = auth.user_id;
  console.log(`Found user: ${PATIENT_EMAIL} (user_id: ${userId})`);

  const role = await db.collection("userroles").findOne({ user_id: userId });
  console.log(`Role: ${(role as any)?.role}`);

  const profile = await db.collection("profiles").findOne({ user_id: userId });
  console.log(`Profile: ${(profile as any)?.full_name || "no name"}`);

  // Ensure the patient record exists
  let patient = await db.collection("patients").findOne({ patient_user_id: userId });
  if (!patient) {
    const result = await db.collection("patients").insertOne({
      patient_user_id: userId,
      doctor_id: userId,
      full_name: (profile as any)?.full_name || "Abhay Desai",
      phone: (profile as any)?.phone || "",
      status: "active",
      country: "India",
      city: "Mumbai",
      preferred_treatment_location: "Mumbai",
      conditions: ["Cardiac Assessment"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    patient = await db.collection("patients").findOne({ _id: result.insertedId });
    console.log("Created patient record");
  } else {
    // Update with Mediimate fields
    await db.collection("patients").updateOne(
      { _id: patient._id },
      { $set: { country: "India", city: "Mumbai", preferred_treatment_location: "Mumbai" } }
    );
    console.log("Patient record exists, updated with location fields");
  }

  // Get hospital IDs
  const hospitals = await db.collection("clinics").find({ is_public_listed: true }).toArray();
  if (hospitals.length === 0) {
    console.log("No public hospitals found. Run seed-mediimate.ts first!");
    process.exit(1);
  }
  console.log(`Found ${hospitals.length} public hospitals`);

  // Delete old cases for this user (clean slate)
  await db.collection("cases").deleteMany({ patient_user_id: userId });

  // Create 3 cases in different statuses
  const cases = [
    {
      patient_user_id: userId,
      condition: "Cardiac Bypass Surgery (CABG)",
      condition_details: "Triple vessel coronary artery disease diagnosed via angiography. Requires CABG surgery. Looking for the best cardiac center with experienced surgeons.",
      budget_min: 300000,
      budget_max: 800000,
      preferred_location: "Chennai",
      preferred_country: "India",
      medical_documents: [],
      status: "hospital_matched",
      matched_clinic_id: hospitals[0]._id.toString(),
      matched_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      assigned_by: "admin",
      admin_notes: "Matched to Apollo Chennai based on cardiac specialty and budget fit.",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      patient_user_id: userId,
      condition: "Knee Replacement Surgery",
      condition_details: "Severe osteoarthritis in both knees. Grade 4. Need total knee replacement. Preferably minimally invasive approach.",
      budget_min: 200000,
      budget_max: 500000,
      preferred_location: "Bangalore",
      preferred_country: "India",
      medical_documents: [],
      status: "submitted",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    {
      patient_user_id: userId,
      condition: "Liver Transplant Evaluation",
      condition_details: "Chronic liver disease, cirrhosis. Need evaluation for liver transplant. Donor available in family.",
      budget_min: 1500000,
      budget_max: 3000000,
      preferred_location: "Gurgaon",
      preferred_country: "India",
      medical_documents: [],
      status: "treatment_completed",
      matched_clinic_id: hospitals[1]._id.toString(),
      matched_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      accepted_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      treatment_start_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      treatment_end_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      treatment_plan: {
        description: "Living donor liver transplant. Pre-op evaluation, surgery, and 2-week recovery.",
        estimated_cost: 2200000,
        estimated_duration: "3 weeks",
        uploaded_by: "clinic",
        uploaded_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      assigned_by: "admin",
      admin_notes: "Urgent case. Fortis Gurgaon has excellent hepatology team.",
      createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  ];

  const insertedCases = await db.collection("cases").insertMany(cases);
  console.log(`Created ${cases.length} cases:`);
  console.log("  1. Cardiac Bypass - hospital_matched (Apollo Chennai)");
  console.log("  2. Knee Replacement - submitted (waiting for admin)");
  console.log("  3. Liver Transplant - treatment_completed (Fortis Gurgaon)");

  // Create program enrollments
  const programs = await db.collection("programs").find({ is_active: true }).limit(2).toArray();
  if (programs.length > 0) {
    await db.collection("enrollments").deleteMany({ patient_id: { $in: [userId, patient!._id.toString()] } });
    
    const enrollments = [
      {
        patient_id: patient!._id.toString(),
        program_id: programs[0]._id.toString(),
        doctor_id: userId,
        clinic_id: hospitals[0]._id.toString(),
        status: "active",
        adherence_pct: 72,
        enrolled_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
    ];

    if (programs.length > 1) {
      enrollments.push({
        patient_id: patient!._id.toString(),
        program_id: programs[1]._id.toString(),
        doctor_id: userId,
        clinic_id: hospitals[1]._id.toString(),
        status: "completed",
        adherence_pct: 95,
        enrolled_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      });
    }

    await db.collection("enrollments").insertMany(enrollments);
    console.log(`Created ${enrollments.length} program enrollment(s)`);
  } else {
    console.log("No active programs found - skipping enrollments. Create programs in Admin > Programs first.");
  }

  console.log("\n--- Done! ---");
  console.log(`Patient ${PATIENT_EMAIL} now has:`);
  console.log("  - 3 treatment cases (submitted, hospital_matched, treatment_completed)");
  console.log("  - Program enrollments (if programs exist)");
  console.log("\nGo to the Patient Portal and check:");
  console.log("  Sidebar > 'Find Hospitals' - 3 hospitals with reviews");
  console.log("  Sidebar > 'My Cases' - 3 cases in different statuses");
  console.log("  Sidebar > 'My Programs' - enrollment progress");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

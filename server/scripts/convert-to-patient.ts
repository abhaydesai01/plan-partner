import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/plan-partner";
const EMAIL = "abhay.desai0001@gmail.com";

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  const auth = await db.collection("authusers").findOne({ email: EMAIL });
  if (!auth) { console.log("User not found"); process.exit(1); }
  const userId = auth.user_id;
  console.log(`Found user: ${EMAIL} (user_id: ${userId})`);

  // 1. Change role from doctor to patient
  await db.collection("userroles").updateOne(
    { user_id: userId },
    { $set: { role: "patient" } }
  );
  console.log("Role changed: doctor -> patient");

  // 2. Ensure patient record exists with Mediimate fields
  let patient = await db.collection("patients").findOne({ patient_user_id: userId });
  if (!patient) {
    const profile = await db.collection("profiles").findOne({ user_id: userId });
    const res = await db.collection("patients").insertOne({
      patient_user_id: userId,
      doctor_id: userId,
      full_name: (profile as any)?.full_name || "Abhay Desai",
      phone: (profile as any)?.phone || "",
      age: 45,
      gender: "Male",
      status: "active",
      country: "India",
      city: "Mumbai",
      preferred_treatment_location: "Mumbai",
      medical_condition_summary: "Cardiac assessment, knee osteoarthritis",
      conditions: ["Coronary Artery Disease", "Osteoarthritis"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    patient = await db.collection("patients").findOne({ _id: res.insertedId });
    console.log("Created patient record");
  } else {
    await db.collection("patients").updateOne(
      { _id: patient._id },
      { $set: { country: "India", city: "Mumbai", preferred_treatment_location: "Mumbai" } }
    );
    console.log("Patient record already exists, updated location");
  }

  // 3. Move cases from the mediimate patient account to this user
  const mediimateAuth = await db.collection("authusers").findOne({ email: "abhay.patient@mediimate.com" });
  if (mediimateAuth) {
    const moved = await db.collection("cases").updateMany(
      { patient_user_id: mediimateAuth.user_id },
      { $set: { patient_user_id: userId } }
    );
    console.log(`Moved ${moved.modifiedCount} cases from mediimate patient account`);

    // Move enrollments too
    const mediimatePatient = await db.collection("patients").findOne({ patient_user_id: mediimateAuth.user_id });
    if (mediimatePatient) {
      await db.collection("enrollments").updateMany(
        { patient_id: mediimatePatient._id.toString() },
        { $set: { patient_id: patient!._id.toString() } }
      );
      console.log("Moved enrollments");
    }

    // Delete the temporary mediimate patient account
    await db.collection("authusers").deleteOne({ email: "abhay.patient@mediimate.com" });
    await db.collection("userroles").deleteOne({ user_id: mediimateAuth.user_id });
    await db.collection("profiles").deleteOne({ user_id: mediimateAuth.user_id });
    if (mediimatePatient) {
      await db.collection("patients").deleteOne({ _id: mediimatePatient._id });
    }
    console.log("Deleted temporary abhay.patient@mediimate.com account");
  }

  // Also move any cases that were created under this userId directly
  const existingCases = await db.collection("cases").countDocuments({ patient_user_id: userId });
  if (existingCases === 0) {
    // Seed fresh cases
    const hospitals = await db.collection("clinics").find({ is_public_listed: true }).sort({ rating_avg: -1 }).toArray();
    if (hospitals.length > 0) {
      await db.collection("cases").insertMany([
        {
          patient_user_id: userId,
          condition: "Cardiac Bypass Surgery (CABG)",
          condition_details: "Triple vessel coronary artery disease. Requires CABG surgery.",
          budget_min: 300000, budget_max: 800000,
          preferred_location: "Chennai", preferred_country: "India",
          status: "hospital_accepted",
          matched_clinic_id: hospitals[0]._id.toString(),
          matched_at: new Date(Date.now() - 3 * 86400000),
          accepted_at: new Date(Date.now() - 1 * 86400000),
          assigned_by: "admin",
          treatment_plan: { description: "CABG triple vessel. Pre-op 2 days, surgery day 3, ICU 3 days.", estimated_cost: 550000, estimated_duration: "2 weeks", uploaded_by: "clinic", uploaded_at: new Date(Date.now() - 86400000) },
          createdAt: new Date(Date.now() - 7 * 86400000), updatedAt: new Date(),
        },
        {
          patient_user_id: userId,
          condition: "Knee Replacement - Both Knees",
          condition_details: "Severe osteoarthritis Grade 4 in both knees.",
          budget_min: 400000, budget_max: 900000,
          preferred_location: "Bangalore", preferred_country: "India",
          status: "submitted",
          createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(),
        },
        {
          patient_user_id: userId,
          condition: "Liver Transplant Evaluation",
          condition_details: "Chronic liver disease, cirrhosis. Living donor available.",
          budget_min: 1500000, budget_max: 3000000,
          preferred_location: "Gurgaon", preferred_country: "India",
          status: "treatment_completed",
          matched_clinic_id: hospitals.length > 1 ? hospitals[1]._id.toString() : hospitals[0]._id.toString(),
          matched_at: new Date(Date.now() - 45 * 86400000),
          accepted_at: new Date(Date.now() - 43 * 86400000),
          treatment_start_date: new Date(Date.now() - 35 * 86400000),
          treatment_end_date: new Date(Date.now() - 10 * 86400000),
          treatment_plan: { description: "Living donor liver transplant.", estimated_cost: 2200000, estimated_duration: "3 weeks", uploaded_by: "clinic", uploaded_at: new Date(Date.now() - 40 * 86400000) },
          createdAt: new Date(Date.now() - 50 * 86400000), updatedAt: new Date(),
        },
        {
          patient_user_id: userId,
          condition: "Spinal Disc Herniation",
          condition_details: "L4-L5 disc herniation causing sciatica. Need micro-discectomy.",
          budget_min: 150000, budget_max: 400000,
          preferred_location: "Mumbai", preferred_country: "India",
          status: "hospital_matched",
          matched_clinic_id: hospitals.length > 2 ? hospitals[2]._id.toString() : hospitals[0]._id.toString(),
          matched_at: new Date(Date.now() - 86400000),
          createdAt: new Date(Date.now() - 3 * 86400000), updatedAt: new Date(),
        },
      ]);
      console.log("Seeded 4 treatment cases");
    }
  } else {
    console.log(`User already has ${existingCases} cases`);
  }

  console.log("\n========================================");
  console.log("  DONE!");
  console.log("========================================");
  console.log(`  ${EMAIL} is now a PATIENT`);
  console.log("  Password: unchanged (use your existing password)");
  console.log("========================================");
  console.log("\nIMPORTANT: Log out and log back in for the role change to take effect.");
  console.log("Go to /auth/patient and sign in with your existing email & password.");

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

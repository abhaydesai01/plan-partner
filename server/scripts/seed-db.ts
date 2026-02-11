/**
 * Seeds the database with sample data (patients, clinic, appointments, vitals, etc.).
 * Uses SEED_DOCTOR_USER_ID from env, or a default so your logged-in user sees the data.
 * Run: cd server && npm run seed
 */
import "dotenv/config";
import mongoose from "mongoose";
import {
  Alert,
  Appointment,
  AppointmentCheckin,
  Clinic,
  ClinicInvite,
  ClinicMember,
  DoctorAvailability,
  Enrollment,
  FoodLog,
  LabResult,
  Notification,
  Patient,
  Profile,
  Program,
  UserRole,
  Vital,
} from "../models/index.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/plan-partner";
const DOCTOR_ID = process.env.SEED_DOCTOR_USER_ID || "e0697d5c-a726-4e3e-8da3-ee72b99f6999";

const patientNames = [
  { full_name: "Rajesh Kumar", phone: "+919876543201", age: 45, gender: "male", conditions: ["Hypertension", "Type 2 Diabetes"] },
  { full_name: "Priya Sharma", phone: "+919876543202", age: 32, gender: "female", conditions: ["Asthma"] },
  { full_name: "Amit Patel", phone: "+919876543203", age: 58, gender: "male", conditions: ["COPD", "Hypertension"] },
  { full_name: "Sneha Reddy", phone: "+919876543204", age: 28, gender: "female", conditions: [] },
  { full_name: "Vikram Singh", phone: "+919876543205", age: 52, gender: "male", conditions: ["Diabetes", "Thyroid"] },
  { full_name: "Kavita Nair", phone: "+919876543206", age: 38, gender: "female", conditions: ["PCOD"] },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // 1. Profile & UserRole for doctor (upsert so seed works after login)
  await Profile.findOneAndUpdate(
    { user_id: DOCTOR_ID },
    { $set: { full_name: "Dr. Abhay Desai", doctor_code: "MEDIM001", phone: "+919876500001", specialties: ["General Medicine", "Cardiology"] } },
    { upsert: true, new: true }
  );
  await UserRole.findOneAndUpdate(
    { user_id: DOCTOR_ID },
    { $set: { role: "doctor" } },
    { upsert: true }
  );
  console.log("Created/updated profile and user role for doctor");

  // 2. Clinic & membership (reuse existing or create)
  let clinic = await Clinic.findOne({ created_by: DOCTOR_ID });
  if (!clinic) {
    clinic = await Clinic.create({
    name: "Mediimate Care Clinic",
    address: "123 Health Street, Mumbai",
    phone: "+912212345678",
    email: "contact@mediimate.in",
    created_by: DOCTOR_ID,
    specialties: ["General Medicine", "Cardiology", "Pediatrics"],
    bed_count: 20,
    opd_capacity: 100,
  });
  }
  const clinicId = clinic._id.toString();
  const existingMember = await ClinicMember.findOne({ clinic_id: clinicId, user_id: DOCTOR_ID });
  if (!existingMember) await ClinicMember.create({ clinic_id: clinicId, user_id: DOCTOR_ID, role: "owner" });
  console.log("Created/updated clinic and membership");

  // 3. Doctor availability (Mon–Fri 9–17) – only if none exist
  const hasAvailability = await DoctorAvailability.findOne({ doctor_id: DOCTOR_ID });
  if (!hasAvailability) {
  for (let day = 1; day <= 5; day++) {
    await DoctorAvailability.create({
      doctor_id: DOCTOR_ID,
      day_of_week: day,
      start_time: "09:00",
      end_time: "17:00",
      slot_duration_minutes: 15,
      is_active: true,
      appointment_types: ["consultation", "follow_up"],
    });
  }
  }
  console.log("Created doctor availability");

  // 4. Patients
  const patientIds: string[] = [];
  for (const p of patientNames) {
    const pat = await Patient.create({
      doctor_id: DOCTOR_ID,
      clinic_id: clinicId,
      full_name: p.full_name,
      phone: p.phone,
      age: p.age,
      gender: p.gender,
      conditions: p.conditions,
      status: p.full_name.includes("Kumar") ? "at_risk" : "active",
      medications: p.conditions.length ? ["As prescribed"] : [],
      emergency_contact: "+919999999999",
    });
    patientIds.push(pat._id.toString());
  }
  console.log("Created", patientIds.length, "patients");

  // 5. Programs
  const programs = await Program.insertMany([
    { doctor_id: DOCTOR_ID, name: "NCD Management", type: "ncd", duration_days: 90, description: "Hypertension & diabetes care", is_active: true },
    { doctor_id: DOCTOR_ID, name: "Post-Discharge Care", type: "post_discharge", duration_days: 30, description: "Follow-up after discharge", is_active: true },
    { doctor_id: DOCTOR_ID, name: "Elder Care", type: "elder_care", duration_days: 180, is_active: true },
  ]);
  const programIds = programs.map((p) => p._id.toString());
  console.log("Created programs");

  // 6. Enrollments
  await Enrollment.insertMany([
    { doctor_id: DOCTOR_ID, patient_id: patientIds[0], program_id: programIds[0], status: "active", adherence_pct: 78, enrolled_at: new Date(Date.now() - 45 * 24 * 3600 * 1000) },
    { doctor_id: DOCTOR_ID, patient_id: patientIds[1], program_id: programIds[0], status: "active", adherence_pct: 92, enrolled_at: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
    { doctor_id: DOCTOR_ID, patient_id: patientIds[2], program_id: programIds[1], status: "active", adherence_pct: 65, enrolled_at: new Date(Date.now() - 14 * 24 * 3600 * 1000) },
    { doctor_id: DOCTOR_ID, patient_id: patientIds[4], program_id: programIds[0], status: "completed", adherence_pct: 88, completed_at: new Date() },
  ]);
  console.log("Created enrollments");

  // 7. Appointments (past and future)
  const now = new Date();
  const appointments: { _id: mongoose.Types.ObjectId; patient_id: string; scheduled_at: Date; status: string; title: string }[] = [];
  for (let i = 0; i < patientIds.length; i++) {
    const past = new Date(now);
    past.setDate(past.getDate() - (i + 1));
    past.setHours(10 + i, 0, 0, 0);
    const appt = await Appointment.create({
      doctor_id: DOCTOR_ID,
      patient_id: patientIds[i],
      clinic_id: clinicId,
      title: "Follow-up",
      scheduled_at: past,
      status: i % 3 === 0 ? "completed" : "scheduled",
      duration_minutes: 30,
      appointment_type: "consultation",
    });
    appointments.push({ _id: appt._id, patient_id: patientIds[i], scheduled_at: past, status: appt.status, title: appt.title });
  }
  for (let i = 0; i < 3; i++) {
    const future = new Date(now);
    future.setDate(future.getDate() + (i + 1));
    future.setHours(11 + i, 0, 0, 0);
    await Appointment.create({
      doctor_id: DOCTOR_ID,
      patient_id: patientIds[i],
      clinic_id: clinicId,
      title: "Next visit",
      scheduled_at: future,
      status: "scheduled",
      duration_minutes: 30,
      appointment_type: "consultation",
    });
  }
  console.log("Created appointments");

  // 8. Appointment checkins (for some completed)
  const completedAppts = appointments.filter((a) => a.status === "completed");
  for (let i = 0; i < completedAppts.length; i++) {
    await AppointmentCheckin.create({
      appointment_id: completedAppts[i]._id.toString(),
      patient_id: completedAppts[i].patient_id,
      doctor_id: DOCTOR_ID,
      clinic_id: clinicId,
      checked_in_at: completedAppts[i].scheduled_at,
      status: "completed",
      completed_at: new Date(completedAppts[i].scheduled_at.getTime() + 25 * 60000),
    });
  }
  console.log("Created appointment checkins");

  // 9. Vitals (for each patient)
  const vitalTypes = ["blood_pressure", "heart_rate", "temperature", "weight", "blood_sugar"];
  for (let pi = 0; pi < patientIds.length; pi++) {
    for (let v = 0; v < 4; v++) {
      const recorded = new Date(now);
      recorded.setDate(recorded.getDate() - v * 2);
      await Vital.create({
        doctor_id: DOCTOR_ID,
        patient_id: patientIds[pi],
        vital_type: vitalTypes[v % vitalTypes.length],
        value_text: vitalTypes[v % vitalTypes.length] === "blood_pressure" ? "120/80" : vitalTypes[v % vitalTypes.length] === "heart_rate" ? "72" : vitalTypes[v % vitalTypes.length] === "temperature" ? "98.6" : "70",
        value_numeric: vitalTypes[v % vitalTypes.length] === "heart_rate" ? 72 : vitalTypes[v % vitalTypes.length] === "temperature" ? 98.6 : 70,
        unit: vitalTypes[v % vitalTypes.length] === "heart_rate" ? "bpm" : vitalTypes[v % vitalTypes.length] === "temperature" ? "°F" : vitalTypes[v % vitalTypes.length] === "weight" ? "kg" : undefined,
        recorded_at: recorded,
      });
    }
  }
  console.log("Created vitals");

  // 10. Lab results
  const labTests = [
    { test_name: "HbA1c", result_value: "6.2", unit: "%", reference_range: "4-5.6" },
    { test_name: "Fasting Glucose", result_value: "108", unit: "mg/dL", reference_range: "70-100" },
    { test_name: "Total Cholesterol", result_value: "195", unit: "mg/dL", reference_range: "<200" },
    { test_name: "Creatinine", result_value: "1.0", unit: "mg/dL", reference_range: "0.7-1.2" },
  ];
  for (let pi = 0; pi < patientIds.length; pi++) {
    for (let t = 0; t < 2; t++) {
      const test = labTests[(pi + t) % labTests.length];
      const testedAt = new Date(now);
      testedAt.setDate(testedAt.getDate() - (t + 1) * 7);
      await LabResult.create({
        doctor_id: DOCTOR_ID,
        patient_id: patientIds[pi],
        test_name: test.test_name,
        result_value: test.result_value,
        unit: test.unit,
        reference_range: test.reference_range,
        status: "final",
        tested_at: testedAt,
      });
    }
  }
  console.log("Created lab results");

  // 11. Alerts
  await Alert.insertMany([
    { doctor_id: DOCTOR_ID, patient_id: patientIds[0], alert_type: "low_adherence", severity: "warning", title: "Low adherence", description: "Patient missed 3 check-ins this week", status: "open" },
    { doctor_id: DOCTOR_ID, patient_id: patientIds[2], alert_type: "abnormal_vital", severity: "critical", title: "High BP", description: "Blood pressure 150/95 recorded", status: "acknowledged" },
  ]);
  console.log("Created alerts");

  // 12. Food logs
  const meals = ["breakfast", "lunch", "dinner", "snack"];
  for (let pi = 0; pi < Math.min(3, patientIds.length); pi++) {
    for (let m = 0; m < 3; m++) {
      const loggedAt = new Date(now);
      loggedAt.setDate(loggedAt.getDate() - m);
      loggedAt.setHours(8 + m * 4, 0, 0, 0);
      await FoodLog.create({
        doctor_id: DOCTOR_ID,
        patient_id: patientIds[pi],
        meal_type: meals[m % meals.length],
        total_calories: 400 + m * 150,
        total_protein: 15 + m * 5,
        total_carbs: 45 + m * 10,
        total_fat: 12 + m * 3,
        logged_at: loggedAt,
        source: "manual",
      });
    }
  }
  console.log("Created food logs");

  // 13. Notifications
  await Notification.insertMany([
    { user_id: DOCTOR_ID, title: "New patient enrolled", message: "Rajesh Kumar self-enrolled via your link.", type: "success", category: "enrollment" },
    { user_id: DOCTOR_ID, title: "Appointment reminder", message: "Follow-up with Priya Sharma tomorrow at 11:00.", type: "info", category: "appointment" },
    { user_id: DOCTOR_ID, title: "Alert", message: "Low adherence alert for Rajesh Kumar.", type: "warning", category: "alert" },
  ]);
  console.log("Created notifications");

  // 14. Clinic invite (for join flow demo)
  await ClinicInvite.create({
    clinic_id: clinicId,
    email: "newdoctor@example.com",
    invite_code: "JOIN001",
    invited_by: DOCTOR_ID,
    role: "doctor",
    status: "pending",
  });
  console.log("Created clinic invite");

  console.log("\nSeed complete. Log in as the doctor (user_id:", DOCTOR_ID + ") to see all data.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

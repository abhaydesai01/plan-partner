/**
 * Removes duplicate documents from the database.
 * For each collection, documents that share the same "unique key" are considered
 * duplicates; all but one (oldest by _id) are deleted.
 * Run from server folder: npm run remove-duplicates
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
  LinkRequest,
  Notification,
  Patient,
  PatientDocument,
  PatientDoctorLink,
  PatientVaultCode,
  Profile,
  Program,
  UserRole,
  Vital,
} from "../models/index.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/plan-partner";

type KeyFields = string[];

async function removeDuplicatesInCollection(
  name: string,
  model: mongoose.Model<mongoose.Document>,
  keyFields: KeyFields
): Promise<number> {
  const collection = model.collection;
  const groupId: Record<string, string> = {};
  for (const f of keyFields) groupId[f] = `$${f}`;

  const dupeGroups = await collection
    .aggregate<{ _id: Record<string, unknown>; ids: mongoose.Types.ObjectId[]; count: number }>([
      { $group: { _id: groupId, ids: { $push: "$_id" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  let deleted = 0;
  for (const g of dupeGroups) {
    const toDelete = g.ids.slice(1);
    if (toDelete.length) {
      const result = await collection.deleteMany({ _id: { $in: toDelete } });
      deleted += result.deletedCount;
    }
  }
  if (deleted) console.log(`  ${name}: removed ${deleted} duplicate(s)`);
  return deleted;
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB. Scanning for duplicates...\n");

  const config: [string, mongoose.Model<mongoose.Document>, KeyFields][] = [
    ["patients", Patient, ["doctor_id", "full_name", "phone"]],
    ["enrollments", Enrollment, ["doctor_id", "patient_id", "program_id"]],
    ["appointments", Appointment, ["doctor_id", "patient_id", "scheduled_at"]],
    ["appointmentcheckins", AppointmentCheckin, ["appointment_id"]],
    ["alerts", Alert, ["doctor_id", "patient_id", "title"]],
    ["vitals", Vital, ["doctor_id", "patient_id", "vital_type", "recorded_at"]],
    ["lab_results", LabResult, ["doctor_id", "patient_id", "test_name", "tested_at"]],
    ["food_logs", FoodLog, ["doctor_id", "patient_id", "logged_at"]],
    ["patient_documents", PatientDocument, ["doctor_id", "patient_id", "file_path"]],
    ["programs", Program, ["doctor_id", "name", "type"]],
    ["doctor_availability", DoctorAvailability, ["doctor_id", "day_of_week", "start_time", "end_time"]],
    ["clinic_members", ClinicMember, ["clinic_id", "user_id"]],
    ["clinic_invites", ClinicInvite, ["clinic_id", "invite_code"]],
    ["clinics", Clinic, ["created_by", "name"]],
    ["link_requests", LinkRequest, ["doctor_id", "patient_user_id"]],
    ["patient_doctor_links", PatientDoctorLink, ["doctor_user_id", "patient_user_id"]],
    ["patient_vault_codes", PatientVaultCode, ["patient_user_id", "vault_code"]],
    ["profiles", Profile, ["user_id"]],
    ["user_roles", UserRole, ["user_id"]],
  ];

  let total = 0;
  for (const [name, model, keys] of config) {
    try {
      total += await removeDuplicatesInCollection(name, model, keys);
    } catch (e) {
      console.error(`  ${name}: error`, e);
    }
  }

  if (total === 0) console.log("No duplicates found.");
  else console.log(`\nTotal duplicates removed: ${total}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

import "dotenv/config";
import mongoose from "mongoose";
import { AuthUser, Patient, CarePlanAssignment, CarePlan } from "../models/index.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/plan-partner";
await mongoose.connect(MONGODB_URI);

// Find the demo patient user
const authUser = await AuthUser.findOne({ email: "demo@mediimate.in" }).lean() as any;
if (!authUser) { console.log("❌ AuthUser not found for demo@mediimate.in"); process.exit(1); }

console.log("AuthUser:", authUser.user_id);

const patient = await Patient.findOne({ user_id: authUser.user_id }).lean() as any;
if (!patient) { console.log("❌ Patient record not found"); process.exit(1); }

console.log("Patient _id:", patient._id.toString());

// Check assignments
const assignments = await CarePlanAssignment.find({ patient_id: patient._id.toString() }).lean();
console.log(`\nAssignments found: ${assignments.length}`);
for (const a of assignments) {
  const cp = await CarePlan.findById((a as any).careplan_id).lean() as any;
  console.log(` - assignment ${(a as any)._id} | careplan_id: ${(a as any).careplan_id} | careplan exists: ${!!cp} | status: ${(a as any).status}`);
}

// Check all careplans
const allPlans = await CarePlan.find({}).lean();
console.log(`\nAll CarePlans in DB: ${allPlans.length}`);
for (const p of allPlans) {
  console.log(` - ${(p as any)._id} | ${(p as any).name}`);
}

await mongoose.disconnect();

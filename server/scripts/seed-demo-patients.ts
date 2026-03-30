/**
 * Seeds 15 demo patients (demo1@gmail.com → demo15@gmail.com, password: Demo1234!)
 * with 15 days of realistic varied data in the 30-Day Diabetes care plan.
 * Every collection is populated: AuthUser, UserRole, Profile, Patient,
 * PatientGamification, Vital(s), CarePlanAssignment (full day_logs + mhp_history).
 *
 * Run: cd server && npx tsx scripts/seed-demo-patients.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  AuthUser,
  UserRole,
  Profile,
  Patient,
  PatientGamification,
  Vital,
  Notification,
  CarePlan,
  CarePlanAssignment,
} from "../models/index.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/plan-partner";
const DOCTOR_ID = process.env.SEED_DOCTOR_USER_ID || "e0697d5c-a726-4e3e-8da3-ee72b99f6999";
const PASSWORD = "Demo1234!";

// ─────────────────────────────────────────────────────────────────
//  Simple seeded PRNG (LCG) for reproducible data across runs
// ─────────────────────────────────────────────────────────────────
let _lcg = 314159265;
function rand(): number {
  _lcg = (Math.imul(_lcg, 1664525) + 1013904223) >>> 0;
  return _lcg / 4294967296;
}
function ri(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function rb(prob: number): boolean {
  return rand() < prob;
}

function dateNDaysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}
function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────
//  Patient definitions
// ─────────────────────────────────────────────────────────────────
interface PatientDef {
  idx: number;
  email: string;
  name: string;
  phone: string;
  age: number;
  gender: "male" | "female";
  conditions: string[];
  medications: string[];
  baselineSugar: number;
  fastingRange: [number, number];
  postmealRange: [number, number];
  bpSystolicRange?: [number, number];
  weightKg?: number;
  missedDays: number[];      // 1-based day numbers that are skipped
  medAdherenceRate: number;  // 0-1
  workoutRate: number;       // 0-1
  targetMHP: number;         // desired final MHP balance
  screenComps: { eye?: boolean; kidney?: boolean; nerve?: boolean; heart?: boolean };
  appointmentBooked: boolean;
  escalateDays: number[];    // days when sugar triggers escalation (very high)
}

const PATIENTS: PatientDef[] = [
  // 1 – Well-controlled, consistent
  {
    idx: 1, email: "demo1@gmail.com", name: "Arjun Mehta",
    phone: "+919876540001", age: 55, gender: "male",
    conditions: ["Type 2 Diabetes", "Hypertension"],
    medications: ["Metformin 500mg BD", "Amlodipine 5mg OD", "Metoprolol 25mg OD"],
    baselineSugar: 162, fastingRange: [94, 122], postmealRange: [130, 165],
    bpSystolicRange: [124, 140], weightKg: 78,
    missedDays: [6, 12], medAdherenceRate: 0.93, workoutRate: 0.38,
    targetMHP: 725,
    screenComps: { eye: true, kidney: true, nerve: false, heart: false },
    appointmentBooked: true,
    escalateDays: [],
  },
  // 2 – Moderate adherence
  {
    idx: 2, email: "demo2@gmail.com", name: "Sunita Reddy",
    phone: "+919876540002", age: 48, gender: "female",
    conditions: ["Type 2 Diabetes"],
    medications: ["Metformin 1000mg BD", "Vildagliptin 50mg OD"],
    baselineSugar: 178, fastingRange: [118, 165], postmealRange: [155, 215],
    weightKg: 68,
    missedDays: [4, 7, 11], medAdherenceRate: 0.77, workoutRate: 0.20,
    targetMHP: 475,
    screenComps: { eye: false, kidney: false, nerve: false, heart: false },
    appointmentBooked: false,
    escalateDays: [],
  },
  // 3 – Poor control, CKD
  {
    idx: 3, email: "demo3@gmail.com", name: "Ramesh Iyer",
    phone: "+919876540003", age: 62, gender: "male",
    conditions: ["Type 2 Diabetes", "CKD Stage 2"],
    medications: ["Insulin Glargine 20U HS", "Empagliflozin 10mg OD"],
    baselineSugar: 225, fastingRange: [172, 255], postmealRange: [220, 300],
    bpSystolicRange: [138, 158], weightKg: 82,
    missedDays: [3, 6, 7, 9, 11, 14], medAdherenceRate: 0.60, workoutRate: 0.08,
    targetMHP: 290,
    screenComps: { eye: true, kidney: true, nerve: true, heart: false },
    appointmentBooked: true,
    escalateDays: [2, 5, 10, 13],
  },
  // 4 – Young, PCOS, motivated
  {
    idx: 4, email: "demo4@gmail.com", name: "Ananya Krishnan",
    phone: "+919876540004", age: 37, gender: "female",
    conditions: ["Type 2 Diabetes", "PCOS", "Obesity"],
    medications: ["Metformin 500mg BD", "Inositol 2g OD", "Clomiphene 50mg (monthly)"],
    baselineSugar: 150, fastingRange: [106, 148], postmealRange: [140, 190],
    weightKg: 83,
    missedDays: [10], medAdherenceRate: 0.88, workoutRate: 0.45,
    targetMHP: 580,
    screenComps: { eye: false, kidney: false, nerve: false, heart: false },
    appointmentBooked: false,
    escalateDays: [],
  },
  // 5 – Elderly, triple comorbidity, poor
  {
    idx: 5, email: "demo5@gmail.com", name: "Mohan Nair",
    phone: "+919876540005", age: 71, gender: "male",
    conditions: ["Type 2 Diabetes", "Hypertension", "Dyslipidemia"],
    medications: ["Insulin NPH 30U BD", "Amlodipine 10mg OD", "Atorvastatin 20mg OD", "Aspirin 75mg OD"],
    baselineSugar: 240, fastingRange: [190, 275], postmealRange: [240, 330],
    bpSystolicRange: [148, 172], weightKg: 72,
    missedDays: [2, 4, 7, 9, 11, 12, 14], medAdherenceRate: 0.52, workoutRate: 0.04,
    targetMHP: 195,
    screenComps: { eye: true, kidney: false, nerve: true, heart: true },
    appointmentBooked: true,
    escalateDays: [1, 3, 6, 8, 10, 13, 15],
  },
  // 6 – Newly diagnosed, very engaged
  {
    idx: 6, email: "demo6@gmail.com", name: "Kavitha Subramaniam",
    phone: "+919876540006", age: 44, gender: "female",
    conditions: ["Type 2 Diabetes", "Obesity"],
    medications: ["Metformin 850mg BD", "Semaglutide 0.5mg weekly"],
    baselineSugar: 188, fastingRange: [132, 185], postmealRange: [170, 230],
    weightKg: 92,
    missedDays: [8], medAdherenceRate: 0.94, workoutRate: 0.48,
    targetMHP: 850,
    screenComps: { eye: true, kidney: false, nerve: false, heart: false },
    appointmentBooked: true,
    escalateDays: [],
  },
  // 7 – Misses weekends (days 7, 8, 14, 15 map to weekend pattern)
  {
    idx: 7, email: "demo7@gmail.com", name: "Deepak Verma",
    phone: "+919876540007", age: 58, gender: "male",
    conditions: ["Type 2 Diabetes", "Hypertension"],
    medications: ["Metformin 1000mg BD", "Telmisartan 40mg OD", "Aspirin 75mg OD"],
    baselineSugar: 195, fastingRange: [145, 208], postmealRange: [185, 250],
    bpSystolicRange: [132, 155], weightKg: 85,
    missedDays: [7, 8, 14, 15], medAdherenceRate: 0.70, workoutRate: 0.22,
    targetMHP: 395,
    screenComps: { eye: false, kidney: false, nerve: false, heart: false },
    appointmentBooked: false,
    escalateDays: [],
  },
  // 8 – Perfect adherence, near Gold
  {
    idx: 8, email: "demo8@gmail.com", name: "Priya Balasubramanian",
    phone: "+919876540008", age: 34, gender: "female",
    conditions: ["Type 2 Diabetes"],
    medications: ["Metformin 500mg BD"],
    baselineSugar: 142, fastingRange: [86, 115], postmealRange: [118, 155],
    weightKg: 62,
    missedDays: [], medAdherenceRate: 0.98, workoutRate: 0.58,
    targetMHP: 960,
    screenComps: { eye: true, kidney: true, nerve: true, heart: true },
    appointmentBooked: true,
    escalateDays: [],
  },
  // 9 – Elderly, hypothyroidism
  {
    idx: 9, email: "demo9@gmail.com", name: "Lakshmi Venkatesh",
    phone: "+919876540009", age: 67, gender: "female",
    conditions: ["Type 2 Diabetes", "Hypothyroidism"],
    medications: ["Insulin Regular 10U AC meals", "Levothyroxine 50mcg OD"],
    baselineSugar: 215, fastingRange: [158, 218], postmealRange: [200, 268],
    weightKg: 69,
    missedDays: [3, 6, 8, 9, 12], medAdherenceRate: 0.63, workoutRate: 0.10,
    targetMHP: 315,
    screenComps: { eye: false, kidney: false, nerve: false, heart: false },
    appointmentBooked: false,
    escalateDays: [5, 15],
  },
  // 10 – Cardiac history, reasonable
  {
    idx: 10, email: "demo10@gmail.com", name: "Sanjay Kulkarni",
    phone: "+919876540010", age: 52, gender: "male",
    conditions: ["Type 2 Diabetes", "CAD", "Hypertension"],
    medications: ["Metformin 1000mg BD", "Repaglinide 1mg TDS", "Clopidogrel 75mg OD", "Ramipril 5mg OD"],
    baselineSugar: 180, fastingRange: [128, 178], postmealRange: [165, 222],
    bpSystolicRange: [128, 148], weightKg: 80,
    missedDays: [5, 6], medAdherenceRate: 0.80, workoutRate: 0.28,
    targetMHP: 520,
    screenComps: { eye: false, kidney: false, nerve: false, heart: true },
    appointmentBooked: true,
    escalateDays: [],
  },
  // 11 – Young T1 diabetic
  {
    idx: 11, email: "demo11@gmail.com", name: "Rohit Choudhary",
    phone: "+919876540011", age: 29, gender: "male",
    conditions: ["Type 1 Diabetes"],
    medications: ["Insulin Aspart 8U AC meals", "Insulin Glargine 18U HS"],
    baselineSugar: 138, fastingRange: [93, 132], postmealRange: [125, 170],
    weightKg: 68,
    missedDays: [5], medAdherenceRate: 0.96, workoutRate: 0.52,
    targetMHP: 685,
    screenComps: { eye: false, kidney: false, nerve: false, heart: false },
    appointmentBooked: false,
    escalateDays: [],
  },
  // 12 – Overweight, dyslipidemia
  {
    idx: 12, email: "demo12@gmail.com", name: "Fatima Shaikh",
    phone: "+919876540012", age: 46, gender: "female",
    conditions: ["Type 2 Diabetes", "Obesity", "Dyslipidemia"],
    medications: ["Metformin 1000mg BD", "Rosuvastatin 10mg OD", "Fenofibrate 145mg OD"],
    baselineSugar: 192, fastingRange: [138, 198], postmealRange: [175, 242],
    weightKg: 96,
    missedDays: [4, 11], medAdherenceRate: 0.78, workoutRate: 0.30,
    targetMHP: 478,
    screenComps: { eye: false, kidney: false, nerve: false, heart: false },
    appointmentBooked: false,
    escalateDays: [],
  },
  // 13 – Low engagement, just enrolled
  {
    idx: 13, email: "demo13@gmail.com", name: "Gopal Joshi",
    phone: "+919876540013", age: 60, gender: "male",
    conditions: ["Type 2 Diabetes"],
    medications: ["Glibenclamide 5mg OD"],
    baselineSugar: 205, fastingRange: [168, 235], postmealRange: [210, 290],
    weightKg: 76,
    missedDays: [2, 4, 5, 7, 8, 9, 11, 12], medAdherenceRate: 0.42, workoutRate: 0.06,
    targetMHP: 155,
    screenComps: { eye: false, kidney: false, nerve: false, heart: false },
    appointmentBooked: false,
    escalateDays: [3, 6, 10],
  },
  // 14 – Near Gold tier, excellent
  {
    idx: 14, email: "demo14@gmail.com", name: "Meena Agarwal",
    phone: "+919876540014", age: 53, gender: "female",
    conditions: ["Type 2 Diabetes", "Hypertension"],
    medications: ["Metformin 500mg BD", "Teneligliptin 20mg OD", "Losartan 50mg OD"],
    baselineSugar: 155, fastingRange: [90, 124], postmealRange: [122, 158],
    bpSystolicRange: [118, 136], weightKg: 65,
    missedDays: [], medAdherenceRate: 0.97, workoutRate: 0.55,
    targetMHP: 900,
    screenComps: { eye: true, kidney: true, nerve: true, heart: true },
    appointmentBooked: true,
    escalateDays: [],
  },
  // 15 – Struggling early, gradually improving
  {
    idx: 15, email: "demo15@gmail.com", name: "Vikram Pandey",
    phone: "+919876540015", age: 41, gender: "male",
    conditions: ["Type 2 Diabetes"],
    medications: ["Metformin 500mg BD", "Glimepiride 2mg OD"],
    baselineSugar: 198, fastingRange: [148, 202], postmealRange: [188, 252],
    weightKg: 88,
    missedDays: [1, 2, 3, 8], medAdherenceRate: 0.71, workoutRate: 0.25,
    targetMHP: 430,
    screenComps: { eye: false, kidney: false, nerve: false, heart: false },
    appointmentBooked: false,
    escalateDays: [4, 9],
  },
];

// ─────────────────────────────────────────────────────────────────

async function seedPatient(
  pDef: PatientDef,
  careplanId: string,
  careplanName: string,
  passwordHash: string
) {
  const { email, name, phone, age, gender, conditions, medications, idx } = pDef;

  // ── AuthUser ──────────────────────────────────────────────────
  let userId: string;
  const existing = await AuthUser.findOne({ email }).lean();
  if (existing) {
    userId = (existing as any).user_id;
    await AuthUser.updateOne(
      { email },
      { $set: { password_hash: passwordHash, email_verified: true, approval_status: "active" } }
    );
  } else {
    userId = crypto.randomUUID();
    await AuthUser.create({
      email,
      password_hash: passwordHash,
      user_id: userId,
      email_verified: true,
      approval_status: "active",
    });
  }

  // ── UserRole ──────────────────────────────────────────────────
  await UserRole.findOneAndUpdate(
    { user_id: userId },
    { $set: { role: "patient" } },
    { upsert: true }
  );

  // ── Profile ───────────────────────────────────────────────────
  await Profile.findOneAndUpdate(
    { user_id: userId },
    { $set: { full_name: name, phone } },
    { upsert: true }
  );

  // ── Patient ───────────────────────────────────────────────────
  let patient = await Patient.findOne({ patient_user_id: userId });
  if (!patient) {
    patient = await Patient.create({
      patient_user_id: userId,
      doctor_id: DOCTOR_ID,
      full_name: name,
      phone,
      age,
      gender,
      conditions,
      medications,
      status: "active",
      date_of_birth: new Date(new Date().getFullYear() - age, 5, 15),
      blood_group: (["A+", "B+", "O+", "AB+", "A-", "B-"] as const)[idx % 6],
      allergies: idx % 5 === 0 ? ["Sulfonamides"] : [],
    });
  } else {
    // Keep patient record fresh
    await Patient.updateOne(
      { _id: patient._id },
      { $set: { conditions, medications, phone, age, gender, status: "active" } }
    );
  }
  const patientId = patient._id.toString();

  // ── PatientGamification ───────────────────────────────────────
  const now = new Date();
  await PatientGamification.findOneAndUpdate(
    { patient_id: patientId },
    {
      $set: {
        patient_id: patientId,
        current_streak: Math.max(0, 15 - Math.max(...pDef.missedDays, 0)),
        longest_streak: 15 - pDef.missedDays.length,
        total_points: pDef.targetMHP,
        level: pDef.targetMHP >= 1000 ? 5 : pDef.targetMHP >= 750 ? 4 : pDef.targetMHP >= 500 ? 3 : pDef.targetMHP >= 200 ? 2 : 1,
        level_label:
          pDef.targetMHP >= 1000 ? "Expert" :
          pDef.targetMHP >= 750 ? "Advanced" :
          pDef.targetMHP >= 500 ? "Intermediate" :
          pDef.targetMHP >= 200 ? "Beginner+" : "Beginner",
        badges:
          pDef.targetMHP >= 1000
            ? ["7-Day Streak", "First Log", "Medicine Master", "Complication Screened", "30-Day Champion"]
            : pDef.targetMHP >= 500
            ? ["7-Day Streak", "First Log", "Medicine Master"]
            : pDef.targetMHP >= 200
            ? ["3-Day Streak", "First Log"]
            : ["First Log"],
        last_activity: now,
      },
    },
    { upsert: true }
  );

  // ── Remove old assignment & vitals for idempotency ────────────
  await CarePlanAssignment.deleteMany({ patient_id: patientId, careplan_id: careplanId });
  await Vital.deleteMany({ patient_id: patientId, source: "careplan_seed" });

  // ── Build 15 day_logs ─────────────────────────────────────────
  // Program started 15 days ago
  const startDate = dateNDaysAgo(15);
  const dayLogs: any[] = [];
  const mhpHistory: any[] = [];
  const vitalDocs: any[] = [];
  let mhpAccumulated = 0;
  let streakDays = 0;
  let lastLogDate = "";

  for (let day = 1; day <= 15; day++) {
    const logDate = new Date(startDate);
    logDate.setDate(logDate.getDate() + day - 1);
    const dateStr = fmtDate(logDate);
    const missed = pDef.missedDays.includes(day);

    if (missed) {
      streakDays = 0;
      dayLogs.push({
        day,
        date: logDate,
        fasting_sugar: null,
        postmeal_sugar: null,
        meds_taken: false,
        meals_logged: 0,
        foot_check_done: false,
        workout_logged: false,
        mhp_earned_today: 0,
        escalation_triggered: false,
        notes: "",
      });
      continue;
    }

    // Values
    const fastingSugar = ri(pDef.fastingRange[0], pDef.fastingRange[1]);
    const postmealSugar = day >= 3 ? ri(pDef.postmealRange[0], pDef.postmealRange[1]) : null;
    const escalate = pDef.escalateDays.includes(day);
    const actualFasting = escalate ? ri(295, 340) : fastingSugar;
    const medsTaken = rb(pDef.medAdherenceRate);
    const mealsLogged = ri(1, 3);
    const footCheckDay = day === 3 || day === 7 || day === 14;
    const footCheckDone = footCheckDay && rb(0.75);
    const workoutLogged = rb(pDef.workoutRate);

    let mhpToday = 0;

    const addMhp = (action: string, points: number) => {
      mhpToday += points;
      mhpHistory.push({ action, points, date: logDate, day });
    };

    addMhp("fasting_sugar_log", 10);
    if (postmealSugar) addMhp("postmeal_sugar_log", 10);
    if (medsTaken) addMhp("medicine_confirm", 5);
    for (let m = 0; m < mealsLogged; m++) addMhp("meal_log", 5);
    if (footCheckDone) addMhp("foot_check", 10);
    if (workoutLogged) addMhp("workout_log", 10);

    streakDays++;
    lastLogDate = dateStr;
    if (streakDays === 3) addMhp("streak_3day", 25);
    if (streakDays === 7) addMhp("streak_7day", 75);

    mhpAccumulated += mhpToday;

    dayLogs.push({
      day,
      date: logDate,
      fasting_sugar: actualFasting,
      postmeal_sugar: postmealSugar ? (escalate ? ri(340, 420) : postmealSugar) : null,
      meds_taken: medsTaken,
      meals_logged: mealsLogged,
      foot_check_done: footCheckDone,
      workout_logged: workoutLogged,
      mhp_earned_today: mhpToday,
      escalation_triggered: escalate,
      notes: escalate ? "Very high sugar — escalation triggered" : "",
    });

    // Blood sugar vitals (fasting)
    const morningTime = new Date(logDate);
    morningTime.setHours(7, ri(0, 59), 0, 0);
    vitalDocs.push({
      patient_id: patientId,
      doctor_id: DOCTOR_ID,
      vital_type: "blood_sugar",
      value_numeric: actualFasting,
      value_text: String(actualFasting),
      unit: "mg/dL",
      recorded_at: morningTime,
      source: "careplan_seed",
      notes: "Fasting blood sugar",
    });

    // Blood sugar vitals (post-meal)
    if (postmealSugar) {
      const afternoonTime = new Date(logDate);
      afternoonTime.setHours(14, ri(0, 59), 0, 0);
      vitalDocs.push({
        patient_id: patientId,
        doctor_id: DOCTOR_ID,
        vital_type: "blood_sugar",
        value_numeric: escalate ? ri(340, 420) : postmealSugar,
        value_text: String(escalate ? ri(340, 420) : postmealSugar),
        unit: "mg/dL",
        recorded_at: afternoonTime,
        source: "careplan_seed",
        notes: "Post-meal blood sugar",
      });
    }

    // Blood pressure vitals (for hypertension patients)
    if (pDef.bpSystolicRange && (day % 2 === 1)) {
      const bpSys = ri(pDef.bpSystolicRange[0], pDef.bpSystolicRange[1]);
      const bpDia = ri(75, 92);
      const bpTime = new Date(logDate);
      bpTime.setHours(8, ri(0, 30), 0, 0);
      vitalDocs.push({
        patient_id: patientId,
        doctor_id: DOCTOR_ID,
        vital_type: "blood_pressure",
        value_numeric: bpSys,
        value_text: `${bpSys}/${bpDia}`,
        unit: "mmHg",
        recorded_at: bpTime,
        source: "careplan_seed",
        notes: "Blood pressure reading",
      });
    }

    // Weight vitals (every 3-4 days for patients with weight defined)
    if (pDef.weightKg && day % 4 === 0) {
      const w = pDef.weightKg - Math.round(rand() * 6) / 10; // slight variation
      const wTime = new Date(logDate);
      wTime.setHours(7, 0, 0, 0);
      vitalDocs.push({
        patient_id: patientId,
        doctor_id: DOCTOR_ID,
        vital_type: "weight",
        value_numeric: w,
        value_text: String(w),
        unit: "kg",
        recorded_at: wTime,
        source: "careplan_seed",
        notes: "Body weight",
      });
    }

    // Oxygen saturation for elderly patients (age >= 60, on some days)
    if (pDef.age >= 60 && day % 5 === 0) {
      const spo2 = ri(94, 98);
      const spo2Time = new Date(logDate);
      spo2Time.setHours(9, 0, 0, 0);
      vitalDocs.push({
        patient_id: patientId,
        doctor_id: DOCTOR_ID,
        vital_type: "oxygen_saturation",
        value_numeric: spo2,
        value_text: String(spo2),
        unit: "%",
        recorded_at: spo2Time,
        source: "careplan_seed",
        notes: "SpO2 reading",
      });
    }
  }

  // Scale MHP to target
  const scaleFactor = mhpAccumulated > 0 ? pDef.targetMHP / mhpAccumulated : 1;
  const scaledHistory = mhpHistory.map((h) => ({
    ...h,
    points: Math.max(1, Math.round(h.points * scaleFactor)),
  }));

  // Tier
  let tier: string | null = null;
  if (pDef.targetMHP >= 1000) tier = "Gold";
  else if (pDef.targetMHP >= 500) tier = "Silver";
  else if (pDef.targetMHP >= 200) tier = "Bronze";

  // Complication screenings — apply on day 14 for patients that have them
  const compScreened = {
    eye: pDef.screenComps.eye ?? false,
    kidney: pDef.screenComps.kidney ?? false,
    nerve: pDef.screenComps.nerve ?? false,
    heart: pDef.screenComps.heart ?? false,
  };
  if (compScreened.eye) {
    const d = dateNDaysAgo(2);
    mhpHistory.push({ action: "complication_screen_eye", points: 20, date: d, day: 14 });
  }
  if (compScreened.kidney) {
    const d = dateNDaysAgo(2);
    mhpHistory.push({ action: "complication_screen_kidney", points: 20, date: d, day: 14 });
  }
  if (compScreened.nerve) {
    const d = dateNDaysAgo(2);
    mhpHistory.push({ action: "complication_screen_nerve", points: 20, date: d, day: 14 });
  }
  if (compScreened.heart) {
    const d = dateNDaysAgo(2);
    mhpHistory.push({ action: "complication_screen_heart", points: 20, date: d, day: 14 });
  }
  if (pDef.appointmentBooked) {
    const d = dateNDaysAgo(3);
    mhpHistory.push({ action: "appointment_book", points: 50, date: d, day: 12 });
  }

  // Escalation log
  const escalationLog = pDef.escalateDays.map((day) => ({
    day,
    date: dateNDaysAgo(15 - day + 1),
    trigger: "fasting_sugar_critical",
    sugar_value: ri(295, 340),
    action_taken: "WhatsApp escalation sent to doctor",
  }));

  await CarePlanAssignment.create({
    careplan_id: careplanId,
    patient_id: patientId,
    doctor_id: DOCTOR_ID,
    status: "active",
    enrolled_at: startDate,
    start_date: startDate,
    current_day: 15,
    onboarding_complete: true,
    onboarding_step: 3,
    diabetes_type: pDef.conditions.includes("Type 1 Diabetes") ? "insulin" : "tablets",
    medicines: medications,
    baseline_sugar: pDef.baselineSugar,
    baseline_timing: "fasting",
    complications: conditions.filter((c) => !c.toLowerCase().includes("diabet") && !c.toLowerCase().includes("hyper")),
    mhp_balance: pDef.targetMHP,
    mhp_tier: tier,
    mhp_history: scaledHistory,
    streak_days: streakDays,
    last_log_date: lastLogDate,
    day_logs: dayLogs,
    complications_screened: compScreened,
    appointment_booked: pDef.appointmentBooked,
    escalations_count: pDef.escalateDays.length,
    escalation_log: escalationLog,
    rewards_claimed: {
      bronze: pDef.targetMHP >= 200,
      silver: pDef.targetMHP >= 500,
      gold: pDef.targetMHP >= 1000,
    },
  });

  // Bulk insert vitals
  if (vitalDocs.length > 0) {
    await Vital.insertMany(vitalDocs);
  }

  // Welcome notification
  await Notification.create({
    user_id: userId,
    title: "Welcome to your Care Plan!",
    message: `You've been enrolled in the ${careplanName}. Start logging daily for MHP rewards!`,
    category: "careplan",
    type: "success",
    is_read: idx % 3 !== 0, // some unread
    related_type: "careplan_assignment",
  });

  console.log(
    `  ✓ ${name.padEnd(25)} | ${pDef.email.padEnd(22)} | MHP: ${String(pDef.targetMHP).padStart(4)} (${tier || "None"}) | Vitals: ${vitalDocs.length}`
  );
}

// ─────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB\n");

  // Find or create the 30-day diabetes care plan
  const careplan = await CarePlan.findOne({ slug: "30-day-diabetes" }).lean();
  if (!careplan) {
    console.error("ERROR: 30-day-diabetes care plan not found. Run seed-careplan.ts first.");
    process.exit(1);
  }
  const careplanId = (careplan as any)._id.toString();
  const careplanName = (careplan as any).name;
  console.log(`Using care plan: "${careplanName}" (${careplanId})\n`);
  console.log("Seeding 15 demo patients...\n");

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const pDef of PATIENTS) {
    await seedPatient(pDef, careplanId, careplanName, passwordHash);
  }

  const totalPatients = await Patient.countDocuments({
    phone: { $in: PATIENTS.map((p) => p.phone) },
  });
  const totalVitals = await Vital.countDocuments({ source: "careplan_seed" });
  const totalAssignments = await CarePlanAssignment.countDocuments({ careplan_id: careplanId });

  console.log("\n──────────────────────────────────────────");
  console.log(`✅  Seeded ${totalPatients} patients, ${totalVitals} vitals, ${totalAssignments} assignments`);
  console.log(`   Login: demo1@gmail.com → demo15@gmail.com`);
  console.log(`   Password: ${PASSWORD}`);
  console.log("──────────────────────────────────────────\n");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

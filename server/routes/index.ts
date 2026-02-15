import { Router, Request } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import webpush from "web-push";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { LIMITS, parseLimit, parseSkip } from "../constants.js";
import {
  Alert,
  AuthUser,
  Appointment,
  AppointmentCheckin,
  Clinic,
  ClinicInvite,
  ClinicMember,
  DoctorAvailability,
  Enrollment,
  Feedback,
  FeedbackRequest,
  FoodLog,
  LabReport,
  LabResult,
  LinkRequest,
  MedicationLog,
  Notification,
  ReminderEscalation,
  Patient,
  PatientDocument,
  PatientDoctorLink,
  PatientVaultCode,
  Profile,
  Program,
  PushSubscription,
  QuickLogToken,
  UserRole,
  Vital,
  FamilyConnection,
  DoctorMessage,
  UserBadge,
  UserWeeklyChallenge,
  MilestoneReward,
  Medication,
  PatientGamification,
  VoiceConversation,
} from "../models/index.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${(file.originalname || "file").replace(/[^a-zA-Z0-9.-]/g, "_")}`),
  }),
});

type AuthRequest = Request & { user: { id: string } };

/** For clinic-role users, returns their clinic_id; otherwise null. */
async function getClinicIdForUser(userId: string): Promise<string | null> {
  const u = await AuthUser.findOne({ user_id: userId }).select("clinic_id").lean();
  return (u as { clinic_id?: string } | null)?.clinic_id ?? null;
}

/** True if current user can act for this clinic (member as owner/admin, or clinic role with this clinic_id). */
async function canActForClinic(userId: string, clinicId: string): Promise<boolean> {
  const asClinic = await getClinicIdForUser(userId);
  if (asClinic === clinicId) return true;
  const member = await ClinicMember.findOne({ clinic_id: clinicId, user_id: userId }).lean();
  const role = (member as { role?: string } | null)?.role;
  return role === "owner" || role === "admin";
}

/** True if doctor can access this patient (owns the Patient record or has active PatientDoctorLink). */
async function doctorCanAccessPatient(doctorId: string, patientId: string): Promise<boolean> {
  if (!patientId) return false;
  const patient = await Patient.findById(patientId).select("doctor_id patient_user_id").lean();
  if (!patient) return false;
  const p = patient as { doctor_id: string; patient_user_id?: string };
  if (p.doctor_id === doctorId) return true;
  if (p.patient_user_id) {
    const link = await PatientDoctorLink.findOne({ doctor_user_id: doctorId, patient_user_id: p.patient_user_id, status: "active" }).lean();
    return !!link;
  }
  return false;
}

async function getAiVitalRemark(vitalType: string, valueText: string, unit?: string | null): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const label = vitalType.replace(/_/g, " ");
  const prompt = `You are a clinical assistant. Given this vital sign reading, write ONE short sentence (max 15 words) as a remark for the notes field. Be factual and neutral. No disclaimer.
Vital: ${label}. Value: ${valueText}${unit ? ` ${unit}` : ""}.
Reply with only the remark, no quotes or prefix.`;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 80 },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text && text.length <= 200 ? text : null;
  } catch {
    return null;
  }
}

// ---------- Auth: register/login are in routes/auth.ts (mounted first in app). Me and rest here ----------
function generateDoctorCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "DR";
  for (let i = 0; i < 6; i++) code += chars[crypto.randomInt(0, chars.length)];
  return code;
}

router.get("/auth/me", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const [profile, roleDoc, patientExisting, authUser] = await Promise.all([
    Profile.findOne({ user_id: userId }).lean(),
    UserRole.findOne({ user_id: userId }).lean(),
    Patient.findOne({ patient_user_id: userId }).lean(),
    AuthUser.findOne({ user_id: userId }).select("clinic_id").lean(),
  ]);
  const role = (roleDoc as { role?: string; clinic_id?: string })?.role ?? null;
  const clinicId = (roleDoc as { clinic_id?: string })?.clinic_id ?? (authUser as { clinic_id?: string })?.clinic_id;

  let profileForOut = profile as { _id?: unknown; user_id?: string; doctor_code?: string; full_name?: string; [k: string]: unknown } | null;
  if (role === "doctor" && profileForOut && !profileForOut.doctor_code) {
    let code = generateDoctorCode();
    for (let attempt = 0; attempt < 10; attempt++) {
      const existing = await Profile.findOne({ doctor_code: code }).lean();
      if (!existing) break;
      code = generateDoctorCode();
    }
    await Profile.findOneAndUpdate({ user_id: userId }, { $set: { doctor_code: code } });
    profileForOut = { ...profileForOut, doctor_code: code };
  }

  let patient = patientExisting;
  if (!patient && role === "patient") {
    const created = await Patient.create({
      patient_user_id: userId,
      doctor_id: userId,
      full_name: (profileForOut as { full_name?: string })?.full_name || "Patient",
      phone: " ",
      status: "active",
    });
    patient = created.toObject ? created.toObject() : (created as any);
  }

  let clinicOut = null;
  if (role === "clinic" && clinicId) {
    const clinic = await Clinic.findById(clinicId).lean();
    if (clinic) {
      clinicOut = { ...clinic, id: (clinic as any)._id?.toString(), _id: undefined, __v: undefined };
    }
  }

  const profileOut = profileForOut ? { ...profileForOut, id: (profileForOut as any)._id?.toString(), _id: undefined, __v: undefined } : null;
  const patientOut = patient ? { ...patient, id: (patient as any)._id?.toString(), _id: undefined, __v: undefined } : null;
  return res.json({
    user: { id: userId },
    profile: profileOut,
    role,
    patient: role === "clinic" ? null : patientOut,
    clinic: clinicOut,
  });
});

// ---------- Doctor: switch to clinic portal (when clinic has its own login) ----------
router.get("/auth/switchable-clinics", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const roleDoc = await UserRole.findOne({ user_id: userId }).lean();
  const role = (roleDoc as { role?: string })?.role;
  if (role !== "doctor") return res.json([]);
  const memberships = await ClinicMember.find({ user_id: userId, role: { $in: ["owner", "admin"] } }).select("clinic_id").lean();
  const clinicIds = [...new Set((memberships as { clinic_id: string }[]).map((m) => m.clinic_id))];
  const withLogin = await AuthUser.find({ clinic_id: { $in: clinicIds } }).select("clinic_id").lean();
  const idsWithLogin = [...new Set((withLogin as { clinic_id: string }[]).map((a) => a.clinic_id))];
  const objectIds = idsWithLogin.filter((id) => id && mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
  const clinics = objectIds.length > 0 ? await Clinic.find({ _id: { $in: objectIds } }).select("name").lean() : [];
  return res.json(clinics.map((c: any) => ({ id: c._id.toString(), name: c.name || "Clinic" })));
});

router.post("/auth/switch-to-clinic", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const { clinic_id } = req.body;
  if (!clinic_id) return res.status(400).json({ error: "clinic_id required" });
  const roleDoc = await UserRole.findOne({ user_id: userId }).lean();
  if ((roleDoc as { role?: string })?.role !== "doctor") return res.status(403).json({ error: "Only doctors can switch to clinic" });
  const member = await ClinicMember.findOne({ clinic_id, user_id: userId }).lean();
  if (!member) return res.status(404).json({ error: "Clinic not found" });
  const memRole = (member as { role?: string }).role;
  if (memRole !== "owner" && memRole !== "admin") return res.status(403).json({ error: "Only clinic owner or admin can switch to clinic portal" });
  const clinicUser = await AuthUser.findOne({ clinic_id }).select("user_id").lean();
  if (!clinicUser) return res.status(404).json({ error: "This clinic does not have a separate login yet" });
  const token = jwt.sign({ sub: (clinicUser as any).user_id }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token });
});

// ---------- Patient self-service: /me/* (current user's linked patient) ----------
router.get("/me/enrollments", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const filter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const list = await Enrollment.find(filter).sort({ enrolled_at: -1 }).limit(20).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.get("/me/appointments", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const filter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const list = await Appointment.find(filter).sort({ scheduled_at: -1 }).limit(20).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/me/appointments", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const { title, scheduled_at, duration_minutes, notes, appointment_type, clinic_id, doctor_id: bodyDoctorId } = req.body;
  if (!title || !scheduled_at) return res.status(400).json({ error: "title and scheduled_at required" });
  let patient_id: string;
  let doctor_id: string;
  if (bodyDoctorId) {
    const rec = await Patient.findOne({ patient_user_id: userId, doctor_id: String(bodyDoctorId) }).select("_id doctor_id").lean();
    if (!rec || (rec as any).doctor_id === userId) return res.status(403).json({ error: "Not linked to this doctor" });
    patient_id = (rec as any)._id?.toString();
    doctor_id = (rec as any).doctor_id;
  } else {
    const link = await getPatientForCurrentUser(req);
    if (!link) return res.status(404).json({ error: "Patient record not linked" });
    if (link.doctor_id === userId) return res.status(400).json({ error: "Connect with a doctor first. Select a doctor when booking." });
    patient_id = link.patient_id;
    doctor_id = link.doctor_id;
  }
  const scheduledAt = new Date(scheduled_at);
  if (isNaN(scheduledAt.getTime())) return res.status(400).json({ error: "Invalid scheduled_at" });
  const doc = await Appointment.create({
    patient_id,
    doctor_id,
    title: String(title).trim(),
    scheduled_at: scheduledAt,
    duration_minutes: duration_minutes != null ? Math.max(5, parseInt(String(duration_minutes), 10) || 30) : 30,
    notes: notes != null ? String(notes).trim() || null : null,
    appointment_type: appointment_type || "consultation",
    ...(clinic_id ? { clinic_id: String(clinic_id) } : {}),
  });
  res.status(201).json({ ...doc.toJSON(), id: (doc as any)._id?.toString() });
});

// Patient: list my linked doctors (for scheduling and choosing who to book with)
router.get("/me/doctors", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  // Ensure every active PatientDoctorLink has a Patient record under that doctor (fixes links created before the fix)
  const links = await PatientDoctorLink.find({ patient_user_id: userId, status: "active" }).select("doctor_user_id").lean();
  for (const link of links as { doctor_user_id: string }[]) {
    const doctorId = link.doctor_user_id;
    const exists = await Patient.findOne({ patient_user_id: userId, doctor_id: doctorId }).select("_id").lean();
    if (!exists) {
      const profile = await Profile.findOne({ user_id: doctorId }).select("full_name").lean();
      const existingAny = await Patient.findOne({ patient_user_id: userId }).select("full_name phone").lean();
      await Patient.create({
        doctor_id: doctorId,
        patient_user_id: userId,
        full_name: (existingAny as any)?.full_name || (profile as any)?.full_name || "Patient",
        phone: (existingAny as any)?.phone || " ",
        status: "active",
      });
    }
  }
  const patients = await Patient.find({ patient_user_id: userId }).select("_id doctor_id").lean();
  const doctors = (patients as { _id: unknown; doctor_id: string }[]).filter((p) => p.doctor_id && p.doctor_id !== userId);
  if (doctors.length === 0) return res.json([]);
  const uniqueDoctorIds = [...new Set(doctors.map((d) => d.doctor_id))];
  const profiles = await Profile.find({ user_id: { $in: uniqueDoctorIds } }).select("user_id full_name").lean();
  const nameByDoctorId: Record<string, string> = {};
  for (const p of profiles as { user_id: string; full_name?: string }[]) nameByDoctorId[p.user_id] = p.full_name || "Doctor";
  const list = doctors.map((d) => ({
    doctor_id: d.doctor_id,
    doctor_name: nameByDoctorId[d.doctor_id] || "Doctor",
    patient_id: (d as any)._id?.toString(),
  }));
  const seen = new Set<string>();
  const deduped = list.filter((x) => {
    if (seen.has(x.doctor_id)) return false;
    seen.add(x.doctor_id);
    return true;
  });
  res.json(deduped);
});

// Patient: get free appointment slots for my doctor on a given date (based on doctor availability minus booked appointments)
router.get("/me/available_slots", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const q = req.query as { date?: string; doctor_id?: string };
  const dateStr = q.date || "";
  const requestedDoctorId = q.doctor_id ? String(q.doctor_id) : null;

  let link: { patient_id: string; doctor_id: string } | null;
  if (requestedDoctorId) {
    const rec = await Patient.findOne({ patient_user_id: userId, doctor_id: requestedDoctorId }).select("_id doctor_id").lean();
    if (!rec || (rec as any).doctor_id === userId) {
      return res.status(403).json({ error: "Not linked to this doctor" });
    }
    link = { patient_id: (rec as any)._id?.toString(), doctor_id: (rec as any).doctor_id };
  } else {
    link = await getPatientForCurrentUser(req);
    if (!link) return res.status(404).json({ error: "Patient record not linked", reason: "connect_required" });
    if (link.doctor_id === userId) {
      return res.status(200).json({ date: dateStr, slots: [], reason: "connect_required" });
    }
    const allDoctors = await Patient.find({ patient_user_id: userId, doctor_id: { $ne: userId } }).select("doctor_id").lean();
    if (allDoctors.length > 1 && !requestedDoctorId) {
      return res.status(400).json({ error: "You have multiple doctors. Pass doctor_id to see availability for a specific doctor." });
    }
  }

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return res.status(400).json({ error: "Query date required (YYYY-MM-DD)" });
  const day = new Date(dateStr + "T12:00:00.000Z");
  if (isNaN(day.getTime())) return res.status(400).json({ error: "Invalid date" });
  const dayOfWeek = day.getUTCDay();
  const availabilities = await DoctorAvailability.find({
    doctor_id: link!.doctor_id,
    day_of_week: dayOfWeek,
    is_active: true,
  }).lean();
  const slots: { start: string; end: string; scheduled_at: string }[] = [];
  const toMins = (t: string) => {
    const [h, m] = (t || "0:0").split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const defaultSlotDuration = 30;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isSelectedToday = dateStr === todayStr;
  for (const av of availabilities as { start_time: string; end_time: string; slot_duration_minutes?: number }[]) {
    const step = av.slot_duration_minutes || 15;
    let mins = toMins(av.start_time);
    const endMins = toMins(av.end_time);
    while (mins + defaultSlotDuration <= endMins) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const startTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const scheduledAt = new Date(`${dateStr}T${startTime}:00`);
      const isPast = isSelectedToday && scheduledAt < now;
      if (!isPast) {
        const endM = mins + defaultSlotDuration;
        const endTime = `${String(Math.floor(endM / 60)).padStart(2, "0")}:${String(endM % 60).padStart(2, "0")}`;
        slots.push({
          start: startTime,
          end: endTime,
          scheduled_at: scheduledAt.toISOString(),
        });
      }
      mins += step;
    }
  }
  slots.sort((a, b) => a.start.localeCompare(b.start));
  const existing = await Appointment.find({
    doctor_id: link.doctor_id,
    status: "scheduled",
    scheduled_at: {
      $gte: new Date(`${dateStr}T00:00:00`),
      $lt: new Date(`${dateStr}T23:59:59.999`),
    },
  })
    .select("scheduled_at duration_minutes")
    .lean();
  const slotDurationMs = defaultSlotDuration * 60 * 1000;
  const freeSlots = slots.filter((slot) => {
    const slotStart = new Date(slot.scheduled_at).getTime();
    const slotEnd = slotStart + slotDurationMs;
    for (const ex of existing as { scheduled_at: Date; duration_minutes?: number }[]) {
      const exStart = new Date(ex.scheduled_at).getTime();
      const exEnd = exStart + (ex.duration_minutes || 30) * 60 * 1000;
      if (exStart < slotEnd && exEnd > slotStart) return false;
    }
    return true;
  });
  const reason = availabilities.length === 0 ? "no_availability_for_day" : undefined;
  res.json({ date: dateStr, slots: freeSlots, ...(reason ? { reason } : {}) });
});

router.get("/me/vitals", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const filter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const list = await Vital.find(filter).sort({ recorded_at: -1 }).limit(50).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.get("/me/lab_results", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const filter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const list = await LabResult.find(filter).sort({ tested_at: -1 }).limit(50).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/me/lab_results/upload-report", requireAuth, upload.single("file"), async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: "Lab report AI is not configured (GEMINI_API_KEY)" });
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const file = (req as any).file;
  if (!file) return res.status(400).json({ error: "file required" });
  const mime = (file.mimetype || "").toLowerCase();
  const isPdf = mime === "application/pdf";
  const isImage = mime.startsWith("image/");
  if (!isImage && !isPdf) return res.status(400).json({ error: "Only image (JPEG, PNG, WebP) or PDF files are supported" });
  try {
    const buf = fs.readFileSync(path.join(UPLOAD_DIR, file.filename));
    const extracted = isPdf
      ? await extractLabResultsFromPdf(GEMINI_API_KEY, buf, file.originalname || file.filename)
      : await extractLabResultsFromImage(GEMINI_API_KEY, buf.toString("base64"), mime);
    if (!extracted.results?.length) return res.status(422).json({ error: "No lab values could be read from the file. Try a clearer image or PDF." });
    const analysis = await analyzeLabResultsForReport(GEMINI_API_KEY, extracted.results);
    const testedAt = extracted.tested_at ? new Date(extracted.tested_at) : new Date();
    const reportDoc = await LabReport.create({
      patient_id: link.patient_id,
      doctor_id: link.doctor_id,
      uploaded_by: (req as AuthRequest).user.id,
      file_name: file.originalname || file.filename,
      file_path: file.filename,
      file_type: mime,
      tested_at: testedAt,
      ai_summary: analysis.ai_summary || null,
      layman_summary: analysis.layman_summary || null,
      extracted_data: (analysis.key_points?.length || analysis.charts?.length) ? { key_points: analysis.key_points, charts: analysis.charts } : null,
    });
    const reportId = reportDoc._id;
    const resultsToCreate = extracted.results.map((r: { test_name: string; result_value: string; unit?: string; reference_range?: string; status?: string }) => ({
      patient_id: link.patient_id,
      doctor_id: link.doctor_id,
      lab_report_id: reportId,
      test_name: String(r.test_name || "").trim() || "Unknown",
      result_value: String(r.result_value || "").trim(),
      unit: r.unit ? String(r.unit).trim() : null,
      reference_range: r.reference_range ? String(r.reference_range).trim() : null,
      status: r.status === "critical" ? "critical" : r.status === "abnormal" ? "abnormal" : "normal",
      tested_at: testedAt,
    }));
    const created = await LabResult.insertMany(resultsToCreate);
    const reportOut = { ...reportDoc.toObject(), id: reportDoc._id?.toString(), _id: undefined, __v: undefined };
    const resultsOut = created.map((d: any) => ({ ...d.toObject(), id: d._id?.toString(), _id: undefined, __v: undefined, lab_report_id: reportId?.toString() }));
    return res.status(201).json({ report: reportOut, results: resultsOut });
  } catch (e) {
    const err = e as Error;
    return res.status(500).json({ error: err.message || "Lab report processing failed" });
  }
});

router.post("/me/lab_results", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const body = { ...req.body, patient_id: link.patient_id, doctor_id: link.doctor_id };
  if (!body.tested_at) body.tested_at = new Date();
  const doc = await LabResult.create(body);
  res.status(201).json(doc.toJSON());
});

router.get("/me/lab_reports", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const filter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const list = await LabReport.find(filter).sort({ tested_at: -1 }).limit(50).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.get("/me/lab_reports/:id", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const report = await LabReport.findById(req.params.id).lean();
  if (!report) return res.status(404).json({ error: "Not found" });
  const r = report as any;
  const patientOk = link.patient_ids.length > 1 ? link.patient_ids.includes(r.patient_id) : r.patient_id === link.patient_id;
  if (!patientOk) return res.status(404).json({ error: "Not found" });
  const results = await LabResult.find({ lab_report_id: r._id }).sort({ test_name: 1 }).lean();
  res.json({
    report: { ...r, id: r._id?.toString(), _id: undefined, __v: undefined },
    results: results.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })),
  });
});

router.get("/me/patient_documents", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const filter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const list = await PatientDocument.find(filter).sort({ created_at: -1 }).limit(LIMITS.ME_DOCUMENTS_MAX).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.get("/me/patient_documents/:id", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const doc = await PatientDocument.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  const d = doc as any;
  const ok = link.patient_ids.length > 1 ? link.patient_ids.includes(d.patient_id) : d.patient_id === link.patient_id;
  if (!ok) return res.status(404).json({ error: "Not found" });
  res.json({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined });
});

router.post("/me/patient_documents/upload-and-analyze", requireAuth, upload.single("file"), async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: "Document analysis is not configured (GEMINI_API_KEY)" });
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const file = (req as any).file;
  const { category, notes } = req.body;
  if (!file) return res.status(400).json({ error: "file required" });
  const mime = (file.mimetype || "").toLowerCase();
  const isPdf = mime === "application/pdf";
  const isImage = mime.startsWith("image/");
  if (!isImage && !isPdf) return res.status(400).json({ error: "Only image (JPEG, PNG, WebP) or PDF are supported" });
  try {
    const buf = fs.readFileSync(path.join(UPLOAD_DIR, file.filename));
    const analysis = isPdf
      ? await analyzeDocumentWithGemini(GEMINI_API_KEY, { type: "pdf", buffer: buf, fileName: file.originalname || file.filename })
      : await analyzeDocumentWithGemini(GEMINI_API_KEY, { type: "image", base64: buf.toString("base64"), mimeType: mime });
    const extractedData: Record<string, unknown> = { key_points: analysis.key_points };
    if (analysis.chart_data) extractedData.chart_data = analysis.chart_data;
    if (analysis.prescription_summary) extractedData.prescription_summary = analysis.prescription_summary;
    if (analysis.medications?.length) extractedData.medications = analysis.medications;
    const doc = await PatientDocument.create({
      patient_id: link.patient_id,
      doctor_id: link.doctor_id,
      uploaded_by: (req as AuthRequest).user.id,
      file_name: file.originalname || file.filename,
      file_path: file.filename,
      file_size_bytes: file.size,
      file_type: mime,
      category: category || "general",
      notes: notes || null,
      ai_summary: analysis.summary || null,
      layman_summary: analysis.layman_summary || null,
      extracted_data: extractedData,
      analyzed_at: new Date(),
    });
    res.status(201).json(doc.toJSON());
  } catch (e) {
    const doc = await PatientDocument.create({
      patient_id: link.patient_id,
      doctor_id: link.doctor_id,
      uploaded_by: (req as AuthRequest).user.id,
      file_name: file.originalname || file.filename,
      file_path: file.filename,
      file_size_bytes: file.size,
      file_type: mime,
      category: category || "general",
      notes: notes || null,
    });
    res.status(201).json(doc.toJSON());
  }
});

router.post("/me/patient_documents/upload", requireAuth, upload.single("file"), async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const file = (req as any).file;
  const { category, notes } = req.body;
  if (!file) return res.status(400).json({ error: "file required" });
  const doc = await PatientDocument.create({
    patient_id: link.patient_id,
    doctor_id: link.doctor_id,
    uploaded_by: (req as AuthRequest).user.id,
    file_name: file.originalname || file.filename,
    file_path: file.filename,
    file_size_bytes: file.size,
    file_type: file.mimetype,
    category: category || "general",
    notes: notes || null,
  });
  res.status(201).json(doc.toJSON());
});

router.get("/me/link_requests", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const list = await LinkRequest.find({ patient_user_id: userId }).sort({ created_at: -1 }).limit(5).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/me/link_requests", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const { doctor_code, message } = req.body;
  const profile = await Profile.findOne({ doctor_code: (doctor_code as string)?.toUpperCase() }).select("user_id full_name").lean();
  if (!profile) return res.status(404).json({ error: "Doctor not found" });
  const myProfile = await Profile.findOne({ user_id: userId }).select("full_name").lean();
  await LinkRequest.create({
    patient_user_id: userId,
    patient_name: (myProfile as any)?.full_name || "Patient",
    doctor_id: (profile as any).user_id,
    message: message || null,
    status: "pending",
  });
  res.status(201).json({ ok: true });
});

router.get("/me/patient", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const patient = await Patient.findOne({ patient_user_id: userId }).lean();
  if (!patient) return res.status(404).json({ error: "Patient record not linked" });
  res.json({ ...patient, id: (patient as any)._id?.toString(), _id: undefined, __v: undefined });
});

router.patch("/me/patient", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const updated = await Patient.findOneAndUpdate(
    { patient_user_id: userId },
    req.body,
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ error: "Patient record not linked" });
  res.json({ ...updated, id: (updated as any)._id?.toString(), _id: undefined, __v: undefined });
});

// ---------- Patient self-service: log own vitals / meals (patient_user_id = user.id) ----------
async function getPatientForCurrentUser(req: Request): Promise<{ patient_id: string; doctor_id: string; patient_ids: string[] } | null> {
  const userId = (req as AuthRequest).user.id;
  const patients = await Patient.find({ patient_user_id: userId }).select("_id doctor_id").sort({ createdAt: 1 }).lean();
  if (patients.length === 0) {
    const roleDoc = await UserRole.findOne({ user_id: userId }).lean();
    if ((roleDoc as { role?: string })?.role === "patient") {
      const profile = await Profile.findOne({ user_id: userId }).select("full_name").lean();
      const created = await Patient.create({
        patient_user_id: userId,
        doctor_id: userId,
        full_name: (profile as { full_name?: string })?.full_name || "Patient",
        phone: " ",
        status: "active",
      });
      const id = created._id.toString();
      return { patient_id: id, doctor_id: (created as any).doctor_id, patient_ids: [id] };
    }
    return null;
  }
  const patient_ids = (patients as { _id: unknown }[]).map((p) => p._id?.toString()).filter(Boolean) as string[];
  // Prefer the doctor from an active PatientDoctorLink (the doctor the patient actually connected with)
  const activeLink = await PatientDoctorLink.findOne({ patient_user_id: userId, status: "active" })
    .select("doctor_user_id")
    .sort({ responded_at: -1, createdAt: -1 })
    .lean();
  if (activeLink) {
    const docId = (activeLink as { doctor_user_id: string }).doctor_user_id;
    const linkedPatient = (patients as { _id: unknown; doctor_id: string }[]).find((p) => p.doctor_id === docId);
    if (linkedPatient) {
      return { patient_id: linkedPatient._id?.toString() as string, doctor_id: docId, patient_ids };
    }
  }
  // Prefer a Patient record linked to a real doctor (doctor_id !== userId) over the self-created placeholder
  const underDoctor = (patients as { _id: unknown; doctor_id: string }[]).find((p) => p.doctor_id && p.doctor_id !== userId);
  if (underDoctor) {
    return { patient_id: underDoctor._id?.toString() as string, doctor_id: underDoctor.doctor_id, patient_ids };
  }
  const first = patients[0] as { _id: unknown; doctor_id: string };
  return { patient_id: first._id?.toString() as string, doctor_id: first.doctor_id, patient_ids };
}

router.post("/me/vitals/bulk", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked to your account" });
  const vitalsList = req.body?.vitals;
  if (!Array.isArray(vitalsList) || vitalsList.length === 0) {
    return res.status(400).json({ error: "vitals array required and must be non-empty" });
  }
  const valid: Array<Record<string, unknown>> = [];
  for (const v of vitalsList) {
    const vital_type = v.vital_type != null ? String(v.vital_type) : "";
    const value_text = v.value_text != null ? String(v.value_text).trim() : "";
    if (!vital_type || !value_text) continue;
    valid.push({
      patient_id: link.patient_id,
      doctor_id: link.doctor_id,
      vital_type,
      value_text,
      value_numeric: v.value_numeric != null && Number.isFinite(Number(v.value_numeric)) ? Number(v.value_numeric) : null,
      unit: v.unit != null ? String(v.unit).trim() || null : null,
      notes: v.notes != null ? String(v.notes).trim() || null : null,
      recorded_at: v.recorded_at ? new Date(v.recorded_at as string) : undefined,
    });
  }
  if (valid.length === 0) return res.status(400).json({ error: "No valid vitals (need vital_type and value_text per row)" });
  const created = await Vital.insertMany(valid);
  const hasBp = valid.some((v) => v.vital_type === "blood_pressure");
  const hasSugar = valid.some((v) => v.vital_type === "blood_sugar");
  if (hasBp) await resolveReminderEscalation(link.patient_id, "blood_pressure");
  if (hasSugar) await resolveReminderEscalation(link.patient_id, "blood_sugar");
  const points_earned = (hasBp ? POINTS.blood_pressure : 0) + (hasSugar ? POINTS.blood_sugar : 0);
  const filterBulk: RewardsFilter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const rewards = await getRewardsForFilter(filterBulk);
  if (hasBp) await updateGamificationState(link.patient_id, "blood_pressure", filterBulk);
  if (hasSugar) await updateGamificationState(link.patient_id, "blood_sugar", filterBulk);
  return res.status(201).json({ created: created.length, ids: created.map((d: any) => d._id?.toString()), points_earned, ...rewards });
});

router.post("/me/vitals", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked to your account" });
  const body = {
    ...req.body,
    patient_id: link.patient_id,
    doctor_id: link.doctor_id,
  };
  if (!body.notes || String(body.notes).trim() === "") {
    const remark = await getAiVitalRemark(body.vital_type, body.value_text, body.unit);
    if (remark) body.notes = remark;
  }
  const doc = await Vital.create(body);
  const vitalType = (body.vital_type as string) === "blood_pressure" || (body.vital_type as string) === "blood_sugar" ? (body.vital_type as "blood_pressure" | "blood_sugar") : null;
  if (vitalType) await resolveReminderEscalation(link.patient_id, vitalType);
  const points_earned = vitalType ? POINTS[vitalType] : 0;
  const filterVital: RewardsFilter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const rewardsVital = await getRewardsForFilter(filterVital);
  if (vitalType) await updateGamificationState(link.patient_id, vitalType, filterVital);
  res.status(201).json({ ...doc.toJSON(), points_earned, ...rewardsVital });
});

// ---------- Instant rewards (points, health score, today progress) ----------
const POINTS = { blood_pressure: 10, blood_sugar: 15, food: 5, medication: 20 } as const;
const HEALTH_SCORE_PER_ITEM = 25; // 4 items × 25 = 100

type RewardsFilter = { patient_id: string } | { patient_id: { $in: string[] } };
async function getRewardsForFilter(filter: RewardsFilter): Promise<{
  total_points: number;
  health_score: number;
  today_progress: { bp: boolean; food: boolean; sugar: boolean; medication: boolean };
  points_breakdown: { blood_pressure: number; blood_sugar: number; food: number; medication: number };
}> {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const [bpCount, sugarCount, foodCount, medCount, bpToday, sugarToday, foodToday, medToday] = await Promise.all([
    Vital.countDocuments({ ...filter, vital_type: "blood_pressure" }),
    Vital.countDocuments({ ...filter, vital_type: "blood_sugar" }),
    FoodLog.countDocuments(filter),
    MedicationLog.countDocuments(filter),
    Vital.exists({ ...filter, vital_type: "blood_pressure", recorded_at: { $gte: startOfToday } }),
    Vital.exists({ ...filter, vital_type: "blood_sugar", recorded_at: { $gte: startOfToday } }),
    FoodLog.exists({ ...filter, logged_at: { $gte: startOfToday } }),
    MedicationLog.exists({ ...filter, logged_at: { $gte: startOfToday } }),
  ]);
  const points_breakdown = {
    blood_pressure: bpCount * POINTS.blood_pressure,
    blood_sugar: sugarCount * POINTS.blood_sugar,
    food: foodCount * POINTS.food,
    medication: medCount * POINTS.medication,
  };
  const total_points = points_breakdown.blood_pressure + points_breakdown.blood_sugar + points_breakdown.food + points_breakdown.medication;
  const health_score =
    (!!bpToday ? HEALTH_SCORE_PER_ITEM : 0) +
    (!!sugarToday ? HEALTH_SCORE_PER_ITEM : 0) +
    (!!foodToday ? HEALTH_SCORE_PER_ITEM : 0) +
    (!!medToday ? HEALTH_SCORE_PER_ITEM : 0);
  return {
    total_points,
    health_score,
    today_progress: { bp: !!bpToday, food: !!foodToday, sugar: !!sugarToday, medication: !!medToday },
    points_breakdown,
  };
}

// ---------- Gamification: streak, badges, levels, weekly challenges ----------
function getWeekStart(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  const day = x.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = start
  x.setUTCDate(x.getUTCDate() + diff);
  return x;
}

async function getDistinctLogDates(filter: RewardsFilter): Promise<string[]> {
  const dateProject = { $dateToString: { format: "%Y-%m-%d", date: "$recorded_at" } };
  const [vitalDates, foodDates, medDates] = await Promise.all([
    Vital.aggregate<{ _id: string }>([{ $match: { ...filter } }, { $group: { _id: dateProject } }]).exec(),
    FoodLog.aggregate<{ _id: string }>([{ $match: { ...filter } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$logged_at" } } } }]).exec(),
    MedicationLog.aggregate<{ _id: string }>([{ $match: { ...filter } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$logged_at" } } } }]).exec(),
  ]);
  const set = new Set<string>();
  for (const r of vitalDates) set.add(r._id);
  for (const r of foodDates) set.add(r._id);
  for (const r of medDates) set.add(r._id);
  return [...set].sort();
}

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const set = new Set(dates);
  if (!set.has(todayStr)) return 0;
  let streak = 0;
  const d = new Date(todayStr);
  while (true) {
    const s = d.toISOString().slice(0, 10);
    if (!set.has(s)) break;
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}

const BADGE_DEFINITIONS: { key: string; title: string; requirement: number; type: "bp_days" | "sugar_days" | "food_days" | "med_days" }[] = [
  { key: "bp_30_days", title: "Heart Guardian", requirement: 30, type: "bp_days" },
  { key: "sugar_30_days", title: "Sugar Sentinel", requirement: 30, type: "sugar_days" },
  { key: "food_14_days", title: "Nutrition Navigator", requirement: 14, type: "food_days" },
  { key: "med_30_days", title: "Medication Master", requirement: 30, type: "med_days" },
];

const LEVELS: { min_points: number; label: string }[] = [
  { min_points: 0, label: "Beginner" },
  { min_points: 100, label: "Consistent" },
  { min_points: 500, label: "Health Champion" },
];

const WEEKLY_CHALLENGES: { key: string; title: string; target_days: number; reward_points: number; type: "bp_days" | "sugar_days" | "food_days" | "med_days" }[] = [
  { key: "bp_7_days", title: "Log BP 7 days this week", target_days: 7, reward_points: 50, type: "bp_days" },
  { key: "sugar_5_days", title: "Log blood sugar 5 days this week", target_days: 5, reward_points: 40, type: "sugar_days" },
  { key: "food_7_days", title: "Log food 7 days this week", target_days: 7, reward_points: 35, type: "food_days" },
  { key: "med_7_days", title: "Log medication 7 days this week", target_days: 7, reward_points: 50, type: "med_days" },
];

// Layer 7: Milestone rewards — tangible real-world benefits
const MILESTONE_DEFINITIONS: { key: string; title: string; description: string; required_logs: number; icon: string }[] = [
  { key: "free_consultation", title: "Free Doctor Consultation", description: "Complete 20 health logs to unlock a free doctor consultation", required_logs: 20, icon: "stethoscope" },
  { key: "medicine_discount", title: "Medicine Discount", description: "Complete 40 health logs to unlock a medicine discount", required_logs: 40, icon: "pill" },
  { key: "health_report", title: "Health Report", description: "Complete 60 health logs to unlock a detailed health report", required_logs: 60, icon: "file-text" },
  { key: "premium_checkup", title: "Premium Health Checkup", description: "Complete 100 health logs to unlock a premium health checkup", required_logs: 100, icon: "heart-pulse" },
];

/**
 * Update the persisted gamification state for a patient after a log action.
 * Call this after every BP, sugar, food, or medication log.
 */
async function updateGamificationState(
  patientId: string,
  logType: "blood_pressure" | "blood_sugar" | "food" | "medication",
  filter: RewardsFilter
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const pointsForLog = logType === "blood_pressure" ? POINTS.blood_pressure
    : logType === "blood_sugar" ? POINTS.blood_sugar
    : logType === "food" ? POINTS.food
    : POINTS.medication;

  const pointsField = logType === "blood_pressure" ? "points_bp"
    : logType === "blood_sugar" ? "points_sugar"
    : logType === "food" ? "points_food"
    : "points_medication";

  const countField = logType === "blood_pressure" ? "bp_logs"
    : logType === "blood_sugar" ? "sugar_logs"
    : logType === "food" ? "food_logs"
    : "medication_logs";

  // Upsert the gamification doc
  let gam = await PatientGamification.findOne({ patient_id: patientId });
  if (!gam) {
    // First-time: bootstrap from actual DB counts
    const [bpC, sugarC, foodC, medC] = await Promise.all([
      Vital.countDocuments({ ...filter, vital_type: "blood_pressure" }),
      Vital.countDocuments({ ...filter, vital_type: "blood_sugar" }),
      FoodLog.countDocuments(filter),
      MedicationLog.countDocuments(filter),
    ]);
    const dates = await getDistinctLogDates(filter);
    const streak = computeStreak(dates);
    const tp = bpC * POINTS.blood_pressure + sugarC * POINTS.blood_sugar + foodC * POINTS.food + medC * POINTS.medication;
    let lv = 1; let ll = LEVELS[0].label;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (tp >= LEVELS[i].min_points) { lv = i + 1; ll = LEVELS[i].label; break; }
    }
    gam = await PatientGamification.create({
      patient_id: patientId,
      current_streak: streak, longest_streak: streak, last_log_date: today,
      total_points: tp, points_bp: bpC * POINTS.blood_pressure, points_sugar: sugarC * POINTS.blood_sugar,
      points_food: foodC * POINTS.food, points_medication: medC * POINTS.medication,
      level: lv, level_label: ll,
      total_logs: bpC + sugarC + foodC + medC,
      bp_logs: bpC, sugar_logs: sugarC, food_logs: foodC, medication_logs: medC,
    });
    return;
  }

  // Increment points & counts
  const g = gam as any;
  g[pointsField] = (g[pointsField] || 0) + pointsForLog;
  g.total_points = (g.total_points || 0) + pointsForLog;
  g[countField] = (g[countField] || 0) + 1;
  g.total_logs = (g.total_logs || 0) + 1;

  // Update streak
  const lastDate = g.last_log_date;
  if (lastDate !== today) {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    if (lastDate === yesterdayStr) {
      g.current_streak = (g.current_streak || 0) + 1;
    } else if (!lastDate || lastDate < yesterdayStr) {
      g.current_streak = 1;
    }
    g.last_log_date = today;
  }
  if (g.current_streak > (g.longest_streak || 0)) {
    g.longest_streak = g.current_streak;
  }

  // Update level
  let lv = 1; let ll = LEVELS[0].label;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (g.total_points >= LEVELS[i].min_points) { lv = i + 1; ll = LEVELS[i].label; break; }
  }
  g.level = lv;
  g.level_label = ll;

  await gam.save();
}

async function getDaysCountByType(filter: RewardsFilter): Promise<{ bp_days: number; sugar_days: number; food_days: number; med_days: number }> {
  const [bp, sugar, food, med] = await Promise.all([
    Vital.aggregate<{ _id: string }>([{ $match: { ...filter, vital_type: "blood_pressure" } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$recorded_at" } } } }]).exec(),
    Vital.aggregate<{ _id: string }>([{ $match: { ...filter, vital_type: "blood_sugar" } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$recorded_at" } } } }]).exec(),
    FoodLog.aggregate<{ _id: string }>([{ $match: filter }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$logged_at" } } } }]).exec(),
    MedicationLog.aggregate<{ _id: string }>([{ $match: filter }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$logged_at" } } } }]).exec(),
  ]);
  return { bp_days: bp.length, sugar_days: sugar.length, food_days: food.length, med_days: med.length };
}

async function getDaysThisWeekByType(filter: RewardsFilter, weekStart: Date): Promise<{ bp_days: number; sugar_days: number; food_days: number; med_days: number }> {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const [bp, sugar, food, med] = await Promise.all([
    Vital.aggregate<{ _id: string }>([
      { $match: { ...filter, vital_type: "blood_pressure", recorded_at: { $gte: weekStart, $lt: weekEnd } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$recorded_at" } } } },
    ]).exec(),
    Vital.aggregate<{ _id: string }>([
      { $match: { ...filter, vital_type: "blood_sugar", recorded_at: { $gte: weekStart, $lt: weekEnd } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$recorded_at" } } } },
    ]).exec(),
    FoodLog.aggregate<{ _id: string }>([
      { $match: { ...filter, logged_at: { $gte: weekStart, $lt: weekEnd } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$logged_at" } } } },
    ]).exec(),
    MedicationLog.aggregate<{ _id: string }>([
      { $match: { ...filter, logged_at: { $gte: weekStart, $lt: weekEnd } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$logged_at" } } } },
    ]).exec(),
  ]);
  return { bp_days: bp.length, sugar_days: sugar.length, food_days: food.length, med_days: med.length };
}

router.get("/me/gamification", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked to your account" });
  const filter: RewardsFilter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const patientId = link.patient_id;

  const [rewards, dates, daysByType, earnedBadgesList, bpCount, sugarCount, foodCount, medCount] = await Promise.all([
    getRewardsForFilter(filter),
    getDistinctLogDates(filter),
    getDaysCountByType(filter),
    UserBadge.find({ patient_id: patientId }).sort({ earned_at: -1 }).lean(),
    Vital.countDocuments({ ...filter, vital_type: "blood_pressure" }),
    Vital.countDocuments({ ...filter, vital_type: "blood_sugar" }),
    FoodLog.countDocuments(filter),
    MedicationLog.countDocuments(filter),
  ]);

  const streak_days = computeStreak(dates);

  const badges: { key: string; title: string; earned_at?: string }[] = [];
  for (const b of earnedBadgesList) {
    const def = BADGE_DEFINITIONS.find((d) => d.key === (b as any).badge_key);
    badges.push({ key: (b as any).badge_key, title: def?.title ?? (b as any).badge_key, earned_at: (b as any).earned_at?.toISOString?.() ?? undefined });
  }
  for (const def of BADGE_DEFINITIONS) {
    const count = daysByType[def.type];
    if (count >= def.requirement && !earnedBadgesList.some((e: any) => e.badge_key === def.key)) {
      await UserBadge.create({ patient_id: patientId, badge_key: def.key });
      badges.push({ key: def.key, title: def.title, earned_at: new Date().toISOString() });
    }
  }
  badges.sort((a, b) => (b.earned_at ?? "").localeCompare(a.earned_at ?? ""));

  let level = 1;
  let level_label = LEVELS[0].label;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (rewards.total_points >= LEVELS[i].min_points) {
      level = i + 1;
      level_label = LEVELS[i].label;
      break;
    }
  }

  const weekStart = getWeekStart(new Date());
  const [daysThisWeek, existingWeekly] = await Promise.all([
    getDaysThisWeekByType(filter, weekStart),
    UserWeeklyChallenge.find({ patient_id: patientId, week_start: weekStart }).lean(),
  ]);

  const weekly_challenges: { id: string; title: string; target_days: number; current_days: number; reward_points: number; completed: boolean; completed_at?: string }[] = [];
  for (const ch of WEEKLY_CHALLENGES) {
    const current_days = daysThisWeek[ch.type];
    const existing = existingWeekly.find((e: any) => e.challenge_key === ch.key);
    const completed = existing != null || current_days >= ch.target_days;
    let completed_at: string | undefined = (existing as any)?.completed_at?.toISOString?.();
    if (current_days >= ch.target_days && !existing) {
      try {
        const created = await UserWeeklyChallenge.create({
          patient_id: patientId,
          challenge_key: ch.key,
          week_start: weekStart,
          reward_points_awarded: ch.reward_points,
          completed_at: new Date(),
        });
        completed_at = (created as any).completed_at?.toISOString?.();
      } catch (err: any) {
        if (err?.code !== 11000) throw err;
        completed_at = new Date().toISOString();
      }
    }
    weekly_challenges.push({
      id: ch.key,
      title: ch.title,
      target_days: ch.target_days,
      current_days,
      reward_points: ch.reward_points,
      completed: !!existing || current_days >= ch.target_days,
      completed_at,
    });
  }

  // --- Layer 7: Milestone rewards (real-world benefits) ---
  const totalLogs = bpCount + sugarCount + foodCount + medCount;
  const existingMilestones = await MilestoneReward.find({ patient_id: patientId }).lean();

  const milestoneResults: { key: string; title: string; description: string; required_logs: number; current_logs: number; unlocked: boolean; unlocked_at?: string; claimed: boolean; claimed_at?: string; icon: string }[] = [];
  for (const m of MILESTONE_DEFINITIONS) {
    const existing = existingMilestones.find((e: any) => e.milestone_key === m.key);
    const unlocked = existing != null || totalLogs >= m.required_logs;
    if (totalLogs >= m.required_logs && !existing) {
      try {
        await MilestoneReward.create({ patient_id: patientId, milestone_key: m.key });
      } catch (err: any) {
        if (err?.code !== 11000) throw err;
      }
    }
    const doc = existing || (unlocked ? await MilestoneReward.findOne({ patient_id: patientId, milestone_key: m.key }).lean() : null);
    milestoneResults.push({
      key: m.key,
      title: m.title,
      description: m.description,
      required_logs: m.required_logs,
      current_logs: totalLogs,
      unlocked,
      unlocked_at: (doc as any)?.unlocked_at?.toISOString?.(),
      claimed: (doc as any)?.claimed ?? false,
      claimed_at: (doc as any)?.claimed_at?.toISOString?.(),
      icon: m.icon,
    });
  }

  // Persist gamification snapshot to DB
  const gamUpdate = {
    current_streak: streak_days,
    longest_streak: streak_days,
    last_log_date: dates.length > 0 ? dates[0] : undefined,
    total_points: rewards.total_points,
    points_bp: rewards.points_breakdown.blood_pressure,
    points_sugar: rewards.points_breakdown.blood_sugar,
    points_food: rewards.points_breakdown.food,
    points_medication: rewards.points_breakdown.medication,
    level,
    level_label,
    total_logs: totalLogs,
    bp_logs: bpCount,
    sugar_logs: sugarCount,
    food_logs: foodCount,
    medication_logs: medCount,
  };
  await PatientGamification.findOneAndUpdate(
    { patient_id: patientId },
    { $set: gamUpdate, $max: { longest_streak: streak_days } },
    { upsert: true, new: true }
  );

  res.json({
    streak_days,
    longest_streak: streak_days,
    badges,
    level,
    level_label,
    total_points: rewards.total_points,
    points_breakdown: rewards.points_breakdown,
    weekly_challenges,
    milestones: milestoneResults,
    total_logs: totalLogs,
  });
});

// Layer 7: Claim a milestone reward
router.post("/me/milestones/:key/claim", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked to your account" });
  const patientId = link.patient_id;
  const key = req.params.key;
  const milestone = await MilestoneReward.findOne({ patient_id: patientId, milestone_key: key });
  if (!milestone) return res.status(404).json({ error: "Milestone not unlocked yet" });
  if ((milestone as any).claimed) return res.status(400).json({ error: "Already claimed" });
  (milestone as any).claimed = true;
  (milestone as any).claimed_at = new Date();
  await milestone.save();
  res.json({ success: true, claimed_at: (milestone as any).claimed_at.toISOString() });
});

router.get("/me/rewards", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked to your account" });
  const filter: RewardsFilter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const rewards = await getRewardsForFilter(filter);
  res.json(rewards);
});

router.get("/me/quick-log/last", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked to your account" });
  const filter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const [lastBp, lastSugar, lastFood, lastMed] = await Promise.all([
    Vital.findOne({ ...filter, vital_type: "blood_pressure" }).sort({ recorded_at: -1 }).select("value_text recorded_at").lean(),
    Vital.findOne({ ...filter, vital_type: "blood_sugar" }).sort({ recorded_at: -1 }).select("value_text recorded_at").lean(),
    FoodLog.findOne(filter).sort({ logged_at: -1 }).select("meal_type logged_at").lean(),
    MedicationLog.findOne(filter).sort({ logged_at: -1 }).select("taken logged_at").lean(),
  ]);
  res.json({
    blood_pressure: lastBp ? { value_text: (lastBp as any).value_text, recorded_at: (lastBp as any).recorded_at } : null,
    blood_sugar: lastSugar ? { value_text: (lastSugar as any).value_text, recorded_at: (lastSugar as any).recorded_at } : null,
    food: lastFood ? { meal_type: (lastFood as any).meal_type, logged_at: (lastFood as any).logged_at } : null,
    medication: lastMed ? { taken: (lastMed as any).taken, logged_at: (lastMed as any).logged_at } : null,
  });
});

router.get("/me/food_logs", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked to your account" });
  const filter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const list = await FoodLog.find(filter).sort({ logged_at: -1 }).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/me/food_logs", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked to your account" });
  const body = {
    ...req.body,
    patient_id: link.patient_id,
    doctor_id: link.doctor_id,
  };
  const doc = await FoodLog.create(body);
  const points_earned = POINTS.food;
  const filterFood: RewardsFilter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const rewards = await getRewardsForFilter(filterFood);
  await updateGamificationState(link.patient_id, "food", filterFood);
  res.status(201).json({ ...doc.toJSON(), points_earned, ...rewards });
});

router.get("/me/medication-log", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked to your account" });
  const filter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const list = await MedicationLog.find(filter).sort({ logged_at: -1 }).limit(30).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/me/medication-log", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked to your account" });
  const taken = req.body?.taken === true || req.body?.taken === "true";
  const body = {
    patient_id: link.patient_id,
    doctor_id: link.doctor_id,
    taken,
    source: req.body?.source || "quick_log",
    time_of_day: req.body?.time_of_day || undefined,
    medication_name: req.body?.medication_name || undefined,
  };
  const doc = await MedicationLog.create(body);
  await resolveReminderEscalation(link.patient_id, "medication");
  const points_earned = POINTS.medication;
  const filterMed: RewardsFilter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const rewards = await getRewardsForFilter(filterMed);
  await updateGamificationState(link.patient_id, "medication", filterMed);
  res.status(201).json({ ...doc.toJSON(), points_earned, ...rewards });
});

router.post("/me/medication-log/bulk", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked to your account" });
  const entries = req.body?.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: "entries array required (each: time_of_day, medication_name, taken)" });
  }
  const created = [];
  for (const e of entries) {
    const time_of_day = e.time_of_day && ["morning", "afternoon", "evening", "night"].includes(String(e.time_of_day)) ? e.time_of_day : undefined;
    const medication_name = e.medication_name != null ? String(e.medication_name).trim() : undefined;
    const taken = e.taken === true || e.taken === "true";
    created.push(
      await MedicationLog.create({
        patient_id: link.patient_id,
        doctor_id: link.doctor_id,
        taken,
        time_of_day: time_of_day || undefined,
        medication_name: medication_name || undefined,
        source: "quick_log",
      })
    );
  }
  if (created.length > 0) await resolveReminderEscalation(link.patient_id, "medication");
  const points_earned = created.length > 0 ? POINTS.medication : 0;
  const filterBulkMed: RewardsFilter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const rewards = await getRewardsForFilter(filterBulkMed);
  if (created.length > 0) await updateGamificationState(link.patient_id, "medication", filterBulkMed);
  res.status(201).json({ created: created.length, ids: created.map((d: any) => d._id?.toString()), points_earned, ...rewards });
});

// ---------- Medications (persistent list) ----------
router.get("/me/medications", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked to your account" });
  const filter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const active = req.query.active !== "false";
  const list = await Medication.find({ ...filter, ...(active ? { active: true } : {}) }).sort({ added_at: -1 }).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/me/medications", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked to your account" });
  const { medicine, dosage, frequency, duration, instructions, timing_display, suggested_time, food_relation, timings } = req.body;
  if (!medicine || !String(medicine).trim()) return res.status(400).json({ error: "medicine name required" });
  const doc = await Medication.create({
    patient_id: link.patient_id,
    doctor_id: link.doctor_id,
    medicine: String(medicine).trim(),
    dosage: dosage || undefined,
    frequency: frequency || undefined,
    duration: duration || undefined,
    instructions: instructions || undefined,
    timing_display: timing_display || undefined,
    suggested_time: suggested_time || undefined,
    food_relation: food_relation || undefined,
    timings: Array.isArray(timings) ? timings : [],
    source: "manual",
  });
  res.status(201).json(doc.toJSON());
});

router.patch("/me/medications/:id", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked to your account" });
  const filter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const med = await Medication.findOne({ _id: req.params.id, ...filter });
  if (!med) return res.status(404).json({ error: "Medication not found" });
  const allowed = ["medicine", "dosage", "frequency", "duration", "instructions", "timing_display", "suggested_time", "food_relation", "timings", "active"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) (med as any)[key] = req.body[key];
  }
  await med.save();
  res.json(med.toJSON());
});

router.delete("/me/medications/:id", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked to your account" });
  const filter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const deleted = await Medication.findOneAndDelete({ _id: req.params.id, ...filter });
  if (!deleted) return res.status(404).json({ error: "Medication not found" });
  res.json({ success: true });
});

// Upload prescription → AI parse → save medications + document
router.post("/me/medications/upload-prescription", requireAuth, upload.single("file"), async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: "AI not configured (GEMINI_API_KEY)" });
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const file = (req as any).file;
  if (!file) return res.status(400).json({ error: "file required" });
  const mime = (file.mimetype || "").toLowerCase();
  const isPdf = mime === "application/pdf";
  const isImage = mime.startsWith("image/");
  if (!isImage && !isPdf) return res.status(400).json({ error: "Only image (JPEG, PNG, WebP) or PDF supported" });

  try {
    const buf = fs.readFileSync(path.join(UPLOAD_DIR, file.filename));
    const analysis = isPdf
      ? await analyzeDocumentWithGemini(GEMINI_API_KEY, { type: "pdf", buffer: buf, fileName: file.originalname || file.filename })
      : await analyzeDocumentWithGemini(GEMINI_API_KEY, { type: "image", base64: buf.toString("base64"), mimeType: mime });

    // Save as PatientDocument (shows in Documents tab)
    const extractedData: Record<string, unknown> = { key_points: analysis.key_points };
    if (analysis.chart_data) extractedData.chart_data = analysis.chart_data;
    if (analysis.prescription_summary) extractedData.prescription_summary = analysis.prescription_summary;
    if (analysis.medications?.length) extractedData.medications = analysis.medications;

    const patDoc = await PatientDocument.create({
      patient_id: link.patient_id,
      doctor_id: link.doctor_id,
      uploaded_by: (req as AuthRequest).user.id,
      file_name: file.originalname || file.filename,
      file_path: file.filename,
      file_size_bytes: file.size,
      file_type: mime,
      category: "prescription",
      notes: req.body?.notes || null,
      ai_summary: analysis.summary || null,
      layman_summary: analysis.layman_summary || null,
      extracted_data: extractedData,
      analyzed_at: new Date(),
    });

    // Save extracted medications
    const savedMeds: any[] = [];
    if (analysis.medications && analysis.medications.length > 0) {
      for (const m of analysis.medications) {
        const med = await Medication.create({
          patient_id: link.patient_id,
          doctor_id: link.doctor_id,
          medicine: m.medicine || "Unknown",
          dosage: m.dosage || undefined,
          frequency: m.frequency || undefined,
          duration: m.duration || undefined,
          instructions: m.instructions || undefined,
          timing_display: m.timing_display || undefined,
          suggested_time: m.suggested_time || undefined,
          food_relation: m.food_relation || undefined,
          timings: Array.isArray(m.timings) ? m.timings : [],
          source: "prescription",
          prescription_document_id: patDoc._id?.toString(),
        });
        savedMeds.push(med.toJSON());
      }
    }

    res.status(201).json({
      document: patDoc.toJSON(),
      medications: savedMeds,
      prescription_summary: analysis.prescription_summary || null,
      medications_count: savedMeds.length,
    });
  } catch (e) {
    // If AI fails, still save the document
    const patDoc = await PatientDocument.create({
      patient_id: link.patient_id,
      doctor_id: link.doctor_id,
      uploaded_by: (req as AuthRequest).user.id,
      file_name: file.originalname || file.filename,
      file_path: file.filename,
      file_size_bytes: file.size,
      file_type: mime,
      category: "prescription",
      notes: req.body?.notes || null,
    });
    res.status(201).json({
      document: patDoc.toJSON(),
      medications: [],
      prescription_summary: null,
      medications_count: 0,
      ai_error: "Could not analyze prescription. You can add medications manually.",
    });
  }
});

// ---------- Push subscriptions (Solution 6) ----------
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:support@mediimate.com", VAPID_PUBLIC, VAPID_PRIVATE);
}

router.post("/me/push-subscribe", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const { subscription } = req.body as { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } };
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: "subscription with endpoint and keys (p256dh, auth) required" });
  }
  const userAgent = (req.get("user-agent") || "").slice(0, 200);
  await PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    { user_id: userId, endpoint: subscription.endpoint, keys: subscription.keys, user_agent: userAgent, updated_at: new Date() },
    { upsert: true, new: true }
  );
  res.json({ ok: true });
});

router.delete("/me/push-subscribe", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const endpoint = (req.body?.endpoint || req.query?.endpoint) as string | undefined;
  if (!endpoint) return res.status(400).json({ error: "endpoint required" });
  await PushSubscription.deleteOne({ user_id: userId, endpoint });
  res.json({ ok: true });
});

router.get("/me/push-subscribe", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const sub = await PushSubscription.findOne({ user_id: userId }).select("endpoint updated_at").lean();
  res.json({ subscribed: !!sub, endpoint: sub ? (sub as any).endpoint : null });
});

// One-time token redeem: log from notification (Solution 6)
router.post("/me/quick-log-from-notification", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const { token } = req.body as { token?: string };
  if (!token || typeof token !== "string") return res.status(400).json({ error: "token required" });
  const doc = await QuickLogToken.findOne({ token, user_id: userId }).lean();
  if (!doc) return res.status(404).json({ error: "Invalid or expired token" });
  const t = doc as { used_at?: Date; type: string; value_text?: string; meal_type?: string; taken?: boolean };
  if (t.used_at) return res.status(400).json({ error: "Token already used" });
  if (new Date() > new Date((doc as any).expires_at)) return res.status(400).json({ error: "Token expired" });
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  if (t.type === "blood_pressure" || t.type === "blood_sugar") {
    const unit = t.type === "blood_pressure" ? "mmHg" : "mg/dL";
    const num = t.value_text ? parseFloat(t.value_text.replace(/\/.*/, "")) : undefined;
    await Vital.create({
      patient_id: link.patient_id,
      doctor_id: link.doctor_id,
      vital_type: t.type,
      value_text: t.value_text || "",
      value_numeric: Number.isFinite(num) ? num : undefined,
      unit,
      source: "push",
    });
    await resolveReminderEscalation(link.patient_id, t.type as "blood_pressure" | "blood_sugar");
  } else if (t.type === "food") {
    await FoodLog.create({
      patient_id: link.patient_id,
      doctor_id: link.doctor_id,
      meal_type: t.meal_type || "other",
      source: "push",
    });
  } else if (t.type === "medication") {
    await MedicationLog.create({
      patient_id: link.patient_id,
      doctor_id: link.doctor_id,
      taken: t.taken === true,
      source: "push",
    });
    await resolveReminderEscalation(link.patient_id, "medication");
  }
  await QuickLogToken.updateOne({ token }, { used_at: new Date() });
  const points_earned = t.type === "blood_pressure" ? POINTS.blood_pressure : t.type === "blood_sugar" ? POINTS.blood_sugar : t.type === "food" ? POINTS.food : t.type === "medication" ? POINTS.medication : 0;
  const filterQ: RewardsFilter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const rewards = await getRewardsForFilter(filterQ);
  const logTypeMap: Record<string, "blood_pressure" | "blood_sugar" | "food" | "medication"> = { blood_pressure: "blood_pressure", blood_sugar: "blood_sugar", food: "food", medication: "medication" };
  if (logTypeMap[t.type]) await updateGamificationState(link.patient_id, logTypeMap[t.type], filterQ);
  res.json({ ok: true, points_earned, ...rewards });
});

// ---------- Layer 4: Accountability (doctor / family visibility) ----------
/** Get today's log status (UTC) for a set of patient_ids. */
async function getTodayLogStatus(patientIds: string[]): Promise<{ bp: boolean; food: boolean; sugar: boolean; medication: boolean }> {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const filter = patientIds.length > 1 ? { patient_id: { $in: patientIds } } : { patient_id: patientIds[0] };
  const [bp, food, sugar, medication] = await Promise.all([
    Vital.findOne({ ...filter, vital_type: "blood_pressure", recorded_at: { $gte: startOfToday } }).select("_id").lean(),
    FoodLog.findOne({ ...filter, logged_at: { $gte: startOfToday } }).select("_id").lean(),
    Vital.findOne({ ...filter, vital_type: "blood_sugar", recorded_at: { $gte: startOfToday } }).select("_id").lean(),
    MedicationLog.findOne({ ...filter, logged_at: { $gte: startOfToday } }).select("_id").lean(),
  ]);
  return { bp: !!bp, food: !!food, sugar: !!sugar, medication: !!medication };
}

/** GET /me/accountability - patient: doctor visibility, family connections, doctor messages (for UI). */
router.get("/me/accountability", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const link = await getPatientForCurrentUser(req);
  let doctor_can_see_logs = false;
  let doctor_name: string | null = null;
  if (link && link.doctor_id !== userId) {
    doctor_can_see_logs = true;
    const profile = await Profile.findOne({ user_id: link.doctor_id }).select("full_name").lean();
    doctor_name = (profile as { full_name?: string })?.full_name || null;
  }
  const connections = await FamilyConnection.find({ patient_user_id: userId }).lean();
  const family_connections = (connections as any[]).map((c) => ({
    id: c._id?.toString(),
    relationship: c.relationship,
    invite_email: c.invite_email,
    status: c.status,
    family_user_id: c.family_user_id || null,
  }));
  const patientIds = link?.patient_ids ?? [];
  const doctor_messages: { id: string; message: string; created_at: string; doctor_name?: string }[] = [];
  if (patientIds.length > 0) {
    const messages = await DoctorMessage.find({ patient_id: { $in: patientIds } })
      .sort({ created_at: -1 })
      .limit(20)
      .lean();
    const doctorIds = [...new Set((messages as any[]).map((m) => m.doctor_id))];
    const profiles = await Profile.find({ user_id: { $in: doctorIds } }).select("user_id full_name").lean();
    const nameByDoctor: Record<string, string> = {};
    for (const p of profiles as { user_id: string; full_name?: string }[]) nameByDoctor[p.user_id] = p.full_name || "";
    for (const m of messages as any[]) {
      doctor_messages.push({
        id: m._id?.toString(),
        message: m.message,
        created_at: m.created_at?.toISOString?.() ?? new Date().toISOString(),
        doctor_name: nameByDoctor[m.doctor_id] || undefined,
      });
    }
  }
  res.json({ doctor_can_see_logs, doctor_name, family_connections, doctor_messages });
});

router.get("/me/doctor-messages", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const patientIds = link.patient_ids;
  const list = await DoctorMessage.find({ patient_id: { $in: patientIds } })
    .sort({ created_at: -1 })
    .limit(50)
    .lean();
  const doctorIds = [...new Set((list as any[]).map((m) => m.doctor_id))];
  const profiles = await Profile.find({ user_id: { $in: doctorIds } }).select("user_id full_name").lean();
  const nameByDoctor: Record<string, string> = {};
  for (const p of profiles as { user_id: string; full_name?: string }[]) nameByDoctor[p.user_id] = p.full_name || "";
  res.json(
    (list as any[]).map((m) => ({
      id: m._id?.toString(),
      message: m.message,
      created_at: m.created_at?.toISOString?.() ?? new Date().toISOString(),
      doctor_name: nameByDoctor[m.doctor_id] || "Doctor",
    }))
  );
});

router.get("/me/family-connections", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const list = await FamilyConnection.find({ patient_user_id: userId }).sort({ created_at: -1 }).lean();
  res.json(
    list.map((d: any) => ({
      id: d._id?.toString(),
      relationship: d.relationship,
      invite_email: d.invite_email,
      status: d.status,
      family_user_id: d.family_user_id || null,
      created_at: d.created_at?.toISOString?.() ?? new Date().toISOString(),
    }))
  );
});

router.post("/me/family-connections", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const { invite_email, relationship } = req.body as { invite_email?: string; relationship?: string };
  const email = invite_email ? String(invite_email).trim().toLowerCase() : "";
  if (!email) return res.status(400).json({ error: "invite_email required" });
  const rel = relationship === "son" || relationship === "daughter" || relationship === "spouse" ? relationship : "other";
  const existing = await FamilyConnection.findOne({ patient_user_id: userId, invite_email: email }).lean();
  if (existing) return res.status(400).json({ error: "Already invited this email" });
  const doc = await FamilyConnection.create({
    patient_user_id: userId,
    invite_email: email,
    relationship: rel,
    status: "pending",
  });
  res.status(201).json({
    id: doc._id?.toString(),
    relationship: rel,
    invite_email: email,
    status: "pending",
    family_user_id: null,
  });
});

router.delete("/me/family-connections/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const deleted = await FamilyConnection.findOneAndDelete({
    _id: req.params.id,
    patient_user_id: userId,
  });
  if (!deleted) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

/** Family dashboard: linked patients' today log status (for family role users). */
router.get("/family/dashboard", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const connections = await FamilyConnection.find({ family_user_id: userId, status: "active" }).lean();
  if (connections.length === 0) {
    return res.json({ patients: [] });
  }
  const patientUserIds = [...new Set((connections as any[]).map((c) => c.patient_user_id))];
  const patients = await Patient.find({ patient_user_id: { $in: patientUserIds } }).select("_id patient_user_id full_name").lean();
  const patientIdsByUser: Record<string, string[]> = {};
  for (const p of patients as { _id: unknown; patient_user_id: string }[]) {
    const uid = p.patient_user_id;
    if (!patientIdsByUser[uid]) patientIdsByUser[uid] = [];
    const id = p._id?.toString();
    if (id) patientIdsByUser[uid].push(id);
  }
  const relByPatient: Record<string, string> = {};
  for (const c of connections as any[]) {
    relByPatient[c.patient_user_id] = c.relationship;
  }
  const results: { patient_user_id: string; full_name: string; relationship: string; today: { bp: boolean; food: boolean; sugar: boolean; medication: boolean } }[] = [];
  for (const uid of patientUserIds) {
    const ids = patientIdsByUser[uid] || [];
    const today = await getTodayLogStatus(ids);
    const first = (patients as any[]).find((p) => p.patient_user_id === uid);
    results.push({
      patient_user_id: uid,
      full_name: first?.full_name ?? "Patient",
      relationship: relByPatient[uid] ?? "other",
      today,
    });
  }
  res.json({ patients: results });
});

/** Doctor sends a message to patient (shown in patient app). */
router.post("/patients/:id/message", requireAuth, async (req, res) => {
  const doctorId = (req as AuthRequest).user.id;
  const patientId = req.params.id;
  const canAccess = await doctorCanAccessPatient(doctorId, patientId);
  if (!canAccess) return res.status(404).json({ error: "Patient not found" });
  const { message } = req.body as { message?: string };
  const text = message != null ? String(message).trim() : "";
  if (!text) return res.status(400).json({ error: "message required" });
  const doc = await DoctorMessage.create({ doctor_id: doctorId, patient_id: patientId, message: text });
  res.status(201).json({
    id: doc._id?.toString(),
    message: text,
    created_at: (doc as any).created_at?.toISOString?.() ?? new Date().toISOString(),
  });
});

// ---------- Routine detection (Solution 7): usual log times in UTC (frontend uses browser local) ----------
router.get("/me/quick-log/routine", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const filter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const lookback = new Date();
  lookback.setDate(lookback.getDate() - 14);

  const aggHour = (collection: mongoose.Model<mongoose.Document>, match: Record<string, unknown>) =>
    collection.aggregate([
      { $match: { ...filter, ...match } },
      { $match: { recorded_at: { $gte: lookback } } },
      { $project: { hour: { $hour: "$recorded_at" }, minute: { $minute: "$recorded_at" } } },
      { $group: { _id: { hour: "$hour", minute: "$minute" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

  const [bp, sugar, food, med] = await Promise.all([
    aggHour(Vital as any, { vital_type: "blood_pressure" }).then((r) => r[0] as { _id?: { hour: number; minute: number } } | undefined),
    aggHour(Vital as any, { vital_type: "blood_sugar" }).then((r) => r[0] as { _id?: { hour: number; minute: number } } | undefined),
    FoodLog.aggregate([
      { $match: filter },
      { $match: { logged_at: { $gte: lookback } } },
      { $project: { hour: { $hour: "$logged_at" }, minute: { $minute: "$logged_at" } } },
      { $group: { _id: { hour: "$hour", minute: "$minute" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]).then((r) => r[0] as { _id?: { hour: number; minute: number } } | undefined),
    MedicationLog.aggregate([
      { $match: filter },
      { $match: { logged_at: { $gte: lookback } } },
      { $project: { hour: { $hour: "$logged_at" }, minute: { $minute: "$logged_at" } } },
      { $group: { _id: { hour: "$hour", minute: "$minute" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]).then((r) => r[0] as { _id?: { hour: number; minute: number } } | undefined),
  ]);

  const toRoutine = (r: { _id?: { hour: number; minute: number } } | undefined) =>
    r?._id ? { hour_utc: r._id.hour, minute_utc: r._id.minute } : null;

  res.json({
    blood_pressure: toRoutine(bp),
    blood_sugar: toRoutine(sugar),
    food: toRoutine(food),
    medication: toRoutine(med),
  });
});

// Internal: send routine pushes (call from cron / Netlify scheduled function). Requires CRON_SECRET.
async function getRoutineForUserId(userId: string): Promise<{ blood_pressure: { hour_utc: number; minute_utc: number } | null; blood_sugar: { hour_utc: number; minute_utc: number } | null }> {
  const patients = await Patient.find({ patient_user_id: userId }).select("_id").lean();
  if (patients.length === 0) return { blood_pressure: null, blood_sugar: null };
  const patientIds = (patients as { _id: unknown }[]).map((p) => p._id?.toString()).filter(Boolean) as string[];
  const filter = patientIds.length > 1 ? { patient_id: { $in: patientIds } } : { patient_id: patientIds[0] };
  const lookback = new Date();
  lookback.setDate(lookback.getDate() - 14);
  const agg = (vitalType: string) =>
    Vital.aggregate([
      { $match: { ...filter, vital_type: vitalType } },
      { $match: { recorded_at: { $gte: lookback } } },
      { $project: { hour: { $hour: "$recorded_at" }, minute: { $minute: "$recorded_at" } } },
      { $group: { _id: { hour: "$hour", minute: "$minute" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]).then((r) => (r[0] as { _id?: { hour: number; minute: number } })?._id ?? null);
  const [bp, sugar] = await Promise.all([agg("blood_pressure"), agg("blood_sugar")]);
  return {
    blood_pressure: bp ? { hour_utc: bp.hour, minute_utc: bp.minute } : null,
    blood_sugar: sugar ? { hour_utc: sugar.hour, minute_utc: sugar.minute } : null,
  };
}

router.post("/internal/send-routine-pushes", async (req, res) => {
  const secret = req.headers["x-cron-secret"] || req.query?.secret;
  if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: "Unauthorized" });
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return res.json({ sent: 0, error: "VAPID not configured" });
  const now = new Date();
  const hourUtc = now.getUTCHours();
  const batchSize = LIMITS.PUSH_SUBSCRIPTION_BATCH;
  let sent = 0;
  let skip = 0;
  let batch: { user_id: string; endpoint: string; keys: { p256dh: string; auth: string } }[];
  do {
    batch = (await PushSubscription.find({}).skip(skip).limit(batchSize).lean()) as typeof batch;
    for (const sub of batch) {
    try {
      const routine = await getRoutineForUserId(sub.user_id);
      const defaultBp = "120/80";
      const defaultSugar = "100";
      if (routine.blood_pressure && routine.blood_pressure.hour_utc === hourUtc) {
        const token = crypto.randomBytes(24).toString("hex");
        await QuickLogToken.create({
          token,
          user_id: sub.user_id,
          type: "blood_pressure",
          value_text: defaultBp,
          expires_at: new Date(Date.now() + 15 * 60 * 1000),
        });
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({
            title: "Log BP now",
            body: `Tap to log ${defaultBp}`,
            tag: "routine-bp",
            data: { token, type: "blood_pressure", value: defaultBp },
          }),
          { TTL: 60 * 15 }
        );
        sent++;
      }
      if (routine.blood_sugar && routine.blood_sugar.hour_utc === hourUtc) {
        const token = crypto.randomBytes(24).toString("hex");
        await QuickLogToken.create({
          token,
          user_id: sub.user_id,
          type: "blood_sugar",
          value_text: defaultSugar,
          expires_at: new Date(Date.now() + 15 * 60 * 1000),
        });
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({
            title: "Log blood sugar now",
            body: `Tap to log ${defaultSugar} mg/dL`,
            tag: "routine-sugar",
            data: { token, type: "blood_sugar", value: defaultSugar },
          }),
          { TTL: 60 * 15 }
        );
        sent++;
      }
      // Medication reminders based on patient's active medications
      const patients = await Patient.find({ patient_user_id: sub.user_id }).select("_id").lean();
      const patIds = (patients as { _id: unknown }[]).map((p) => p._id?.toString()).filter(Boolean) as string[];
      if (patIds.length > 0) {
        const medFilter = patIds.length > 1 ? { patient_id: { $in: patIds } } : { patient_id: patIds[0] };
        const activeMeds = await Medication.find({ ...medFilter, active: true }).select("medicine timing_display timings suggested_time").lean();
        const hourStr = String(hourUtc).padStart(2, "0");
        const medsToRemind = (activeMeds as any[]).filter((m) => {
          if (m.timings?.length > 0) return m.timings.some((t: string) => t.startsWith(hourStr));
          if (m.suggested_time) return m.suggested_time.startsWith(hourStr);
          return false;
        });
        if (medsToRemind.length > 0) {
          const names = medsToRemind.map((m: any) => m.medicine).slice(0, 3).join(", ");
          const more = medsToRemind.length > 3 ? ` +${medsToRemind.length - 3} more` : "";
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            JSON.stringify({
              title: "Time for your medication",
              body: `Take: ${names}${more}`,
              tag: "routine-medication",
              data: { type: "medication" },
            }),
            { TTL: 60 * 30 }
          );
          sent++;
        }
      }
    } catch {
      // Skip failed subscription (expired/invalid)
    }
    }
    skip += batchSize;
  } while (batch.length === batchSize);
  res.json({ sent });
});

// ---------- Smart reminders: Layer 2 (triggers) + Layer 3 (adaptive escalation) ----------
/** Resolve any open reminder escalation when user logs (BP, sugar, or medication). */
async function resolveReminderEscalation(patientId: string, triggerType: "blood_pressure" | "blood_sugar" | "medication") {
  await ReminderEscalation.updateMany(
    { patient_id: patientId, trigger_type: triggerType, resolved_at: null },
    { resolved_at: new Date() }
  );
}

/** Get patient link by user_id (for cron, no request). */
async function getPatientLinkByUserId(userId: string): Promise<{ patient_id: string; doctor_id: string; patient_ids: string[] } | null> {
  const patients = await Patient.find({ patient_user_id: userId }).select("_id doctor_id").lean();
  if (!patients?.length) return null;
  const patient_ids = (patients as { _id: unknown }[]).map((p) => p._id?.toString()).filter(Boolean) as string[];
  const activeLink = await PatientDoctorLink.findOne({ patient_user_id: userId, status: "active" })
    .select("doctor_user_id")
    .sort({ responded_at: -1 })
    .lean();
  if (activeLink) {
    const docId = (activeLink as { doctor_user_id: string }).doctor_user_id;
    const linked = (patients as { _id: unknown; doctor_id: string }[]).find((p) => p.doctor_id === docId);
    if (linked) return { patient_id: linked._id?.toString() as string, doctor_id: docId, patient_ids };
  }
  const underDoctor = (patients as { _id: unknown; doctor_id: string }[]).find((p) => p.doctor_id && p.doctor_id !== userId);
  if (underDoctor) return { patient_id: underDoctor._id?.toString() as string, doctor_id: underDoctor.doctor_id, patient_ids };
  const first = patients[0] as { _id: unknown; doctor_id: string };
  return { patient_id: first._id?.toString() as string, doctor_id: first.doctor_id, patient_ids };
}

/** Check if patient logged this trigger type today (UTC). */
async function didPatientLogToday(patientIds: string[], triggerType: "blood_pressure" | "blood_sugar" | "medication"): Promise<boolean> {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const filter = patientIds.length > 1 ? { patient_id: { $in: patientIds } } : { patient_id: patientIds[0] };
  if (triggerType === "blood_pressure" || triggerType === "blood_sugar") {
    const last = await Vital.findOne({
      ...filter,
      vital_type: triggerType,
      recorded_at: { $gte: startOfToday },
    })
      .select("_id")
      .lean();
    return !!last;
  }
  const last = await MedicationLog.findOne({
    ...filter,
    logged_at: { $gte: startOfToday },
  })
    .select("_id")
    .lean();
  return !!last;
}

/** Days since anchor (UTC date diff). */
function daysSince(date: Date): number {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

const ESCALATION_MESSAGES = {
  blood_pressure: {
    day1: { title: "Reminder: Log your BP", body: "Don't forget to log your blood pressure today. It only takes a moment." },
    day2: { title: "We noticed you haven't logged BP", body: "Logging regularly helps your doctor care for you. Tap to log now." },
    day3: { title: "Important: Please log your BP", body: "Your care team is here if you need help. Log your blood pressure when you can." },
  },
  blood_sugar: {
    day1: { title: "Reminder: Log your blood sugar", body: "Don't forget to log your blood sugar today." },
    day2: { title: "We noticed you haven't logged blood sugar", body: "Regular logging helps your doctor support you. Tap to log now." },
    day3: { title: "Important: Please log your blood sugar", body: "Your care team is here if you need help. Log when you can." },
  },
  medication: {
    day1: { title: "Reminder: Did you take your medication?", body: "Mark your medications in the app when you take them." },
    day2: { title: "We noticed you haven't logged medication", body: "Logging helps your doctor track your care. Tap to log now." },
    day3: { title: "Important: Please log your medication", body: "Your care team is here if you need help. Log when you can." },
  },
};

/** Internal: process adaptive reminder escalations (Day 1 → 2 → 3 → 5). Call from cron daily. */
router.post("/internal/process-reminder-escalations", async (req, res) => {
  const secret = req.headers["x-cron-secret"] || req.query?.secret;
  if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: "Unauthorized" });
  const now = new Date();
  const results = { day1: 0, day2: 0, day3: 0, day5: 0, resolved: 0 };
  const subs = await PushSubscription.find({}).select("user_id").lean();
  const userIds = [...new Set((subs as { user_id: string }[]).map((s) => s.user_id))];
  for (const userId of userIds) {
    const link = await getPatientLinkByUserId(userId);
    if (!link) continue;
    const { patient_id, doctor_id, patient_ids } = link;
    const patient = await Patient.findById(patient_id).select("full_name emergency_contact medications").lean();
    if (!patient) continue;
    const p = patient as { full_name?: string; emergency_contact?: string; medications?: string[] };
    const triggerTypes: ("blood_pressure" | "blood_sugar" | "medication")[] = ["blood_pressure", "blood_sugar", "medication"];
    for (const triggerType of triggerTypes) {
      const loggedToday = await didPatientLogToday(patient_ids, triggerType);
      if (loggedToday) {
        await resolveReminderEscalation(patient_id, triggerType);
        results.resolved++;
        continue;
      }
      const hasRoutine = await (async () => {
        if (triggerType === "medication") return (p.medications?.length ?? 0) > 0;
        const routine = await getRoutineForUserId(userId);
        return triggerType === "blood_pressure" ? !!routine.blood_pressure : !!routine.blood_sugar;
      })();
      if (!hasRoutine) continue;
      let esc = await ReminderEscalation.findOne({
        user_id: userId,
        patient_id,
        trigger_type: triggerType,
        resolved_at: null,
      }).lean();
      if (!esc) {
        const created = await ReminderEscalation.create({
          user_id: userId,
          patient_id,
          doctor_id,
          trigger_type: triggerType,
          anchor_date: now,
        });
        esc = created.toObject();
      }
      const e = esc as { anchor_date: Date; day1_sent_at?: Date; day2_sent_at?: Date; day3_sent_at?: Date; day5_sent_at?: Date };
      const day = daysSince(new Date(e.anchor_date));
      const sub = await PushSubscription.findOne({ user_id: userId }).lean();
      const pushPayload = sub as { endpoint: string; keys: { p256dh: string; auth: string } } | null;
      const triggerLabel = triggerType === "blood_pressure" ? "BP" : triggerType === "blood_sugar" ? "blood sugar" : "medication";
      if (day >= 1 && !e.day1_sent_at) {
        const msg = ESCALATION_MESSAGES[triggerType].day1;
        if (pushPayload && VAPID_PUBLIC && VAPID_PRIVATE) {
          try {
            await webpush.sendNotification(
              { endpoint: pushPayload.endpoint, keys: pushPayload.keys },
              JSON.stringify({ title: msg.title, body: msg.body, tag: `escalation-${triggerType}-1`, data: { type: triggerType } }),
              { TTL: 86400 }
            );
          } catch (err) {
            console.error("Escalation push day1 failed", userId, err);
          }
        }
        await Notification.create({
          user_id: userId,
          title: msg.title,
          message: msg.body,
          category: "reminder",
          related_type: "reminder_escalation",
        });
        await ReminderEscalation.updateOne({ _id: (esc as any)._id }, { day1_sent_at: now });
        results.day1++;
      }
      if (day >= 2 && !e.day2_sent_at) {
        const msg = ESCALATION_MESSAGES[triggerType].day2;
        if (pushPayload && VAPID_PUBLIC && VAPID_PRIVATE) {
          try {
            await webpush.sendNotification(
              { endpoint: pushPayload.endpoint, keys: pushPayload.keys },
              JSON.stringify({ title: msg.title, body: msg.body, tag: `escalation-${triggerType}-2`, data: { type: triggerType } }),
              { TTL: 86400 }
            );
          } catch (err) {
            console.error("Escalation push day2 failed", userId, err);
          }
        }
        await Notification.create({
          user_id: userId,
          title: msg.title,
          message: msg.body,
          category: "reminder",
          related_type: "reminder_escalation",
        });
        await ReminderEscalation.updateOne({ _id: (esc as any)._id }, { day2_sent_at: now });
        results.day2++;
      }
      if (day >= 3 && !e.day3_sent_at) {
        const msg = ESCALATION_MESSAGES[triggerType].day3;
        if (pushPayload && VAPID_PUBLIC && VAPID_PRIVATE) {
          try {
            await webpush.sendNotification(
              { endpoint: pushPayload.endpoint, keys: pushPayload.keys },
              JSON.stringify({
                title: msg.title,
                body: msg.body,
                tag: `escalation-${triggerType}-3`,
                data: { type: triggerType, whatsapp_reminder: true },
              }),
              { TTL: 86400 }
            );
          } catch (err) {
            console.error("Escalation push day3 failed", userId, err);
          }
        }
        await Notification.create({
          user_id: userId,
          title: msg.title,
          message: msg.body,
          category: "reminder",
          related_type: "reminder_escalation",
        });
        await ReminderEscalation.updateOne({ _id: (esc as any)._id }, { day3_sent_at: now });
        results.day3++;
      }
      if (day >= 5 && !e.day5_sent_at) {
        const emergencyContact = p.emergency_contact || "Not set";
        const alert = await Alert.create({
          doctor_id,
          patient_id,
          title: `Reminder escalation: ${triggerLabel} not logged for 5 days`,
          description: `${p.full_name || "Patient"} has not logged ${triggerLabel} for 5 days. Consider contacting emergency contact: ${emergencyContact}.`,
          severity: "medium",
          status: "open",
          related_type: "reminder_escalation",
          alert_type: "reminder_escalation",
        });
        await ReminderEscalation.updateOne(
          { _id: (esc as any)._id },
          { day5_sent_at: now, day5_alert_id: alert._id?.toString() }
        );
        results.day5++;
      }
    }
  }
  res.json({ ok: true, results });
});

const mealUploadDir = path.join(UPLOAD_DIR, "meals");
if (!fs.existsSync(mealUploadDir)) fs.mkdirSync(mealUploadDir, { recursive: true });
const mealUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, mealUploadDir),
    filename: (req, file, cb) => {
      const uid = (req as AuthRequest).user?.id || "anon";
      cb(null, `${uid}_${Date.now()}_${(file.originalname || "image").replace(/[^a-zA-Z0-9.-]/g, "_")}`);
    },
  }),
});

const feedbackVideoDir = path.join(UPLOAD_DIR, "feedback_videos");
if (!fs.existsSync(feedbackVideoDir)) fs.mkdirSync(feedbackVideoDir, { recursive: true });
const feedbackVideoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, feedbackVideoDir),
    filename: (_req, file, cb) =>
      cb(null, `${Date.now()}_${crypto.randomBytes(6).toString("hex")}_${(file.originalname || "video").replace(/[^a-zA-Z0-9.-]/g, "_")}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    const ok = !file.mimetype || file.mimetype.startsWith("video/");
    (cb as (err: Error | null, accept: boolean) => void)(ok ? null : new Error("Only video files are allowed"), ok);
  },
});
router.post("/me/meal-image-upload", requireAuth, mealUpload.single("file"), async (req, res) => {
  const file = (req as any).file;
  if (!file) return res.status(400).json({ error: "file required" });
  res.json({ path: `meals/${file.filename}` });
});

// ---------- Alerts ----------
router.get("/alerts", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const q = req.query as { patient_id?: string; status?: string; count?: string };
  let filter: Record<string, string> = { doctor_id: userId };
  if (q.patient_id) {
    const canAccess = await doctorCanAccessPatient(userId, q.patient_id);
    if (!canAccess) return res.status(404).json({ error: "Patient not found" });
    filter = { patient_id: q.patient_id };
  }
  if (q.status) filter.status = q.status;
  if (q.count === "true" || q.count === "1") {
    const count = await Alert.countDocuments(filter);
    return res.json({ count });
  }
  const list = await Alert.find(filter).sort({ created_at: -1 }).limit(LIMITS.ALERTS_MAX).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.patch("/alerts/:id", requireAuth, async (req, res) => {
  const updated = await Alert.findOneAndUpdate(
    { _id: req.params.id, doctor_id: (req as AuthRequest).user.id },
    req.body,
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, id: updated._id?.toString(), _id: undefined, __v: undefined });
});

// ---------- Appointments ----------
router.get("/appointments", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const q = req.query as { patient_id?: string; doctor_id?: string; clinic_id?: string };
  const filter: Record<string, string | { $in: string[] }> = {};
  const asClinicId = await getClinicIdForUser(userId);
  const clinicId = q.clinic_id || (asClinicId ? asClinicId : null);
  if (clinicId) {
    const ok = await canActForClinic(userId, clinicId);
    if (!ok) return res.status(403).json({ error: "Not allowed" });
    filter.clinic_id = clinicId;
  } else {
    if (q.patient_id) {
      const canAccess = await doctorCanAccessPatient(userId, q.patient_id);
      if (!canAccess) return res.status(404).json({ error: "Patient not found" });
      filter.patient_id = q.patient_id;
    } else {
      filter.doctor_id = userId;
    }
  }
  const list = await Appointment.find(filter).sort({ scheduled_at: -1 }).limit(LIMITS.APPOINTMENTS_MAX).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/appointments", requireAuth, async (req, res) => {
  const body = { ...req.body, doctor_id: (req as AuthRequest).user.id };
  const doc = await Appointment.create(body);
  res.status(201).json(doc.toJSON());
});

router.patch("/appointments/:id", requireAuth, async (req, res) => {
  const prev = await Appointment.findOne({ _id: req.params.id, doctor_id: (req as AuthRequest).user.id }).lean();
  if (!prev) return res.status(404).json({ error: "Not found" });
  const updated = await Appointment.findOneAndUpdate(
    { _id: req.params.id, doctor_id: (req as AuthRequest).user.id },
    req.body,
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
  // When doctor marks appointment completed, create feedback request and notify patient
  if (req.body.status === "completed" && (prev as any).status !== "completed") {
    const patientDoc = await Patient.findOne({ _id: (updated as any).patient_id }).select("patient_user_id full_name").lean();
    const patientUserId = (patientDoc as any)?.patient_user_id;
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await FeedbackRequest.create({
      appointment_id: (updated as any)._id.toString(),
      clinic_id: (updated as any).clinic_id || undefined,
      doctor_id: (updated as any).doctor_id,
      patient_id: (updated as any).patient_id.toString(),
      patient_user_id: patientUserId || undefined,
      expires_at: expiresAt,
      token,
      status: "pending",
    });
    if (patientUserId) {
      await Notification.create({
        user_id: patientUserId,
        title: "Share your feedback",
        message: "Your recent appointment was completed. We'd love to hear about your experience with the doctor and clinic.",
        related_id: (updated as any)._id.toString(),
        related_type: "appointment",
        category: "feedback",
      });
    }
  }
  res.json({ ...updated, id: updated._id?.toString(), _id: undefined, __v: undefined });
});

// ---------- Appointment checkins ----------
router.get("/appointment_checkins", requireAuth, async (req, res) => {
  const q = req.query as { patient_id?: string };
  const filter: Record<string, string> = { doctor_id: (req as AuthRequest).user.id };
  if (q.patient_id) filter.patient_id = q.patient_id;
  const list = await AppointmentCheckin.find(filter).sort({ checked_in_at: -1 }).limit(LIMITS.APPOINTMENT_CHECKINS_MAX).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/appointment_checkins", requireAuth, async (req, res) => {
  const body = { ...req.body, doctor_id: (req as AuthRequest).user.id };
  const doc = await AppointmentCheckin.create(body);
  res.status(201).json(doc.toJSON());
});

// ---------- Clinics ----------
router.get("/clinics", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const asClinicId = await getClinicIdForUser(userId);
  if (asClinicId) {
    const clinic = await Clinic.findById(asClinicId).lean();
    if (!clinic) return res.json([]);
    return res.json([{ ...clinic, id: (clinic as any)._id?.toString(), _id: undefined, __v: undefined }]);
  }
  const members = await ClinicMember.find({ user_id: userId }).lean();
  const clinicIds = (members as { clinic_id: string }[]).map((m) => m.clinic_id);
  const clinics = await Clinic.find({ _id: { $in: clinicIds } }).lean();
  const list = (clinics as any[]).map((c) => ({ ...c, id: c._id?.toString(), _id: undefined, __v: undefined }));
  res.json(list);
});

router.get("/clinics/:id", requireAuth, async (req, res) => {
  const ok = await canActForClinic((req as AuthRequest).user.id, req.params.id);
  if (!ok) return res.status(404).json({ error: "Not found" });
  const clinic = await Clinic.findById(req.params.id).lean();
  if (!clinic) return res.status(404).json({ error: "Not found" });
  res.json({ ...clinic, id: clinic._id?.toString(), _id: undefined, __v: undefined });
});

router.post("/clinics", requireAuth, async (req, res) => {
  const body = { ...req.body, created_by: (req as AuthRequest).user.id };
  const doc = await Clinic.create(body);
  const clinicId = doc._id.toString();
  await ClinicMember.create({
    clinic_id: clinicId,
    user_id: (req as AuthRequest).user.id,
    role: "owner",
  });
  res.status(201).json(doc.toJSON());
});

router.patch("/clinics/:id", requireAuth, async (req, res) => {
  const ok = await canActForClinic((req as AuthRequest).user.id, req.params.id);
  if (!ok) return res.status(404).json({ error: "Not found" });
  const updated = await Clinic.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, id: updated._id?.toString(), _id: undefined, __v: undefined });
});

router.post("/clinics/:id/add-by-doctor-code", requireAuth, async (req, res) => {
  const ok = await canActForClinic((req as AuthRequest).user.id, req.params.id);
  if (!ok) return res.status(403).json({ error: "Not allowed to add members to this clinic" });
  const { doctor_code, role } = req.body as { doctor_code?: string; role?: string };
  if (!doctor_code || String(doctor_code).trim() === "") return res.status(400).json({ error: "doctor_code required" });
  const profile = await Profile.findOne({ doctor_code: String(doctor_code).trim().toUpperCase() }).select("user_id").lean();
  if (!profile) return res.status(404).json({ error: "Doctor not found with this code" });
  const doctorUserId = (profile as { user_id: string }).user_id;
  const roleDoc = await UserRole.findOne({ user_id: doctorUserId }).lean();
  if ((roleDoc as { role?: string })?.role !== "doctor") return res.status(400).json({ error: "This code belongs to a non-doctor account. Only doctors can be added by code." });
  const existing = await ClinicMember.findOne({ clinic_id: req.params.id, user_id: doctorUserId }).lean();
  if (existing) return res.status(409).json({ error: "This doctor is already a member of the clinic" });
  const memberRole = role === "nurse" || role === "admin" || role === "staff" ? role : "doctor";
  await ClinicMember.create({ clinic_id: req.params.id, user_id: doctorUserId, role: memberRole });
  return res.status(201).json({ message: "Doctor added to clinic", user_id: doctorUserId, role: memberRole });
});

router.get("/clinics/:id/has-login", requireAuth, async (req, res) => {
  const ok = await canActForClinic((req as AuthRequest).user.id, req.params.id);
  if (!ok) return res.status(404).json({ error: "Clinic not found" });
  const existing = await AuthUser.findOne({ clinic_id: req.params.id }).lean();
  return res.json({ hasLogin: !!existing });
});

router.post("/clinics/:id/create-login", requireAuth, async (req, res) => {
  const member = await ClinicMember.findOne({ clinic_id: req.params.id, user_id: (req as AuthRequest).user.id }).lean();
  if (!member) return res.status(404).json({ error: "Clinic not found" });
  const role = (member as { role?: string }).role;
  if (role !== "owner" && role !== "admin") {
    return res.status(403).json({ error: "Only clinic owner or admin can create clinic login" });
  }
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const existingEmail = await AuthUser.findOne({ email: (email as string).toLowerCase() }).lean();
  if (existingEmail) return res.status(400).json({ error: "Email already registered" });
  const existingClinicLogin = await AuthUser.findOne({ clinic_id: req.params.id }).lean();
  if (existingClinicLogin) return res.status(409).json({ error: "This clinic already has a login. Use a different clinic or contact support." });
  const clinic = await Clinic.findById(req.params.id).lean();
  if (!clinic) return res.status(404).json({ error: "Clinic not found" });
  const user_id = crypto.randomUUID();
  const password_hash = await bcrypt.hash(password, 10);
  await AuthUser.create({
    email: (email as string).toLowerCase(),
    password_hash,
    user_id,
    clinic_id: req.params.id,
  });
  await Profile.create({ user_id, full_name: (clinic as any).name || "Clinic" });
  await UserRole.create({ user_id, role: "clinic", clinic_id: req.params.id });
  return res.status(201).json({ message: "Clinic login created. You can now sign in with this email.", email: (email as string).toLowerCase() });
});

// ---------- Clinic members ----------
router.get("/clinic_members", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const q = req.query as { clinic_id?: string };
  const asClinicId = await getClinicIdForUser(userId);
  const filter: Record<string, string | { $in: string[] }> = {};
  if (asClinicId) filter.clinic_id = asClinicId;
  else if (q.clinic_id) filter.clinic_id = q.clinic_id;
  else {
    const members = await ClinicMember.find({ user_id: userId }).select("clinic_id").lean();
    filter.clinic_id = { $in: members.map((m: { clinic_id: string }) => m.clinic_id) };
  }
  const list = await ClinicMember.find(filter).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/clinic_members", requireAuth, async (req, res) => {
  const body = req.body as { clinic_id: string; user_id: string; role?: string };
  if (!body.clinic_id || !body.user_id) return res.status(400).json({ error: "clinic_id and user_id required" });
  const ok = await canActForClinic((req as AuthRequest).user.id, body.clinic_id);
  if (!ok) return res.status(403).json({ error: "Not allowed to add members to this clinic" });
  const doc = await ClinicMember.create({ ...body, role: body.role || "doctor" });
  res.status(201).json(doc.toJSON());
});

// ---------- Clinic invites ----------
router.get("/clinic_invites", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const q = req.query as { clinic_id?: string };
  const asClinicId = await getClinicIdForUser(userId);
  const filter: Record<string, unknown> = {};
  if (asClinicId) filter.clinic_id = asClinicId;
  else if (q.clinic_id) filter.clinic_id = q.clinic_id;
  else return res.json([]);
  const list = await ClinicInvite.find(filter).sort({ created_at: -1 }).limit(200).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/clinic_invites", requireAuth, async (req, res) => {
  const body = req.body as { clinic_id: string; email: string; role?: string };
  if (!body.clinic_id || !body.email) return res.status(400).json({ error: "clinic_id and email required" });
  const ok = await canActForClinic((req as AuthRequest).user.id, body.clinic_id);
  if (!ok) return res.status(403).json({ error: "Not allowed to invite to this clinic" });
  const doc = await ClinicInvite.create({ ...body, invited_by: (req as AuthRequest).user.id, invite_code: crypto.randomBytes(4).toString("hex").toUpperCase(), role: body.role || "doctor" });
  res.status(201).json(doc.toJSON());
});

router.patch("/clinic_invites/:id", requireAuth, async (req, res) => {
  const updated = await ClinicInvite.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, id: updated._id?.toString(), _id: undefined, __v: undefined });
});

// ---------- Doctor availability ----------
router.get("/doctor_availability", requireAuth, async (req, res) => {
  const q = req.query as { doctor_id?: string; clinic_id?: string };
  const filter: Record<string, string> = { doctor_id: (req as AuthRequest).user.id };
  if (q.clinic_id) filter.clinic_id = q.clinic_id;
  const list = await DoctorAvailability.find(filter).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/doctor_availability", requireAuth, async (req, res) => {
  const body = { ...req.body, doctor_id: (req as AuthRequest).user.id };
  const doc = await DoctorAvailability.create(body);
  res.status(201).json(doc.toJSON());
});

router.patch("/doctor_availability/:id", requireAuth, async (req, res) => {
  const updated = await DoctorAvailability.findOneAndUpdate(
    { _id: req.params.id, doctor_id: (req as AuthRequest).user.id },
    req.body,
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, id: updated._id?.toString(), _id: undefined, __v: undefined });
});

router.delete("/doctor_availability/:id", requireAuth, async (req, res) => {
  const deleted = await DoctorAvailability.findOneAndDelete({ _id: req.params.id, doctor_id: (req as AuthRequest).user.id });
  if (!deleted) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

// ---------- Enrollments ----------
router.get("/enrollments", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const q = req.query as { patient_id?: string };
  let filter: Record<string, string> = { doctor_id: userId };
  if (q.patient_id) {
    const canAccess = await doctorCanAccessPatient(userId, q.patient_id);
    if (!canAccess) return res.status(404).json({ error: "Patient not found" });
    filter = { patient_id: q.patient_id };
  }
  const list = await Enrollment.find(filter).sort({ enrolled_at: -1 }).limit(LIMITS.ENROLLMENTS_MAX).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/enrollments", requireAuth, async (req, res) => {
  const body = { ...req.body, doctor_id: (req as AuthRequest).user.id };
  const doc = await Enrollment.create(body);
  res.status(201).json(doc.toJSON());
});

router.patch("/enrollments/:id", requireAuth, async (req, res) => {
  const updated = await Enrollment.findOneAndUpdate(
    { _id: req.params.id, doctor_id: (req as AuthRequest).user.id },
    req.body,
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, id: updated._id?.toString(), _id: undefined, __v: undefined });
});

// ---------- Feedback requests ----------
router.get("/feedback_requests", requireAuth, async (req, res) => {
  const q = req.query as { token?: string };
  const filter: Record<string, string> = {};
  if (q.token) filter.token = q.token;
  const list = await FeedbackRequest.find(filter).limit(LIMITS.FEEDBACK_REQUESTS_MAX).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

// Patient: list my pending feedback requests (for completed appointments)
router.get("/me/feedback_requests", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const now = new Date();
  const list = await FeedbackRequest.find({
    patient_user_id: userId,
    status: "pending",
    expires_at: { $gt: now },
  })
    .sort({ created_at: -1 })
    .limit(LIMITS.FEEDBACK_REQUESTS_MAX)
    .lean();
  if (list.length === 0) return res.json([]);
  const doctorIds = [...new Set((list as any[]).map((r) => r.doctor_id))];
  const clinicIds = [...new Set((list as any[]).map((r) => r.clinic_id).filter(Boolean))];
  const [profiles, clinics, appts] = await Promise.all([
    Profile.find({ user_id: { $in: doctorIds } }).select("user_id full_name").lean(),
    clinicIds.length ? Clinic.find({ _id: { $in: clinicIds } }).select("_id name").lean() : [],
    Appointment.find({ _id: { $in: (list as any[]).map((r) => r.appointment_id) } }).select("_id title scheduled_at").lean(),
  ]);
  const nameByDoctor: Record<string, string> = {};
  for (const p of profiles as { user_id: string; full_name?: string }[]) nameByDoctor[p.user_id] = p.full_name || "Doctor";
  const nameByClinic: Record<string, string> = {};
  for (const c of clinics as { _id: unknown; name?: string }[]) nameByClinic[(c as any)._id?.toString()] = c.name || "Clinic";
  const apptById: Record<string, { title?: string; scheduled_at?: Date }> = {};
  for (const a of appts as any[]) apptById[a._id?.toString()] = { title: a.title, scheduled_at: a.scheduled_at };
  const out = (list as any[]).map((r) => ({
    ...r,
    id: r._id?.toString(),
    _id: undefined,
    __v: undefined,
    doctor_name: nameByDoctor[r.doctor_id] || "Doctor",
    clinic_name: r.clinic_id ? nameByClinic[r.clinic_id] : null,
    appointment_title: apptById[r.appointment_id]?.title,
    scheduled_at: apptById[r.appointment_id]?.scheduled_at,
  }));
  res.json(out);
});

// Get a single feedback request by token (for feedback form link; optional auth)
router.get("/feedback_requests/by_token/:token", optionalAuth, async (req, res) => {
  const reqDoc = await FeedbackRequest.findOne({ token: req.params.token, status: "pending" }).lean();
  if (!reqDoc) return res.status(404).json({ error: "Feedback request not found or already submitted" });
  const r = reqDoc as any;
  if (r.expires_at && new Date(r.expires_at) < new Date()) return res.status(410).json({ error: "Feedback request has expired" });
  const [doctorProfile, clinic, appt] = await Promise.all([
    Profile.findOne({ user_id: r.doctor_id }).select("full_name").lean(),
    r.clinic_id ? Clinic.findById(r.clinic_id).select("name").lean() : null,
    Appointment.findById(r.appointment_id).select("title scheduled_at").lean(),
  ]);
  res.json({
    id: r._id?.toString(),
    token: r.token,
    doctor_name: (doctorProfile as any)?.full_name || "Doctor",
    clinic_name: (clinic as any)?.name || null,
    appointment_title: (appt as any)?.title,
    scheduled_at: (appt as any)?.scheduled_at,
    has_clinic: !!r.clinic_id,
  });
});

// Patient: submit feedback (authenticated; multipart with optional video file)
router.post("/me/feedbacks", requireAuth, feedbackVideoUpload.single("video"), async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const body = req.body as Record<string, string | undefined>;
  const doctorRating = body.doctor_rating != null ? parseInt(String(body.doctor_rating), 10) : NaN;
  if (!Number.isFinite(doctorRating) || doctorRating < 1 || doctorRating > 5) {
    return res.status(400).json({ error: "doctor_rating required (1-5)" });
  }
  let reqDoc = null;
  if (body.feedback_request_id) {
    reqDoc = await FeedbackRequest.findOne({ _id: body.feedback_request_id, patient_user_id: userId }).lean();
  } else if (body.token) {
    reqDoc = await FeedbackRequest.findOne({ token: body.token, patient_user_id: userId }).lean();
  }
  if (!reqDoc) return res.status(404).json({ error: "Feedback request not found or not yours" });
  const r = reqDoc as any;
  if (r.status !== "pending") return res.status(400).json({ error: "Feedback already submitted" });
  if (r.expires_at && new Date(r.expires_at) < new Date()) return res.status(410).json({ error: "Feedback request has expired" });
  const file = (req as any).file;
  const videoPath = file ? `feedback_videos/${file.filename}` : undefined;
  const clinicRating = body.clinic_rating != null && body.clinic_rating !== "" ? parseInt(String(body.clinic_rating), 10) : undefined;
  const doc = await Feedback.create({
    appointment_id: r.appointment_id,
    clinic_id: r.clinic_id || undefined,
    doctor_id: r.doctor_id,
    doctor_rating: doctorRating,
    clinic_rating: Number.isFinite(clinicRating) ? clinicRating : undefined,
    feedback_request_id: r._id.toString(),
    patient_id: r.patient_id,
    review_text: (body.review_text && String(body.review_text).trim()) || undefined,
    video_url: undefined,
    video_path: videoPath,
    consent_to_publish: body.consent_to_publish === "true" || body.consent_to_publish === "1",
    is_testimonial: body.is_testimonial === "true" || body.is_testimonial === "1",
  });
  await FeedbackRequest.updateOne({ _id: r._id }, { status: "submitted", submitted_at: new Date() });
  res.status(201).json(doc.toJSON());
});

// ---------- Feedbacks ----------
// Doctor: feedbacks for my practice. Clinic: feedbacks for clinic_id (when user can act for clinic).
// When clinic_id is requested, include feedbacks that have that clinic_id OR feedbacks with no clinic_id where the doctor is a member of the clinic.
router.get("/feedbacks", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const q = req.query as { clinic_id?: string; is_testimonial?: string; doctor_id?: string };
  const filter: Record<string, unknown> = {};
  if (q.clinic_id) {
    const ok = await canActForClinic(userId, q.clinic_id);
    if (!ok) return res.status(403).json({ error: "Not allowed to view this clinic's feedback" });
    const clinicDoctorIds = await ClinicMember.find({ clinic_id: q.clinic_id }).distinct("user_id");
    filter.$or = [
      { clinic_id: q.clinic_id },
      { doctor_id: { $in: clinicDoctorIds }, $or: [{ clinic_id: null }, { clinic_id: "" }, { clinic_id: { $exists: false } }] },
    ];
  } else if (q.doctor_id) {
    // Only allow if current user is that doctor or can act for a clinic that includes that doctor
    if (q.doctor_id !== userId) {
      const clinicId = await getClinicIdForUser(userId);
      if (clinicId) {
        const member = await ClinicMember.findOne({ clinic_id: clinicId, user_id: q.doctor_id }).lean();
        if (!member) return res.status(403).json({ error: "Not allowed" });
      } else return res.status(403).json({ error: "Not allowed" });
    }
    filter.doctor_id = q.doctor_id;
  } else {
    filter.doctor_id = userId;
  }
  if (q.is_testimonial === "true") filter.is_testimonial = true;
  const list = await Feedback.find(filter).sort({ created_at: -1 }).lean();
  const withNames = list as any[];
  if (withNames.length > 0) {
    const doctorIds = [...new Set(withNames.map((d) => d.doctor_id))];
    const profiles = await Profile.find({ user_id: { $in: doctorIds } }).select("user_id full_name").lean();
    const nameByDoctor: Record<string, string> = {};
    for (const p of profiles as { user_id: string; full_name?: string }[]) nameByDoctor[p.user_id] = p.full_name || "Doctor";
    const out = withNames.map((d) => ({
      ...d,
      id: d._id?.toString(),
      _id: undefined,
      __v: undefined,
      doctor_name: nameByDoctor[d.doctor_id] || "Doctor",
    }));
    return res.json(out);
  }
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

// Serve uploaded feedback video (doctor or clinic with access)
router.get("/feedbacks/:id/video", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const fb = await Feedback.findById(req.params.id).lean();
  if (!fb || !(fb as any).video_path) return res.status(404).json({ error: "Not found" });
  const f = fb as any;
  let allowed = f.doctor_id === userId;
  if (!allowed && f.clinic_id) {
    allowed = await canActForClinic(userId, f.clinic_id);
  }
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  const filePath = path.join(UPLOAD_DIR, f.video_path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
  res.sendFile(filePath, { headers: { "Content-Disposition": "inline" } });
});

router.post("/feedbacks", requireAuth, async (req, res) => {
  const doc = await Feedback.create(req.body);
  res.status(201).json(doc.toJSON());
});

// ---------- Food logs ----------
router.get("/food_logs", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const q = req.query as { patient_id?: string; count?: string };
  let filter: Record<string, string> = { doctor_id: userId };
  if (q.patient_id) {
    const canAccess = await doctorCanAccessPatient(userId, q.patient_id);
    if (!canAccess) return res.status(404).json({ error: "Patient not found" });
    filter = { patient_id: q.patient_id };
  }
  if (q.count === "true" || q.count === "1") {
    const count = await FoodLog.countDocuments(filter);
    return res.json({ count });
  }
  const list = await FoodLog.find(filter).sort({ logged_at: -1 }).limit(LIMITS.FOOD_LOGS_MAX).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/food_logs", requireAuth, async (req, res) => {
  const body = { ...req.body, doctor_id: (req as AuthRequest).user.id };
  const doc = await FoodLog.create(body);
  res.status(201).json(doc.toJSON());
});

// ---------- Lab results ----------
router.get("/lab_results", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const q = req.query as { patient_id?: string; count?: string };
  let filter: Record<string, string> = { doctor_id: userId };
  if (q.patient_id) {
    const canAccess = await doctorCanAccessPatient(userId, q.patient_id);
    if (!canAccess) return res.status(404).json({ error: "Patient not found" });
    filter = { patient_id: q.patient_id };
  }
  if (q.count === "true" || q.count === "1") {
    const count = await LabResult.countDocuments(filter);
    return res.json({ count });
  }
  const list = await LabResult.find(filter).sort({ tested_at: -1 }).limit(LIMITS.LAB_RESULTS_MAX).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/lab_results/upload-report", requireAuth, upload.single("file"), async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: "Lab report AI is not configured (GEMINI_API_KEY)" });
  const file = (req as any).file;
  const patientId = req.body?.patient_id;
  if (!file || !patientId) return res.status(400).json({ error: "file and patient_id required" });
  const userId = (req as AuthRequest).user.id;
  const canAccess = await doctorCanAccessPatient(userId, patientId);
  if (!canAccess) return res.status(404).json({ error: "Patient not found" });
  const mime = (file.mimetype || "").toLowerCase();
  const isPdf = mime === "application/pdf";
  const isImage = mime.startsWith("image/");
  if (!isImage && !isPdf) return res.status(400).json({ error: "Only image (JPEG, PNG, WebP) or PDF files are supported" });
  try {
    const buf = fs.readFileSync(path.join(UPLOAD_DIR, file.filename));
    const extracted = isPdf
      ? await extractLabResultsFromPdf(GEMINI_API_KEY, buf, file.originalname || file.filename)
      : await extractLabResultsFromImage(GEMINI_API_KEY, buf.toString("base64"), mime);
    if (!extracted.results?.length) return res.status(422).json({ error: "No lab values could be read from the file. Try a clearer image or PDF." });
    const analysis = await analyzeLabResultsForReport(GEMINI_API_KEY, extracted.results);
    const testedAt = extracted.tested_at ? new Date(extracted.tested_at) : new Date();
    const reportDoc = await LabReport.create({
      patient_id: patientId,
      doctor_id: userId,
      uploaded_by: userId,
      file_name: file.originalname || file.filename,
      file_path: file.filename,
      file_type: mime,
      tested_at: testedAt,
      ai_summary: analysis.ai_summary || null,
      layman_summary: analysis.layman_summary || null,
      extracted_data: (analysis.key_points?.length || analysis.charts?.length) ? { key_points: analysis.key_points, charts: analysis.charts } : null,
    });
    const reportId = reportDoc._id;
    const resultsToCreate = extracted.results.map((r: { test_name: string; result_value: string; unit?: string; reference_range?: string; status?: string }) => ({
      patient_id: patientId,
      doctor_id: userId,
      lab_report_id: reportId,
      test_name: String(r.test_name || "").trim() || "Unknown",
      result_value: String(r.result_value || "").trim(),
      unit: r.unit ? String(r.unit).trim() : null,
      reference_range: r.reference_range ? String(r.reference_range).trim() : null,
      status: r.status === "critical" ? "critical" : r.status === "abnormal" ? "abnormal" : "normal",
      tested_at: testedAt,
    }));
    const created = await LabResult.insertMany(resultsToCreate);
    const reportOut = { ...reportDoc.toObject(), id: reportDoc._id?.toString(), _id: undefined, __v: undefined };
    const resultsOut = created.map((d: any) => ({ ...d.toObject(), id: d._id?.toString(), _id: undefined, __v: undefined, lab_report_id: reportId?.toString() }));
    return res.status(201).json({ report: reportOut, results: resultsOut });
  } catch (e) {
    const err = e as Error;
    return res.status(500).json({ error: err.message || "Lab report processing failed" });
  }
});

router.get("/lab_reports", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const q = req.query as { patient_id?: string };
  if (!q.patient_id) return res.status(400).json({ error: "patient_id required" });
  const canAccess = await doctorCanAccessPatient(userId, q.patient_id);
  if (!canAccess) return res.status(404).json({ error: "Patient not found" });
  const list = await LabReport.find({ patient_id: q.patient_id }).sort({ tested_at: -1 }).limit(50).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.get("/lab_reports/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const report = await LabReport.findById(req.params.id).lean();
  if (!report) return res.status(404).json({ error: "Not found" });
  const r = report as any;
  const canAccess = await doctorCanAccessPatient(userId, r.patient_id);
  if (!canAccess) return res.status(404).json({ error: "Not found" });
  const results = await LabResult.find({ lab_report_id: r._id }).sort({ test_name: 1 }).lean();
  res.json({
    report: { ...r, id: r._id?.toString(), _id: undefined, __v: undefined },
    results: results.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })),
  });
});

router.post("/lab_results", requireAuth, async (req, res) => {
  const body = { ...req.body, doctor_id: (req as AuthRequest).user.id };
  if (!body.tested_at) body.tested_at = new Date();
  const doc = await LabResult.create(body);
  res.status(201).json(doc.toJSON());
});

// ---------- Link requests ----------
router.get("/link_requests", requireAuth, async (req, res) => {
  const list = await LinkRequest.find({ doctor_id: (req as AuthRequest).user.id }).sort({ created_at: -1 }).limit(LIMITS.LINK_REQUESTS_MAX).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/link_requests", requireAuth, async (req, res) => {
  const body = { ...req.body, doctor_id: (req as AuthRequest).user.id };
  const doc = await LinkRequest.create(body);
  res.status(201).json(doc.toJSON());
});

router.patch("/link_requests/:id", requireAuth, async (req, res) => {
  const doctorId = (req as AuthRequest).user.id;
  const request = await LinkRequest.findOne({ _id: req.params.id, doctor_id: doctorId }).lean();
  if (!request) return res.status(404).json({ error: "Not found" });
  const body = req.body as { status?: string; linked_patient_id?: string; resolved_at?: string };
  if (body.status === "approved") {
    const patientUserId = (request as any).patient_user_id;
    let linkedPatientId = body.linked_patient_id;
    const existingPatient = await Patient.findOne({ patient_user_id: patientUserId }).select("_id full_name phone").lean();
    if (linkedPatientId) {
      const patientDoc = await Patient.findOne({ _id: linkedPatientId, doctor_id: doctorId });
      if (patientDoc && !patientDoc.patient_user_id) {
        (patientDoc as any).patient_user_id = patientUserId;
        await patientDoc.save();
      } else if (!patientDoc) {
        // linked_patient_id is not a record under this doctor; create one so /me/doctors and booking work
        const created = await Patient.create({
          doctor_id: doctorId,
          patient_user_id: patientUserId,
          full_name: (existingPatient as any)?.full_name || (request as any).patient_name || "Patient",
          phone: (existingPatient as any)?.phone || " ",
          status: "active",
        });
        linkedPatientId = created._id.toString();
      }
    } else {
      // No linked_patient_id: create a Patient record under this doctor (don't reuse patient's self-record)
      const created = await Patient.create({
        doctor_id: doctorId,
        patient_user_id: patientUserId,
        full_name: (existingPatient as any)?.full_name || (request as any).patient_name || "Patient",
        phone: (existingPatient as any)?.phone || " ",
        status: "active",
      });
      linkedPatientId = created._id.toString();
    }
    const doctorProfile = await Profile.findOne({ user_id: doctorId }).select("full_name").lean();
    const existingLink = await PatientDoctorLink.findOne({ doctor_user_id: doctorId, patient_user_id: patientUserId }).lean();
    if (!existingLink) {
      await PatientDoctorLink.create({
        doctor_user_id: doctorId,
        patient_user_id: patientUserId,
        doctor_name: (doctorProfile as any)?.full_name || "Doctor",
        status: "active",
        responded_at: new Date(),
      });
    }
    body.linked_patient_id = linkedPatientId;
    if (!body.resolved_at) body.resolved_at = new Date().toISOString();
  }
  const updated = await LinkRequest.findOneAndUpdate(
    { _id: req.params.id, doctor_id: doctorId },
    body,
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, id: updated._id?.toString(), _id: undefined, __v: undefined });
});

// ---------- Notifications ----------
router.get("/notifications", requireAuth, async (req, res) => {
  const list = await Notification.find({ user_id: (req as AuthRequest).user.id }).sort({ created_at: -1 }).limit(LIMITS.NOTIFICATIONS_MAX).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.patch("/notifications/:id", requireAuth, async (req, res) => {
  const updated = await Notification.findOneAndUpdate(
    { _id: req.params.id, user_id: (req as AuthRequest).user.id },
    req.body,
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, id: updated._id?.toString(), _id: undefined, __v: undefined });
});

router.patch("/notifications/read-all", requireAuth, async (req, res) => {
  await Notification.updateMany({ user_id: (req as AuthRequest).user.id, is_read: false }, { is_read: true });
  res.json({ ok: true });
});

// ---------- Patient doctor links ----------
router.get("/patient_doctor_links", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const q = req.query as { patient_user_id?: string; doctor_id?: string };
  const filter: Record<string, string> = {};
  if (q.doctor_id) filter.doctor_user_id = q.doctor_id;
  if (q.patient_user_id) {
    if (q.patient_user_id !== userId) return res.status(403).json({ error: "Forbidden" });
    filter.patient_user_id = q.patient_user_id;
  }
  const list = await PatientDoctorLink.find(filter).limit(500).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/patient_doctor_links", requireAuth, async (req, res) => {
  const body = { ...req.body };
  if (body.status == null || body.status === "") body.status = "pending";
  const doc = await PatientDoctorLink.create(body);
  res.status(201).json(doc.toJSON());
});

router.patch("/patient_doctor_links/:id", requireAuth, async (req, res) => {
  const updated = await PatientDoctorLink.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, id: updated._id?.toString(), _id: undefined, __v: undefined });
});

// ---------- Patient vault codes ----------
router.get("/patient_vault_codes", requireAuth, async (req, res) => {
  const q = req.query as { patient_user_id?: string; vault_code?: string };
  const filter: Record<string, string | unknown> = {};
  if (q.patient_user_id) filter.patient_user_id = q.patient_user_id;
  if (q.vault_code) {
    filter.vault_code = String(q.vault_code).trim().toUpperCase();
    filter.is_active = true;
  }
  const list = await PatientVaultCode.find(filter).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

function generateVaultCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

router.post("/patient_vault_codes", requireAuth, async (req, res) => {
  const body = { ...req.body };
  if (!body.vault_code) body.vault_code = generateVaultCode();
  const doc = await PatientVaultCode.create(body);
  res.status(201).json(doc.toJSON());
});

router.patch("/patient_vault_codes/:id", requireAuth, async (req, res) => {
  const doc = await PatientVaultCode.findOne({ _id: req.params.id }).lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  if ((doc as any).patient_user_id !== (req as AuthRequest).user.id) return res.status(403).json({ error: "Forbidden" });
  const updated = await PatientVaultCode.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  res.json({ ...updated, id: (updated as any)._id?.toString(), _id: undefined, __v: undefined });
});

// ---------- Patient documents ----------
router.get("/patient_documents", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const q = req.query as { patient_id?: string; count?: string };
  let filter: Record<string, string> = { doctor_id: userId };
  if (q.patient_id) {
    const canAccess = await doctorCanAccessPatient(userId, q.patient_id);
    if (!canAccess) return res.status(404).json({ error: "Patient not found" });
    filter = { patient_id: q.patient_id };
  }
  if (q.count === "true" || q.count === "1") {
    const count = await PatientDocument.countDocuments(filter);
    return res.json({ count });
  }
  const list = await PatientDocument.find(filter).sort({ created_at: -1 }).limit(LIMITS.DOCUMENTS_MAX).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/patient_documents", requireAuth, async (req, res) => {
  const body = { ...req.body, doctor_id: (req as AuthRequest).user.id };
  const doc = await PatientDocument.create(body);
  res.status(201).json(doc.toJSON());
});

router.get("/patient_documents/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const doc = await PatientDocument.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  const d = doc as any;
  const canAccess = await doctorCanAccessPatient(userId, d.patient_id);
  if (!canAccess) return res.status(404).json({ error: "Not found" });
  res.json({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined });
});

router.post("/patient_documents/upload-and-analyze", requireAuth, upload.single("file"), async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: "Document analysis is not configured (GEMINI_API_KEY)" });
  const file = (req as any).file;
  const { patient_id, category, notes } = req.body;
  if (!file || !patient_id) return res.status(400).json({ error: "file and patient_id required" });
  const userId = (req as AuthRequest).user.id;
  const canAccess = await doctorCanAccessPatient(userId, patient_id);
  if (!canAccess) return res.status(404).json({ error: "Patient not found" });
  const patient = await Patient.findOne({ _id: patient_id }).select("doctor_id").lean();
  const doctorId = (patient as any).doctor_id;
  const mime = (file.mimetype || "").toLowerCase();
  const isPdf = mime === "application/pdf";
  const isImage = mime.startsWith("image/");
  if (!isImage && !isPdf) return res.status(400).json({ error: "Only image (JPEG, PNG, WebP) or PDF are supported" });
  try {
    const buf = fs.readFileSync(path.join(UPLOAD_DIR, file.filename));
    const analysis = isPdf
      ? await analyzeDocumentWithGemini(GEMINI_API_KEY, { type: "pdf", buffer: buf, fileName: file.originalname || file.filename })
      : await analyzeDocumentWithGemini(GEMINI_API_KEY, { type: "image", base64: buf.toString("base64"), mimeType: mime });
    const extractedData: Record<string, unknown> = { key_points: analysis.key_points };
    if (analysis.chart_data) extractedData.chart_data = analysis.chart_data;
    if (analysis.prescription_summary) extractedData.prescription_summary = analysis.prescription_summary;
    if (analysis.medications?.length) extractedData.medications = analysis.medications;
    const doc = await PatientDocument.create({
      patient_id,
      doctor_id: doctorId,
      uploaded_by: userId,
      file_name: file.originalname || file.filename,
      file_path: file.filename,
      file_size_bytes: file.size,
      file_type: mime,
      category: category || "general",
      notes: notes || null,
      ai_summary: analysis.summary || null,
      layman_summary: analysis.layman_summary || null,
      extracted_data: extractedData,
      analyzed_at: new Date(),
    });
    res.status(201).json(doc.toJSON());
  } catch {
    const doc = await PatientDocument.create({
      patient_id,
      doctor_id: doctorId,
      uploaded_by: userId,
      file_name: file.originalname || file.filename,
      file_path: file.filename,
      file_size_bytes: file.size,
      file_type: mime,
      category: category || "general",
      notes: notes || null,
    });
    res.status(201).json(doc.toJSON());
  }
});

router.post("/patient_documents/upload", requireAuth, upload.single("file"), async (req, res) => {
  const file = (req as any).file;
  const { patient_id, category, notes } = req.body;
  if (!file || !patient_id) return res.status(400).json({ error: "file and patient_id required" });
  const patient = await Patient.findOne({ _id: patient_id }).select("doctor_id").lean();
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  const doctorId = (patient as any).doctor_id;
  const file_path = file.filename;
  const doc = await PatientDocument.create({
    patient_id,
    doctor_id: doctorId,
    uploaded_by: (req as AuthRequest).user.id,
    file_name: file.originalname || file_path,
    file_path,
    file_size_bytes: file.size,
    file_type: file.mimetype,
    category: category || "general",
    notes: notes || null,
  });
  res.status(201).json(doc.toJSON());
});

router.get("/patient_documents/:id/file", requireAuth, async (req, res) => {
  const doc = await PatientDocument.findOne({ _id: req.params.id }).lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  const d = doc as any;
  const userId = (req as AuthRequest).user.id;
  const patient = await Patient.findOne({ _id: d.patient_id }).select("doctor_id patient_user_id").lean();
  if (!patient) return res.status(404).json({ error: "Not found" });
  const p = patient as { doctor_id: string; patient_user_id?: string };
  let canAccess = d.doctor_id === userId || p.patient_user_id === userId;
  if (!canAccess && p.patient_user_id) {
    const link = await PatientDoctorLink.findOne({ doctor_user_id: userId, patient_user_id: p.patient_user_id, status: "active" }).lean();
    canAccess = !!link;
  }
  if (!canAccess) return res.status(403).json({ error: "Forbidden" });
  const filePath = path.join(UPLOAD_DIR, d.file_path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
  res.sendFile(filePath, { headers: { "Content-Disposition": `inline; filename="${encodeURIComponent(d.file_name)}"` } });
});

router.delete("/patient_documents/:id", requireAuth, async (req, res) => {
  const deleted = await PatientDocument.findOneAndDelete({ _id: req.params.id, doctor_id: (req as AuthRequest).user.id });
  if (!deleted) return res.status(404).json({ error: "Not found" });
  const filePath = path.join(UPLOAD_DIR, (deleted as any).file_path);
  if (fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  res.status(204).send();
});

// ---------- Patients ----------
// More specific routes first so /patients/:id/medication-logs and /patients/:id are matched correctly
/** Doctor: list medication logs for a patient (adherence). Paginated for scale. */
router.get("/patients/:id/medication-logs", requireAuth, async (req, res) => {
  const patientId = req.params.id;
  const doctorId = (req as AuthRequest).user.id;
  if (!patientId) return res.status(404).json({ error: "Not found" });
  const canAccess = await doctorCanAccessPatient(doctorId, patientId);
  if (!canAccess) return res.status(404).json({ error: "Not found" });
  const q = req.query as { count?: string; limit?: string; skip?: string };
  if (q.count === "true" || q.count === "1") {
    const count = await MedicationLog.countDocuments({ patient_id: patientId });
    return res.json({ count });
  }
  const limit = Math.min(Math.max(parseInt(String(q.limit || "20"), 10) || 20, 1), 100);
  const skip = Math.max(parseInt(String(q.skip || "0"), 10) || 0, 0);
  const [list, total] = await Promise.all([
    MedicationLog.find({ patient_id: patientId })
      .sort({ logged_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MedicationLog.countDocuments({ patient_id: patientId }),
  ]);
  const items = list.map((d: any) => ({
    id: d._id?.toString(),
    logged_at: d.logged_at,
    taken: d.taken,
    time_of_day: d.time_of_day,
    medication_name: d.medication_name,
    source: d.source,
  }));
  res.json({ items, total });
});

router.get("/patients/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  const userId = (req as AuthRequest).user.id;
  if (!id) return res.status(404).json({ error: "Not found" });
  const one = await Patient.findById(id).lean();
  if (!one) return res.status(404).json({ error: "Not found" });
  const patientUserId = (one as any).patient_user_id;
  const isOwner = (one as any).doctor_id === userId;
  const hasLink = patientUserId
    ? await PatientDoctorLink.findOne({ doctor_user_id: userId, patient_user_id: patientUserId, status: "active" }).lean()
    : false;
  if (!isOwner && !hasLink) return res.status(404).json({ error: "Not found" });
  const out = { ...one, id: (one as any)._id?.toString(), _id: undefined, __v: undefined };
  res.json(out);
});

router.get("/patients", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const q = req.query as { doctor_id?: string; patient_user_id?: string; count?: string; status?: string; clinic_id?: string; limit?: string; skip?: string };
  type PatientFilter = Record<string, string | { $in: string[] } | Array<{ doctor_id: string } | { patient_user_id: { $in: string[] } }>>;
  let filter: PatientFilter = {};
  const asClinicId = await getClinicIdForUser(userId);
  const clinicId = q.clinic_id || (asClinicId ? asClinicId : null);
  if (clinicId) {
    const ok = await canActForClinic(userId, clinicId);
    if (!ok) return res.status(403).json({ error: "Not allowed" });
    const members = await ClinicMember.find({ clinic_id: clinicId }).select("user_id").lean();
    const doctorIds = [...new Set((members as { user_id: string }[]).map((m) => m.user_id))];
    if (doctorIds.length === 0) return res.json([]);
    filter.doctor_id = { $in: doctorIds };
  } else {
    const links = await PatientDoctorLink.find({ doctor_user_id: userId, status: "active" }).select("patient_user_id").lean();
    const linkedPatientUserIds = [...new Set((links as { patient_user_id: string }[]).map((l) => l.patient_user_id))];
    if (linkedPatientUserIds.length > 0) {
      filter.$or = [{ doctor_id: userId }, { patient_user_id: { $in: linkedPatientUserIds } }];
    } else {
      filter.doctor_id = userId;
    }
  }
  if (q.patient_user_id) filter.patient_user_id = q.patient_user_id;
  if (q.status) filter.status = q.status;
  if (q.count === "true" || q.count === "1") {
    const count = await Patient.countDocuments(filter);
    return res.json({ count });
  }
  const limit = parseLimit(q.limit, LIMITS.PATIENTS_DEFAULT, LIMITS.PATIENTS_MAX);
  const skip = parseSkip(q.skip);
  const [list, total] = await Promise.all([
    Patient.find(filter).sort({ full_name: 1 }).skip(skip).limit(limit).lean(),
    Patient.countDocuments(filter),
  ]);
  const mapped = list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined }));
  res.json({ items: mapped, total });
});

router.post("/patients", requireAuth, async (req, res) => {
  const body = { ...req.body, doctor_id: (req as AuthRequest).user.id };
  const doc = await Patient.create(body);
  res.status(201).json(doc.toJSON());
});

const MAX_BULK_PATIENTS = 500;
router.post("/patients/bulk", requireAuth, async (req, res) => {
  const body = Array.isArray(req.body) ? req.body : [];
  if (body.length > MAX_BULK_PATIENTS) {
    return res.status(400).json({ error: `Maximum ${MAX_BULK_PATIENTS} patients per bulk import. Split into smaller batches.` });
  }
  const doctorId = (req as AuthRequest).user.id;
  const docs = await Patient.insertMany(body.map((p: Record<string, unknown>) => ({ ...p, doctor_id: doctorId })));
  res.status(201).json(docs.map((d) => d.toJSON()));
});

router.patch("/patients/:id", requireAuth, async (req, res) => {
  const updated = await Patient.findOneAndUpdate(
    { _id: req.params.id, doctor_id: (req as AuthRequest).user.id },
    req.body,
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, id: updated._id?.toString(), _id: undefined, __v: undefined });
});

// ---------- Profiles ----------
router.get("/profiles", requireAuth, async (req, res) => {
  const q = req.query as { user_id?: string; doctor_code?: string };
  const filter: Record<string, string> = {};
  if (q.user_id) filter.user_id = q.user_id;
  if (q.doctor_code != null && q.doctor_code !== "") filter.doctor_code = String(q.doctor_code).toUpperCase();
  const list = await Profile.find(filter).limit(500).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.get("/profiles/me", requireAuth, async (req, res) => {
  const one = await Profile.findOne({ user_id: (req as AuthRequest).user.id }).lean();
  if (!one) return res.status(404).json({ error: "Not found" });
  res.json({ ...one, id: one._id?.toString(), _id: undefined, __v: undefined });
});

router.post("/profiles", requireAuth, async (req, res) => {
  const doc = await Profile.create(req.body);
  res.status(201).json(doc.toJSON());
});

router.patch("/profiles/:id", requireAuth, async (req, res) => {
  const updated = await Profile.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, id: updated._id?.toString(), _id: undefined, __v: undefined });
});

// ---------- Programs ----------
router.get("/programs", requireAuth, async (req, res) => {
  const q = req.query as { doctor_id?: string; is_active?: string };
  const filter: Record<string, unknown> = { doctor_id: (req as AuthRequest).user.id };
  if (q.is_active === "true") filter.is_active = true;
  const list = await Program.find(filter).sort({ name: 1 }).limit(200).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/programs", requireAuth, async (req, res) => {
  const body = { ...req.body, doctor_id: (req as AuthRequest).user.id };
  const doc = await Program.create(body);
  res.status(201).json(doc.toJSON());
});

router.patch("/programs/:id", requireAuth, async (req, res) => {
  const updated = await Program.findOneAndUpdate(
    { _id: req.params.id, doctor_id: (req as AuthRequest).user.id },
    req.body,
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, id: updated._id?.toString(), _id: undefined, __v: undefined });
});

// ---------- User roles ----------
router.get("/user_roles", requireAuth, async (req, res) => {
  const q = req.query as { user_id?: string };
  const filter = q.user_id ? { user_id: q.user_id } : {};
  const list = await UserRole.find(filter).limit(500).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/user_roles", requireAuth, async (req, res) => {
  const doc = await UserRole.create(req.body);
  res.status(201).json(doc.toJSON());
});

// ---------- Vitals ----------
router.get("/vitals", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const q = req.query as { patient_id?: string; count?: string };
  let filter: Record<string, string> = { doctor_id: userId };
  if (q.patient_id) {
    const canAccess = await doctorCanAccessPatient(userId, q.patient_id);
    if (!canAccess) return res.status(404).json({ error: "Patient not found" });
    filter = { patient_id: q.patient_id };
  }
  if (q.count === "true" || q.count === "1") {
    const count = await Vital.countDocuments(filter);
    return res.json({ count });
  }
  const list = await Vital.find(filter).sort({ recorded_at: -1 }).limit(LIMITS.VITALS_MAX).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/vitals/bulk", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const { patient_id: patientId, vitals: vitalsList } = req.body as { patient_id?: string; vitals?: Array<Record<string, unknown>> };
  if (!patientId || !Array.isArray(vitalsList) || vitalsList.length === 0) {
    return res.status(400).json({ error: "patient_id and non-empty vitals array required" });
  }
  const canAccess = await doctorCanAccessPatient(userId, patientId);
  if (!canAccess) return res.status(404).json({ error: "Patient not found" });
  const valid: Array<Record<string, unknown>> = [];
  for (const v of vitalsList) {
    const vital_type = v.vital_type != null ? String(v.vital_type) : "";
    const value_text = v.value_text != null ? String(v.value_text).trim() : "";
    if (!vital_type || !value_text) continue;
    valid.push({
      patient_id: patientId,
      doctor_id: userId,
      vital_type,
      value_text,
      value_numeric: v.value_numeric != null && Number.isFinite(Number(v.value_numeric)) ? Number(v.value_numeric) : null,
      unit: v.unit != null ? String(v.unit).trim() || null : null,
      notes: v.notes != null ? String(v.notes).trim() || null : null,
      recorded_at: v.recorded_at ? new Date(v.recorded_at as string) : undefined,
    });
  }
  if (valid.length === 0) return res.status(400).json({ error: "No valid vitals (need vital_type and value_text per row)" });
  const created = await Vital.insertMany(valid);
  return res.status(201).json({ created: created.length, ids: created.map((d: any) => d._id?.toString()) });
});

router.post("/vitals", requireAuth, async (req, res) => {
  const body = { ...req.body, doctor_id: (req as AuthRequest).user.id };
  if (!body.notes || String(body.notes).trim() === "") {
    const remark = await getAiVitalRemark(body.vital_type, body.value_text, body.unit);
    if (remark) body.notes = remark;
  }
  const doc = await Vital.create(body);
  res.status(201).json(doc.toJSON());
});

// ---------- AI (Gemini) – replaces Supabase Edge Functions ----------
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const LAB_EXTRACTION_PROMPT = `You are a lab report OCR and data extraction expert. Analyze the lab report (blood test, pathology, etc.) and extract EVERY test result.
Return ONLY valid JSON with no markdown or code fences: { "tested_at": "YYYY-MM-DD" or null if not visible, "results": [ { "test_name": "e.g. Haemoglobin", "result_value": "e.g. 14.2", "unit": "e.g. g/dL", "reference_range": "e.g. 12-16", "status": "normal" or "abnormal" or "critical" } ] }
- Extract all rows/tests from the report. Use exact test names and values as shown.
- Infer status from reference range when possible: within range = normal, outside = abnormal, severely out = critical.
- If reference range is missing, use "normal". Always return valid JSON only.`;

type LabExtraction = { tested_at: string | null; results: Array<{ test_name: string; result_value: string; unit?: string; reference_range?: string; status?: string }> };

function parseLabExtractionResponse(content: string): LabExtraction {
  let raw = content.trim();
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) raw = codeBlock[1].trim();
  const firstBrace = raw.indexOf("{");
  if (firstBrace >= 0) raw = raw.slice(firstBrace);
  // Fix common LLM JSON issues: trailing commas before ] or }
  let toParse = raw.replace(/,(\s*[}\]])/g, "$1");
  try {
    const parsed = JSON.parse(toParse);
    return {
      tested_at: parsed.tested_at ?? null,
      results: Array.isArray(parsed.results) ? parsed.results : [],
    };
  } catch {
    // Try to extract just the results array; use bracket counting that respects strings
    const resultsMatch = raw.match(/"results"\s*:\s*\[/);
    if (resultsMatch) {
      const startIdx = raw.indexOf(resultsMatch[0]) + resultsMatch[0].length - 1; // index of [
      let depth = 0;
      let inString = false;
      let escape = false;
      let quote = "";
      let endIdx = startIdx;
      for (let i = startIdx; i < raw.length; i++) {
        const c = raw[i];
        if (inString) {
          if (escape) { escape = false; continue; }
          if (c === "\\") { escape = true; continue; }
          if (c === quote) { inString = false; continue; }
          continue;
        }
        if (c === '"' || c === "'") { inString = true; quote = c; continue; }
        if (c === "[" || c === "{") depth++;
        else if (c === "]" || c === "}") { depth--; if (depth === 0) { endIdx = i; break; } }
      }
      const arrayStr = raw.slice(startIdx, endIdx + 1);
      try {
        const repaired = arrayStr.replace(/,(\s*[}\]])/g, "$1");
        const arr = JSON.parse(repaired);
        return { tested_at: null, results: Array.isArray(arr) ? arr : [] };
      } catch {
        // Last resort: collect individual object-like blocks
        const results: LabExtraction["results"] = [];
        const objRegex = /\{\s*"test_name"\s*:\s*"([^"]*)"\s*,\s*"result_value"\s*:\s*"([^"]*)"(?:\s*,\s*"unit"\s*:\s*"([^"]*)")?(?:\s*,\s*"reference_range"\s*:\s*"([^"]*)")?(?:\s*,\s*"status"\s*:\s*"([^"]*)")?\s*\}/g;
        let m;
        while ((m = objRegex.exec(raw)) !== null) {
          results.push({
            test_name: m[1] || "",
            result_value: m[2] || "",
            unit: m[3] || undefined,
            reference_range: m[4] || undefined,
            status: m[5] || "normal",
          });
        }
        return { tested_at: null, results };
      }
    }
  }
  return { tested_at: null, results: [] };
}

/** Upload a PDF to Gemini Files API (resumable) and return file URI. */
async function uploadPdfToGemini(apiKey: string, pdfBuffer: Buffer, displayName: string): Promise<{ fileUri: string; mimeType: string }> {
  const numBytes = pdfBuffer.length;
  const mimeType = "application/pdf";
  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(numBytes),
        "X-Goog-Upload-Header-Content-Type": mimeType,
      },
      body: JSON.stringify({ file: { display_name: displayName || "lab-report.pdf" } }),
    }
  );
  if (!startRes.ok) {
    const errText = await startRes.text();
    throw new Error(`Gemini file upload start failed: ${startRes.status} ${errText}`);
  }
  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("No x-goog-upload-url in response");
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(numBytes),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: new Uint8Array(pdfBuffer),
  });
  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Gemini file upload failed: ${uploadRes.status} ${errText}`);
  }
  const fileInfo = await uploadRes.json();
  const fileUri = (fileInfo as any).file?.uri;
  if (!fileUri) throw new Error("No file.uri in upload response");
  return { fileUri, mimeType };
}

async function extractLabResultsFromPdf(
  apiKey: string | undefined,
  pdfBuffer: Buffer,
  fileName: string
): Promise<{ tested_at: string | null; results: Array<{ test_name: string; result_value: string; unit?: string; reference_range?: string; status?: string }> }> {
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const { fileUri, mimeType } = await uploadPdfToGemini(apiKey, pdfBuffer, fileName || "lab-report.pdf");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: LAB_EXTRACTION_PROMPT }] },
        contents: [{
          role: "user",
          parts: [
            { file_data: { file_uri: fileUri, mime_type: mimeType } },
            { text: "Extract all lab test results from this PDF report. Return only the JSON." },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OCR request failed: ${res.status} ${errText}`);
  }
  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseLabExtractionResponse(content);
}

async function extractLabResultsFromImage(
  apiKey: string | undefined,
  imageBase64: string,
  mimeType: string
): Promise<{ tested_at: string | null; results: Array<{ test_name: string; result_value: string; unit?: string; reference_range?: string; status?: string }> }> {
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: LAB_EXTRACTION_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: "Extract all lab test results from this report image. Return only the JSON." }, { inlineData: { mimeType: mimeType, data: imageBase64 } }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      }),
    }
  );
  if (!res.ok) throw new Error("OCR request failed");
  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseLabExtractionResponse(content);
}

const LAB_ANALYSIS_PROMPT = `You are a clinical assistant. Given a list of lab results, provide:
1. ai_summary: 2-4 sentences in clinical/doctor terms (findings, trends, follow-up, differential considerations).
2. layman_summary: 3-5 sentences in very simple language for the patient (what the report means in plain words, what's normal, what to discuss with the doctor). No jargon.
3. key_points: array of 3-8 short bullet strings (e.g. "HDL within range", "Elevated LDL – discuss diet").
4. charts: array of chart objects so we can show MULTIPLE graphs. Group tests by category (e.g. Lipids, Glucose, CBC, Kidney, Liver, Thyroid, Electrolytes). Each chart: { "title": "Category name (e.g. Lipid Panel)", "type": "bar", "labels": ["short test name", ...], "datasets": [{ "label": "Result", "values": [number, ...] }] }. Use numeric values only; omit non-numeric tests from charts. Use short labels (abbreviations ok). Include 1-4 charts depending on how many logical groups exist.

Return ONLY valid JSON (no markdown):
{
  "ai_summary": "string",
  "layman_summary": "string",
  "key_points": ["string", "..."],
  "charts": [{ "title": "string", "type": "bar", "labels": ["..."], "datasets": [{ "label": "string", "values": [number, ...] }] }, ...]
}
Always valid JSON only.`;

function parseLabAnalysisResponse(content: string): {
  ai_summary: string;
  layman_summary: string;
  key_points: string[];
  charts: { title: string; type: string; labels: string[]; datasets: { label: string; values: number[] }[] }[];
} {
  let raw = content.trim();
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) raw = codeBlock[1].trim();
  const firstBrace = raw.indexOf("{");
  if (firstBrace >= 0) raw = raw.slice(firstBrace);
  const toParse = raw.replace(/,(\s*[}\]])/g, "$1");
  try {
    const parsed = JSON.parse(toParse);
    const charts = Array.isArray(parsed.charts)
      ? parsed.charts
          .filter((c: any) => c && c.title && Array.isArray(c.labels) && Array.isArray(c.datasets))
          .map((c: any) => ({
            title: String(c.title),
            type: c.type === "line" ? "line" : "bar",
            labels: c.labels.map((l: any) => String(l)),
            datasets: (c.datasets || []).map((d: any) => ({
              label: String(d.label || "Value"),
              values: Array.isArray(d.values) ? d.values.map((v: any) => Number(v)) : [],
            })),
          }))
      : [];
    return {
      ai_summary: parsed.ai_summary || "",
      layman_summary: parsed.layman_summary || "",
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points.map((p: any) => String(p)) : [],
      charts,
    };
  } catch {
    return { ai_summary: "", layman_summary: "", key_points: [], charts: [] };
  }
}

async function analyzeLabResultsForReport(
  apiKey: string | undefined,
  results: Array<{ test_name: string; result_value: string; unit?: string; reference_range?: string; status?: string }>
): Promise<{
  ai_summary: string;
  layman_summary: string;
  key_points: string[];
  charts: { title: string; type: string; labels: string[]; datasets: { label: string; values: number[] }[] }[];
}> {
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const text = results.map((r) => `${r.test_name}: ${r.result_value} ${r.unit || ""} (ref: ${r.reference_range || "—"}) [${r.status || "normal"}]`).join("\n");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: LAB_ANALYSIS_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: `Lab results:\n${text}\n\nReturn the JSON only (ai_summary, layman_summary, key_points, charts).` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
    }
  );
  if (!res.ok) throw new Error("Analysis request failed");
  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const parsed = parseLabAnalysisResponse(content);
  return {
    ai_summary: parsed.ai_summary || "No summary generated.",
    layman_summary: parsed.layman_summary || "Review the values in the table and discuss with your doctor if anything is marked abnormal.",
    key_points: parsed.key_points,
    charts: parsed.charts,
  };
}

const DOCUMENT_ANALYSIS_PROMPT = `You are a medical document analyst. Read and understand the FULL document (report, prescription, referral, imaging report, etc.) and extract the following.

For EVERY document return:
1. summary: Brief professional summary (2-4 sentences) for the doctor.
2. layman_summary: Simple explanation in plain language for the patient (2-4 sentences).
3. key_points: List of short strings (important findings, dates, names, facility).
4. chart_data: Only if the document has numeric data to visualize (e.g. lab-like values); otherwise omit. Format: { "labels": ["label1", "..."], "datasets": [{ "label": "Series name", "values": [number, ...] }] }.

If the document is a PRESCRIPTION or contains a list of medications, ALSO extract:
5. prescription_summary: A short patient-friendly summary of the prescription, e.g. "💊 *Your Prescription Summary*\\n\\n1. *MED NAME* - dosage, frequency, duration\\n2. ..." (one line per medication).
6. medications: Array of objects, one per medication. For each medication extract everything you can read from the document. Use empty string or empty array when not specified. Structure:
   {
     "medicine": "Full medicine name (include strength/form if visible, e.g. SOTRET NF 8MG CAP 10'S (ISOTRETINOIN))",
     "dosage": "Amount per dose (e.g. 1, 2 tabs, 5ml, Local)",
     "frequency": "How often (e.g. Once a day, Twice daily, Three times a day, Once)",
     "duration": "How long (e.g. 30 Days, 2 weeks, 5 days)",
     "instructions": "Special instructions (e.g. After meals, As directed, Before food)",
     "timing_display": "Time of day if mentioned (e.g. Morning, Night, Afternoon)",
     "suggested_time": "Suggested time in HH:MM 24h if inferrable (e.g. 08:00, 20:00), else empty string",
     "food_relation": "Relation to food (e.g. after food, before food, with food, any time)",
     "timings": ["08:00", "20:00"]  // array of time strings if multiple times per day; empty array if once daily or not specified
   }

Return ONLY valid JSON (no markdown). For non-prescription documents omit prescription_summary and medications or set medications to [].
Example with prescription:
{
  "summary": "Prescription for John Doe dated ...",
  "layman_summary": "Your doctor prescribed ...",
  "key_points": ["Patient: John Doe", "Date: ...", "Medications: ..."],
  "prescription_summary": "💊 *Your Prescription Summary*\\n\\n1. *MED A* - dosage, frequency, duration\\n2. *MED B* - ...",
  "medications": [
    { "medicine": "Full name (INGREDIENT)", "dosage": "1", "frequency": "Once a day", "duration": "30 Days", "instructions": "After meals", "timing_display": "Night", "suggested_time": "20:00", "food_relation": "after food", "timings": [] }
  ]
}
Always return valid JSON only.`;

type ExtractedMedication = {
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  timing_display: string;
  suggested_time: string;
  food_relation: string;
  timings: string[];
};

function parseDocumentAnalysisResponse(content: string): {
  summary: string;
  layman_summary: string;
  key_points: string[];
  chart_data?: { labels: string[]; datasets: { label: string; values: number[] }[] };
  prescription_summary?: string;
  medications?: ExtractedMedication[];
} {
  let raw = content.trim();
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) raw = codeBlock[1].trim();
  const firstBrace = raw.indexOf("{");
  if (firstBrace >= 0) raw = raw.slice(firstBrace);
  const toParse = raw.replace(/,(\s*[}\]])/g, "$1");
  try {
    const parsed = JSON.parse(toParse);
    const medications: ExtractedMedication[] = Array.isArray(parsed.medications)
      ? parsed.medications
          .filter((m: any) => m && (m.medicine || m.dosage))
          .map((m: any) => ({
            medicine: String(m.medicine ?? ""),
            dosage: String(m.dosage ?? ""),
            frequency: String(m.frequency ?? ""),
            duration: String(m.duration ?? ""),
            instructions: String(m.instructions ?? ""),
            timing_display: String(m.timing_display ?? ""),
            suggested_time: String(m.suggested_time ?? ""),
            food_relation: String(m.food_relation ?? ""),
            timings: Array.isArray(m.timings) ? m.timings.map((t: any) => String(t)) : [],
          }))
      : [];
    return {
      summary: parsed.summary || "",
      layman_summary: parsed.layman_summary || "",
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
      chart_data: parsed.chart_data && typeof parsed.chart_data === "object" ? parsed.chart_data : undefined,
      prescription_summary: typeof parsed.prescription_summary === "string" ? parsed.prescription_summary : undefined,
      medications: medications.length ? medications : undefined,
    };
  } catch {
    return { summary: "", layman_summary: "", key_points: [] };
  }
}

async function analyzeDocumentWithGemini(
  apiKey: string | undefined,
  opts: { type: "image"; base64: string; mimeType: string } | { type: "pdf"; buffer: Buffer; fileName: string }
): Promise<{
  summary: string;
  layman_summary: string;
  key_points: string[];
  chart_data?: { labels: string[]; datasets: { label: string; values: number[] }[] };
  prescription_summary?: string;
  medications?: ExtractedMedication[];
}> {
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const systemInstruction = { parts: [{ text: DOCUMENT_ANALYSIS_PROMPT }] };
  const generationConfig = { temperature: 0.2, maxOutputTokens: 8192 };
  let contents: { role: string; parts: unknown[] };

  if (opts.type === "pdf") {
    const { fileUri, mimeType } = await uploadPdfToGemini(apiKey, opts.buffer, opts.fileName || "document.pdf");
    contents = {
      role: "user",
      parts: [
        { file_data: { file_uri: fileUri, mime_type: mimeType } },
        { text: "Analyze this document and return the JSON only." },
      ],
    };
  } else {
    contents = {
      role: "user",
      parts: [
        { text: "Analyze this document and return the JSON only." },
        { inlineData: { mimeType: opts.mimeType, data: opts.base64 } },
      ],
    };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction, contents: [contents], generationConfig }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Document analysis failed: ${res.status} ${errText}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseDocumentAnalysisResponse(text);
}

router.post("/analyze-meal-image", requireAuth, async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
  const { image_base64: imageBase64, image_url: imageUrl, mime_type: mimeType } = req.body;
  let imageBase64Final = imageBase64;
  let mime = mimeType || "image/jpeg";
  if (imageUrl && !imageBase64Final) {
    try {
      const imgResp = await fetch(imageUrl as string);
      if (!imgResp.ok) throw new Error("Failed to fetch image");
      const buf = Buffer.from(await imgResp.arrayBuffer());
      imageBase64Final = buf.toString("base64");
      mime = (imgResp.headers.get("content-type") || "").split(";")[0] || "image/jpeg";
    } catch {
      return res.status(400).json({ error: "Could not fetch image from URL" });
    }
  }
  if (!imageBase64Final) return res.status(400).json({ error: "image_base64 or image_url required" });

  const systemPrompt = `You are a nutrition parser. Analyze the meal image and extract food items.
Return ONLY valid JSON: { "meal_type": "breakfast"|"lunch"|"dinner"|"snack"|"other", "food_items": [{ "name", "quantity", "unit", "calories", "protein", "carbs", "fat" }], "notes": "string" }
Infer meal_type from food type. For Indian foods use common serving sizes. Always return valid JSON only.`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: "Analyze this meal image. Return only the JSON." }, { inlineData: { mimeType: mime, data: imageBase64Final } }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      }),
    }
  );
  if (!geminiRes.ok) return res.status(500).json({ error: "AI analysis failed" });
  const aiResult = await geminiRes.json();
  const content = aiResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  let parsed: { meal_type?: string; food_items?: unknown[]; notes?: string };
  try {
    parsed = JSON.parse(jsonMatch[1]!.trim());
  } catch {
    return res.status(422).json({ error: "Could not parse food data", raw: content });
  }
  const items: { calories?: number; protein?: number; carbs?: number; fat?: number }[] = Array.isArray(parsed.food_items) ? (parsed.food_items as { calories?: number; protein?: number; carbs?: number; fat?: number }[]) : [];
  res.json({
    meal_type: parsed.meal_type || "other",
    food_items: items,
    notes: parsed.notes || null,
    total_calories: items.reduce((s, i) => s + (i.calories || 0), 0),
    total_protein: items.reduce((s, i) => s + (i.protein || 0), 0),
    total_carbs: items.reduce((s, i) => s + (i.carbs || 0), 0),
    total_fat: items.reduce((s, i) => s + (i.fat || 0), 0),
  });
});

/** Format medications for AI context: supports string[] or object[] (medicine, dosage, frequency_per_day, timings, etc.) */
function formatMedicationsForContext(medications: unknown): string {
  if (!medications || !Array.isArray(medications) || medications.length === 0) return "None recorded";
  return medications
    .map((m: any) => {
      if (typeof m === "string") return m;
      if (m && typeof m === "object" && m.medicine) {
        const parts = [m.medicine];
        if (m.dosage) parts.push(m.dosage);
        if (m.frequency_per_day) parts.push(`${m.frequency_per_day}x/day`);
        if (m.timings?.length) parts.push(`at ${m.timings.join(", ")}`);
        if (m.duration_days) parts.push(`for ${m.duration_days} days`);
        if (m.meal_instruction) parts.push(`(${m.meal_instruction})`);
        return parts.join(" — ");
      }
      return String(m);
    })
    .join("\n");
}

async function buildPatientContext(patientId: string, patient?: any) {
  const [vitals, labs, appointments, enrollments, docs] = await Promise.all([
    Vital.find({ patient_id: patientId }).sort({ recorded_at: -1 }).limit(20).lean(),
    LabResult.find({ patient_id: patientId }).sort({ tested_at: -1 }).limit(20).lean(),
    Appointment.find({ patient_id: patientId }).sort({ scheduled_at: -1 }).limit(10).lean(),
    Enrollment.find({ patient_id: patientId }).sort({ enrolled_at: -1 }).limit(10).lean(),
    PatientDocument.find({ patient_id: patientId }).sort({ created_at: -1 }).limit(10).lean(),
  ]);
  const parts: string[] = [];
  if (patient) {
    const medsText = formatMedicationsForContext(patient.medications);
    parts.push(
      `PATIENT PROFILE:\n- Name: ${patient.full_name || "Unknown"}\n- Age: ${patient.age ?? "Unknown"}\n- Gender: ${patient.gender ?? "Unknown"}\n- Conditions: ${(patient.conditions?.length && patient.conditions.join(", ")) || "None"}\n- Medications:\n${medsText === "None recorded" ? "  None recorded" : medsText.split("\n").map((line) => "  " + line).join("\n")}\n- Status: ${patient.status || "active"}`
    );
  }
  if (vitals.length) parts.push("RECENT VITALS:\n" + vitals.map((v: any) => `- ${v.vital_type}: ${v.value_text}${v.unit ? ` ${v.unit}` : ""} (${new Date(v.recorded_at).toLocaleDateString()})`).join("\n"));
  if (labs.length) parts.push("LAB RESULTS:\n" + labs.map((l: any) => `- ${l.test_name}: ${l.result_value} (${new Date(l.tested_at).toLocaleDateString()})`).join("\n"));
  if (appointments.length) parts.push("APPOINTMENTS:\n" + appointments.map((a: any) => `- ${a.title}: ${new Date(a.scheduled_at).toLocaleString()} (${a.status})`).join("\n"));
  if (enrollments.length) parts.push("PROGRAMS:\n" + enrollments.map((e: any) => `- Program ${e.program_id}: ${e.status}`).join("\n"));
  if (docs.length) parts.push("DOCUMENTS:\n" + docs.map((d: any) => `- ${d.file_name}`).join("\n"));
  return parts.join("\n\n");
}

router.post("/chat/patient", requireAuth, async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
  const { messages } = req.body;
  const userId = (req as AuthRequest).user.id;
  const patient = await Patient.findOne({ patient_user_id: userId }).lean();
  let contextParts = "";
  if (patient) {
    const pid = (patient as any)._id.toString();
    contextParts = await buildPatientContext(pid, patient);
  }
  const systemPrompt = `You are Mediimate AI — a caring health assistant for patients. You have access to the patient's health records below. You are NOT a doctor; recommend consulting their doctor for medical decisions. Be empathetic and concise.\n\n${contextParts || "No patient records found."}\n\nRespond in a friendly, professional tone.`;
  const geminiContents = (messages || []).map((m: { role: string; content: string }) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content || "" }] }));
  const streamRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: geminiContents }) }
  );
  if (!streamRes.ok) return res.status(500).json({ error: "AI service error" });
  res.setHeader("Content-Type", "text/event-stream");
  const reader = streamRes.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const data = JSON.parse(jsonStr);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
          } catch { /* skip */ }
        }
      }
    }
    res.write("data: [DONE]\n\n");
  } finally {
    res.end();
  }
});

router.post("/chat/doctor", requireAuth, async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
  const { messages, patient_id } = req.body;
  if (!patient_id) return res.status(400).json({ error: "patient_id required" });
  const userId = (req as AuthRequest).user.id;
  const patient = await Patient.findOne({ _id: patient_id, doctor_id: userId }).lean();
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  const pid = (patient as any)._id.toString();
  const contextParts = await buildPatientContext(pid, patient);
  const systemPrompt = `You are a clinical copilot for doctors. Patient records:\n\n${contextParts}\n\nBe precise and clinical.`;
  const geminiContents = (messages || []).map((m: { role: string; content: string }) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content || "" }] }));
  const streamRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: geminiContents }) }
  );
  if (!streamRes.ok) return res.status(500).json({ error: "AI service error" });
  res.setHeader("Content-Type", "text/event-stream");
  const reader = streamRes.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const data = JSON.parse(jsonStr);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
          } catch { /* skip */ }
        }
      }
    }
    res.write("data: [DONE]\n\n");
  } finally {
    res.end();
  }
});

// ---------- Voice Doctor: AI doctor persona chat (streaming) ----------
const DOCTOR_PERSONAS: Record<string, { name: string; style: string; gender: "female" | "male" }> = {
  dr_priya: {
    name: "Dr. Priya",
    gender: "female",
    style: "You are Dr. Priya, a warm, empathetic, and caring female doctor. You speak gently and encouragingly. You use simple language the patient can understand. You occasionally use Hindi phrases naturally (like 'theek hai', 'bahut accha') when appropriate.",
  },
  dr_abhay: {
    name: "Dr. Abhay",
    gender: "male",
    style: "You are Dr. Abhay, a calm, thorough, and reassuring male doctor. You are methodical in your questioning and give clear, confident advice. You use simple language and occasionally use Hindi phrases naturally when appropriate.",
  },
};

router.post("/chat/voice-doctor", requireAuth, async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
  const { messages, persona } = req.body;
  const personaKey = persona && DOCTOR_PERSONAS[persona] ? persona : "dr_priya";
  const doc = DOCTOR_PERSONAS[personaKey];
  const userId = (req as AuthRequest).user.id;
  const patient = await Patient.findOne({ patient_user_id: userId }).lean();
  let contextParts = "";
  if (patient) {
    const pid = (patient as any)._id.toString();
    contextParts = await buildPatientContext(pid, patient);
  }
  const patientName = (patient as any)?.full_name || "the patient";
  const systemPrompt = `${doc.style}

You are conducting a daily health check-in call with your patient ${patientName}. This is a voice conversation, so keep your responses conversational and concise (2-4 sentences max per turn). Do NOT use markdown, bullet points, or formatting -- speak naturally as you would on a phone call.

Your goal each session:
1. Ask how they are feeling today
2. Ask about their blood pressure reading (if they monitor BP)
3. Ask about their blood sugar level (if diabetic)
4. Ask what they ate today (meals)
5. Ask if they took their medications
6. Ask about any symptoms, pain, or concerns
7. Ask about sleep and exercise

Do NOT ask all questions at once. Ask one topic at a time, listen to the answer, acknowledge it, then move to the next. Be natural and conversational. If the patient provides a health value, acknowledge whether it sounds normal or concerning.

You are NOT making diagnoses. If something sounds concerning, advise them to visit their doctor in person.

Patient health context:
${contextParts || "No records available yet."}

Start the conversation by greeting the patient warmly and asking how they are feeling today.`;

  const geminiContents = (messages || []).map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content || "" }],
  }));
  const streamRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: geminiContents,
      }),
    }
  );
  if (!streamRes.ok) return res.status(500).json({ error: "AI service error" });
  res.setHeader("Content-Type", "text/event-stream");
  const reader = streamRes.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const data = JSON.parse(jsonStr);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
          } catch { /* skip */ }
        }
      }
    }
    res.write("data: [DONE]\n\n");
  } finally {
    res.end();
  }
});

// ---------- Voice Conversation: save transcript + auto-extract health data ----------
router.post("/me/voice-conversation/save", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const { messages, persona, duration_seconds } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required" });
  }
  const personaKey = persona && DOCTOR_PERSONAS[persona] ? persona : "dr_priya";

  // Save conversation
  const conv = await VoiceConversation.create({
    patient_id: link.patient_id,
    doctor_persona: personaKey,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
    duration_seconds: duration_seconds || undefined,
  });

  // Extract health actions from transcript using AI
  let extractedActions: any[] = [];
  if (GEMINI_API_KEY) {
    try {
      const transcript = messages.map((m: { role: string; content: string }) =>
        `${m.role === "assistant" ? "Doctor" : "Patient"}: ${m.content}`
      ).join("\n");

      const extractionPrompt = `Extract health data from this doctor-patient conversation. Return ONLY valid JSON.

Conversation:
${transcript}

Return this exact format:
{
  "actions": [
    { "type": "blood_pressure", "value": "120/80" },
    { "type": "blood_sugar", "value": "110" },
    { "type": "food", "meal_type": "breakfast", "notes": "description of food" },
    { "type": "medication", "taken": true, "medication_name": "medicine name" },
    { "type": "symptom", "description": "symptom description" }
  ]
}

Rules:
- Only include data the PATIENT explicitly mentioned
- blood_pressure value must be in format "systolic/diastolic" (e.g. "120/80")
- blood_sugar value must be a number string (e.g. "110")
- For food, include meal_type (breakfast/lunch/dinner/snack) and notes
- For medication, include taken (true/false) and medication_name
- For symptoms, include description
- If the patient did not mention a type, do not include it
- Return empty actions array if no health data was mentioned
- Return ONLY the JSON, no other text`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: extractionPrompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
          }),
        }
      );

      if (geminiRes.ok) {
        const aiResult = await geminiRes.json();
        const content = aiResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        try {
          const parsed = JSON.parse(jsonMatch[1]!.trim());
          extractedActions = Array.isArray(parsed.actions) ? parsed.actions : [];
        } catch { /* ignore parse errors */ }
      }
    } catch (e) {
      console.error("Voice extraction error:", e);
    }
  }

  // Auto-log extracted actions
  const filter: Record<string, unknown> = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const logged: any[] = [];

  for (const action of extractedActions) {
    try {
      if (action.type === "blood_pressure" && action.value) {
        const parts = String(action.value).split("/");
        const upper = parseFloat(parts[0]);
        await Vital.create({
          patient_id: link.patient_id,
          doctor_id: link.doctor_id,
          vital_type: "blood_pressure",
          value_text: action.value,
          value_numeric: Number.isFinite(upper) ? upper : undefined,
          unit: "mmHg",
          source: "voice",
        });
        await resolveReminderEscalation(link.patient_id, "blood_pressure");
        await updateGamificationState(link.patient_id, "blood_pressure", filter as any);
        logged.push({ type: "blood_pressure", value: action.value });
      } else if (action.type === "blood_sugar" && action.value) {
        const num = parseFloat(action.value);
        await Vital.create({
          patient_id: link.patient_id,
          doctor_id: link.doctor_id,
          vital_type: "blood_sugar",
          value_text: action.value,
          value_numeric: Number.isFinite(num) ? num : undefined,
          unit: "mg/dL",
          source: "voice",
        });
        await resolveReminderEscalation(link.patient_id, "blood_sugar");
        await updateGamificationState(link.patient_id, "blood_sugar", filter as any);
        logged.push({ type: "blood_sugar", value: action.value });
      } else if (action.type === "food") {
        await FoodLog.create({
          patient_id: link.patient_id,
          doctor_id: link.doctor_id,
          meal_type: action.meal_type || "other",
          notes: action.notes || undefined,
          source: "voice",
        });
        await updateGamificationState(link.patient_id, "food", filter as any);
        logged.push({ type: "food", meal_type: action.meal_type, notes: action.notes });
      } else if (action.type === "medication") {
        await MedicationLog.create({
          patient_id: link.patient_id,
          doctor_id: link.doctor_id,
          taken: action.taken === true,
          medication_name: action.medication_name || undefined,
          source: "voice",
        });
        await resolveReminderEscalation(link.patient_id, "medication");
        await updateGamificationState(link.patient_id, "medication", filter as any);
        logged.push({ type: "medication", taken: action.taken, medication_name: action.medication_name });
      } else if (action.type === "symptom") {
        logged.push({ type: "symptom", description: action.description });
      }
    } catch (err) {
      console.error("Auto-log error:", err);
    }
  }

  // Update conversation with extracted actions
  if (extractedActions.length > 0) {
    await VoiceConversation.updateOne(
      { _id: conv._id },
      {
        extracted_actions: extractedActions.map((a: any, i: number) => ({
          type: a.type,
          value: a.value || a.description || a.notes || "",
          details: a,
          logged: logged.some((l) => l.type === a.type),
          logged_at: logged.some((l) => l.type === a.type) ? new Date() : undefined,
        })),
      }
    );
  }

  res.status(201).json({
    conversation_id: conv._id?.toString(),
    messages_count: messages.length,
    extracted_actions: extractedActions,
    logged,
    duration_seconds: duration_seconds || 0,
  });
});

// Get voice conversation history
router.get("/me/voice-conversations", requireAuth, async (req, res) => {
  const link = await getPatientForCurrentUser(req);
  if (!link) return res.status(404).json({ error: "Patient record not linked" });
  const filter = link.patient_ids.length > 1 ? { patient_id: { $in: link.patient_ids } } : { patient_id: link.patient_id };
  const list = await VoiceConversation.find(filter).sort({ session_date: -1 }).limit(20).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/clinical-evidence", requireAuth, async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
  const { patient_id } = req.body;
  if (!patient_id) return res.status(400).json({ error: "patient_id required" });
  const userId = (req as AuthRequest).user.id;
  const patient = await Patient.findOne({ _id: patient_id, doctor_id: userId }).lean();
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  const p = patient as any;
  const conditions = (p.conditions || []).join(", ") || "None";
  const medications = (p.medications || []).join(", ") || "None";
  const prompt = `Patient: ${p.full_name}. Conditions: ${conditions}. Medications: ${medications}. List 3-5 brief, relevant clinical considerations or evidence-based points. Use markdown.`;
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }) }
  );
  if (!geminiRes.ok) return res.status(500).json({ error: "Evidence search failed" });
  const data = await geminiRes.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "No evidence generated.";
  res.json({ content });
});

router.post("/contact", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });
  res.json({ ok: true });
});

export default router;

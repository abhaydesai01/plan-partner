import { Router, Request } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
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
  const list = await PatientDocument.find(filter).sort({ created_at: -1 }).lean();
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
      extracted_data: analysis.chart_data ? { chart_data: analysis.chart_data, key_points: analysis.key_points } : { key_points: analysis.key_points },
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
  return res.status(201).json({ created: created.length, ids: created.map((d: any) => d._id?.toString()) });
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
  res.status(201).json(doc.toJSON());
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
  res.status(201).json(doc.toJSON());
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
  const list = await Alert.find(filter).sort({ created_at: -1 }).lean();
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
  const list = await Appointment.find(filter).sort({ scheduled_at: -1 }).lean();
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
  const list = await AppointmentCheckin.find(filter).sort({ checked_in_at: -1 }).lean();
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
  const list = await ClinicInvite.find(filter).sort({ created_at: -1 }).lean();
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
  const list = await Enrollment.find(filter).sort({ enrolled_at: -1 }).lean();
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
  const list = await FeedbackRequest.find(filter).lean();
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
  }).sort({ created_at: -1 }).lean();
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
  const list = await FoodLog.find(filter).sort({ logged_at: -1 }).lean();
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
  const list = await LabResult.find(filter).sort({ tested_at: -1 }).lean();
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
  const list = await LinkRequest.find({ doctor_id: (req as AuthRequest).user.id }).sort({ created_at: -1 }).lean();
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
  const list = await Notification.find({ user_id: (req as AuthRequest).user.id }).sort({ created_at: -1 }).lean();
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
  const list = await PatientDoctorLink.find(filter).lean();
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
  const list = await PatientDocument.find(filter).sort({ created_at: -1 }).lean();
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
      extracted_data: analysis.chart_data ? { chart_data: analysis.chart_data, key_points: analysis.key_points } : { key_points: analysis.key_points },
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
// More specific route first so /patients/:id is not matched as /patients
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
  const hasLimit = q.limit != null && String(q.limit).trim() !== "";
  const hasSkip = q.skip != null && String(q.skip).trim() !== "";
  const usePagination = hasLimit || hasSkip;
  const limit = usePagination ? Math.min(Math.max(parseInt(String(q.limit || "50"), 10) || 50, 1), 200) : 0;
  const skip = usePagination ? Math.max(parseInt(String(q.skip || "0"), 10) || 0, 0) : 0;
  if (usePagination) {
    const [list, total] = await Promise.all([
      Patient.find(filter).sort({ full_name: 1 }).skip(skip).limit(limit).lean(),
      Patient.countDocuments(filter),
    ]);
    const mapped = list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined }));
    return res.json({ items: mapped, total });
  }
  const list = await Patient.find(filter).sort({ full_name: 1 }).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/patients", requireAuth, async (req, res) => {
  const body = { ...req.body, doctor_id: (req as AuthRequest).user.id };
  const doc = await Patient.create(body);
  res.status(201).json(doc.toJSON());
});

router.post("/patients/bulk", requireAuth, async (req, res) => {
  const body = Array.isArray(req.body) ? req.body : [];
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
  const list = await Profile.find(filter).lean();
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
  const list = await Program.find(filter).sort({ name: 1 }).lean();
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
  const list = await UserRole.find(filter).lean();
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
  const list = await Vital.find(filter).sort({ recorded_at: -1 }).lean();
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

const DOCUMENT_ANALYSIS_PROMPT = `You are a medical document analyst. Analyze this document (report, prescription, referral, imaging report, etc.) and extract:
1. A brief professional summary (2-4 sentences) for the doctor.
2. A simple explanation in plain language for the patient (2-4 sentences).
3. Key points as a list of short strings (e.g. important findings, medications, dates).
4. If the document contains numeric data or values that can be visualized (e.g. lab-like values, scores over time), provide chart_data for a bar or line chart.

Return ONLY valid JSON (no markdown): {
  "summary": "string",
  "layman_summary": "string",
  "key_points": ["string", "..."],
  "chart_data": { "labels": ["label1", "..."], "datasets": [{ "label": "Series name", "values": [number, ...] }] }
}
Omit chart_data if there is nothing to chart. Use short labels. Always return valid JSON only.`;

function parseDocumentAnalysisResponse(content: string): { summary: string; layman_summary: string; key_points: string[]; chart_data?: { labels: string[]; datasets: { label: string; values: number[] }[] } } {
  let raw = content.trim();
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) raw = codeBlock[1].trim();
  const firstBrace = raw.indexOf("{");
  if (firstBrace >= 0) raw = raw.slice(firstBrace);
  const toParse = raw.replace(/,(\s*[}\]])/g, "$1");
  try {
    const parsed = JSON.parse(toParse);
    return {
      summary: parsed.summary || "",
      layman_summary: parsed.layman_summary || "",
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
      chart_data: parsed.chart_data && typeof parsed.chart_data === "object" ? parsed.chart_data : undefined,
    };
  } catch {
    return { summary: "", layman_summary: "", key_points: [] };
  }
}

async function analyzeDocumentWithGemini(
  apiKey: string | undefined,
  opts: { type: "image"; base64: string; mimeType: string } | { type: "pdf"; buffer: Buffer; fileName: string }
): Promise<{ summary: string; layman_summary: string; key_points: string[]; chart_data?: { labels: string[]; datasets: { label: string; values: number[] }[] } }> {
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

async function buildPatientContext(patientId: string) {
  const [vitals, labs, appointments, enrollments, docs] = await Promise.all([
    Vital.find({ patient_id: patientId }).sort({ recorded_at: -1 }).limit(20).lean(),
    LabResult.find({ patient_id: patientId }).sort({ tested_at: -1 }).limit(20).lean(),
    Appointment.find({ patient_id: patientId }).sort({ scheduled_at: -1 }).limit(10).lean(),
    Enrollment.find({ patient_id: patientId }).sort({ enrolled_at: -1 }).limit(10).lean(),
    PatientDocument.find({ patient_id: patientId }).sort({ created_at: -1 }).limit(10).lean(),
  ]);
  const parts: string[] = [];
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
    contextParts = await buildPatientContext(pid);
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
  const contextParts = await buildPatientContext(pid);
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
  const { email, message, name } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });
  console.log("Contact form:", { email, name, message });
  res.json({ ok: true });
});

export default router;

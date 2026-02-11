import { Router, Request } from "express";
import mongoose from "mongoose";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import {
  Alert,
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

type AuthRequest = Request & { user: { id: string } };

// ---------- Ensure user (create profile + user_role in MongoDB from JWT metadata) ----------
router.post("/ensure-user", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No token" });

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  const metadata = (user.user_metadata || {}) as { full_name?: string; role?: string };
  const fullName = metadata.full_name || "";
  const role = metadata.role === "patient" ? "patient" : "doctor";

  const existingProfile = await Profile.findOne({ user_id: userId }).lean();
  if (!existingProfile) {
    await Profile.create({ user_id: userId, full_name: fullName });
  }

  const existingRole = await UserRole.findOne({ user_id: userId }).lean();
  if (!existingRole) {
    await UserRole.create({ user_id: userId, role });
  }

  res.json({ ok: true });
});

// ---------- Alerts ----------
router.get("/alerts", requireAuth, async (req, res) => {
  const q = req.query as { patient_id?: string; status?: string; count?: string };
  const filter: Record<string, string> = { doctor_id: (req as AuthRequest).user.id };
  if (q.patient_id) filter.patient_id = q.patient_id;
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
  const q = req.query as { patient_id?: string; doctor_id?: string };
  const filter: Record<string, string> = {};
  filter.doctor_id = (req as AuthRequest).user.id;
  if (q.patient_id) filter.patient_id = q.patient_id;
  const list = await Appointment.find(filter).sort({ scheduled_at: -1 }).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/appointments", requireAuth, async (req, res) => {
  const body = { ...req.body, doctor_id: (req as AuthRequest).user.id };
  const doc = await Appointment.create(body);
  res.status(201).json(doc.toJSON());
});

router.patch("/appointments/:id", requireAuth, async (req, res) => {
  const updated = await Appointment.findOneAndUpdate(
    { _id: req.params.id, doctor_id: (req as AuthRequest).user.id },
    req.body,
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
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
  const members = await ClinicMember.find({ user_id: (req as AuthRequest).user.id }).lean();
  const clinicIds = (members as { clinic_id: string }[]).map((m) => m.clinic_id);
  const clinics = await Clinic.find({ _id: { $in: clinicIds } }).lean();
  const list = (clinics as any[]).map((c) => ({ ...c, id: c._id?.toString(), _id: undefined, __v: undefined }));
  res.json(list);
});

router.get("/clinics/:id", requireAuth, async (req, res) => {
  const member = await ClinicMember.findOne({ clinic_id: req.params.id, user_id: (req as AuthRequest).user.id });
  if (!member) return res.status(404).json({ error: "Not found" });
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
  const member = await ClinicMember.findOne({ clinic_id: req.params.id, user_id: (req as AuthRequest).user.id });
  if (!member) return res.status(404).json({ error: "Not found" });
  const updated = await Clinic.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, id: updated._id?.toString(), _id: undefined, __v: undefined });
});

// ---------- Clinic members ----------
router.get("/clinic_members", requireAuth, async (req, res) => {
  const q = req.query as { clinic_id?: string };
  const filter: Record<string, string> = {};
  if (q.clinic_id) filter.clinic_id = q.clinic_id;
  else {
    const members = await ClinicMember.find({ user_id: (req as AuthRequest).user.id }).select("clinic_id").lean();
    filter.clinic_id = { $in: members.map((m: any) => m.clinic_id) };
  }
  const list = await ClinicMember.find(filter).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/clinic_members", requireAuth, async (req, res) => {
  const doc = await ClinicMember.create(req.body);
  res.status(201).json(doc.toJSON());
});

// ---------- Clinic invites ----------
router.get("/clinic_invites", requireAuth, async (req, res) => {
  const q = req.query as { clinic_id?: string };
  const filter: Record<string, unknown> = {};
  if (q.clinic_id) filter.clinic_id = q.clinic_id;
  const list = await ClinicInvite.find(filter).sort({ created_at: -1 }).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/clinic_invites", requireAuth, async (req, res) => {
  const doc = await ClinicInvite.create(req.body);
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
  const q = req.query as { patient_id?: string };
  const filter: Record<string, string> = { doctor_id: (req as AuthRequest).user.id };
  if (q.patient_id) filter.patient_id = q.patient_id;
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

// ---------- Feedbacks ----------
router.get("/feedbacks", optionalAuth, async (req, res) => {
  const q = req.query as { clinic_id?: string; is_testimonial?: string };
  const filter: Record<string, unknown> = {};
  const uid = (req as AuthRequest).user?.id;
  if (uid) filter.doctor_id = uid;
  if (q.clinic_id) filter.clinic_id = q.clinic_id;
  if (q.is_testimonial === "true") filter.is_testimonial = true;
  const list = await Feedback.find(filter).sort({ created_at: -1 }).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/feedbacks", optionalAuth, async (req, res) => {
  const doc = await Feedback.create(req.body);
  res.status(201).json(doc.toJSON());
});

// ---------- Food logs ----------
router.get("/food_logs", requireAuth, async (req, res) => {
  const q = req.query as { patient_id?: string; count?: string };
  const filter: Record<string, string> = { doctor_id: (req as AuthRequest).user.id };
  if (q.patient_id) filter.patient_id = q.patient_id;
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
  const q = req.query as { patient_id?: string; count?: string };
  const filter: Record<string, string> = { doctor_id: (req as AuthRequest).user.id };
  if (q.patient_id) filter.patient_id = q.patient_id;
  if (q.count === "true" || q.count === "1") {
    const count = await LabResult.countDocuments(filter);
    return res.json({ count });
  }
  const list = await LabResult.find(filter).sort({ tested_at: -1 }).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/lab_results", requireAuth, async (req, res) => {
  const body = { ...req.body, doctor_id: (req as AuthRequest).user.id };
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
  const updated = await LinkRequest.findOneAndUpdate(
    { _id: req.params.id, doctor_id: (req as AuthRequest).user.id },
    req.body,
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
  const q = req.query as { patient_user_id?: string; doctor_id?: string };
  const filter: Record<string, string> = {};
  if (q.doctor_id) filter.doctor_user_id = q.doctor_id;
  else if (q.patient_user_id) filter.patient_user_id = q.patient_user_id;
  const list = await PatientDoctorLink.find(filter).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/patient_doctor_links", requireAuth, async (req, res) => {
  const doc = await PatientDoctorLink.create(req.body);
  res.status(201).json(doc.toJSON());
});

router.patch("/patient_doctor_links/:id", requireAuth, async (req, res) => {
  const updated = await PatientDoctorLink.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ ...updated, id: updated._id?.toString(), _id: undefined, __v: undefined });
});

// ---------- Patient vault codes ----------
router.get("/patient_vault_codes", requireAuth, async (req, res) => {
  const q = req.query as { patient_user_id?: string };
  const filter: Record<string, string> = {};
  if (q.patient_user_id) filter.patient_user_id = q.patient_user_id;
  const list = await PatientVaultCode.find(filter).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/patient_vault_codes", requireAuth, async (req, res) => {
  const doc = await PatientVaultCode.create(req.body);
  res.status(201).json(doc.toJSON());
});

// ---------- Patient documents ----------
router.get("/patient_documents", requireAuth, async (req, res) => {
  const q = req.query as { patient_id?: string; count?: string };
  const filter: Record<string, string> = { doctor_id: (req as AuthRequest).user.id };
  if (q.patient_id) filter.patient_id = q.patient_id;
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

router.delete("/patient_documents/:id", requireAuth, async (req, res) => {
  const deleted = await PatientDocument.findOneAndDelete({ _id: req.params.id, doctor_id: (req as AuthRequest).user.id });
  if (!deleted) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

// ---------- Patients ----------
// More specific route first so /patients/:id is not matched as /patients
router.get("/patients/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ error: "Not found" });
  const one = await Patient.findOne({
    _id: new mongoose.Types.ObjectId(id),
    doctor_id: (req as AuthRequest).user.id,
  }).lean();
  if (!one) return res.status(404).json({ error: "Not found" });
  const out = { ...one, id: (one as any)._id?.toString(), _id: undefined, __v: undefined };
  res.json(out);
});

router.get("/patients", requireAuth, async (req, res) => {
  const q = req.query as { doctor_id?: string; patient_user_id?: string; count?: string; status?: string };
  const filter: Record<string, string> = { doctor_id: (req as AuthRequest).user.id };
  if (q.patient_user_id) filter.patient_user_id = q.patient_user_id;
  if (q.status) filter.status = q.status;
  if (q.count === "true" || q.count === "1") {
    const count = await Patient.countDocuments(filter);
    return res.json({ count });
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
  if (q.doctor_code) filter.doctor_code = q.doctor_code.toUpperCase();
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
  const q = req.query as { patient_id?: string; count?: string };
  const filter: Record<string, string> = { doctor_id: (req as AuthRequest).user.id };
  if (q.patient_id) filter.patient_id = q.patient_id;
  if (q.count === "true" || q.count === "1") {
    const count = await Vital.countDocuments(filter);
    return res.json({ count });
  }
  const list = await Vital.find(filter).sort({ recorded_at: -1 }).lean();
  res.json(list.map((d: any) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined })));
});

router.post("/vitals", requireAuth, async (req, res) => {
  const body = { ...req.body, doctor_id: (req as AuthRequest).user.id };
  const doc = await Vital.create(body);
  res.status(201).json(doc.toJSON());
});

export default router;

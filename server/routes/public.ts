import { Router } from "express";
import { Profile, Program, ClinicMember, Clinic, Patient, Enrollment, Notification, ClinicInvite } from "../models/index.js";

const router = Router();

/** GET /api - health/root (so "Cannot GET /api" is replaced with a proper response) */
router.get("/", (_req, res) => {
  res.json({ ok: true, message: "Plan Partner API", version: "1.0", routes: "auth/register, auth/login, ..." });
});

/** GET ?code=INVITE_CODE - public lookup for join-clinic flow */
router.get("/clinic-invite-by-code", async (req, res) => {
  const code = (req.query.code as string)?.trim()?.toUpperCase();
  if (!code) {
    res.status(400).json({ error: "Missing code" });
    return;
  }
  const inv = await ClinicInvite.findOne({ invite_code: code, status: "pending" }).lean();
  if (!inv) {
    res.status(404).json({ error: "No pending invite found" });
    return;
  }
  const clinic = await Clinic.findById((inv as any).clinic_id).select("name").lean();
  res.json({
    id: (inv as any)._id?.toString(),
    clinic_id: (inv as any).clinic_id,
    role: (inv as any).role,
    clinic_name: (clinic as any)?.name || "Unknown Clinic",
  });
});

/** GET ?code=DOCTOR_CODE - public doctor info + programs for enrollment */
router.get("/patient-enroll", async (req, res) => {
  const doctorCode = (req.query.code as string)?.toUpperCase();
  if (!doctorCode) {
    res.status(400).json({ error: "Missing doctor code" });
    return;
  }

  const profile = await Profile.findOne({ doctor_code: doctorCode }).lean();
  if (!profile) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  const userId = (profile as { user_id: string }).user_id;
  const programs = await Program.find({
    doctor_id: userId,
    is_active: true,
  })
    .select("name type description duration_days")
    .lean();

  const membership = await ClinicMember.findOne({ user_id: userId })
    .select("clinic_id")
    .lean();
  let clinic: { name: string; address: string; phone: string } | null = null;
  if (membership?.clinic_id) {
    const c = await Clinic.findById((membership as any).clinic_id).select("name address phone").lean();
    if (c) clinic = { name: (c as any).name, address: (c as any).address || "", phone: (c as any).phone || "" };
  }

  const p = profile as { full_name: string; specialties?: string[]; doctor_code?: string };
  res.json({
    doctor: {
      name: p.full_name,
      specialties: p.specialties || [],
      code: p.doctor_code || "",
    },
    clinic,
    programs: programs.map((pr: any) => ({ ...pr, id: pr._id?.toString(), _id: undefined, __v: undefined })),
  });
});

/** POST - create patient + optional enrollment (public) */
router.post("/patient-enroll", async (req, res) => {
  const body = req.body as {
    doctor_code?: string;
    full_name?: string;
    phone?: string;
    age?: string;
    gender?: string;
    conditions?: string;
    medications?: string;
    emergency_contact?: string;
    language_preference?: string;
    program_id?: string;
  };

  const { doctor_code, full_name, phone, age, gender, conditions, medications, emergency_contact, language_preference, program_id } = body;

  if (!doctor_code || !full_name || !phone) {
    res.status(400).json({ error: "doctor_code, full_name, and phone are required" });
    return;
  }

  const profile = await Profile.findOne({ doctor_code: doctor_code.toUpperCase() }).lean();
  if (!profile) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  const doctorId = (profile as { user_id: string }).user_id;

  let normalizedPhone = phone.replace(/[\s\-\(\)\.]/g, "");
  if (normalizedPhone.startsWith("0")) normalizedPhone = "+91" + normalizedPhone.slice(1);
  if (!normalizedPhone.startsWith("+")) normalizedPhone = "+91" + normalizedPhone;

  const existing = await Patient.findOne({ doctor_id: doctorId, phone: normalizedPhone }).lean();
  if (existing) {
    res.status(409).json({ error: "A patient with this phone number is already registered." });
    return;
  }

  const membership = await ClinicMember.findOne({ user_id: doctorId }).select("clinic_id").lean();
  const clinicId = (membership as { clinic_id?: string } | null)?.clinic_id ?? null;

  const clientIp = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
  const ip = Array.isArray(clientIp) ? clientIp[0] : String(clientIp);

  const patient = await Patient.create({
    doctor_id: doctorId,
    clinic_id: clinicId,
    full_name,
    phone: normalizedPhone,
    age: age ? parseInt(age, 10) : undefined,
    gender: gender || undefined,
    conditions: conditions ? conditions.split(";").map((c) => c.trim()).filter(Boolean) : [],
    medications: medications ? medications.split(";").map((m) => m.trim()).filter(Boolean) : [],
    emergency_contact: emergency_contact || undefined,
    language_preference: language_preference || "en",
    consent_given_at: new Date(),
    consent_ip: ip,
  });

  let enrollmentId: string | null = null;
  if (program_id && patient) {
    const enrollment = await Enrollment.create({
      patient_id: patient._id.toString(),
      program_id,
      doctor_id: doctorId,
    });
    enrollmentId = enrollment._id.toString();
  }

  await Notification.create({
    user_id: doctorId,
    title: `New patient enrolled: ${full_name}`,
    message: `${full_name} (${normalizedPhone}) self-enrolled via your enrollment link.${program_id ? " Enrolled in a program." : ""}`,
    type: "success",
    category: "enrollment",
    related_id: patient._id.toString(),
    related_type: "patient",
  });

  res.status(200).json({
    success: true,
    patient_id: patient._id.toString(),
    enrollment_id: enrollmentId,
  });
});

export default router;

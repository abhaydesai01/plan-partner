import { Router } from "express";
import { Profile, Program, ClinicMember, Clinic, Patient, Enrollment, Notification, ClinicInvite, AuthUser, HospitalReview, UserRole, TreatmentCondition } from "../models/index.js";
import { matchHospitals, searchSuggest } from "../services/matching-engine.js";

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

/** GET /api/doctor-by-code?code=ABCD12 - public lookup for QR connect flow */
router.get("/doctor-by-code", async (req, res) => {
  const code = (req.query.code as string)?.toUpperCase();
  if (!code) { res.status(400).json({ error: "Missing code" }); return; }

  const profile = await Profile.findOne({ doctor_code: code }).lean();
  if (!profile) { res.status(404).json({ error: "Doctor not found" }); return; }

  const userId = (profile as any).user_id;
  const membership = await ClinicMember.findOne({ user_id: userId }).select("clinic_id").lean();
  let clinicName: string | null = null;
  if (membership?.clinic_id) {
    const c = await Clinic.findById((membership as any).clinic_id).select("name").lean();
    if (c) clinicName = (c as any).name;
  }

  res.json({
    doctor_name: (profile as any).full_name || "Doctor",
    doctor_code: code,
    doctor_user_id: userId,
    specialties: (profile as any).specialties || [],
    clinic_name: clinicName,
  });
});

// ═══════════════════════════════════════════════════════════════
// Hospital Discovery (public, no auth)
// ═══════════════════════════════════════════════════════════════

router.get("/hospitals", async (req, res) => {
  try {
    const { city, specialty, condition, price_min, price_max, page, limit: rawLimit, sort: sortBy } = req.query;
    const filter: any = { is_public_listed: true };
    if (city) filter.city = { $regex: new RegExp(String(city), "i") };
    if (specialty) filter.specialties = { $regex: new RegExp(String(specialty), "i") };
    if (condition) {
      filter.$or = [
        { treatments_offered: { $regex: new RegExp(String(condition), "i") } },
        { specialties: { $regex: new RegExp(String(condition), "i") } },
      ];
    }
    if (price_min || price_max) {
      if (price_min) filter.price_range_min = { $gte: Number(price_min) };
      if (price_max) filter.price_range_max = { $lte: Number(price_max) };
    }
    const limit = Math.min(Number(rawLimit) || 20, 50);
    const skip = ((Number(page) || 1) - 1) * limit;

    let sortObj: any = { rating_avg: -1, createdAt: -1 };
    if (sortBy === "outcomes") sortObj = { patient_satisfaction: -1, completion_rate: -1 };
    else if (sortBy === "price") sortObj = { price_range_min: 1 };

    const [hospitals, total] = await Promise.all([
      Clinic.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      Clinic.countDocuments(filter),
    ]);

    const mapToObj = (m: any) => {
      if (!m) return {};
      if (m instanceof Map) return Object.fromEntries(m);
      if (typeof m.toJSON === "function") return m.toJSON();
      return m;
    };

    res.json({
      hospitals: hospitals.map((h: any) => ({
        id: h._id?.toString(),
        name: h.name,
        city: h.city,
        country: h.country,
        description: h.description,
        specialties: h.specialties,
        treatments_offered: h.treatments_offered,
        price_range_min: h.price_range_min,
        price_range_max: h.price_range_max,
        rating_avg: h.rating_avg,
        total_reviews: h.total_reviews,
        logo_url: h.logo_url,
        bed_count: h.bed_count,
        accreditations: h.accreditations,
        established_year: h.established_year,
        patient_volume: h.patient_volume,
        completion_rate: h.completion_rate,
        patient_satisfaction: h.patient_satisfaction,
        success_rates: mapToObj(h.success_rates),
        international_patient_count: h.international_patient_count,
        international_support: h.international_support,
        facilities: h.facilities,
        program_ids: h.program_ids,
        response_time_hours: h.response_time_hours,
      })),
      total,
      page: Number(page) || 1,
      total_pages: Math.ceil(total / limit),
    });
  } catch {
    res.status(500).json({ error: "Failed to search hospitals" });
  }
});

router.post("/hospitals/match", async (req, res) => {
  try {
    const { condition, budget_min, budget_max, preferred_location, preferred_country, timeline, travel_type } = req.body;
    if (!condition) return res.status(400).json({ error: "condition is required" });

    const results = await matchHospitals({
      condition, budget_min, budget_max,
      preferred_location, preferred_country,
      timeline, travel_type,
    });

    const mapToObj = (m: any) => {
      if (!m) return {};
      if (m instanceof Map) return Object.fromEntries(m);
      if (typeof m.toJSON === "function") return m.toJSON();
      return m;
    };

    res.json({
      hospitals: results.map((r) => ({
        id: r.hospital._id?.toString(),
        name: r.hospital.name,
        city: r.hospital.city,
        country: r.hospital.country,
        description: r.hospital.description,
        specialties: r.hospital.specialties,
        treatments_offered: r.hospital.treatments_offered,
        price_range_min: r.hospital.price_range_min,
        price_range_max: r.hospital.price_range_max,
        rating_avg: r.hospital.rating_avg,
        total_reviews: r.hospital.total_reviews,
        logo_url: r.hospital.logo_url,
        bed_count: r.hospital.bed_count,
        accreditations: r.hospital.accreditations,
        established_year: r.hospital.established_year,
        patient_volume: r.hospital.patient_volume,
        completion_rate: r.hospital.completion_rate,
        patient_satisfaction: r.hospital.patient_satisfaction,
        success_rates: mapToObj(r.hospital.success_rates),
        international_patient_count: r.hospital.international_patient_count,
        international_support: r.hospital.international_support,
        facilities: r.hospital.facilities,
        program_ids: r.hospital.program_ids,
        response_time_hours: r.hospital.response_time_hours,
        match_score: r.match_score,
        match_breakdown: r.match_breakdown,
      })),
      intent: { condition, budget_min, budget_max, preferred_location, preferred_country, timeline, travel_type },
    });
  } catch {
    res.status(500).json({ error: "Failed to match hospitals" });
  }
});

router.get("/hospitals/search-suggest", async (req, res) => {
  try {
    const q = String(req.query.q || "");
    const suggestions = await searchSuggest(q);
    res.json({ suggestions });
  } catch {
    res.status(500).json({ error: "Failed to get suggestions" });
  }
});

router.get("/hospitals/conditions", async (_req, res) => {
  try {
    const conditions = await TreatmentCondition.find().sort({ condition: 1 }).lean();
    res.json(conditions.map((c: any) => ({
      id: c._id?.toString(),
      condition: c.condition,
      specialty: c.specialty,
      category: c.category,
    })));
  } catch {
    res.status(500).json({ error: "Failed to fetch conditions" });
  }
});

router.get("/hospitals/compare", async (req, res) => {
  try {
    const ids = (req.query.ids as string)?.split(",").slice(0, 3);
    if (!ids?.length) return res.status(400).json({ error: "ids query param required (comma-separated)" });
    const hospitals = await Clinic.find({ _id: { $in: ids }, is_public_listed: true }).lean();
    const result = await Promise.all(
      hospitals.map(async (h: any) => {
        const doctorMembers = await ClinicMember.find({ clinic_id: h._id.toString(), role: { $in: ["owner", "doctor"] } }).lean();
        const doctorProfiles = doctorMembers.length
          ? await Profile.find({ user_id: { $in: doctorMembers.map((m: any) => m.user_id) } }).lean()
          : [];
        return {
          id: h._id?.toString(),
          name: h.name,
          city: h.city,
          country: h.country,
          description: h.description,
          specialties: h.specialties,
          price_range_min: h.price_range_min,
          price_range_max: h.price_range_max,
          rating_avg: h.rating_avg,
          total_reviews: h.total_reviews,
          bed_count: h.bed_count,
          accreditations: h.accreditations,
          established_year: h.established_year,
          doctor_count: doctorProfiles.length,
          doctors: doctorProfiles.map((d: any) => ({
            name: d.full_name,
            specialties: d.specialties,
            experience_years: d.experience_years,
          })),
        };
      })
    );
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to compare hospitals" });
  }
});

router.get("/hospitals/:id", async (req, res) => {
  try {
    const hospital = await Clinic.findOne({ _id: req.params.id, is_public_listed: true }).lean();
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });
    const h = hospital as any;

    const doctorMembers = await ClinicMember.find({ clinic_id: h._id.toString(), role: { $in: ["owner", "doctor"] } }).lean();
    const doctorUserIds = doctorMembers.map((m: any) => m.user_id);
    const doctorProfiles = doctorUserIds.length
      ? await Profile.find({ user_id: { $in: doctorUserIds } }).lean()
      : [];

    const reviews = await HospitalReview.find({ clinic_id: req.params.id }).sort({ createdAt: -1 }).limit(20).lean();
    const reviewerIds = reviews.map((r: any) => r.patient_user_id);
    const reviewerProfiles = reviewerIds.length ? await Profile.find({ user_id: { $in: reviewerIds } }).lean() : [];
    const reviewerMap = new Map((reviewerProfiles as any[]).map((p: any) => [p.user_id, p]));

    const mapToObj = (m: any) => {
      if (!m) return {};
      if (m instanceof Map) return Object.fromEntries(m);
      if (typeof m.toJSON === "function") return m.toJSON();
      return m;
    };

    const programs = (h.program_ids?.length)
      ? await (await import("../models/index.js")).Program.find({ _id: { $in: h.program_ids }, is_active: true }).select("name description category duration_days").lean()
      : [];

    res.json({
      id: h._id?.toString(),
      name: h.name,
      city: h.city,
      country: h.country,
      address: h.address,
      description: h.description,
      specialties: h.specialties,
      treatments_offered: h.treatments_offered,
      price_range_min: h.price_range_min,
      price_range_max: h.price_range_max,
      rating_avg: h.rating_avg,
      total_reviews: h.total_reviews,
      logo_url: h.logo_url,
      gallery_urls: h.gallery_urls,
      bed_count: h.bed_count,
      accreditations: h.accreditations,
      established_year: h.established_year,
      website: h.website,
      phone: h.phone,
      email: h.email,
      patient_volume: h.patient_volume,
      completion_rate: h.completion_rate,
      patient_satisfaction: h.patient_satisfaction,
      success_rates: mapToObj(h.success_rates),
      average_cost_by_treatment: mapToObj(h.average_cost_by_treatment),
      international_patient_count: h.international_patient_count,
      international_support: h.international_support,
      facilities: h.facilities,
      response_time_hours: h.response_time_hours,
      programs: programs.map((p: any) => ({
        id: p._id?.toString(),
        name: p.name,
        description: p.description,
        category: p.category,
        duration_days: p.duration_days,
      })),
      doctors: doctorProfiles.map((d: any) => ({
        id: d.user_id,
        name: d.full_name,
        specialties: d.specialties,
        experience_years: d.experience_years,
        bio: d.bio,
        avatar_url: d.avatar_url,
        consultation_fee: d.consultation_fee,
        languages: d.languages,
      })),
      reviews: reviews.map((r: any) => ({
        id: r._id?.toString(),
        rating: r.rating,
        review_text: r.review_text,
        is_verified: r.is_verified,
        patient_name: (reviewerMap.get(r.patient_user_id) as any)?.full_name || "Anonymous",
        created_at: r.createdAt,
      })),
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch hospital profile" });
  }
});

router.get("/hospitals/:id/doctors", async (req, res) => {
  try {
    const hospital = await Clinic.findOne({ _id: req.params.id, is_public_listed: true }).lean();
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });
    const members = await ClinicMember.find({ clinic_id: req.params.id, role: { $in: ["owner", "doctor"] } }).lean();
    const userIds = members.map((m: any) => m.user_id);
    const profiles = userIds.length ? await Profile.find({ user_id: { $in: userIds } }).lean() : [];
    res.json(
      (profiles as any[]).map((d: any) => ({
        id: d.user_id,
        name: d.full_name,
        specialties: d.specialties,
        experience_years: d.experience_years,
        bio: d.bio,
        avatar_url: d.avatar_url,
        consultation_fee: d.consultation_fee,
        languages: d.languages,
        education: d.education,
      }))
    );
  } catch {
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

router.get("/doctors/:id/public", async (req, res) => {
  try {
    const profile = await Profile.findOne({ user_id: req.params.id, is_public_listed: true }).lean();
    if (!profile) return res.status(404).json({ error: "Doctor not found" });
    const p = profile as any;
    const membership = await ClinicMember.findOne({ user_id: req.params.id }).lean();
    let clinic = null;
    if (membership) {
      const c = await Clinic.findById((membership as any).clinic_id).select("name city country specialties logo_url").lean();
      if (c) clinic = { id: (c as any)._id?.toString(), name: (c as any).name, city: (c as any).city, country: (c as any).country };
    }
    res.json({
      id: p.user_id,
      name: p.full_name,
      specialties: p.specialties,
      experience_years: p.experience_years,
      bio: p.bio,
      avatar_url: p.avatar_url,
      consultation_fee: p.consultation_fee,
      languages: p.languages,
      education: p.education,
      clinic,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch doctor profile" });
  }
});

export default router;

/**
 * Admin API routes — all require admin role.
 * Mounted at /api/admin in app.ts so all routes here are under /api/admin/*.
 * Mounted at /api/admin in app.ts so routes here are relative (no /admin prefix).
 * Manages clinics, doctors, programs, program assignments, revenue, and analytics.
 */
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
  AuthUser,
  Case,
  Clinic,
  ClinicMember,
  Enrollment,
  Patient,
  Profile,
  Program,
  ProgramAssignment,
  DoctorProgramAssignment,
  RevenueEntry,
  UserRole,
} from "../models/index.js";
import {
  sendClinicApprovedEmail,
  sendClinicRejectedEmail,
  sendDoctorApprovedEmail,
  sendDoctorRejectedEmail,
  sendAccountSuspendedEmail,
} from "../services/email.js";

const router = Router();

// All routes in this router require auth + admin role.
// Safe to use catch-all because this router is mounted at /api/admin
// so ONLY requests starting with /api/admin reach here.
router.use(requireAuth, requireAdmin);

// ─── Clinic Management ──────────────────────────────────────────

/** List all clinics with approval status */
router.get("/clinics", async (_req, res) => {
  try {
    const clinicRoles = await UserRole.find({ role: "clinic" }).lean();
    const userIds = clinicRoles.map((r: any) => r.user_id);
    const [authUsers, profiles, clinics] = await Promise.all([
      AuthUser.find({ user_id: { $in: userIds } }).select("user_id email approval_status createdAt email_verified").lean(),
      Profile.find({ user_id: { $in: userIds } }).lean(),
      Clinic.find({}).lean(),
    ]);
    const authMap = new Map(authUsers.map((u: any) => [u.user_id, u]));
    const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
    const clinicRoleMap = new Map(clinicRoles.map((r: any) => [r.user_id, r]));

    const result = userIds.map((uid: string) => {
      const auth = authMap.get(uid) as any;
      const profile = profileMap.get(uid) as any;
      const role = clinicRoleMap.get(uid) as any;
      const clinicDoc = role?.clinic_id ? clinics.find((c: any) => c._id?.toString() === role.clinic_id) : null;
      return {
        user_id: uid,
        email: auth?.email,
        name: profile?.full_name || (clinicDoc as any)?.name || "Unknown",
        phone: profile?.phone || (clinicDoc as any)?.phone || "",
        clinic_name: (clinicDoc as any)?.name || "",
        clinic_id: role?.clinic_id || "",
        address: (clinicDoc as any)?.address || "",
        approval_status: auth?.approval_status || "active",
        email_verified: !!auth?.email_verified,
        created_at: auth?.createdAt,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch clinics" });
  }
});

/** Approve a clinic */
router.patch("/clinics/:id/approve", async (req, res) => {
  try {
    const userId = req.params.id;
    await AuthUser.updateOne({ user_id: userId }, { $set: { approval_status: "approved" } });
    const auth = await AuthUser.findOne({ user_id: userId }).lean();
    const profile = await Profile.findOne({ user_id: userId }).lean();
    if (auth) {
      sendClinicApprovedEmail((auth as any).email, (profile as any)?.full_name || "Clinic").catch(() => {});
    }
    res.json({ success: true, message: "Clinic approved" });
  } catch {
    res.status(500).json({ error: "Failed to approve clinic" });
  }
});

/** Reject a clinic */
router.patch("/clinics/:id/reject", async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;
    await AuthUser.updateOne({ user_id: userId }, { $set: { approval_status: "rejected" } });
    const auth = await AuthUser.findOne({ user_id: userId }).lean();
    const profile = await Profile.findOne({ user_id: userId }).lean();
    if (auth) {
      sendClinicRejectedEmail((auth as any).email, (profile as any)?.full_name || "Clinic", reason).catch(() => {});
    }
    res.json({ success: true, message: "Clinic rejected" });
  } catch {
    res.status(500).json({ error: "Failed to reject clinic" });
  }
});

/** Suspend a clinic */
router.patch("/clinics/:id/suspend", async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;
    await AuthUser.updateOne({ user_id: userId }, { $set: { approval_status: "suspended" } });
    const auth = await AuthUser.findOne({ user_id: userId }).lean();
    const profile = await Profile.findOne({ user_id: userId }).lean();
    if (auth) {
      sendAccountSuspendedEmail((auth as any).email, (profile as any)?.full_name || "User", reason).catch(() => {});
    }
    res.json({ success: true, message: "Clinic suspended" });
  } catch {
    res.status(500).json({ error: "Failed to suspend clinic" });
  }
});

// ─── Doctor Management ──────────────────────────────────────────

/** List all doctors */
router.get("/doctors", async (_req, res) => {
  try {
    const doctorRoles = await UserRole.find({ role: "doctor" }).lean();
    const userIds = doctorRoles.map((r: any) => r.user_id);
    const [authUsers, profiles] = await Promise.all([
      AuthUser.find({ user_id: { $in: userIds } }).select("user_id email approval_status createdAt email_verified clinic_id").lean(),
      Profile.find({ user_id: { $in: userIds } }).lean(),
    ]);
    const authMap = new Map(authUsers.map((u: any) => [u.user_id, u]));
    const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
    const roleMap = new Map(doctorRoles.map((r: any) => [r.user_id, r]));

    const clinicIds = [...new Set(authUsers.map((a: any) => a.clinic_id).filter(Boolean))];
    const clinicDocs = clinicIds.length ? await Clinic.find({ _id: { $in: clinicIds } }).lean() : [];
    const clinicMap = new Map(clinicDocs.map((c: any) => [c._id.toString(), c]));

    const result = userIds.map((uid: string) => {
      const auth = authMap.get(uid) as any;
      const profile = profileMap.get(uid) as any;
      const role = roleMap.get(uid) as any;
      const clinicId = auth?.clinic_id || role?.clinic_id;
      const clinic = clinicId ? clinicMap.get(clinicId) : null;
      return {
        user_id: uid,
        email: auth?.email,
        name: profile?.full_name || "Unknown",
        phone: profile?.phone || "",
        specialization: profile?.specialization || "",
        clinic_id: clinicId || "",
        clinic_name: (clinic as any)?.name || "",
        approval_status: auth?.approval_status || "active",
        email_verified: !!auth?.email_verified,
        created_at: auth?.createdAt,
      };
    });

    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

/** Approve a doctor */
router.patch("/doctors/:id/approve", async (req, res) => {
  try {
    const userId = req.params.id;
    await AuthUser.updateOne({ user_id: userId }, { $set: { approval_status: "approved" } });
    const auth = await AuthUser.findOne({ user_id: userId }).lean();
    const profile = await Profile.findOne({ user_id: userId }).lean();
    if (auth) {
      sendDoctorApprovedEmail((auth as any).email, (profile as any)?.full_name || "Doctor").catch(() => {});
    }
    res.json({ success: true, message: "Doctor approved" });
  } catch {
    res.status(500).json({ error: "Failed to approve doctor" });
  }
});

/** Reject a doctor */
router.patch("/doctors/:id/reject", async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;
    await AuthUser.updateOne({ user_id: userId }, { $set: { approval_status: "rejected" } });
    const auth = await AuthUser.findOne({ user_id: userId }).lean();
    const profile = await Profile.findOne({ user_id: userId }).lean();
    if (auth) {
      sendDoctorRejectedEmail((auth as any).email, (profile as any)?.full_name || "Doctor", reason).catch(() => {});
    }
    res.json({ success: true, message: "Doctor rejected" });
  } catch {
    res.status(500).json({ error: "Failed to reject doctor" });
  }
});

/** Suspend a doctor */
router.patch("/doctors/:id/suspend", async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;
    await AuthUser.updateOne({ user_id: userId }, { $set: { approval_status: "suspended" } });
    const auth = await AuthUser.findOne({ user_id: userId }).lean();
    const profile = await Profile.findOne({ user_id: userId }).lean();
    if (auth) {
      sendAccountSuspendedEmail((auth as any).email, (profile as any)?.full_name || "User", reason).catch(() => {});
    }
    res.json({ success: true, message: "Doctor suspended" });
  } catch {
    res.status(500).json({ error: "Failed to suspend doctor" });
  }
});

// ─── Program Builder ────────────────────────────────────────────

/** Create a program */
router.post("/programs", async (req, res) => {
  try {
    const adminId = (req as any).user.id;
    const { name, description, category, duration_days, duration_unit, outcome_goal, phases, type } = req.body;
    if (!name) return res.status(400).json({ error: "Program name is required" });

    const program = await Program.create({
      name,
      description,
      category,
      duration_days: duration_days || 90,
      duration_unit: duration_unit || "days",
      outcome_goal,
      phases: phases || [],
      type: type || category || "General",
      is_active: true,
      created_by: adminId,
    });
    res.status(201).json(program);
  } catch {
    res.status(500).json({ error: "Failed to create program" });
  }
});

/** List all programs */
router.get("/programs", async (_req, res) => {
  try {
    const programs = await Program.find({}).sort({ createdAt: -1 }).lean();
    const result = programs.map((p: any) => ({
      ...p,
      id: p._id?.toString(),
      _id: undefined,
      __v: undefined,
    }));
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to fetch programs" });
  }
});

/** Get single program */
router.get("/programs/:id", async (req, res) => {
  try {
    const program = await Program.findById(req.params.id).lean();
    if (!program) return res.status(404).json({ error: "Program not found" });

    const assignments = await ProgramAssignment.find({ program_id: req.params.id, status: "active" }).lean();
    const clinicIds = assignments.map((a: any) => a.clinic_id);
    const clinics = clinicIds.length ? await Clinic.find({ _id: { $in: clinicIds } }).lean() : [];

    const enrollmentCount = await Enrollment.countDocuments({ program_id: req.params.id });

    res.json({
      ...program,
      id: (program as any)._id?.toString(),
      _id: undefined,
      __v: undefined,
      assignments: assignments.map((a: any) => {
        const clinic = clinics.find((c: any) => c._id.toString() === a.clinic_id);
        return {
          id: a._id?.toString(),
          clinic_id: a.clinic_id,
          clinic_name: (clinic as any)?.name || "Unknown",
          assigned_at: a.assigned_at,
          status: a.status,
        };
      }),
      enrollment_count: enrollmentCount,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch program" });
  }
});

/** Update a program */
router.patch("/programs/:id", async (req, res) => {
  try {
    const { name, description, category, duration_days, duration_unit, outcome_goal, phases, type, is_active } = req.body;
    const update: any = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (category !== undefined) update.category = category;
    if (duration_days !== undefined) update.duration_days = duration_days;
    if (duration_unit !== undefined) update.duration_unit = duration_unit;
    if (outcome_goal !== undefined) update.outcome_goal = outcome_goal;
    if (phases !== undefined) update.phases = phases;
    if (type !== undefined) update.type = type;
    if (is_active !== undefined) update.is_active = is_active;

    const program = await Program.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
    if (!program) return res.status(404).json({ error: "Program not found" });
    res.json({ ...program, id: (program as any)._id?.toString(), _id: undefined, __v: undefined });
  } catch {
    res.status(500).json({ error: "Failed to update program" });
  }
});

/** Deactivate a program */
router.delete("/programs/:id", async (req, res) => {
  try {
    await Program.findByIdAndUpdate(req.params.id, { $set: { is_active: false } });
    res.json({ success: true, message: "Program deactivated" });
  } catch {
    res.status(500).json({ error: "Failed to deactivate program" });
  }
});

// ─── Program Assignment ─────────────────────────────────────────

/** Assign program to a clinic */
router.post("/programs/:id/assign", async (req, res) => {
  try {
    const adminId = (req as any).user.id;
    const programId = req.params.id;
    const { clinic_id } = req.body;
    if (!clinic_id) return res.status(400).json({ error: "clinic_id is required" });

    const existing = await ProgramAssignment.findOne({ program_id: programId, clinic_id, status: "active" }).lean();
    if (existing) return res.status(400).json({ error: "Program already assigned to this clinic" });

    const assignment = await ProgramAssignment.create({
      program_id: programId,
      clinic_id,
      assigned_by: adminId,
      status: "active",
    });

    // Auto-enroll the actual clinic owner (ClinicMember with role "owner") as a doctor.
    // The ClinicMember owner may be a separate doctor account from the clinic login account.
    const ownerMember = await ClinicMember.findOne({ clinic_id, role: "owner" }).lean();
    const ownerUserId = (ownerMember as any)?.user_id;
    if (ownerUserId) {
      const ownerExists = await DoctorProgramAssignment.findOne({
        program_id: programId, doctor_user_id: ownerUserId, clinic_id, status: "active",
      }).lean();
      if (!ownerExists) {
        await DoctorProgramAssignment.create({
          program_id: programId, doctor_user_id: ownerUserId, clinic_id, assigned_by: "system",
        }).catch(() => {});
      }
    }

    res.status(201).json(assignment);
  } catch {
    res.status(500).json({ error: "Failed to assign program" });
  }
});

/** Revoke assignment */
router.delete("/programs/:id/assign/:clinicId", async (req, res) => {
  try {
    await ProgramAssignment.updateOne(
      { program_id: req.params.id, clinic_id: req.params.clinicId, status: "active" },
      { $set: { status: "revoked" } }
    );
    res.json({ success: true, message: "Assignment revoked" });
  } catch {
    res.status(500).json({ error: "Failed to revoke assignment" });
  }
});

/** List assignments for a program */
router.get("/programs/:id/assignments", async (req, res) => {
  try {
    const assignments = await ProgramAssignment.find({ program_id: req.params.id }).sort({ assigned_at: -1 }).lean();
    const clinicIds = [...new Set(assignments.map((a: any) => a.clinic_id))];
    const clinics = clinicIds.length ? await Clinic.find({ _id: { $in: clinicIds } }).lean() : [];
    const clinicMap = new Map(clinics.map((c: any) => [c._id.toString(), c]));

    const result = assignments.map((a: any) => ({
      id: a._id?.toString(),
      program_id: a.program_id,
      clinic_id: a.clinic_id,
      clinic_name: (clinicMap.get(a.clinic_id) as any)?.name || "Unknown",
      assigned_by: a.assigned_by,
      assigned_at: a.assigned_at,
      status: a.status,
    }));
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

// ─── Revenue ────────────────────────────────────────────────────

/** Global revenue dashboard data */
router.get("/revenue", async (_req, res) => {
  try {
    const entries = await RevenueEntry.find({}).sort({ entry_date: -1 }).lean();
    const totalRevenue = entries.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    const byMonth: Record<string, number> = {};
    entries.forEach((e: any) => {
      const d = new Date(e.entry_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] || 0) + (e.amount || 0);
    });

    res.json({
      total_revenue: totalRevenue,
      currency: "INR",
      entry_count: entries.length,
      by_month: byMonth,
      recent_entries: entries.slice(0, 20).map((e: any) => ({
        ...e,
        id: e._id?.toString(),
        _id: undefined,
        __v: undefined,
      })),
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch revenue data" });
  }
});

/** Revenue by clinic */
router.get("/revenue/by-clinic", async (_req, res) => {
  try {
    const pipeline = [
      { $group: { _id: "$clinic_id", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 as const } },
    ];
    const agg = await RevenueEntry.aggregate(pipeline);
    const clinicIds = agg.map((a: any) => a._id).filter(Boolean);
    const clinics = clinicIds.length ? await Clinic.find({ _id: { $in: clinicIds } }).lean() : [];
    const clinicMap = new Map(clinics.map((c: any) => [c._id.toString(), c]));

    const result = agg.map((a: any) => ({
      clinic_id: a._id,
      clinic_name: (clinicMap.get(a._id) as any)?.name || "Unknown",
      total_revenue: a.total,
      entry_count: a.count,
    }));
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to fetch revenue by clinic" });
  }
});

/** Revenue by program */
router.get("/revenue/by-program", async (_req, res) => {
  try {
    const pipeline = [
      { $group: { _id: "$program_id", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 as const } },
    ];
    const agg = await RevenueEntry.aggregate(pipeline);
    const progIds = agg.map((a: any) => a._id).filter(Boolean);
    const programs = progIds.length ? await Program.find({ _id: { $in: progIds } }).lean() : [];
    const progMap = new Map(programs.map((p: any) => [p._id.toString(), p]));

    const result = agg.map((a: any) => ({
      program_id: a._id,
      program_name: (progMap.get(a._id) as any)?.name || "Unknown",
      total_revenue: a.total,
      entry_count: a.count,
    }));
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to fetch revenue by program" });
  }
});

/** Create revenue entry */
router.post("/revenue", async (req, res) => {
  try {
    const adminId = (req as any).user.id;
    const { clinic_id, doctor_id, program_id, patient_id, enrollment_id, amount, currency, description, entry_date } = req.body;
    if (!clinic_id || !amount) return res.status(400).json({ error: "clinic_id and amount are required" });

    const entry = await RevenueEntry.create({
      clinic_id,
      doctor_id,
      program_id,
      patient_id,
      enrollment_id,
      amount,
      currency: currency || "INR",
      description,
      entered_by: adminId,
      entry_date: entry_date ? new Date(entry_date) : new Date(),
    });
    res.status(201).json(entry);
  } catch {
    res.status(500).json({ error: "Failed to create revenue entry" });
  }
});

// ─── Analytics ──────────────────────────────────────────────────

router.get("/analytics", async (_req, res) => {
  try {
    const [
      totalClinics,
      pendingClinics,
      totalDoctors,
      pendingDoctors,
      totalPatients,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      totalPrograms,
      totalRevenue,
    ] = await Promise.all([
      UserRole.countDocuments({ role: "clinic" }),
      AuthUser.countDocuments({ approval_status: "pending_approval", user_id: { $in: (await UserRole.find({ role: "clinic" }).lean()).map((r: any) => r.user_id) } }),
      UserRole.countDocuments({ role: "doctor" }),
      AuthUser.countDocuments({ approval_status: "pending_approval", user_id: { $in: (await UserRole.find({ role: "doctor" }).lean()).map((r: any) => r.user_id) } }),
      Patient.countDocuments({}),
      Enrollment.countDocuments({}),
      Enrollment.countDocuments({ status: "active" }),
      Enrollment.countDocuments({ status: "completed" }),
      Program.countDocuments({ is_active: true }),
      RevenueEntry.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]).then((r: any[]) => r[0]?.total || 0),
    ]);

    const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

    res.json({
      total_clinics: totalClinics,
      pending_clinics: pendingClinics,
      total_doctors: totalDoctors,
      pending_doctors: pendingDoctors,
      total_patients: totalPatients,
      total_enrollments: totalEnrollments,
      active_enrollments: activeEnrollments,
      completed_enrollments: completedEnrollments,
      completion_rate: completionRate,
      total_programs: totalPrograms,
      total_revenue: totalRevenue,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// ─── List all clinics (for assignment dropdown) ─────────────────

router.get("/all-clinics", async (_req, res) => {
  try {
    const clinics = await Clinic.find({}).lean();
    const result = clinics.map((c: any) => ({
      id: c._id?.toString(),
      name: c.name,
      address: c.address,
      city: c.city,
    }));
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to fetch clinics list" });
  }
});

// ─── Case Management ────────────────────────────────────────────

router.get("/cases", async (req, res) => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    const cases = await Case.find(filter).sort({ createdAt: -1 }).lean();
    const patientIds = [...new Set(cases.map((c: any) => c.patient_user_id))];
    const clinicIds = [...new Set(cases.map((c: any) => c.matched_clinic_id).filter(Boolean))];
    const [profiles, clinics] = await Promise.all([
      patientIds.length ? Profile.find({ user_id: { $in: patientIds } }).lean() : [],
      clinicIds.length ? Clinic.find({ _id: { $in: clinicIds } }).lean() : [],
    ]);
    const profileMap = new Map((profiles as any[]).map((p: any) => [p.user_id, p]));
    const clinicMap = new Map((clinics as any[]).map((c: any) => [c._id.toString(), c]));
    const result = cases.map((c: any) => {
      const profile = profileMap.get(c.patient_user_id) as any;
      const selectedHospital = c.matched_clinic_id
        ? (c.approved_hospitals || []).find((h: any) => h.clinic_id === c.matched_clinic_id)
        : null;
      return {
        ...c,
        id: c._id?.toString(),
        _id: undefined,
        __v: undefined,
        patient_name: profile?.full_name || "Unknown",
        patient_profile_phone: profile?.phone || "",
        matched_clinic_name: c.matched_clinic_id ? (clinicMap.get(c.matched_clinic_id) as any)?.name || null : null,
        selected_hospital_name: selectedHospital?.clinic_name || null,
        selected_hospital_price: selectedHospital?.quoted_price || null,
      };
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to fetch cases" });
  }
});

router.get("/cases/:id", async (req, res) => {
  try {
    const c = await Case.findById(req.params.id).lean();
    if (!c) return res.status(404).json({ error: "Case not found" });
    let clinic = null;
    if ((c as any).matched_clinic_id) {
      clinic = await Clinic.findById((c as any).matched_clinic_id).lean();
    }
    const [patient, authUser] = await Promise.all([
      Profile.findOne({ user_id: (c as any).patient_user_id }).lean(),
      AuthUser.findOne({ user_id: (c as any).patient_user_id }).select("email").lean(),
    ]);
    const selectedHospital = (c as any).matched_clinic_id
      ? ((c as any).approved_hospitals || []).find((h: any) => h.clinic_id === (c as any).matched_clinic_id)
      : null;
    res.json({
      ...(c as any),
      id: (c as any)._id?.toString(),
      _id: undefined,
      __v: undefined,
      patient_name: (patient as any)?.full_name || "Unknown",
      patient_profile_phone: (patient as any)?.phone || "",
      patient_email: (authUser as any)?.email || "",
      matched_clinic: clinic ? { id: (clinic as any)._id?.toString(), name: (clinic as any).name, city: (clinic as any).city } : null,
      selected_hospital_name: selectedHospital?.clinic_name || null,
      selected_hospital_price: selectedHospital?.quoted_price || null,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch case" });
  }
});

router.patch("/cases/:id/assign", async (req, res) => {
  try {
    const adminId = (req as any).user.id;
    const { clinic_id, doctor_id } = req.body;
    if (!clinic_id) return res.status(400).json({ error: "clinic_id is required" });
    const c = await Case.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Case not found" });
    (c as any).matched_clinic_id = clinic_id;
    if (doctor_id) (c as any).matched_doctor_id = doctor_id;
    (c as any).matched_at = new Date();
    (c as any).status = "hospital_matched";
    (c as any).assigned_by = adminId;
    await c.save();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to assign case" });
  }
});

router.patch("/cases/:id/notes", async (req, res) => {
  try {
    const { admin_notes } = req.body;
    await Case.updateOne({ _id: req.params.id }, { $set: { admin_notes } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update notes" });
  }
});

router.patch("/cases/:id/status", async (req, res) => {
  try {
    const { status, message } = req.body;
    if (!status) return res.status(400).json({ error: "status is required" });
    const c = await Case.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Case not found" });
    (c as any).status = status;
    (c as any).status_history = [
      ...((c as any).status_history || []),
      { status, message: message || `Status changed to ${status}`, timestamp: new Date() },
    ];
    await c.save();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update status" });
  }
});

router.post("/cases/:id/approved-hospitals", async (req, res) => {
  try {
    const { clinic_id, quoted_price, treatment_includes, estimated_duration, notes } = req.body;
    if (!clinic_id) return res.status(400).json({ error: "clinic_id is required" });
    const c = await Case.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Case not found" });

    const clinic = await Clinic.findById(clinic_id).lean();
    if (!clinic) return res.status(404).json({ error: "Hospital not found" });

    const existing = ((c as any).approved_hospitals || []).find(
      (h: any) => h.clinic_id === clinic_id
    );
    if (existing) return res.status(400).json({ error: "Hospital already added to this case" });

    const entry = {
      clinic_id,
      clinic_name: (clinic as any).name,
      city: (clinic as any).city || "",
      quoted_price: quoted_price || 0,
      treatment_includes: treatment_includes || "",
      estimated_duration: estimated_duration || "",
      notes: notes || "",
      approved_at: new Date(),
    };
    (c as any).approved_hospitals = [...((c as any).approved_hospitals || []), entry];

    if ((c as any).status === "submitted" || (c as any).status === "reviewing") {
      (c as any).status = "hospital_matched";
      (c as any).status_history = [
        ...((c as any).status_history || []),
        {
          status: "hospital_matched",
          message: `Mediimate found hospital options for your treatment. Check your dashboard.`,
          timestamp: new Date(),
        },
      ];
    }
    await c.save();
    res.json({ success: true, approved_hospitals: (c as any).approved_hospitals });
  } catch {
    res.status(500).json({ error: "Failed to add hospital" });
  }
});

router.delete("/cases/:id/approved-hospitals/:clinicId", async (req, res) => {
  try {
    const c = await Case.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Case not found" });
    (c as any).approved_hospitals = ((c as any).approved_hospitals || []).filter(
      (h: any) => h.clinic_id !== req.params.clinicId
    );
    await c.save();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to remove hospital" });
  }
});

export default router;

/**
 * Auth routes mounted first under /api so register and login are always available.
 */
import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthUser, Clinic, ClinicMember, Patient, Profile, UserRole } from "../models/index.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

/** GET /api/health - verify this app and /api auth routes are deployed (no auth required) */
router.get("/health", (_req, res) => {
  res.json({ ok: true, auth: true, message: "Plan Partner API with auth routes" });
});

router.post("/auth/register", async (req, res) => {
  const { email, password, full_name, role, clinic_name, address, phone } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  const phoneTrimmed = phone != null ? String(phone).trim() : "";
  if (!phoneTrimmed) {
    return res.status(400).json({ error: "Phone number is required" });
  }
  const existing = await AuthUser.findOne({ email: (email as string).toLowerCase() }).lean();
  if (existing) return res.status(400).json({ error: "Email already registered" });

  const roleChoice = role === "patient" ? "patient" : role === "clinic" ? "clinic" : "doctor";
  const user_id = crypto.randomUUID();
  const password_hash = await bcrypt.hash(password, 10);

  if (roleChoice === "clinic") {
    if (!clinic_name || String(clinic_name).trim() === "") {
      return res.status(400).json({ error: "Clinic name is required for clinic signup" });
    }
    const clinicDoc = await Clinic.create({
      name: String(clinic_name).trim(),
      address: address ? String(address).trim() : undefined,
      phone: phoneTrimmed,
      created_by: user_id,
    });
    const clinicId = clinicDoc._id.toString();
    await AuthUser.create({ email: (email as string).toLowerCase(), password_hash, user_id, clinic_id: clinicId });
    await Profile.create({ user_id, full_name: String(clinic_name).trim() });
    await UserRole.create({ user_id, role: "clinic", clinic_id: clinicId });
  } else {
    await AuthUser.create({ email: (email as string).toLowerCase(), password_hash, user_id });
    await Profile.create({ user_id, full_name: full_name || "", phone: phoneTrimmed });
    await UserRole.create({ user_id, role: roleChoice });

    if (roleChoice === "patient") {
      const existingPatient = await Patient.findOne({ patient_user_id: user_id }).lean();
      if (!existingPatient) {
        await Patient.create({
          patient_user_id: user_id,
          doctor_id: user_id,
          full_name: full_name || "Patient",
          phone: phoneTrimmed,
          status: "active",
        });
      }
    }
  }

  const token = jwt.sign({ sub: user_id }, JWT_SECRET, { expiresIn: "7d" });
  return res.status(201).json({ token, user: { id: user_id, email: (email as string).toLowerCase() } });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const emailNorm = String(email).trim().toLowerCase();
  const authUser = await AuthUser.findOne({ email: emailNorm }).lean();
  if (!authUser) return res.status(401).json({ error: "Invalid email or password" });

  const ok = await bcrypt.compare(password, (authUser as any).password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  const token = jwt.sign({ sub: (authUser as any).user_id }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token, user: { id: (authUser as any).user_id, email: (authUser as any).email } });
});

export default router;

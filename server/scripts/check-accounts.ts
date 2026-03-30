import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { AuthUser } from "../models/index.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/plan-partner";
await mongoose.connect(MONGODB_URI);

const accounts = [
  { email: "demo@mediimate.in", password: "Demo1234!" },
  { email: "doc@mediimate.in", password: "DocDemo1234!" },
  { email: "admin@mediimate.com", password: "Test1234!" },
];

for (const { email, password } of accounts) {
  const u = await AuthUser.findOne({ email }).lean() as any;
  if (!u) {
    console.log(`${email} → NOT FOUND in DB`);
    continue;
  }
  const ok = await bcrypt.compare(password, u.password_hash);
  console.log(`${email} → found | pw_ok=${ok} | approval_status=${u.approval_status} | email_verified=${u.email_verified}`);
}

await mongoose.disconnect();

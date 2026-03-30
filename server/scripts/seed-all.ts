/**
 * Master seed — run this once to restore all demo data.
 * Run: cd server && npx tsx scripts/seed-all.ts
 *
 * Order:
 *   1. seed-mediimate.ts  — hospital, programs, condition definitions
 *   2. seed-db.ts         — doctor profile, sample clinic data
 *   3. seed-careplan.ts   — 30-day diabetes plan + demo patient (demo@mediimate.in)
 *   4. seed-demodoc.ts    — demo doctor login (doc@mediimate.in)
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const scripts = [
  "seed-mediimate.ts",
  "seed-db.ts",
  "seed-careplan.ts",
  "seed-demodoc.ts",
  "seed-demo-patients.ts",
  "seed-fix-doctor-careplans.ts",
];

for (const script of scripts) {
  const scriptPath = path.join(__dirname, script);
  console.log(`\n${"─".repeat(60)}`);
  console.log(`▶ Running ${script}...`);
  console.log("─".repeat(60));
  try {
    execSync(`npx tsx "${scriptPath}"`, { stdio: "inherit", cwd: path.join(__dirname, "..") });
    console.log(`✅ ${script} done`);
  } catch (err) {
    console.error(`❌ ${script} FAILED — see error above`);
    process.exit(1);
  }
}

console.log("\n" + "═".repeat(60));
console.log("✅ All seeds complete! Demo credentials:");
console.log("  Patient: demo@mediimate.in     / Demo1234!");
console.log("  Doctor:  doc@mediimate.in      / DocDemo1234!");
console.log("  Admin:   admin@mediimate.com   / Test1234!");
console.log("  Demo 1-15: demo1@gmail.com … demo15@gmail.com / Demo1234!");
console.log("═".repeat(60));

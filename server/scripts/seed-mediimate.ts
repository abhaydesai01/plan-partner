/**
 * Seeds Mediimate data: 12 hospitals, doctors, reviews,
 * treatment conditions, programs, and sample patient cases with approved hospitals.
 * Run: cd server && npx tsx scripts/seed-mediimate.ts
 */
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/plan-partner";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");
  const db = mongoose.connection.db!;
  const passwordHash = await bcrypt.hash("Test1234!", 10);

  // ─── Treatment Conditions Lookup ────────────────────────────
  const conditions = [
    { condition: "Knee Replacement", specialty: "Orthopedics", keywords: ["knee", "joint", "arthroplasty", "osteoarthritis", "tkr"], category: "Orthopedics" },
    { condition: "Hip Replacement", specialty: "Orthopedics", keywords: ["hip", "arthroplasty", "joint"], category: "Orthopedics" },
    { condition: "Cardiac Bypass (CABG)", specialty: "Cardiology", keywords: ["cabg", "bypass", "heart", "coronary", "cardiac"], category: "Cardiac" },
    { condition: "Angioplasty", specialty: "Cardiology", keywords: ["angioplasty", "stent", "coronary", "heart"], category: "Cardiac" },
    { condition: "Heart Valve Replacement", specialty: "Cardiology", keywords: ["valve", "heart", "mitral", "aortic"], category: "Cardiac" },
    { condition: "Liver Transplant", specialty: "Transplant Surgery", keywords: ["liver", "transplant", "hepatic", "cirrhosis"], category: "Transplant" },
    { condition: "Kidney Transplant", specialty: "Renal Sciences", keywords: ["kidney", "renal", "transplant", "dialysis"], category: "Transplant" },
    { condition: "Dental Implants", specialty: "Dental", keywords: ["dental", "implant", "tooth", "teeth"], category: "Dental" },
    { condition: "Spinal Disc Surgery", specialty: "Neurosciences", keywords: ["spine", "spinal", "disc", "herniation", "sciatica", "back"], category: "Spine" },
    { condition: "Brain Tumor Surgery", specialty: "Neurosciences", keywords: ["brain", "tumor", "neurosurgery", "craniotomy"], category: "Neurology" },
    { condition: "Breast Cancer Treatment", specialty: "Cancer Care", keywords: ["breast", "cancer", "oncology", "mastectomy"], category: "Oncology" },
    { condition: "Prostate Cancer Treatment", specialty: "Cancer Care", keywords: ["prostate", "cancer", "oncology"], category: "Oncology" },
    { condition: "Bariatric Surgery", specialty: "Bariatric Surgery", keywords: ["bariatric", "weight", "obesity", "gastric", "sleeve"], category: "Bariatric" },
    { condition: "Cataract Surgery", specialty: "Ophthalmology", keywords: ["cataract", "eye", "lens", "vision"], category: "Ophthalmology" },
    { condition: "IVF / Fertility Treatment", specialty: "Fertility", keywords: ["ivf", "fertility", "infertility", "embryo", "egg"], category: "Fertility" },
    { condition: "Cosmetic Surgery", specialty: "Cosmetic Surgery", keywords: ["cosmetic", "plastic", "rhinoplasty", "liposuction"], category: "Cosmetic" },
    { condition: "Hair Transplant", specialty: "Dermatology", keywords: ["hair", "transplant", "baldness", "fue", "fut"], category: "Dermatology" },
  ];

  await db.collection("treatmentconditions").deleteMany({});
  await db.collection("treatmentconditions").insertMany(
    conditions.map((c) => ({ ...c, createdAt: new Date(), updatedAt: new Date() }))
  );
  console.log(`Seeded ${conditions.length} treatment conditions`);

  // ─── Programs ───────────────────────────────────────────────
  const programDefs = [
    { name: "Post-Cardiac Surgery Recovery", description: "12-week guided rehab, medication tracking, and remote monitoring.", category: "Cardiac", duration_days: 84, is_active: true, type: "recovery" },
    { name: "Knee Replacement Rehab", description: "8-week physiotherapy and recovery program.", category: "Orthopedics", duration_days: 56, is_active: true, type: "recovery" },
    { name: "Dental Continuity Program", description: "6-month follow-up with check-ups and care guidance.", category: "Dental", duration_days: 180, is_active: true, type: "continuity" },
    { name: "Cancer Aftercare", description: "Survivorship program with scans, nutrition, and support.", category: "Oncology", duration_days: 365, is_active: true, type: "continuity" },
    { name: "Post-Transplant Monitoring", description: "12-month medication management and lab tracking.", category: "Transplant", duration_days: 365, is_active: true, type: "monitoring" },
  ];

  const programIds: string[] = [];
  for (const p of programDefs) {
    const existing = await db.collection("programs").findOne({ name: p.name });
    if (existing) {
      programIds.push(existing._id.toString());
    } else {
      const r = await db.collection("programs").insertOne({
        ...p,
        phases: [{ name: "Phase 1", phase_type: "onboarding", duration_days: Math.floor(p.duration_days / 3), tasks: [{ title: "Initial Assessment", frequency: "once", description: "Complete initial health assessment" }] }],
        created_by: "system",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      programIds.push(r.insertedId.toString());
    }
  }
  console.log(`Programs ready: ${programIds.length}`);

  // ─── 12 Hospitals with full structured data ────────────────
  const hospitals = [
    {
      name: "Apollo Hospitals",
      city: "Chennai",
      country: "India",
      address: "21 Greams Lane, Off Greams Road, Chennai",
      description: "One of Asia's largest healthcare groups with 10,000+ beds across 73 hospitals. Pioneers in cardiac surgery, organ transplants, and robotic surgery.",
      specialties: ["Cardiology", "Orthopedics", "Oncology", "Neurology", "Transplant Surgery", "Dental"],
      price_range_min: 50000, price_range_max: 2500000,
      accreditations: ["NABH", "JCI", "ISO 9001"],
      bed_count: 700, established_year: 1983,
      is_public_listed: true,
      phone: "+91-44-28290200", email: "info@apollohospitals.com", website: "https://www.apollohospitals.com",
      rating_avg: 4.5, total_reviews: 3,
      treatments_offered: ["Knee Replacement", "Hip Replacement", "Cardiac Bypass (CABG)", "Angioplasty", "Heart Valve Replacement", "Liver Transplant", "Dental Implants", "Spinal Disc Surgery", "Breast Cancer Treatment", "Bariatric Surgery", "Cataract Surgery"],
      success_rates: { "Knee Replacement": 97, "Cardiac Bypass (CABG)": 96, "Liver Transplant": 88, "Angioplasty": 98 },
      patient_volume: 45000,
      facilities: ["ICU", "Laminar Flow OT", "Rehab Center", "PET-CT Scan", "Robotic Surgery Suite", "Cardiac Cath Lab", "24/7 Pharmacy", "International Lounge"],
      international_patient_count: 8500,
      international_support: { travel_assistance: true, airport_pickup: true, translator_available: true, visa_assistance: true, remote_followup: true, supported_countries: ["Middle East", "Africa", "Southeast Asia"] },
      program_ids: [programIds[0], programIds[1]],
      average_cost_by_treatment: { "Knee Replacement": 350000, "Cardiac Bypass (CABG)": 550000, "Liver Transplant": 2200000, "Angioplasty": 250000, "Dental Implants": 45000 },
      completion_rate: 92, patient_satisfaction: 91, response_time_hours: 4,
    },
    {
      name: "Fortis Memorial Research Institute",
      city: "Gurgaon",
      country: "India",
      address: "Sector 44, Opposite HUDA City Centre, Gurgaon",
      description: "Multi-super speciality quaternary care hospital with 1000+ beds. Flagship of Fortis Healthcare.",
      specialties: ["Cardiac Sciences", "Neurosciences", "Orthopedics", "Renal Sciences", "Transplant Surgery"],
      price_range_min: 60000, price_range_max: 3000000,
      accreditations: ["NABH", "JCI"],
      bed_count: 1000, established_year: 2001,
      is_public_listed: true,
      phone: "+91-124-4962200", email: "info@fortishealthcare.com", website: "https://www.fortishealthcare.com",
      rating_avg: 4.3, total_reviews: 2,
      treatments_offered: ["Cardiac Bypass (CABG)", "Heart Valve Replacement", "Kidney Transplant", "Liver Transplant", "Brain Tumor Surgery", "Knee Replacement", "Spinal Disc Surgery", "Angioplasty"],
      success_rates: { "Cardiac Bypass (CABG)": 95, "Liver Transplant": 90, "Kidney Transplant": 93, "Knee Replacement": 96 },
      patient_volume: 38000,
      facilities: ["ICU", "NICU", "Robotic Surgery Suite", "Gamma Knife", "Cardiac Cath Lab", "Dialysis Unit", "24/7 Emergency"],
      international_patient_count: 6200,
      international_support: { travel_assistance: true, airport_pickup: true, translator_available: true, visa_assistance: true, remote_followup: true, supported_countries: ["Middle East", "Africa", "CIS Countries"] },
      program_ids: [programIds[0], programIds[4]],
      average_cost_by_treatment: { "Cardiac Bypass (CABG)": 600000, "Liver Transplant": 2500000, "Kidney Transplant": 1200000, "Knee Replacement": 400000 },
      completion_rate: 89, patient_satisfaction: 88, response_time_hours: 6,
    },
    {
      name: "Manipal Hospitals",
      city: "Bangalore",
      country: "India",
      address: "98, HAL Old Airport Road, Bangalore",
      description: "One of India's leading multi-specialty providers serving 4.5 million patients annually. Expertise in cancer care and cardiac sciences.",
      specialties: ["Cancer Care", "Cardiac Sciences", "Neurosciences", "Organ Transplant", "Bariatric Surgery", "Orthopedics", "Fertility"],
      price_range_min: 40000, price_range_max: 2000000,
      accreditations: ["NABH", "ISO 14001"],
      bed_count: 600, established_year: 1991,
      is_public_listed: true,
      phone: "+91-80-25023456", email: "info@manipalhospitals.com", website: "https://www.manipalhospitals.com",
      rating_avg: 4.2, total_reviews: 2,
      treatments_offered: ["Breast Cancer Treatment", "Prostate Cancer Treatment", "Cardiac Bypass (CABG)", "Knee Replacement", "Hip Replacement", "Bariatric Surgery", "IVF / Fertility Treatment", "Spinal Disc Surgery", "Cataract Surgery"],
      success_rates: { "Breast Cancer Treatment": 91, "Cardiac Bypass (CABG)": 94, "Knee Replacement": 95, "IVF / Fertility Treatment": 52 },
      patient_volume: 32000,
      facilities: ["ICU", "Cancer Center", "IVF Lab", "Cardiac Cath Lab", "Physiotherapy", "24/7 Emergency", "Blood Bank"],
      international_patient_count: 3200,
      international_support: { travel_assistance: true, airport_pickup: false, translator_available: true, visa_assistance: false, remote_followup: true, supported_countries: ["Africa", "Southeast Asia"] },
      program_ids: [programIds[1], programIds[3]],
      average_cost_by_treatment: { "Knee Replacement": 300000, "Cardiac Bypass (CABG)": 480000, "Breast Cancer Treatment": 500000, "IVF / Fertility Treatment": 180000 },
      completion_rate: 87, patient_satisfaction: 85, response_time_hours: 8,
    },
    {
      name: "Max Super Speciality Hospital",
      city: "New Delhi",
      country: "India",
      address: "1, Press Enclave Road, Saket, New Delhi",
      description: "North India's premier super speciality hospital. Known for advanced cardiac care, liver transplants, and neurosurgery.",
      specialties: ["Cardiology", "Neurology", "Liver Transplant", "Orthopedics", "Oncology"],
      price_range_min: 55000, price_range_max: 2800000,
      accreditations: ["NABH", "JCI"],
      bed_count: 500, established_year: 2006,
      is_public_listed: true,
      phone: "+91-11-26515050", email: "info@maxhealthcare.com", website: "https://www.maxhealthcare.in",
      rating_avg: 4.4, total_reviews: 0,
      treatments_offered: ["Cardiac Bypass (CABG)", "Angioplasty", "Liver Transplant", "Knee Replacement", "Hip Replacement", "Brain Tumor Surgery", "Bariatric Surgery"],
      success_rates: { "Cardiac Bypass (CABG)": 95, "Liver Transplant": 91, "Knee Replacement": 97 },
      patient_volume: 35000,
      facilities: ["ICU", "Cardiac Cath Lab", "Robotic Surgery Suite", "Liver Transplant Unit", "24/7 Emergency", "Rehab Center"],
      international_patient_count: 5800,
      international_support: { travel_assistance: true, airport_pickup: true, translator_available: true, visa_assistance: true, remote_followup: true, supported_countries: ["Middle East", "Africa", "Central Asia"] },
      program_ids: [programIds[0]],
      average_cost_by_treatment: { "Cardiac Bypass (CABG)": 520000, "Liver Transplant": 2300000, "Knee Replacement": 380000, "Angioplasty": 230000 },
      completion_rate: 91, patient_satisfaction: 90, response_time_hours: 5,
    },
    {
      name: "Medanta - The Medicity",
      city: "Gurgaon",
      country: "India",
      address: "CH Baktawar Singh Rd, Sector 38, Gurgaon",
      description: "1600-bed multi-super speciality institute founded by Dr. Naresh Trehan. Renowned for cardiac, neuro, and transplant procedures.",
      specialties: ["Cardiac Surgery", "Neurosciences", "Kidney Transplant", "Liver Transplant", "Orthopedics", "Cancer Care"],
      price_range_min: 65000, price_range_max: 3500000,
      accreditations: ["NABH", "JCI", "ISO 9001"],
      bed_count: 1600, established_year: 2009,
      is_public_listed: true,
      phone: "+91-124-4141414", email: "info@medanta.org", website: "https://www.medanta.org",
      rating_avg: 4.6, total_reviews: 0,
      treatments_offered: ["Cardiac Bypass (CABG)", "Heart Valve Replacement", "Kidney Transplant", "Liver Transplant", "Knee Replacement", "Brain Tumor Surgery", "Prostate Cancer Treatment"],
      success_rates: { "Cardiac Bypass (CABG)": 97, "Kidney Transplant": 95, "Liver Transplant": 92, "Heart Valve Replacement": 96 },
      patient_volume: 42000,
      facilities: ["ICU", "Cardiac Cath Lab", "Robotic Surgery", "Gamma Knife", "Transplant Unit", "Dialysis", "24/7 Emergency", "International Ward"],
      international_patient_count: 7500,
      international_support: { travel_assistance: true, airport_pickup: true, translator_available: true, visa_assistance: true, remote_followup: true, supported_countries: ["Middle East", "Africa", "CIS", "SAARC"] },
      program_ids: [programIds[0], programIds[4]],
      average_cost_by_treatment: { "Cardiac Bypass (CABG)": 580000, "Kidney Transplant": 1100000, "Liver Transplant": 2400000, "Knee Replacement": 420000 },
      completion_rate: 93, patient_satisfaction: 92, response_time_hours: 3,
    },
    {
      name: "Narayana Health",
      city: "Bangalore",
      country: "India",
      address: "258/A, Bommasandra Industrial Area, Hosur Road, Bangalore",
      description: "Founded by Dr. Devi Shetty, known for affordable world-class cardiac care. Performs 14,000+ cardiac surgeries annually.",
      specialties: ["Cardiac Sciences", "Orthopedics", "Neurology", "Cancer Care", "Nephrology"],
      price_range_min: 30000, price_range_max: 1800000,
      accreditations: ["NABH", "ISO 9001"],
      bed_count: 800, established_year: 2000,
      is_public_listed: true,
      phone: "+91-80-71222222", email: "info@narayanahealth.org", website: "https://www.narayanahealth.org",
      rating_avg: 4.3, total_reviews: 0,
      treatments_offered: ["Cardiac Bypass (CABG)", "Angioplasty", "Heart Valve Replacement", "Knee Replacement", "Brain Tumor Surgery", "Kidney Transplant", "Cataract Surgery"],
      success_rates: { "Cardiac Bypass (CABG)": 96, "Angioplasty": 97, "Knee Replacement": 94, "Kidney Transplant": 91 },
      patient_volume: 50000,
      facilities: ["ICU", "Cardiac Cath Lab", "OT Complex", "Physiotherapy", "24/7 Emergency", "Blood Bank", "Dialysis"],
      international_patient_count: 4500,
      international_support: { travel_assistance: true, airport_pickup: true, translator_available: false, visa_assistance: true, remote_followup: true, supported_countries: ["Africa", "Bangladesh", "Myanmar"] },
      program_ids: [programIds[0]],
      average_cost_by_treatment: { "Cardiac Bypass (CABG)": 380000, "Angioplasty": 180000, "Knee Replacement": 250000, "Kidney Transplant": 900000 },
      completion_rate: 90, patient_satisfaction: 89, response_time_hours: 6,
    },
    {
      name: "Kokilaben Dhirubhai Ambani Hospital",
      city: "Mumbai",
      country: "India",
      address: "Rao Saheb, Achutrao Patwardhan Marg, Four Bungalows, Andheri (W), Mumbai",
      description: "Multi-speciality hospital with cutting-edge technology. Known for cancer treatment, robotic surgery, and neurosciences.",
      specialties: ["Oncology", "Neurosciences", "Cardiac Sciences", "Orthopedics", "Bariatric Surgery", "Cosmetic Surgery"],
      price_range_min: 55000, price_range_max: 2500000,
      accreditations: ["NABH", "JCI"],
      bed_count: 750, established_year: 2009,
      is_public_listed: true,
      phone: "+91-22-30999999", email: "info@kokilabenhospital.com", website: "https://www.kokilabenhospital.com",
      rating_avg: 4.4, total_reviews: 0,
      treatments_offered: ["Breast Cancer Treatment", "Prostate Cancer Treatment", "Cardiac Bypass (CABG)", "Brain Tumor Surgery", "Knee Replacement", "Bariatric Surgery", "Cosmetic Surgery", "Spinal Disc Surgery"],
      success_rates: { "Breast Cancer Treatment": 93, "Brain Tumor Surgery": 89, "Cardiac Bypass (CABG)": 95, "Bariatric Surgery": 97 },
      patient_volume: 28000,
      facilities: ["ICU", "CyberKnife", "Robotic Surgery", "PET-CT", "Cardiac Cath Lab", "IVF Center", "24/7 Emergency"],
      international_patient_count: 3800,
      international_support: { travel_assistance: true, airport_pickup: true, translator_available: true, visa_assistance: false, remote_followup: true, supported_countries: ["Middle East", "UK", "USA"] },
      program_ids: [programIds[3]],
      average_cost_by_treatment: { "Breast Cancer Treatment": 550000, "Cardiac Bypass (CABG)": 600000, "Brain Tumor Surgery": 750000, "Bariatric Surgery": 380000, "Knee Replacement": 400000 },
      completion_rate: 88, patient_satisfaction: 90, response_time_hours: 5,
    },
    {
      name: "AIIMS New Delhi",
      city: "New Delhi",
      country: "India",
      address: "Sri Aurobindo Marg, Ansari Nagar, New Delhi",
      description: "India's premier government medical institute and hospital. World-class treatment at affordable rates with top medical faculty.",
      specialties: ["Cardiology", "Neurosciences", "Oncology", "Orthopedics", "Gastroenterology", "Nephrology"],
      price_range_min: 10000, price_range_max: 500000,
      accreditations: ["NABH"],
      bed_count: 2500, established_year: 1956,
      is_public_listed: true,
      phone: "+91-11-26588500", email: "info@aiims.edu", website: "https://www.aiims.edu",
      rating_avg: 4.1, total_reviews: 0,
      treatments_offered: ["Cardiac Bypass (CABG)", "Kidney Transplant", "Liver Transplant", "Brain Tumor Surgery", "Knee Replacement", "Breast Cancer Treatment", "Cataract Surgery"],
      success_rates: { "Cardiac Bypass (CABG)": 94, "Kidney Transplant": 92, "Brain Tumor Surgery": 88 },
      patient_volume: 80000,
      facilities: ["ICU", "Trauma Center", "Cancer Center", "Transplant Unit", "Physiotherapy", "24/7 Emergency", "Blood Bank"],
      international_patient_count: 2000,
      international_support: { travel_assistance: false, airport_pickup: false, translator_available: true, visa_assistance: false, remote_followup: false, supported_countries: ["SAARC"] },
      program_ids: [],
      average_cost_by_treatment: { "Cardiac Bypass (CABG)": 150000, "Kidney Transplant": 400000, "Knee Replacement": 120000, "Brain Tumor Surgery": 250000 },
      completion_rate: 85, patient_satisfaction: 78, response_time_hours: 24,
    },
    {
      name: "Aster CMI Hospital",
      city: "Bangalore",
      country: "India",
      address: "No 43/2, New Airport Road, NH-7, Sahakara Nagar, Bangalore",
      description: "State-of-the-art multi-speciality hospital from the Aster DM Healthcare group. Expertise in orthopedics, gastro, and cardiac care.",
      specialties: ["Orthopedics", "Gastroenterology", "Cardiac Sciences", "Neurology", "Pulmonology"],
      price_range_min: 35000, price_range_max: 1500000,
      accreditations: ["NABH"],
      bed_count: 500, established_year: 2014,
      is_public_listed: true,
      phone: "+91-80-43420100", email: "info@astercmi.com", website: "https://www.asterhospitals.in",
      rating_avg: 4.2, total_reviews: 0,
      treatments_offered: ["Knee Replacement", "Hip Replacement", "Cardiac Bypass (CABG)", "Angioplasty", "Spinal Disc Surgery", "Bariatric Surgery", "Cataract Surgery"],
      success_rates: { "Knee Replacement": 96, "Cardiac Bypass (CABG)": 93, "Hip Replacement": 95 },
      patient_volume: 22000,
      facilities: ["ICU", "Cardiac Cath Lab", "Endoscopy Suite", "Physiotherapy", "24/7 Emergency", "Day Care"],
      international_patient_count: 1800,
      international_support: { travel_assistance: true, airport_pickup: false, translator_available: true, visa_assistance: false, remote_followup: true, supported_countries: ["Middle East", "Africa"] },
      program_ids: [programIds[1]],
      average_cost_by_treatment: { "Knee Replacement": 280000, "Cardiac Bypass (CABG)": 450000, "Hip Replacement": 320000, "Spinal Disc Surgery": 250000 },
      completion_rate: 88, patient_satisfaction: 86, response_time_hours: 8,
    },
    {
      name: "Lilavati Hospital",
      city: "Mumbai",
      country: "India",
      address: "A-791, Bandra Reclamation, Bandra (W), Mumbai",
      description: "One of Mumbai's most trusted private hospitals since 1978. Known for cardiology, oncology, and orthopedic excellence.",
      specialties: ["Cardiology", "Oncology", "Orthopedics", "Neurosurgery", "Gastroenterology"],
      price_range_min: 50000, price_range_max: 2000000,
      accreditations: ["NABH"],
      bed_count: 314, established_year: 1978,
      is_public_listed: true,
      phone: "+91-22-26568000", email: "info@lilavatihospital.com", website: "https://www.lilavatihospital.com",
      rating_avg: 4.3, total_reviews: 0,
      treatments_offered: ["Cardiac Bypass (CABG)", "Angioplasty", "Knee Replacement", "Brain Tumor Surgery", "Breast Cancer Treatment", "Bariatric Surgery", "Dental Implants"],
      success_rates: { "Cardiac Bypass (CABG)": 94, "Angioplasty": 97, "Knee Replacement": 95 },
      patient_volume: 25000,
      facilities: ["ICU", "Cardiac Cath Lab", "OT Complex", "Physiotherapy", "24/7 Emergency", "Dialysis"],
      international_patient_count: 2200,
      international_support: { travel_assistance: true, airport_pickup: true, translator_available: true, visa_assistance: false, remote_followup: true, supported_countries: ["Middle East", "UK"] },
      program_ids: [],
      average_cost_by_treatment: { "Cardiac Bypass (CABG)": 550000, "Angioplasty": 220000, "Knee Replacement": 360000, "Brain Tumor Surgery": 700000 },
      completion_rate: 89, patient_satisfaction: 87, response_time_hours: 6,
    },
    {
      name: "Amrita Hospital",
      city: "Faridabad",
      country: "India",
      address: "Amrita Hospital Road, Sector 88, Faridabad, Haryana",
      description: "India's largest private hospital with 2600 beds. Part of Amrita Vishwa Vidyapeetham. Cutting-edge technology with compassionate care.",
      specialties: ["Cardiac Sciences", "Oncology", "Organ Transplant", "Neurosciences", "Orthopedics", "Gastroenterology"],
      price_range_min: 40000, price_range_max: 2500000,
      accreditations: ["NABH", "ISO 9001"],
      bed_count: 2600, established_year: 2022,
      is_public_listed: true,
      phone: "+91-129-2858000", email: "info@amritahospital.org", website: "https://www.amritahospital.org",
      rating_avg: 4.3, total_reviews: 0,
      treatments_offered: ["Cardiac Bypass (CABG)", "Liver Transplant", "Kidney Transplant", "Knee Replacement", "Brain Tumor Surgery", "Breast Cancer Treatment", "Heart Valve Replacement"],
      success_rates: { "Cardiac Bypass (CABG)": 95, "Liver Transplant": 89, "Kidney Transplant": 93 },
      patient_volume: 30000,
      facilities: ["ICU", "Robotic Surgery Suite", "Transplant Unit", "Cancer Center", "Cardiac Cath Lab", "24/7 Emergency", "Helipad"],
      international_patient_count: 2800,
      international_support: { travel_assistance: true, airport_pickup: true, translator_available: true, visa_assistance: true, remote_followup: true, supported_countries: ["Middle East", "Africa", "SAARC"] },
      program_ids: [programIds[0], programIds[4]],
      average_cost_by_treatment: { "Cardiac Bypass (CABG)": 500000, "Liver Transplant": 2100000, "Kidney Transplant": 1000000, "Knee Replacement": 320000 },
      completion_rate: 90, patient_satisfaction: 88, response_time_hours: 5,
    },
    {
      name: "Christian Medical College (CMC)",
      city: "Vellore",
      country: "India",
      address: "Ida Scudder Road, Vellore, Tamil Nadu",
      description: "Premier medical institution founded in 1900. Globally recognized for transplants, hematology, and affordable tertiary care.",
      specialties: ["Transplant Surgery", "Hematology", "Cardiac Sciences", "Orthopedics", "Neurology", "Nephrology"],
      price_range_min: 20000, price_range_max: 1500000,
      accreditations: ["NABH", "NAAC A++"],
      bed_count: 2700, established_year: 1900,
      is_public_listed: true,
      phone: "+91-416-2281000", email: "info@cmcvellore.ac.in", website: "https://www.cmch-vellore.edu",
      rating_avg: 4.5, total_reviews: 0,
      treatments_offered: ["Kidney Transplant", "Liver Transplant", "Cardiac Bypass (CABG)", "Knee Replacement", "Brain Tumor Surgery", "Spinal Disc Surgery", "Breast Cancer Treatment"],
      success_rates: { "Kidney Transplant": 95, "Liver Transplant": 90, "Cardiac Bypass (CABG)": 94 },
      patient_volume: 60000,
      facilities: ["ICU", "Transplant Unit", "Cancer Center", "Physiotherapy", "24/7 Emergency", "Blood Bank", "Research Labs"],
      international_patient_count: 3500,
      international_support: { travel_assistance: true, airport_pickup: false, translator_available: true, visa_assistance: false, remote_followup: true, supported_countries: ["Africa", "Southeast Asia", "Middle East"] },
      program_ids: [programIds[4]],
      average_cost_by_treatment: { "Kidney Transplant": 800000, "Liver Transplant": 1800000, "Cardiac Bypass (CABG)": 350000, "Knee Replacement": 200000 },
      completion_rate: 91, patient_satisfaction: 90, response_time_hours: 12,
    },
  ];

  const clinicIds: string[] = [];
  for (const h of hospitals) {
    const existing = await db.collection("clinics").findOne({ name: h.name });
    if (existing) {
      await db.collection("clinics").updateOne({ _id: existing._id }, { $set: { ...h, updatedAt: new Date() } });
      clinicIds.push(existing._id.toString());
      console.log(`Updated: ${h.name}`);
    } else {
      const dummyUserId = crypto.randomUUID();
      const result = await db.collection("clinics").insertOne({ ...h, created_by: dummyUserId, createdAt: new Date(), updatedAt: new Date() });
      clinicIds.push(result.insertedId.toString());
      console.log(`Created: ${h.name}`);
    }
  }

  // ─── Doctors ────────────────────────────────────────────────
  const doctorData = [
    { name: "Dr. Priya Sharma", specialties: ["Cardiology", "Interventional Cardiology"], bio: "Senior cardiologist with 18 years of experience in complex cardiac interventions.", experience_years: 18, languages: ["English", "Hindi"], hospitalIdx: 0 },
    { name: "Dr. Rajesh Kumar", specialties: ["Orthopedics", "Joint Replacement"], bio: "Robotic-assisted joint replacement specialist. 2000+ surgeries.", experience_years: 15, languages: ["English", "Hindi", "Tamil"], hospitalIdx: 0 },
    { name: "Dr. Lakshmi Venkat", specialties: ["Dental", "Implantology"], bio: "Full-mouth rehabilitation and cosmetic dentistry expert.", experience_years: 10, languages: ["English", "Tamil"], hospitalIdx: 0 },
    { name: "Dr. Ananya Patel", specialties: ["Neurology", "Neurosciences"], bio: "Stroke treatment and brain tumor specialist.", experience_years: 12, languages: ["English", "Hindi", "Gujarati"], hospitalIdx: 1 },
    { name: "Dr. Vikram Singh", specialties: ["Gastroenterology", "Transplant Surgery"], bio: "500+ liver transplants. Advanced endoscopic procedures.", experience_years: 20, languages: ["English", "Hindi", "Punjabi"], hospitalIdx: 1 },
    { name: "Dr. Sanjay Gupta", specialties: ["Renal Sciences", "Kidney Transplant"], bio: "Nephrology expert. Pioneer of paired kidney exchange.", experience_years: 16, languages: ["English", "Hindi"], hospitalIdx: 1 },
    { name: "Dr. Meera Reddy", specialties: ["Cancer Care", "Surgical Oncology"], bio: "Robotic cancer surgery specialist. 1500+ cancer surgeries.", experience_years: 14, languages: ["English", "Kannada", "Telugu"], hospitalIdx: 2 },
    { name: "Dr. Arun Nair", specialties: ["Cardiac Sciences", "CABG Surgery"], bio: "3000+ open heart surgeries. Off-pump CABG pioneer.", experience_years: 22, languages: ["English", "Malayalam", "Hindi"], hospitalIdx: 2 },
    { name: "Dr. Kavitha Rao", specialties: ["Fertility", "IVF"], bio: "IVF specialist with 60%+ success rate.", experience_years: 11, languages: ["English", "Kannada"], hospitalIdx: 2 },
  ];

  for (const doc of doctorData) {
    const email = doc.name.toLowerCase().replace(/[^a-z]/g, "") + "@mediimate.test";
    const existing = await db.collection("authusers").findOne({ email });
    if (existing) {
      console.log(`Doctor exists: ${doc.name}`);
      continue;
    }
    const userId = crypto.randomUUID();
    await db.collection("authusers").insertOne({ email, password_hash: passwordHash, user_id: userId, email_verified: true, approval_status: "approved", createdAt: new Date(), updatedAt: new Date() });
    await db.collection("profiles").insertOne({ user_id: userId, full_name: doc.name, specialties: doc.specialties, bio: doc.bio, experience_years: doc.experience_years, languages: doc.languages, is_public_listed: true, phone: "+91-" + Math.floor(9000000000 + Math.random() * 999999999), createdAt: new Date(), updatedAt: new Date() });
    await db.collection("userroles").insertOne({ user_id: userId, role: "doctor" });
    await db.collection("clinicmembers").insertOne({ clinic_id: clinicIds[doc.hospitalIdx], user_id: userId, role: "doctor", joined_at: new Date() });
    console.log(`Created doctor: ${doc.name}`);
  }

  // ─── Reviews ────────────────────────────────────────────────
  await db.collection("hospitalreviews").deleteMany({ patient_user_id: /^anonymous-reviewer/ });
  const reviews = [
    { clinicIdx: 0, rating: 5, text: "Excellent cardiac care. Dr. Sharma performed my bypass surgery and the recovery was smooth." },
    { clinicIdx: 0, rating: 4, text: "Very good hospital. Clean rooms and attentive staff." },
    { clinicIdx: 0, rating: 5, text: "Traveled from Bangladesh for knee replacement. Mediimate coordination was seamless." },
    { clinicIdx: 1, rating: 4, text: "Great neurology department. Modern equipment and caring staff." },
    { clinicIdx: 1, rating: 5, text: "Liver transplant went perfectly. Dr. Vikram's team was incredible." },
    { clinicIdx: 2, rating: 4, text: "Excellent cancer treatment. Dr. Meera Reddy is exceptional." },
    { clinicIdx: 2, rating: 4, text: "IVF treatment successful on first attempt! Very supportive team." },
  ];
  for (const r of reviews) {
    await db.collection("hospitalreviews").insertOne({
      clinic_id: clinicIds[r.clinicIdx],
      patient_user_id: "anonymous-reviewer-" + crypto.randomUUID().slice(0, 8),
      rating: r.rating, review_text: r.text, is_verified: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
  }
  console.log(`Created ${reviews.length} reviews`);

  // ─── Patient cases with approved_hospitals ──────────────────
  const patientRole = await db.collection("userroles").findOne({ role: "patient" });
  if (patientRole) {
    const userId = (patientRole as any).user_id;
    await db.collection("cases").deleteMany({ patient_user_id: userId });

    await db.collection("cases").insertMany([
      {
        patient_user_id: userId,
        condition: "Knee Replacement",
        condition_details: "Severe osteoarthritis Grade 4 in right knee. Conservative treatment failed after 2 years.",
        budget_min: 200000, budget_max: 500000,
        preferred_location: "Any", preferred_country: "India",
        vault_code: "ABCD1234",
        patient_phone: "+91 98765 43210",
        consent_terms_accepted: true,
        consent_accepted_at: new Date(Date.now() - 5 * 86400000),
        medical_documents: ["knee-xray-report.pdf", "ortho-consultation-notes.pdf"],
        document_ids: [],
        status: "hospital_matched",
        approved_hospitals: [
          {
            clinic_id: clinicIds[0],
            clinic_name: "Apollo Hospitals",
            city: "Chennai",
            quoted_price: 350000,
            treatment_includes: "Surgery + 5 days hospitalization + implant cost + physiotherapy (10 sessions) + medications",
            estimated_duration: "5 days hospital + 8 weeks recovery",
            notes: "",
            approved_at: new Date(Date.now() - 2 * 86400000),
          },
          {
            clinic_id: clinicIds[2],
            clinic_name: "Manipal Hospitals",
            city: "Bangalore",
            quoted_price: 300000,
            treatment_includes: "Surgery + 4 days hospitalization + implant + physiotherapy (8 sessions)",
            estimated_duration: "4 days hospital + 6 weeks recovery",
            notes: "",
            approved_at: new Date(Date.now() - 2 * 86400000),
          },
          {
            clinic_id: clinicIds[5],
            clinic_name: "Narayana Health",
            city: "Bangalore",
            quoted_price: 250000,
            treatment_includes: "Surgery + 3 days hospitalization + implant + physiotherapy (6 sessions)",
            estimated_duration: "3 days hospital + 6 weeks recovery",
            notes: "",
            approved_at: new Date(Date.now() - 1 * 86400000),
          },
        ],
        status_history: [
          { status: "submitted", message: "Your treatment request has been received. Our team will review it and find the best hospitals for you.", timestamp: new Date(Date.now() - 5 * 86400000) },
          { status: "reviewing", message: "Mediimate team is reviewing your request and contacting hospitals.", timestamp: new Date(Date.now() - 4 * 86400000) },
          { status: "hospital_matched", message: "Mediimate found hospital options for your treatment. Check your dashboard.", timestamp: new Date(Date.now() - 2 * 86400000) },
        ],
        createdAt: new Date(Date.now() - 5 * 86400000), updatedAt: new Date(),
      },
      {
        patient_user_id: userId,
        condition: "Cardiac Bypass (CABG)",
        condition_details: "Triple vessel coronary artery disease diagnosed via angiography. Requires CABG surgery.",
        budget_min: 300000, budget_max: 800000,
        preferred_location: "Delhi NCR", preferred_country: "India",
        vault_code: "ABCD1234",
        patient_phone: "+91 98765 43210",
        consent_terms_accepted: true,
        consent_accepted_at: new Date(Date.now() - 7 * 86400000),
        medical_documents: ["angiography-report.pdf", "cardiac-echo.pdf", "blood-work-results.pdf"],
        document_ids: [],
        status: "hospital_matched",
        approved_hospitals: [
          {
            clinic_id: clinicIds[4],
            clinic_name: "Medanta - The Medicity",
            city: "Gurgaon",
            quoted_price: 580000,
            treatment_includes: "CABG surgery + ICU (3 days) + ward (7 days) + all medications + follow-up visits (3 months)",
            estimated_duration: "10 days hospital + 12 weeks recovery",
            notes: "",
            approved_at: new Date(Date.now() - 3 * 86400000),
          },
          {
            clinic_id: clinicIds[3],
            clinic_name: "Max Super Speciality Hospital",
            city: "New Delhi",
            quoted_price: 520000,
            treatment_includes: "CABG surgery + ICU (3 days) + ward (5 days) + medications + cardiac rehab program",
            estimated_duration: "8 days hospital + 10 weeks recovery",
            notes: "",
            approved_at: new Date(Date.now() - 3 * 86400000),
          },
          {
            clinic_id: clinicIds[1],
            clinic_name: "Fortis Memorial Research Institute",
            city: "Gurgaon",
            quoted_price: 600000,
            treatment_includes: "CABG surgery + ICU (4 days) + ward (6 days) + all medications + 6 months post-op monitoring",
            estimated_duration: "10 days hospital + 12 weeks recovery",
            notes: "",
            approved_at: new Date(Date.now() - 2 * 86400000),
          },
        ],
        status_history: [
          { status: "submitted", message: "Your treatment request has been received. Our team will review it and find the best hospitals for you.", timestamp: new Date(Date.now() - 7 * 86400000) },
          { status: "reviewing", message: "Mediimate team is reviewing your request and contacting hospitals.", timestamp: new Date(Date.now() - 6 * 86400000) },
          { status: "hospital_matched", message: "Mediimate found hospital options for your treatment. Check your dashboard.", timestamp: new Date(Date.now() - 3 * 86400000) },
        ],
        createdAt: new Date(Date.now() - 7 * 86400000), updatedAt: new Date(),
      },
      {
        patient_user_id: userId,
        condition: "Liver Transplant",
        condition_details: "Chronic liver disease, cirrhosis. MELD score 22. Living donor available.",
        budget_min: 1500000, budget_max: 3000000,
        preferred_location: "Any", preferred_country: "India",
        vault_code: "XYZW5678",
        patient_phone: "+91 98765 43210",
        consent_terms_accepted: true,
        consent_accepted_at: new Date(Date.now() - 50 * 86400000),
        medical_documents: ["liver-mri-report.pdf", "meld-score-report.pdf", "donor-hla-matching.pdf"],
        document_ids: [],
        status: "treatment_completed",
        matched_clinic_id: clinicIds[1],
        matched_at: new Date(Date.now() - 45 * 86400000),
        accepted_at: new Date(Date.now() - 43 * 86400000),
        treatment_start_date: new Date(Date.now() - 35 * 86400000),
        treatment_end_date: new Date(Date.now() - 10 * 86400000),
        treatment_plan: { description: "Living donor liver transplant. Donor eval 3d, recipient prep 2d, surgery, ICU 5d, ward 10d.", estimated_cost: 2200000, estimated_duration: "3 weeks" },
        approved_hospitals: [
          {
            clinic_id: clinicIds[1],
            clinic_name: "Fortis Memorial Research Institute",
            city: "Gurgaon",
            quoted_price: 2200000,
            treatment_includes: "Full transplant package including donor evaluation, surgery, ICU, ward stay, and 3 months follow-up",
            estimated_duration: "3 weeks hospital + 12 months monitoring",
            notes: "",
            approved_at: new Date(Date.now() - 48 * 86400000),
          },
          {
            clinic_id: clinicIds[4],
            clinic_name: "Medanta - The Medicity",
            city: "Gurgaon",
            quoted_price: 2400000,
            treatment_includes: "Complete transplant package with extended monitoring",
            estimated_duration: "3 weeks hospital + 12 months monitoring",
            notes: "",
            approved_at: new Date(Date.now() - 48 * 86400000),
          },
        ],
        status_history: [
          { status: "submitted", message: "Your treatment request has been received.", timestamp: new Date(Date.now() - 50 * 86400000) },
          { status: "reviewing", message: "Our team is contacting top transplant centers.", timestamp: new Date(Date.now() - 49 * 86400000) },
          { status: "hospital_matched", message: "2 hospitals confirmed for your transplant.", timestamp: new Date(Date.now() - 48 * 86400000) },
          { status: "hospital_accepted", message: "Fortis Memorial confirmed. Treatment plan ready.", timestamp: new Date(Date.now() - 43 * 86400000) },
          { status: "treatment_scheduled", message: "Transplant surgery scheduled.", timestamp: new Date(Date.now() - 38 * 86400000) },
          { status: "treatment_in_progress", message: "Transplant surgery in progress.", timestamp: new Date(Date.now() - 35 * 86400000) },
          { status: "treatment_completed", message: "Treatment completed successfully. Recovery program enrolled.", timestamp: new Date(Date.now() - 10 * 86400000) },
        ],
        createdAt: new Date(Date.now() - 50 * 86400000), updatedAt: new Date(),
      },
      {
        patient_user_id: userId,
        condition: "Dental Implants",
        condition_details: "Missing 3 teeth (upper jaw). Need implants for better chewing and aesthetics.",
        budget_min: 30000, budget_max: 80000,
        preferred_location: "Chennai", preferred_country: "India",
        vault_code: "ABCD1234",
        patient_phone: "+91 98765 43210",
        consent_terms_accepted: true,
        consent_accepted_at: new Date(Date.now() - 1 * 86400000),
        medical_documents: ["dental-xray.jpg"],
        document_ids: [],
        status: "submitted",
        status_history: [
          { status: "submitted", message: "Your treatment request has been received. Our team will review it and find the best hospitals for you.", timestamp: new Date(Date.now() - 86400000) },
        ],
        createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(),
      },
    ]);
    console.log("Created 4 patient cases with approved_hospitals");

    const patient = await db.collection("patients").findOne({ patient_user_id: userId });
    if (patient) {
      await db.collection("enrollments").deleteMany({ patient_id: patient._id.toString() });
      await db.collection("enrollments").insertMany([
        {
          patient_id: patient._id.toString(), program_id: programIds[0],
          doctor_id: userId, clinic_id: clinicIds[0],
          status: "active", adherence_pct: 78,
          enrolled_at: new Date(Date.now() - 10 * 86400000),
          created_at: new Date(Date.now() - 10 * 86400000),
        },
        {
          patient_id: patient._id.toString(), program_id: programIds[1],
          doctor_id: userId, clinic_id: clinicIds[2],
          status: "completed", adherence_pct: 95,
          enrolled_at: new Date(Date.now() - 90 * 86400000),
          completed_at: new Date(Date.now() - 5 * 86400000),
          created_at: new Date(Date.now() - 90 * 86400000),
        },
      ]);
      console.log("Created 2 enrollments");
    }
  } else {
    console.log("No patient user found - skipping case creation.");
  }

  console.log("\n=== Seed complete! ===");
  console.log(`Hospitals: ${hospitals.length} with full structured data`);
  console.log(`Conditions: ${conditions.length} treatment conditions`);
  console.log(`Programs: ${programDefs.length}`);
  console.log(`Doctors: ${doctorData.length}`);
  console.log(`Reviews: ${reviews.length}`);
  console.log("\nPatient cases: 4 (2 with hospital options, 1 completed, 1 newly submitted)");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});

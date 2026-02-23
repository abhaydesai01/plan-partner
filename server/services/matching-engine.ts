import { Clinic, TreatmentCondition, Profile } from "../models/index.js";

export interface PatientIntent {
  condition: string;
  budget_min?: number;
  budget_max?: number;
  preferred_location?: string;
  preferred_country?: string;
  timeline?: "immediate" | "1_month" | "3_months" | "flexible";
  travel_type?: "domestic" | "international";
}

export interface MatchBreakdown {
  condition: number;
  doctors: number;
  outcomes: number;
  price: number;
  location: number;
  preference: number;
}

export interface HospitalMatch {
  hospital: any;
  match_score: number;
  match_breakdown: MatchBreakdown;
}

const WEIGHTS = {
  condition: 0.30,
  doctors: 0.15,
  outcomes: 0.15,
  price: 0.15,
  location: 0.15,
  preference: 0.10,
};

async function resolveCondition(condition: string) {
  const tc = await TreatmentCondition.findOne({
    $or: [
      { condition: { $regex: new RegExp(condition, "i") } },
      { keywords: { $regex: new RegExp(condition, "i") } },
    ],
  }).lean();
  return tc as { condition: string; specialty: string; keywords: string[] } | null;
}

function scoreCondition(hospital: any, condition: string, tcData: { specialty: string; keywords: string[] } | null): number {
  const treatments: string[] = hospital.treatments_offered || [];
  const specialties: string[] = hospital.specialties || [];
  const successRates: Map<string, number> | Record<string, number> = hospital.success_rates || {};

  const condLower = condition.toLowerCase();
  const treatmentMatch = treatments.some(t => t.toLowerCase().includes(condLower) || condLower.includes(t.toLowerCase()));

  if (!treatmentMatch && tcData) {
    const specMatch = specialties.some(s => s.toLowerCase() === tcData.specialty.toLowerCase());
    if (!specMatch) return 10;
    return 40;
  }

  if (!treatmentMatch) {
    const specMatch = specialties.some(s => condLower.includes(s.toLowerCase()) || s.toLowerCase().includes(condLower));
    return specMatch ? 35 : 5;
  }

  let score = 70;

  const rateVal = successRates instanceof Map ? successRates.get(condition) : (successRates as any)?.[condition];
  if (rateVal && rateVal > 0) {
    score += (rateVal / 100) * 30;
  } else {
    score += 15;
  }

  return Math.min(100, Math.round(score));
}

async function scoreDoctors(hospital: any, tcData: { specialty: string } | null): Promise<number> {
  if (!tcData) return 50;

  const ClinicMember = (await import("../models/index.js")).ClinicMember;
  const members = await ClinicMember.find({
    clinic_id: hospital._id.toString(),
    role: { $in: ["owner", "doctor"] },
  }).lean();

  if (!members.length) return 20;

  const userIds = members.map((m: any) => m.user_id);
  const profiles = await Profile.find({ user_id: { $in: userIds } }).lean();

  const relevantDoctors = profiles.filter((p: any) =>
    (p.specialties || []).some((s: string) => s.toLowerCase().includes(tcData.specialty.toLowerCase()))
  );

  if (relevantDoctors.length === 0) return 25;
  if (relevantDoctors.length === 1) return 60;
  if (relevantDoctors.length === 2) return 80;
  return 95;
}

function scoreOutcomes(hospital: any): number {
  let score = 0;
  let factors = 0;

  if (hospital.patient_satisfaction) {
    score += hospital.patient_satisfaction;
    factors++;
  }
  if (hospital.completion_rate) {
    score += hospital.completion_rate;
    factors++;
  }
  if (hospital.rating_avg) {
    score += (hospital.rating_avg / 5) * 100;
    factors++;
  }

  return factors > 0 ? Math.round(score / factors) : 50;
}

function scorePrice(hospital: any, condition: string, budgetMin?: number, budgetMax?: number): number {
  if (!budgetMin && !budgetMax) return 70;

  const costMap = hospital.average_cost_by_treatment || {};
  const avgCost = costMap instanceof Map ? costMap.get(condition) : costMap[condition];
  const hospitalMin = hospital.price_range_min;
  const hospitalMax = hospital.price_range_max;

  const cost = avgCost || (hospitalMin && hospitalMax ? (hospitalMin + hospitalMax) / 2 : null);
  if (!cost) return 50;

  const mid = budgetMin && budgetMax ? (budgetMin + budgetMax) / 2 : (budgetMax || budgetMin || 0);
  const range = budgetMax && budgetMin ? (budgetMax - budgetMin) : mid * 0.5;

  if (range === 0) return cost <= mid ? 80 : 30;

  const diff = Math.abs(cost - mid);
  const ratio = diff / range;

  if (cost >= (budgetMin || 0) && cost <= (budgetMax || Infinity)) return 95;
  if (ratio < 0.5) return 70;
  if (ratio < 1) return 50;
  return 20;
}

function scoreLocation(hospital: any, location?: string, country?: string): number {
  if (!location && !country) return 60;

  const hCity = (hospital.city || "").toLowerCase();
  const hCountry = (hospital.country || "").toLowerCase();
  const pLoc = (location || "").toLowerCase();
  const pCountry = (country || "").toLowerCase();

  if (pLoc && hCity && hCity.includes(pLoc)) return 100;
  if (pCountry && hCountry && hCountry.includes(pCountry)) return 65;
  if (!pCountry && !pLoc) return 60;

  const hasIntl = hospital.international_support;
  if (hasIntl?.travel_assistance || hasIntl?.visa_assistance) return 40;

  return 15;
}

function scorePreference(hospital: any, intent: PatientIntent): number {
  let score = 50;

  if (intent.timeline === "immediate" && hospital.response_time_hours) {
    if (hospital.response_time_hours <= 6) score += 25;
    else if (hospital.response_time_hours <= 24) score += 15;
    else score += 5;
  } else if (intent.timeline === "flexible") {
    score += 20;
  } else {
    score += 10;
  }

  if (intent.travel_type === "international") {
    const intl = hospital.international_support;
    if (intl) {
      if (intl.travel_assistance) score += 5;
      if (intl.airport_pickup) score += 3;
      if (intl.translator_available) score += 5;
      if (intl.visa_assistance) score += 5;
      if (intl.remote_followup) score += 7;
    }
  }

  return Math.min(100, score);
}

export async function matchHospitals(intent: PatientIntent): Promise<HospitalMatch[]> {
  const hospitals = await Clinic.find({ is_public_listed: true }).lean();
  if (!hospitals.length) return [];

  const tcData = await resolveCondition(intent.condition);

  const results: HospitalMatch[] = [];

  for (const h of hospitals) {
    const condScore = scoreCondition(h, intent.condition, tcData);
    const doctorScore = await scoreDoctors(h, tcData);
    const outcomeScore = scoreOutcomes(h);
    const priceScore = scorePrice(h, intent.condition, intent.budget_min, intent.budget_max);
    const locScore = scoreLocation(h, intent.preferred_location, intent.preferred_country);
    const prefScore = scorePreference(h, intent);

    const breakdown: MatchBreakdown = {
      condition: condScore,
      doctors: doctorScore,
      outcomes: outcomeScore,
      price: priceScore,
      location: locScore,
      preference: prefScore,
    };

    const totalScore = Math.round(
      condScore * WEIGHTS.condition +
      doctorScore * WEIGHTS.doctors +
      outcomeScore * WEIGHTS.outcomes +
      priceScore * WEIGHTS.price +
      locScore * WEIGHTS.location +
      prefScore * WEIGHTS.preference
    );

    results.push({ hospital: h, match_score: totalScore, match_breakdown: breakdown });
  }

  results.sort((a, b) => b.match_score - a.match_score);
  return results;
}

export async function searchSuggest(query: string): Promise<Array<{ type: string; text: string; id?: string; count?: number }>> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  const regex = new RegExp(q, "i");
  const suggestions: Array<{ type: string; text: string; id?: string; count?: number }> = [];

  const [conditions, hospitals, cityCounts] = await Promise.all([
    TreatmentCondition.find({ $or: [{ condition: regex }, { keywords: regex }] }).limit(5).lean(),
    Clinic.find({ is_public_listed: true, name: regex }).select("name city").limit(5).lean(),
    Clinic.aggregate([
      { $match: { is_public_listed: true, city: regex } },
      { $group: { _id: "$city", count: { $sum: 1 } } },
      { $limit: 3 },
    ]),
  ]);

  for (const c of conditions) {
    const hospitalCount = await Clinic.countDocuments({
      is_public_listed: true,
      $or: [
        { treatments_offered: { $regex: new RegExp((c as any).condition, "i") } },
        { specialties: { $regex: new RegExp((c as any).specialty, "i") } },
      ],
    });
    suggestions.push({ type: "condition", text: (c as any).condition, count: hospitalCount });
  }

  for (const h of hospitals) {
    suggestions.push({ type: "hospital", text: (h as any).name, id: (h as any)._id?.toString() });
  }

  for (const c of cityCounts) {
    suggestions.push({ type: "city", text: c._id, count: c.count });
  }

  return suggestions.slice(0, 10);
}

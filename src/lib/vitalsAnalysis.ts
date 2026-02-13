/**
 * Vitals analysis: interpret readings against normal ranges and return status + recommendations.
 * Used on both patient and doctor vitals views.
 */

export type VitalStatus = "normal" | "elevated" | "low" | "unknown";

export interface VitalReading {
  vital_type: string;
  value_text: string;
  value_numeric: number | null;
  unit?: string | null;
  recorded_at: string;
}

export interface VitalAnalysisItem {
  vital_type: string;
  label: string;
  value_text: string;
  status: VitalStatus;
  message: string;
  recommendation: string;
  recorded_at: string;
}

export interface VitalsAnalysisResult {
  items: VitalAnalysisItem[];
  summary: string;
}

const LABELS: Record<string, string> = {
  blood_pressure: "Blood Pressure",
  heart_rate: "Heart Rate",
  temperature: "Temperature",
  weight: "Weight",
  blood_sugar: "Blood Sugar",
  spo2: "SpO2",
};

function labelFor(type: string): string {
  return LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseBloodPressure(valueText: string): { systolic: number; diastolic: number } | null {
  const match = valueText.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) return { systolic: parseInt(match[1], 10), diastolic: parseInt(match[2], 10) };
  const num = parseFloat(valueText);
  if (!Number.isNaN(num)) return { systolic: num, diastolic: num };
  return null;
}

function analyzeBloodPressure(v: VitalReading): { status: VitalStatus; message: string; recommendation: string } {
  const parsed = parseBloodPressure(v.value_text);
  if (!parsed) return { status: "unknown", message: "Could not parse reading.", recommendation: "Enter as systolic/diastolic (e.g. 120/80)." };
  const { systolic, diastolic } = parsed;
  if (systolic > 180 || diastolic > 120) {
    return { status: "elevated", message: "Hypertensive crisis range.", recommendation: "Seek immediate medical attention." };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return { status: "elevated", message: "High (Stage 1–2).", recommendation: "Discuss with your doctor. Reduce sodium, stay active, and monitor regularly." };
  }
  if (systolic >= 130 || diastolic >= 85) {
    return { status: "elevated", message: "Elevated.", recommendation: "Lifestyle changes can help: healthy diet, exercise, stress management." };
  }
  if (systolic < 90 && diastolic < 60) {
    return { status: "low", message: "Low.", recommendation: "Stay hydrated. If you feel dizzy or faint, contact your doctor." };
  }
  return { status: "normal", message: "Within normal range.", recommendation: "Keep monitoring and maintain a healthy lifestyle." };
}

function analyzeHeartRate(v: VitalReading): { status: VitalStatus; message: string; recommendation: string } {
  const n = v.value_numeric ?? parseFloat(v.value_text);
  if (Number.isNaN(n)) return { status: "unknown", message: "Numeric value needed.", recommendation: "Enter heart rate in bpm." };
  if (n > 100) return { status: "elevated", message: "Above normal (tachycardia).", recommendation: "Rest and avoid stimulants. If persistent or with symptoms, see your doctor." };
  if (n < 60) return { status: "low", message: "Below normal (bradycardia).", recommendation: "Athletes often have lower HR. If you feel dizzy or tired, discuss with your doctor." };
  return { status: "normal", message: "Within normal range (60–100 bpm).", recommendation: "Good. Continue regular activity and monitoring." };
}

function analyzeTemperature(v: VitalReading): { status: VitalStatus; message: string; recommendation: string } {
  const n = v.value_numeric ?? parseFloat(v.value_text);
  if (Number.isNaN(n)) return { status: "unknown", message: "Numeric value needed.", recommendation: "Enter temperature in °F or °C." };
  const isF = (v.unit || "").toLowerCase().includes("f") || (n > 50 && n < 130);
  const celsius = isF ? (n - 32) * (5 / 9) : n;
  if (celsius >= 39) return { status: "elevated", message: "High fever.", recommendation: "Rest, fluids, and fever reducers. Contact doctor if it persists or worsens." };
  if (celsius >= 37.3) return { status: "elevated", message: "Elevated (low-grade fever).", recommendation: "Rest and hydrate. Monitor; see doctor if it continues." };
  if (celsius < 36) return { status: "low", message: "Below normal.", recommendation: "Keep warm. If persistent or with symptoms, seek medical advice." };
  return { status: "normal", message: "Normal body temperature.", recommendation: "No action needed." };
}

function analyzeWeight(v: VitalReading): { status: VitalStatus; message: string; recommendation: string } {
  const n = v.value_numeric ?? parseFloat(v.value_text);
  if (Number.isNaN(n)) return { status: "unknown", message: "Numeric value needed.", recommendation: "Enter weight in kg or lb." };
  return { status: "normal", message: "Recorded.", recommendation: "Track trends over time. Discuss goals with your doctor if needed." };
}

function analyzeBloodSugar(v: VitalReading): { status: VitalStatus; message: string; recommendation: string } {
  const n = v.value_numeric ?? parseFloat(v.value_text);
  if (Number.isNaN(n)) return { status: "unknown", message: "Numeric value needed.", recommendation: "Enter glucose in mg/dL." };
  if (n >= 200) return { status: "elevated", message: "High (post-meal or random).", recommendation: "If fasting or repeated, discuss with your doctor. Follow diet and medication plan." };
  if (n >= 126) return { status: "elevated", message: "Elevated (fasting may indicate prediabetes/diabetes).", recommendation: "Confirm with doctor and repeat test if needed." };
  if (n < 70) return { status: "low", message: "Low (hypoglycemia).", recommendation: "Consume fast-acting carbs if safe. Recheck in 15 min. Contact doctor if recurrent." };
  return { status: "normal", message: "Within target range.", recommendation: "Continue healthy eating and monitoring." };
}

function analyzeSpo2(v: VitalReading): { status: VitalStatus; message: string; recommendation: string } {
  const n = v.value_numeric ?? parseFloat(v.value_text);
  if (Number.isNaN(n)) return { status: "unknown", message: "Numeric value needed.", recommendation: "Enter SpO2 as percentage." };
  if (n < 90) return { status: "low", message: "Low oxygen saturation.", recommendation: "Seek medical attention, especially if you have shortness of breath." };
  if (n < 95) return { status: "elevated", message: "Below optimal.", recommendation: "Monitor. If you have lung conditions, inform your doctor." };
  return { status: "normal", message: "Normal (95–100%).", recommendation: "Good. No action needed." };
}

const ANALYZERS: Record<string, (v: VitalReading) => { status: VitalStatus; message: string; recommendation: string }> = {
  blood_pressure: analyzeBloodPressure,
  heart_rate: analyzeHeartRate,
  temperature: analyzeTemperature,
  weight: analyzeWeight,
  blood_sugar: analyzeBloodSugar,
  spo2: analyzeSpo2,
};

/**
 * Get latest reading per vital type from a list (assumes list is sorted by recorded_at desc).
 */
function getLatestByType(vitals: VitalReading[]): VitalReading[] {
  const byType: Record<string, VitalReading> = {};
  for (const v of vitals) {
    if (!byType[v.vital_type]) byType[v.vital_type] = v;
  }
  return Object.values(byType);
}

/**
 * Analyze vitals and return per-type status + recommendations and a short summary.
 */
export function getVitalsAnalysis(vitals: VitalReading[]): VitalsAnalysisResult {
  const latest = getLatestByType(vitals);
  const items: VitalAnalysisItem[] = latest.map((v) => {
    const fn = ANALYZERS[v.vital_type];
    const result = fn
      ? fn(v)
      : { status: "unknown" as VitalStatus, message: "No reference range.", recommendation: "Discuss with your doctor." };
    return {
      vital_type: v.vital_type,
      label: labelFor(v.vital_type),
      value_text: v.value_text,
      status: result.status,
      message: result.message,
      recommendation: result.recommendation,
      recorded_at: v.recorded_at,
    };
  });

  const elevated = items.filter((i) => i.status === "elevated");
  const low = items.filter((i) => i.status === "low");
  const normal = items.filter((i) => i.status === "normal");
  let summary: string;
  if (elevated.length || low.length) {
    const parts: string[] = [];
    if (elevated.length) parts.push(`${elevated.length} reading(s) above normal`);
    if (low.length) parts.push(`${low.length} reading(s) below normal`);
    summary = "Review recommended: " + parts.join("; ") + ". See recommendations below.";
  } else if (normal.length) {
    summary = normal.length === items.length ? "All recent readings are within normal ranges. Keep monitoring." : "Some readings are within normal range.";
  } else {
    summary = "Add numeric readings for type-specific analysis and recommendations.";
  }

  return { items, summary };
}

import type { NutritionInsightsData } from "@/components/NutritionInsights";

export interface FoodLogForAnalysis {
  id: string;
  meal_type: string;
  food_items?: { name?: string; quantity?: number; unit?: string }[] | null;
  notes?: string | null;
  total_calories?: number | null;
  logged_at: string;
}

/**
 * Strips verbal prefixes and quantity phrases from a free-text note to extract
 * just the food name. E.g. "i ate 1 plate batata chiwda" → "batata chiwda"
 */
function extractFoodName(raw: string): string {
  return raw
    // Remove leading filler phrases like "i ate", "i had", "i drank", "had", "ate", "drank", "consumed"
    .replace(/^(i\s+)?(ate|had|drank|consumed|eaten|took|eaten)\s+/i, "")
    // Remove leading quantity+unit patterns like "1 plate", "2 roti", "3/4 cup", "half a bowl"
    .replace(/^(a\s+|an\s+|half\s+a?\s+|quarter\s+a?\s+|\d+[\d./]*\s*)(full\s+)?(plate|bowl|cup|glass|piece|slice|serving|roti|chapati|paratha|piece|scoop|tablespoon|tbsp|tsp|ml|g|kg|oz|litre|liter|can|bottle)s?\s+of\s+/i, "")
    .replace(/^(a\s+|an\s+|half\s+a?\s+|quarter\s+a?\s+|\d+[\d./]*\s*)(full\s+)?(plate|bowl|cup|glass|piece|slice|serving|roti|chapati|paratha|piece|scoop|tablespoon|tbsp|tsp|ml|g|kg|oz|litre|liter|can|bottle)s?\s+/i, "")
    // Remove standalone leading numbers/fractions
    .replace(/^\d+[\d./]*\s+/, "")
    .trim();
}

/**
 * Derives AI Nutrition Insights from food logs.
 * Can be replaced later with a Gemini API call for richer analysis.
 */
export function computeNutritionInsights(logs: FoodLogForAnalysis[]): NutritionInsightsData {
  const totalMeals = logs.length;
  const totalCal = logs.reduce((s, l) => s + (l.total_calories ?? 0), 0);
  const avgCalories = totalMeals > 0 ? Math.round(totalCal / totalMeals) : 0;

  const foodCount: Record<string, number> = {};
  logs.forEach((log) => {
    if (log.food_items?.length) {
      log.food_items.forEach((item: any) => {
        const name = (item.name || item).toString().trim() || "Other";
        const cleaned = extractFoodName(name);
        if (cleaned) foodCount[cleaned] = (foodCount[cleaned] || 0) + 1;
      });
    } else if (log.notes) {
      const parts = log.notes.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      parts.forEach((p) => {
        const cleaned = extractFoodName(p);
        if (cleaned) foodCount[cleaned] = (foodCount[cleaned] || 0) + 1;
      });
    }
  });
  const topFoods = Object.entries(foodCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  const healthScore = computeHealthScore(totalMeals, avgCalories, topFoods.length);
  const { overallAssessment, strengths, areasToImprove } = generateAssessment(
    totalMeals,
    avgCalories,
    healthScore,
    topFoods,
  );

  return {
    totalMeals,
    avgCalories,
    healthScore,
    topFoods,
    overallAssessment,
    strengths,
    areasToImprove,
  };
}

function computeHealthScore(totalMeals: number, avgCalories: number, foodVariety: number): number {
  if (totalMeals === 0) return 0;
  let score = 5;
  if (totalMeals >= 7) score += 1;
  if (totalMeals >= 14) score += 1;
  if (avgCalories >= 1200 && avgCalories <= 2500) score += 1;
  if (avgCalories < 800 || avgCalories > 3500) score -= 1;
  if (foodVariety >= 5) score += 1;
  if (foodVariety >= 10) score += 1;
  return Math.max(1, Math.min(10, score));
}

function generateAssessment(
  totalMeals: number,
  avgCalories: number,
  healthScore: number,
  topFoods: string[],
): Pick<NutritionInsightsData, "overallAssessment" | "strengths" | "areasToImprove"> {
  const strengths: string[] = [];
  const areasToImprove: string[] = [];

  if (totalMeals >= 5) strengths.push("Regular meal logging helps track patterns and accountability.");
  if (avgCalories >= 1200 && avgCalories <= 2500) {
    strengths.push("Calorie intake appears to be in a reasonable range for most adults.");
  }
  if (topFoods.length >= 3) {
    strengths.push(`Variety in diet with foods like ${topFoods.slice(0, 3).join(", ")}.`);
  }
  if (strengths.length === 0) strengths.push("Getting started with meal logging is a positive step.");

  if (healthScore < 6) areasToImprove.push("Consider logging more meals and a wider variety of foods for better insights.");
  if (avgCalories < 800 && totalMeals > 0) areasToImprove.push("Calorie intake seems low; ensure adequate nutrition.");
  if (avgCalories > 3000) areasToImprove.push("Calorie intake is high; consider portion sizes and balanced meals.");
  if (topFoods.length < 3 && totalMeals > 2) areasToImprove.push("Adding more variety (vegetables, fruits, proteins) can improve diet quality.");
  if (areasToImprove.length === 0) areasToImprove.push("Keep up the good habits and continue logging for ongoing insights.");

  const overallAssessment =
    totalMeals === 0
      ? "No meals logged yet. Start logging your meals to get personalized nutrition insights and track your diet quality over time."
      : `Overall, this diet appears to be ${healthScore >= 7 ? "moderately to very healthy" : healthScore >= 5 ? "moderately healthy" : "in need of improvement"}, with room to refine. You have logged ${totalMeals} meal(s) with an average of ${avgCalories} calories. The health score of ${healthScore}/10 reflects nutritional quality and consistency. ${topFoods.length ? `Frequently logged foods include ${topFoods.slice(0, 3).join(", ")}.` : ""}`;

  return { overallAssessment, strengths, areasToImprove };
}

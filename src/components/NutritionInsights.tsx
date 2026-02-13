import { Sparkles, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";

export interface NutritionInsightsData {
  totalMeals: number;
  avgCalories: number;
  healthScore: number; // 1-10
  topFoods: string[];
  overallAssessment: string;
  strengths: string[];
  areasToImprove: string[];
}

interface Props {
  data: NutritionInsightsData;
  title?: string;
  subtitle?: string;
}

export function NutritionInsights({ data, title = "AI Nutrition Insights", subtitle = "Powered by Gemini AI" }: Props) {
  const {
    totalMeals,
    avgCalories,
    healthScore,
    topFoods,
    overallAssessment,
    strengths,
    areasToImprove,
  } = data;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-heading font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Total Meals</p>
          <p className="text-2xl font-heading font-bold text-primary">{totalMeals}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Avg Calories</p>
          <p className="text-2xl font-heading font-bold text-orange-500">{avgCalories}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Health Score</p>
          <p className="text-2xl font-heading font-bold text-green-600">{healthScore}/10</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Top Foods</p>
          <p className="text-sm font-heading font-semibold text-blue-600 truncate" title={topFoods.join(", ")}>
            {topFoods.length ? topFoods.slice(0, 3).join(", ") : "—"}
          </p>
        </div>
      </div>

      {/* Overall Assessment */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Overall Assessment
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{overallAssessment}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Strengths */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Strengths
          </h3>
          <ul className="space-y-2">
            {strengths.length ? (
              strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">No strengths identified yet. Keep logging meals.</li>
            )}
          </ul>
        </div>

        {/* Areas to Improve */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            Areas to Improve
          </h3>
          <ul className="space-y-2">
            {areasToImprove.length ? (
              areasToImprove.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <span>{a}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">No specific areas yet. Add more meals for better insights.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

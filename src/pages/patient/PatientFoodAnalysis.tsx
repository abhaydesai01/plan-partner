import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { NutritionInsights } from "@/components/NutritionInsights";
import { computeNutritionInsights } from "@/lib/nutritionAnalysis";
import type { NutritionInsightsData } from "@/components/NutritionInsights";
import { UtensilsCrossed } from "lucide-react";

interface FoodLog {
  id: string;
  meal_type: string;
  food_items?: { name?: string; quantity?: number; unit?: string }[] | null;
  notes?: string | null;
  total_calories?: number | null;
  logged_at: string;
}

const emptyInsights: NutritionInsightsData = {
  totalMeals: 0,
  avgCalories: 0,
  healthScore: 0,
  topFoods: [],
  overallAssessment: "No meals logged yet. Log meals from the AI Assistant page to see your nutrition insights here.",
  strengths: [],
  areasToImprove: [],
};

export default function PatientFoodAnalysis() {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get<FoodLog[]>("me/food_logs")
      .then((data) => {
        if (!cancelled) setLogs(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setLogs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const insights = useMemo(
    () => (logs.length ? computeNutritionInsights(logs) : emptyInsights),
    [logs],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground truncate">Food Analysis</h1>
        <p className="text-muted-foreground text-sm">AI-powered nutrition insights from your meal logs</p>
      </div>
      <div className="glass-card rounded-xl p-5">
        <NutritionInsights data={insights} />
      </div>

      {/* Previous meal logs */}
      <div className="glass-card rounded-xl p-5 space-y-3">
        <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-primary" />
          Previous meal logs
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meals logged yet. Log meals from the Overview page to see them here.</p>
        ) : (
          <div className="space-y-2 max-h-[40vh] sm:max-h-[320px] overflow-y-auto">
            {logs.map((log) => {
              const items = Array.isArray(log.food_items) ? log.food_items : [];
              const names = items.map((i) => i?.name).filter(Boolean).join(", ");
              const summary = names || log.notes || "—";
              return (
                <div key={log.id} className="p-3 rounded-lg border border-border/50 bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground capitalize">{log.meal_type || "Meal"}</p>
                    <p className="text-xs text-muted-foreground truncate" title={summary}>{summary}</p>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">{format(new Date(log.logged_at), "MMM d, yyyy 'at' HH:mm")}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Activity, Droplets, UtensilsCrossed, Pill, Trophy } from "lucide-react";

export type RewardsData = {
  total_points: number;
  health_score: number;
  today_progress: { bp: boolean; food: boolean; sugar: boolean; medication: boolean };
  points_breakdown: { blood_pressure: number; blood_sugar: number; food: number; medication: number };
};

export function useRewards(enabled = true) {
  return useQuery({
    queryKey: ["me", "rewards"],
    queryFn: () => api.get<RewardsData>("me/rewards"),
    enabled,
  });
}

/** Health score out of 100 with pulse animation when displayed. */
export function HealthScore({ data }: { data: RewardsData | undefined }) {
  if (data == null) return null;
  const score = data.health_score;
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 sm:p-4 min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium text-foreground truncate">Health score</span>
      </div>
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-xl sm:text-2xl font-heading font-bold text-primary tabular-nums animate-[pulse_1.5s_ease-in-out_1]">
          {score}
        </span>
        <span className="text-muted-foreground text-sm">/ 100</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden min-w-0">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

/** Today's progress: BP ✓ Food ✓ Sugar ☐ Medication ☐ — Zeigarnik effect. */
export function TodayProgress({ data, compact }: { data: RewardsData | undefined; compact?: boolean }) {
  if (data == null) return null;
  const { today_progress } = data;
  const items = [
    { key: "bp" as const, label: "BP", done: today_progress.bp, icon: Activity },
    { key: "food" as const, label: "Food", done: today_progress.food, icon: UtensilsCrossed },
    { key: "sugar" as const, label: "Sugar", done: today_progress.sugar, icon: Droplets },
    { key: "medication" as const, label: "Medication", done: today_progress.medication, icon: Pill },
  ];
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-card p-3 min-w-0 overflow-hidden flex flex-col justify-center">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1">Today:</span>
          {items.map(({ key, label, done: isDone, icon: Icon }) => (
            <span
              key={key}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                isDone ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              <Icon className="w-3 h-3 flex-shrink-0" />
              {isDone ? "✓" : "☐"} {label}
            </span>
          ))}
          <span className="text-xs font-semibold text-foreground ml-1">{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden min-w-0">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4 min-w-0 overflow-hidden">
      <p className="text-xs font-medium text-muted-foreground mb-2">Today&apos;s progress</p>
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
        {items.map(({ key, label, done: isDone, icon: Icon }) => (
          <span
            key={key}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium min-h-[28px] ${
              isDone ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <Icon className="w-3 h-3 flex-shrink-0" />
            {isDone ? "✓" : "☐"} {label}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-0">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Compact total points badge. */
export function PointsBadge({ data }: { data: RewardsData | undefined }) {
  if (data == null) return null;
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
      <Trophy className="w-3.5 h-3.5" />
      {data.total_points} pts
    </div>
  );
}

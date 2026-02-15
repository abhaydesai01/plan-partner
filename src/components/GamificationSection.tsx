import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Flame, Award, Star, Target } from "lucide-react";

export type GamificationData = {
  streak_days: number;
  badges: { key: string; title: string; earned_at?: string }[];
  level: number;
  level_label: string;
  total_points: number;
  weekly_challenges: {
    id: string;
    title: string;
    target_days: number;
    current_days: number;
    reward_points: number;
    completed: boolean;
    completed_at?: string;
  }[];
};

export function useGamification(enabled = true) {
  return useQuery({
    queryKey: ["me", "gamification"],
    queryFn: () => api.get<GamificationData>("me/gamification"),
    enabled,
  });
}

/** Streak display: "7 day streak 🔥" */
export function StreakBadge({ data, compact }: { data: GamificationData | undefined; compact?: boolean }) {
  if (data == null || data.streak_days === 0) return null;
  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
        <Flame className="w-3.5 h-3.5" />
        <span className="font-heading font-semibold tabular-nums text-sm">{data.streak_days}</span>
        <span className="text-xs font-medium">day streak</span>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 sm:p-4 min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        <Flame className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <span className="text-sm font-medium text-foreground">Streak</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl sm:text-2xl font-heading font-bold text-amber-600 dark:text-amber-400 tabular-nums">
          {data.streak_days}
        </span>
        <span className="text-muted-foreground text-sm">day streak 🔥</span>
      </div>
    </div>
  );
}

/** Level: Beginner / Consistent / Health Champion */
export function LevelBadge({ data, compact }: { data: GamificationData | undefined; compact?: boolean }) {
  if (data == null) return null;
  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
        <Star className="w-3.5 h-3.5" />
        <span className="text-sm font-medium">{data.level_label}</span>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 sm:p-4 min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        <Star className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium text-foreground">Level</span>
      </div>
      <p className="text-lg font-heading font-semibold text-primary">{data.level_label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">Level {data.level} · {data.total_points} pts</p>
    </div>
  );
}

/** Earned badges list */
export function BadgesList({ data }: { data: GamificationData | undefined }) {
  if (data == null || data.badges.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4 min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <Award className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium text-foreground">Badges</span>
      </div>
      <ul className="space-y-1.5">
        {data.badges.map((b) => (
          <li
            key={b.key}
            className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-muted/40 text-sm"
          >
            <span className="font-medium text-foreground">{b.title}</span>
            {b.earned_at && (
              <span className="text-xs text-muted-foreground">
                {new Date(b.earned_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Weekly challenges with progress and reward */
export function WeeklyChallengesList({ data }: { data: GamificationData | undefined }) {
  if (data == null || data.weekly_challenges.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4 min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium text-foreground">Weekly challenges</span>
      </div>
      <ul className="space-y-3">
        {data.weekly_challenges.map((ch) => (
          <li key={ch.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{ch.title}</p>
              <span className="text-xs font-semibold text-primary whitespace-nowrap">
                Reward: {ch.reward_points} pts
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(100, (ch.current_days / ch.target_days) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium tabular-nums text-muted-foreground min-w-[3ch]">
                {ch.current_days}/{ch.target_days}
              </span>
            </div>
            {ch.completed && (
              <p className="mt-1.5 text-xs font-medium text-green-600 dark:text-green-400">Completed ✓</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Full gamification block for dashboard: streak, level, badges, weekly challenges */
export function GamificationBlock({ data }: { data: GamificationData | undefined }) {
  if (data == null) return null;
  return (
    <div className="space-y-4 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <StreakBadge data={data} />
        <LevelBadge data={data} />
      </div>
      <BadgesList data={data} />
      <WeeklyChallengesList data={data} />
    </div>
  );
}

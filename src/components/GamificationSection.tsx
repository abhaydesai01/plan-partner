import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Flame, Award, Star, Target, Gift, Stethoscope, Pill, FileText, HeartPulse, Lock, Check } from "lucide-react";

export type MilestoneData = {
  key: string;
  title: string;
  description: string;
  required_logs: number;
  current_logs: number;
  unlocked: boolean;
  unlocked_at?: string;
  claimed: boolean;
  claimed_at?: string;
  icon: string;
};

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
  milestones: MilestoneData[];
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

const MILESTONE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  stethoscope: Stethoscope,
  pill: Pill,
  "file-text": FileText,
  "heart-pulse": HeartPulse,
};

/** Milestone rewards: real-world benefits unlocked by logging */
export function MilestoneRewardsList({ data }: { data: GamificationData | undefined }) {
  const queryClient = useQueryClient();
  if (data == null || !data.milestones || data.milestones.length === 0) return null;

  const handleClaim = async (key: string) => {
    try {
      await api.post(`me/milestones/${key}/claim`, {});
      queryClient.invalidateQueries({ queryKey: ["me", "gamification"] });
    } catch {
      // already claimed or not unlocked
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4 min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium text-foreground">Rewards</span>
      </div>
      <ul className="space-y-3">
        {data.milestones.map((m) => {
          const Icon = MILESTONE_ICONS[m.icon] ?? Gift;
          const pct = Math.min(100, Math.round((m.current_logs / m.required_logs) * 100));
          return (
            <li
              key={m.key}
              className={`rounded-lg border p-3 transition-colors ${
                m.unlocked
                  ? m.claimed
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-primary/30 bg-primary/5"
                  : "border-border/60 bg-muted/20"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    m.unlocked
                      ? m.claimed
                        ? "bg-green-500/15 text-green-600 dark:text-green-400"
                        : "bg-primary/15 text-primary"
                      : "bg-muted/60 text-muted-foreground"
                  }`}
                >
                  {m.unlocked ? (
                    m.claimed ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${m.unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                      {m.title}
                    </p>
                    {m.unlocked && !m.claimed && (
                      <button
                        type="button"
                        onClick={() => handleClaim(m.key)}
                        className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors touch-manipulation"
                      >
                        Claim
                      </button>
                    )}
                    {m.claimed && (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">Claimed ✓</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                  {!m.unlocked && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60 transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium tabular-nums text-muted-foreground">
                          {m.current_logs}/{m.required_logs}
                        </span>
                      </div>
                    </div>
                  )}
                  {m.unlocked && m.unlocked_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Unlocked {new Date(m.unlocked_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Full gamification block for dashboard: streak, level, badges, weekly challenges, milestones */
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
      <MilestoneRewardsList data={data} />
    </div>
  );
}

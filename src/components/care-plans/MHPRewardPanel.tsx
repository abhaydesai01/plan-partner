import { Award, Gift, Lock, Check, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type HistoryItem = {
  action: string;
  points: number;
  date: string;
  day: number;
};

type RewardTier = {
  name: string;
  min_mhp: number;
  reward: string;
};

const actionLabels: Record<string, string> = {
  fasting_sugar_log: "Fasting sugar logged",
  postmeal_sugar_log: "Post-meal sugar logged",
  medicine_confirm: "Medicine confirmed",
  meal_log: "Meal logged",
  foot_check: "Foot check done",
  workout_log: "Workout logged",
  streak_3day: "3-day streak bonus",
  streak_7day: "7-day streak bonus",
  complication_screen_eye: "Eye screening",
  complication_screen_kidney: "Kidney screening",
  complication_screen_nerve: "Nerve screening",
  complication_screen_heart: "Heart screening",
};

export function MHPRewardPanel({
  balance,
  tier,
  history,
  rewardTiers,
  rewardsClaimed,
}: {
  balance: number;
  tier?: string;
  history: HistoryItem[];
  rewardTiers: RewardTier[];
  rewardsClaimed?: { bronze?: boolean; silver?: boolean; gold?: boolean };
}) {
  const recentHistory = [...history].reverse().slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Reward Tiers */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Reward Tiers</p>
        <div className="space-y-2">
          {rewardTiers.map((rt) => {
            const unlocked = balance >= rt.min_mhp;
            const claimed = rewardsClaimed?.[rt.name.toLowerCase() as keyof typeof rewardsClaimed];
            return (
              <div
                key={rt.name}
                className={`flex items-center gap-3 rounded-xl border p-3 ${unlocked ? "bg-gradient-to-r from-amber-50 to-white border-amber-200" : "bg-slate-50 border-slate-200"}`}
              >
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${unlocked ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                  {unlocked ? <Gift className="h-4.5 w-4.5" /> : <Lock className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${unlocked ? "text-amber-700" : "text-slate-400"}`}>{rt.name}</p>
                    <Badge variant={unlocked ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                      {rt.min_mhp} MHP
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{rt.reward}</p>
                </div>
                {unlocked && (
                  <div className="shrink-0">
                    {claimed ? (
                      <Badge variant="outline" className="text-green-600 border-green-300 text-[10px]">
                        <Check className="h-3 w-3 mr-0.5" /> Claimed
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px]">
                        <Gift className="h-3 w-3 mr-0.5" /> Claim
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {recentHistory.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Recent MHP Activity</p>
          <div className="space-y-1">
            {recentHistory.map((h, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 text-xs border-b border-slate-100 last:border-0">
                <span className="text-muted-foreground">
                  {actionLabels[h.action] || h.action} <span className="text-[10px]">(Day {h.day})</span>
                </span>
                <span className="font-semibold text-green-600">+{h.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

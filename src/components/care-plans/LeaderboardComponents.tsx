import { Badge } from "@/components/ui/badge";
import { Crown, Medal, Award, TrendingUp, Flame } from "lucide-react";

type RankEntry = {
  rank: number;
  name: string;
  mhp_balance: number;
  mhp_tier?: string;
  streak_days: number;
  is_current_user: boolean;
  badge?: string | null;
};

const rankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-4 w-4 text-amber-500 drop-shadow-sm" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400 drop-shadow-sm" />;
  if (rank === 3) return <Award className="h-4 w-4 text-orange-400 drop-shadow-sm" />;
  return <span className="text-sm font-bold">{rank}</span>;
};

const tierBadge = (tier?: string) => {
  if (!tier) return null;
  const map: Record<string, string> = {
    Gold: "bg-gradient-to-r from-amber-200 to-amber-100 text-amber-800 border-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
    Silver: "bg-gradient-to-r from-slate-200 to-slate-100 text-slate-700 border-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
    Bronze: "bg-gradient-to-r from-orange-200 to-orange-100 text-orange-800 border-orange-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
  };
  return (
    <Badge variant="outline" className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 ${map[tier] || ""}`}>
      {tier}
    </Badge>
  );
};

export function LeaderboardCard({ rankings }: { rankings: RankEntry[] }) {
  return (
    <div className="space-y-2">
      {rankings.map((r) => (
        <div
          key={r.rank}
          className={`group flex items-center gap-3.5 rounded-xl px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            r.is_current_user
              ? "bg-gradient-to-r from-emerald-50 to-green-50/50 border border-green-200 shadow-sm ring-1 ring-green-400/20"
              : r.rank <= 3
              ? "bg-slate-50 border border-slate-100/80"
              : "hover:bg-slate-50 border border-transparent"
          }`}
        >
          <div className={`flex items-center justify-center w-8 h-8 rounded-full shadow-sm shrink-0 transition-colors ${
            r.is_current_user ? "bg-white text-green-700" : "bg-slate-100 text-slate-600 group-hover:bg-white group-hover:shadow"
          }`}>
            {rankIcon(r.rank)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-sm font-bold truncate ${r.is_current_user ? "text-green-800" : "text-slate-800"}`}>
                {r.name}
                {r.is_current_user && <span className="text-[10px] ml-1.5 opacity-70 font-medium bg-green-200/50 px-1.5 py-0.5 rounded-full">(You)</span>}
              </span>
              {tierBadge(r.mhp_tier)}
              {r.badge && (
                <Badge className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-700 border-purple-300" variant="outline">
                  {r.badge}
                </Badge>
              )}
            </div>
            {r.streak_days >= 3 && (
              <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded w-fit">
                <Flame className="h-3 w-3" /> {r.streak_days}d streak
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className={`text-base font-black tabular-nums tracking-tight ${r.is_current_user ? "text-green-700" : "text-slate-800"}`}>{r.mhp_balance}</p>
            <p className={`text-[10px] font-bold ${r.is_current_user ? "text-green-600/70" : "text-slate-500"}`}>MHP</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WeeklyPodium({ top }: { top: { name: string; weekly_mhp: number; is_current_user: boolean }[] }) {
  if (top.length < 3) return null;

  const podiumOrder = [top[1], top[0], top[2]]; // 2nd, 1st, 3rd
  const heights = ["h-20", "h-28", "h-16"];
  const labels = ["2nd", "1st", "3rd"];
  const colors = [
    "bg-gradient-to-t from-slate-300 to-slate-200 border-t-2 border-slate-100 shadow-[inset_0_4px_6px_rgba(255,255,255,0.6)]",
    "bg-gradient-to-t from-amber-400 to-yellow-300 border-t-2 border-yellow-100 shadow-[inset_0_4px_6px_rgba(255,255,255,0.7)]",
    "bg-gradient-to-t from-orange-300 to-orange-200 border-t-2 border-orange-100 shadow-[inset_0_4px_6px_rgba(255,255,255,0.5)]"
  ];
  const ringColors = [
    "ring-slate-300",
    "ring-amber-400",
    "ring-orange-300"
  ];

  return (
    <div className="flex items-end justify-center gap-3 py-6 relative">
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none rounded-t-xl" />
      {podiumOrder.map((p, i) => (
        <div key={i} className="flex flex-col items-center gap-2 w-24 relative z-10 group hover:-translate-y-1 transition-transform duration-300 cursor-pointer">
          <div className="flex flex-col items-center">
            {i === 1 && <Crown className="h-6 w-6 text-amber-500 mb-1 drop-shadow-md" />}
            <div className={`w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center mb-1.5 text-sm font-black text-slate-700 ring-2 ${ringColors[i]} ring-offset-2`}>
              {p.name.charAt(0)}
            </div>
            <p className={`text-[11px] font-bold truncate max-w-[80px] px-1 ${p.is_current_user ? "text-green-600" : "text-slate-700"}`}>
              {p.name}
            </p>
            <p className="text-sm font-black tabular-nums text-slate-800 mt-0.5">{p.weekly_mhp}</p>
          </div>
          <div className={`${heights[i]} w-full rounded-t-xl ${colors[i]} flex items-end justify-center pb-2 shadow-lg relative overflow-hidden`}>
            {/* Glossy reflection overlay */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
            <span className="text-[11px] font-black text-slate-800/40 mix-blend-multiply">{labels[i]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityFeed({ feed }: { feed: { action: string; points: number; patient_name: string; date: string }[] }) {
  const actionEmoji: Record<string, string> = {
    fasting_sugar_log: "🩸",
    postmeal_sugar_log: "🩸",
    medicine_confirm: "💊",
    meal_log: "🍽️",
    foot_check: "🦶",
    workout_log: "🏋️",
    streak_3day: "🔥",
    streak_7day: "🔥",
  };

  const actionShort: Record<string, string> = {
    fasting_sugar_log: "logged fasting sugar",
    postmeal_sugar_log: "logged post-meal sugar",
    medicine_confirm: "confirmed medicine",
    meal_log: "logged a meal",
    foot_check: "did foot check",
    workout_log: "logged workout",
    streak_3day: "hit 3-day streak!",
    streak_7day: "hit 7-day streak!",
  };

  return (
    <div className="space-y-1">
      {feed.map((f, i) => (
        <div key={i} className="flex items-center gap-3 text-xs py-2.5 border-b border-slate-100/80 last:border-0 group hover:bg-slate-50/50 rounded-lg px-2 transition-colors -mx-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 shadow-sm text-sm group-hover:bg-white group-hover:shadow transition-colors">
            {actionEmoji[f.action] || "✅"}
          </div>
          <span className="flex-1 text-slate-500 leading-snug">
            <span className="font-bold text-slate-800">{f.patient_name}</span>{" "}
            {actionShort[f.action] || f.action}
          </span>
          <span className="text-emerald-600 font-black shrink-0 ml-2">+{f.points}</span>
        </div>
      ))}
      {feed.length === 0 && <div className="text-center py-6 text-sm text-slate-400">No recent activity</div>}
    </div>
  );
}

export function MyPositionBanner({
  myRank,
  myMhp,
  totalMembers,
  nextAbove,
}: {
  myRank: number;
  myMhp: number;
  totalMembers: number;
  nextAbove?: { name: string; mhp: number; gap: number } | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 shadow-xl shadow-indigo-900/10 ring-1 ring-white/10">
      <div className="absolute right-0 top-0 w-64 h-64 border-[40px] border-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
      <div className="relative flex items-center justify-between z-10 w-full">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-b from-white/20 to-white/5 shadow-inner backdrop-blur-md border border-white/20 text-2xl font-black">
            #{myRank}
          </div>
          <div>
            <p className="text-2xl font-black tracking-tight leading-none mb-1">{myMhp} <span className="text-indigo-200 text-sm font-semibold ml-0.5">MHP</span></p>
            <p className="text-[11px] font-medium text-indigo-200/80 uppercase tracking-wider">of {totalMembers} members</p>
          </div>
        </div>
        {nextAbove && (
          <div className="text-right bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10 shadow-sm shrink-0">
            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-0.5">Next: {nextAbove.name}</p>
            <p className="text-sm font-bold flex items-center gap-1.5 text-amber-300">
              <TrendingUp className="h-4 w-4" /> {nextAbove.gap} <span className="text-[10px] text-amber-300/80">to go</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function BatchMomentum({ loggedToday, totalMembers, momentumPct }: { loggedToday: number; totalMembers: number; momentumPct: number }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-lg shadow-emerald-500/5 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm text-emerald-700 font-bold flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-emerald-500" />
            Today's Batch Energy
          </p>
          <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-emerald-200/50">
            {loggedToday}/{totalMembers} LOYAL
          </div>
        </div>
        
        <div className="flex items-baseline gap-1 mb-3">
          <p className="text-4xl font-black text-slate-800 tracking-tight leading-none">{momentumPct}</p>
          <p className="text-xl text-slate-400 font-bold">%</p>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-3 shadow-inner overflow-hidden">
          <div 
            className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full transition-all duration-1000 ease-out relative" 
            style={{ width: `${momentumPct}%` }} 
          >
            <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-r from-transparent to-white/40" />
          </div>
        </div>
      </div>
    </div>
  );
}

import { Flame, Calendar, Activity, TrendingUp, Target } from "lucide-react";

type StatRowProps = {
  currentDay: number;
  totalDays: number;
  streakDays: number;
  mhpBalance: number;
  daysLogged: number;
};

export function StatsRow({ currentDay, totalDays, streakDays, mhpBalance, daysLogged }: StatRowProps) {
  const logRate = currentDay > 0 ? Math.round((daysLogged / currentDay) * 100) : 0;

  const stats = [
    { icon: Calendar, label: "Day", value: `${currentDay}/${totalDays}`, color: "text-blue-600 bg-blue-50" },
    { icon: Flame, label: "Streak", value: `${streakDays}d`, color: "text-amber-600 bg-amber-50" },
    { icon: Activity, label: "Log Rate", value: `${logRate}%`, color: "text-green-600 bg-green-50" },
    { icon: TrendingUp, label: "MHP", value: String(mhpBalance), color: "text-purple-600 bg-purple-50" },
    { icon: Target, label: "Logged", value: `${daysLogged}d`, color: "text-rose-600 bg-rose-50" },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map((s) => (
        <div key={s.label} className={`flex flex-col items-center rounded-2xl py-4 px-2 ${s.color.split(" ")[1]}`}>
          <s.icon className={`h-5 w-5 mb-2 ${s.color.split(" ")[0]}`} />
          <p className="text-lg font-bold tabular-nums text-foreground leading-tight">{s.value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

import { Progress } from "@/components/ui/progress";

const TIERS = [
  { name: "Bronze", min: 200, color: "text-orange-600" },
  { name: "Silver", min: 500, color: "text-slate-500" },
  { name: "Gold", min: 1000, color: "text-amber-500" },
];

export function TierProgressBar({ balance, tier }: { balance: number; tier?: string }) {
  const maxMhp = 1000;
  const pct = Math.min((balance / maxMhp) * 100, 100);

  const currentIdx = tier ? TIERS.findIndex((t) => t.name === tier) : -1;
  const nextTier = currentIdx < TIERS.length - 1 ? TIERS[currentIdx + 1] : null;
  const pointsToNext = nextTier ? Math.max(nextTier.min - balance, 0) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium">Tier Progress</span>
        {nextTier ? (
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{pointsToNext}</span> MHP to{" "}
            <span className={`font-semibold ${nextTier.color}`}>{nextTier.name}</span>
          </span>
        ) : (
          <span className="font-semibold text-amber-500">Max Tier Reached!</span>
        )}
      </div>

      {/* Progress bar with tick markers */}
      <div className="relative">
        <Progress value={pct} className="h-4 rounded-full bg-slate-100" />
        {TIERS.map((t) => (
          <div
            key={t.name}
            className="absolute top-0 h-full w-0.5 -translate-x-0.5"
            style={{ left: `${(t.min / maxMhp) * 100}%` }}
          >
            <div className={`h-full w-full ${balance >= t.min ? "bg-white/70" : "bg-slate-300"}`} />
          </div>
        ))}
      </div>

      {/* Tier labels aligned to their tick positions */}
      <div className="relative h-5">
        {TIERS.map((t, i) => {
          const isLast = i === TIERS.length - 1;
          const active = balance >= t.min;
          return (
            <span
              key={t.name}
              className={`absolute text-[11px] font-medium whitespace-nowrap ${
                active ? t.color + " font-semibold" : "text-muted-foreground"
              } ${isLast ? "-translate-x-full" : "-translate-x-1/2"}`}
              style={isLast ? { left: "100%" } : { left: `${(t.min / maxMhp) * 100}%` }}
            >
              {t.name} ({t.min})
            </span>
          );
        })}
      </div>
    </div>
  );
}

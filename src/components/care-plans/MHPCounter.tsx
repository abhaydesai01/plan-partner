import { useEffect, useRef, useState } from "react";
import { Coins } from "lucide-react";

export function MHPCounter({ value, tier }: { value: number; tier?: string }) {
  const [display, setDisplay] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 800;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(start + diff * ease));
      if (progress < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const tierColors: Record<string, string> = {
    Gold: "from-amber-400 to-yellow-500 text-yellow-950",
    Silver: "from-slate-300 to-slate-400 text-slate-800",
    Bronze: "from-orange-400 to-amber-600 text-orange-950",
  };

  const bgClass = tier ? tierColors[tier] || "from-green-600 to-emerald-700 text-white" : "from-green-600 to-emerald-700 text-white";

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${bgClass} p-5 shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Mediimate Health Points</p>
          <p className="text-4xl font-heading font-bold tabular-nums mt-1">{display}</p>
          {tier && <span className="text-xs font-semibold opacity-90">{tier} Tier</span>}
        </div>
        <Coins className="h-10 w-10 opacity-30" />
      </div>
      {/* Decorative rings */}
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full border-4 border-current opacity-10" />
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-4 border-current opacity-5" />
    </div>
  );
}

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip as RechartsTooltip, Area, ComposedChart } from "recharts";

type DayLog = {
  day: number;
  fasting_sugar?: number | null;
  postmeal_sugar?: number | null;
};

export function SugarChart({ dayLogs, currentDay }: { dayLogs: DayLog[]; currentDay: number }) {
  const chartData = useMemo(() => {
    return Array.from({ length: currentDay }, (_, i) => {
      const day = i + 1;
      const log = dayLogs.find((d) => d.day === day);
      return {
        day,
        fasting: log?.fasting_sugar ?? undefined,
        postmeal: log?.postmeal_sugar ?? undefined,
      };
    });
  }, [dayLogs, currentDay]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No sugar readings yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Blood Sugar Trend</p>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-blue-500 rounded" /> Fasting</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-rose-500 rounded" /> Post-meal</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
          <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v) => `D${v}`} />
          <YAxis domain={[60, 300]} tick={{ fontSize: 10 }} />
          <RechartsTooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
            labelFormatter={(v) => `Day ${v}`}
          />
          {/* Target band 80-130 */}
          <ReferenceLine y={130} stroke="#22c55e" strokeDasharray="5 5" strokeOpacity={0.5} />
          <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="5 5" strokeOpacity={0.5} />
          {/* Danger line */}
          <ReferenceLine y={200} stroke="#e11d48" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: "High", position: "right", fontSize: 9, fill: "#e11d48" }} />
          <Line type="monotone" dataKey="fasting" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} connectNulls />
          <Line type="monotone" dataKey="postmeal" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3, fill: "#f43f5e" }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

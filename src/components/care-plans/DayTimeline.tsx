import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar } from "lucide-react";

type DayLog = {
  day: number;
  fasting_sugar?: number | null;
  postmeal_sugar?: number | null;
  meds_taken?: boolean;
  meals_logged?: number;
  mhp_earned_today?: number;
};

export function DayTimeline({
  totalDays,
  currentDay,
  dayLogs,
}: {
  totalDays: number;
  currentDay: number;
  dayLogs: DayLog[];
}) {
  const logMap = new Map(dayLogs.map((d) => [d.day, d]));

  const getDayStatus = (day: number) => {
    if (day > currentDay) return "future";
    const log = logMap.get(day);
    if (!log) return day < currentDay ? "missed" : "today";
    const hasActivity = log.fasting_sugar != null || log.postmeal_sugar != null || log.meds_taken || (log.meals_logged || 0) > 0;
    if (day === currentDay) return hasActivity ? "today-active" : "today";
    return hasActivity ? "logged" : "missed";
  };

  const statusStyles: Record<string, string> = {
    logged: "bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-sm ring-1 ring-green-400/50",
    missed: "bg-slate-50 text-slate-300 ring-1 ring-slate-200 border border-slate-100",
    today: "bg-gradient-to-br from-amber-200 to-amber-300 text-amber-800 ring-2 ring-amber-400 animate-pulse shadow-sm",
    "today-active": "bg-gradient-to-br from-emerald-400 to-green-500 text-white ring-2 ring-amber-400 shadow-md",
    future: "bg-slate-50 border border-dashed border-slate-200 text-slate-300",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-500" />
          30-Day Journey
        </p>
        <p className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          Day {currentDay} / {totalDays}
        </p>
      </div>

      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: totalDays }, (_, i) => {
            const day = i + 1;
            const status = getDayStatus(day);
            const log = logMap.get(day);
            return (
              <Tooltip key={day}>
                <TooltipTrigger asChild>
                  <div
                    className={`w-full aspect-square rounded-lg flex items-center justify-center text-[11px] font-black cursor-default transition-all duration-300 hover:scale-[1.15] hover:z-10 ${statusStyles[status]}`}
                  >
                    {day}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs font-medium p-3 rounded-xl shadow-xl border-slate-100 bg-white text-slate-700">
                  <p className="font-black text-sm text-slate-900 mb-1 border-b border-slate-100 pb-1">Day {day}</p>
                  {log && (
                    <div className="space-y-1 mt-2">
                      {log.fasting_sugar != null && <p className="flex justify-between gap-4"><span>Fasting:</span><span className="font-bold">{log.fasting_sugar}</span></p>}
                      {log.postmeal_sugar != null && <p className="flex justify-between gap-4"><span>Post-meal:</span><span className="font-bold">{log.postmeal_sugar}</span></p>}
                      {log.meds_taken && <p className="flex justify-between gap-4 text-emerald-600"><span>Medicine:</span><span className="font-bold">✓</span></p>}
                      {(log.meals_logged || 0) > 0 && <p className="flex justify-between gap-4"><span>Meals:</span><span className="font-bold">{log.meals_logged} logged</span></p>}
                      {(log.mhp_earned_today || 0) > 0 && <p className="flex justify-between gap-4 text-amber-500"><span>MHP earned:</span><span className="font-bold">+{log.mhp_earned_today}</span></p>}
                    </div>
                  )}
                  {!log && day < currentDay && <p className="text-slate-400 italic mt-1">No activity logged</p>}
                  {day === currentDay && <p className="text-amber-500 font-bold mt-1">Today's focuses</p>}
                  {day > currentDay && <p className="text-slate-400 italic mt-1">Upcoming day</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-bold text-slate-500 pt-2 border-t border-slate-50/50">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm" /> Logged</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-200" /> Missed</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-300 ring-2 ring-amber-100" /> Today</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-300" /> Future</span>
      </div>
    </div>
  );
}

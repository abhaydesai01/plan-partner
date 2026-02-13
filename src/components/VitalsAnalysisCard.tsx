import { format } from "date-fns";
import { Activity, AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { VitalsAnalysisResult, VitalStatus } from "@/lib/vitalsAnalysis";

const STATUS_CONFIG: Record<VitalStatus, { icon: typeof CheckCircle; label: string; className: string }> = {
  normal: { icon: CheckCircle, label: "Normal", className: "bg-green-500/10 text-green-700 dark:text-green-400" },
  elevated: { icon: AlertTriangle, label: "Elevated", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  low: { icon: AlertTriangle, label: "Low", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  unknown: { icon: Info, label: "—", className: "bg-muted text-muted-foreground" },
};

interface Props {
  data: VitalsAnalysisResult;
  emptyMessage?: string;
}

export function VitalsAnalysisCard({ data, emptyMessage = "No vitals to analyze yet. Add readings to see status and recommendations." }: Props) {
  if (data.items.length === 0) {
    return (
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5 text-primary" />
          Vitals analysis & recommendations
        </h3>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        Vitals analysis & recommendations
      </h3>
      <p className="text-sm text-muted-foreground">{data.summary}</p>
      <div className="space-y-3">
        {data.items.map((item) => {
          const config = STATUS_CONFIG[item.status];
          const Icon = config.icon;
          return (
            <div
              key={item.vital_type}
              className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-sm text-foreground">{item.label}</span>
                <span className="font-heading font-bold text-foreground">{item.value_text}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
                  <Icon className="w-3 h-3" />
                  {config.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{item.message}</p>
              <p className="text-xs text-foreground/90 font-medium">{item.recommendation}</p>
              <p className="text-[10px] text-muted-foreground">{format(new Date(item.recorded_at), "MMM d, yyyy 'at' HH:mm")}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

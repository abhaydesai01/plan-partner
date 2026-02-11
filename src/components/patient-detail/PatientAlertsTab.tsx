import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  alert_type: string;
  created_at: string;
  resolution_notes: string | null;
  resolved_at: string | null;
}

interface Props {
  patientId: string;
  doctorId: string;
}

const severityColors: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  warning: "bg-accent/10 text-accent border-accent/30",
  info: "bg-primary/10 text-primary border-primary/30",
};

const PatientAlertsTab = ({ patientId, doctorId }: Props) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.get<Alert[]>("alerts", { patient_id: patientId });
        setAlerts(Array.isArray(data) ? data : []);
      } catch {
        setAlerts([]);
      }
      setLoading(false);
    };
    fetch();
  }, [patientId, doctorId]);

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const openAlerts = alerts.filter((a) => a.status === "open");
  const resolvedAlerts = alerts.filter((a) => a.status !== "open");

  if (alerts.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-whatsapp/30 mx-auto mb-3" />
        <p className="text-muted-foreground">No alerts for this patient.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-destructive" />
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">{openAlerts.length}</p>
            <p className="text-xs text-muted-foreground">Open Alerts</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-whatsapp" />
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">{resolvedAlerts.length}</p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </div>
        </div>
      </div>

      {/* Open Alerts */}
      {openAlerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Open ({openAlerts.length})</p>
          {openAlerts.map((a) => (
            <div key={a.id} className={`glass-card rounded-xl p-4 border-l-4 ${severityColors[a.severity] || severityColors.info}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${severityColors[a.severity] || severityColors.info}`}>
                      {a.severity}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize">{a.alert_type.replace("_", " ")}</span>
                  </div>
                  <p className="font-medium text-sm text-foreground mt-1">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{format(new Date(a.created_at), "MMM d")}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved */}
      {resolvedAlerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resolved ({resolvedAlerts.length})</p>
          {resolvedAlerts.map((a) => (
            <div key={a.id} className="glass-card rounded-xl p-4 opacity-70">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                  {a.resolution_notes && <p className="text-xs text-whatsapp mt-1">✓ {a.resolution_notes}</p>}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{format(new Date(a.created_at), "MMM d")}</span>
                  {a.resolved_at && <p className="text-[10px] text-whatsapp">Resolved {format(new Date(a.resolved_at), "MMM d")}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientAlertsTab;

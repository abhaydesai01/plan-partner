import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Heart, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

interface Vital {
  id: string;
  vital_type: string;
  value_text: string;
  value_numeric: number | null;
  unit: string | null;
  recorded_at: string;
  notes: string | null;
}

interface Props {
  patientId: string;
  doctorId: string;
}

const VITAL_COLORS: Record<string, string> = {
  "Blood Pressure": "hsl(0, 70%, 55%)",
  "Blood Glucose": "hsl(30, 90%, 50%)",
  "Heart Rate": "hsl(340, 70%, 55%)",
  Weight: "hsl(200, 70%, 50%)",
  SpO2: "hsl(160, 70%, 45%)",
  Temperature: "hsl(270, 60%, 55%)",
};

const PatientVitalsTab = ({ patientId, doctorId }: Props) => {
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("vitals")
        .select("*")
        .eq("patient_id", patientId)
        .eq("doctor_id", doctorId)
        .order("recorded_at", { ascending: false })
        .limit(100);
      setVitals(data || []);
      setLoading(false);
    };
    fetch();
  }, [patientId, doctorId]);

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>;

  // Group vitals by type
  const grouped: Record<string, Vital[]> = {};
  vitals.forEach((v) => {
    if (!grouped[v.vital_type]) grouped[v.vital_type] = [];
    grouped[v.vital_type].push(v);
  });

  const types = Object.keys(grouped);
  const activeType = selectedType || types[0] || null;

  // Build chart data for selected type
  const chartData = activeType
    ? [...grouped[activeType]]
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
        .map((v) => ({
          date: format(new Date(v.recorded_at), "MMM d"),
          value: v.value_numeric,
          label: v.value_text,
        }))
    : [];

  // Latest reading per type
  const latestByType = types.map((type) => {
    const latest = grouped[type][0];
    const prev = grouped[type][1];
    let trend: "up" | "down" | "stable" = "stable";
    if (latest?.value_numeric && prev?.value_numeric) {
      trend = latest.value_numeric > prev.value_numeric ? "up" : latest.value_numeric < prev.value_numeric ? "down" : "stable";
    }
    return { type, latest, trend };
  });

  if (vitals.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">No vitals recorded for this patient.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Latest Readings Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {latestByType.map(({ type, latest, trend }) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`glass-card rounded-xl p-3 text-left transition-all hover:shadow-md ${activeType === type ? "ring-2 ring-primary shadow-md" : ""}`}
          >
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">{type}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-lg font-heading font-bold text-foreground">{latest.value_text}</p>
              {latest.unit && <span className="text-xs text-muted-foreground">{latest.unit}</span>}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              {trend === "up" && <TrendingUp className="w-3 h-3 text-destructive" />}
              {trend === "down" && <TrendingDown className="w-3 h-3 text-whatsapp" />}
              {trend === "stable" && <Minus className="w-3 h-3 text-muted-foreground" />}
              <span className="text-[10px] text-muted-foreground">{format(new Date(latest.recorded_at), "MMM d")}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Trend Chart */}
      {activeType && chartData.some((d) => d.value !== null) && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">{activeType} Trend</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 13 }}
                  formatter={(val: number, _: string, entry: any) => [entry.payload.label || val, activeType]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={VITAL_COLORS[activeType] || "hsl(var(--primary))"}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: VITAL_COLORS[activeType] || "hsl(var(--primary))" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History Table */}
      {activeType && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-3">{activeType} History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-xs text-muted-foreground">
                  <th className="text-left py-2 font-medium">Date</th>
                  <th className="text-left py-2 font-medium">Value</th>
                  <th className="text-left py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {grouped[activeType].map((v) => (
                  <tr key={v.id} className="border-b border-border/30">
                    <td className="py-2 text-foreground">{format(new Date(v.recorded_at), "MMM d, yyyy HH:mm")}</td>
                    <td className="py-2 font-medium text-foreground">{v.value_text} {v.unit || ""}</td>
                    <td className="py-2 text-muted-foreground">{v.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientVitalsTab;

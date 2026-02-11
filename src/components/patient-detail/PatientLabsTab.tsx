import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { FlaskConical, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine,
} from "recharts";

interface LabResult {
  id: string;
  test_name: string;
  result_value: string;
  unit: string | null;
  reference_range: string | null;
  status: string;
  tested_at: string;
  notes: string | null;
}

interface Props {
  patientId: string;
  doctorId: string;
}

const PatientLabsTab = ({ patientId, doctorId }: Props) => {
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.get<LabResult[]>("lab_results", { patient_id: patientId });
        setLabs(Array.isArray(data) ? data : []);
      } catch {
        setLabs([]);
      }
      setLoading(false);
    };
    fetch();
  }, [patientId, doctorId]);

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>;

  if (labs.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <FlaskConical className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">No lab results for this patient.</p>
      </div>
    );
  }

  const abnormal = labs.filter((l) => l.status === "abnormal");
  const normal = labs.filter((l) => l.status === "normal");

  // Chart data: numeric results
  const chartData = labs
    .filter((l) => !isNaN(parseFloat(l.result_value)))
    .slice(0, 15)
    .reverse()
    .map((l) => ({
      name: l.test_name.length > 12 ? l.test_name.slice(0, 12) + "…" : l.test_name,
      fullName: l.test_name,
      value: parseFloat(l.result_value),
      status: l.status,
      unit: l.unit || "",
      ref: l.reference_range || "",
    }));

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">{abnormal.length}</p>
            <p className="text-xs text-muted-foreground">Abnormal Results</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-whatsapp/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-whatsapp" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">{normal.length}</p>
            <p className="text-xs text-muted-foreground">Normal Results</p>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Lab Results Overview</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 13 }}
                  formatter={(val: number, _: string, entry: any) => [`${val} ${entry.payload.unit}`, entry.payload.fullName]}
                  labelFormatter={(label) => ""}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.status === "abnormal" ? "hsl(0, 70%, 55%)" : "hsl(142, 70%, 45%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed Table */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-heading font-semibold text-foreground mb-3">All Lab Results</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs text-muted-foreground">
                <th className="text-left py-2 font-medium">Test</th>
                <th className="text-left py-2 font-medium">Result</th>
                <th className="text-left py-2 font-medium">Reference</th>
                <th className="text-left py-2 font-medium">Status</th>
                <th className="text-left py-2 font-medium">Date</th>
                <th className="text-left py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {labs.map((l) => (
                <tr key={l.id} className={`border-b border-border/30 ${l.status === "abnormal" ? "bg-destructive/5" : ""}`}>
                  <td className="py-2.5 font-medium text-foreground">{l.test_name}</td>
                  <td className="py-2.5 text-foreground">{l.result_value} {l.unit || ""}</td>
                  <td className="py-2.5 text-muted-foreground">{l.reference_range || "—"}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${l.status === "abnormal" ? "bg-destructive/10 text-destructive" : "bg-whatsapp/10 text-whatsapp"}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-muted-foreground whitespace-nowrap">{format(new Date(l.tested_at), "MMM d, yyyy")}</td>
                  <td className="py-2.5 text-muted-foreground max-w-[200px] truncate">{l.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PatientLabsTab;

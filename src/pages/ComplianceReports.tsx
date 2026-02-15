import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { AlertTriangle, TrendingUp, Users, CheckCircle } from "lucide-react";

const CHART_COLORS = [
  "hsl(168, 80%, 30%)",
  "hsl(24, 95%, 54%)",
  "hsl(142, 70%, 45%)",
  "hsl(200, 70%, 50%)",
  "hsl(0, 84%, 60%)",
];

const ComplianceReports = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const [enrollList, patientList, programList] = await Promise.all([
          api.get<any[]>("enrollments").catch(() => []),
          api.get<{ items: any[] }>("patients", { limit: "200", skip: "0" }).then((r) => r.items ?? []).catch(() => []),
          api.get<any[]>("programs").catch(() => []),
        ]);
        setEnrollments((Array.isArray(enrollList) ? enrollList : []).map(e => ({ ...e, adherence_pct: e.adherence_pct ? Number(e.adherence_pct) : 0 })));
        setPatients(Array.isArray(patientList) ? patientList : []);
        setPrograms(Array.isArray(programList) ? programList : []);
      } catch {
        setEnrollments([]);
        setPatients([]);
        setPrograms([]);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const avgAdherence = enrollments.length > 0
    ? Math.round(enrollments.reduce((s, e) => s + e.adherence_pct, 0) / enrollments.length)
    : 0;

  const atRiskPatients = patients.filter(p => p.status === "at_risk");
  const compliantCount = enrollments.filter(e => e.adherence_pct >= 80).length;
  const nonCompliantCount = enrollments.filter(e => e.adherence_pct < 50).length;

  // Per-program compliance
  const programCompliance = programs.map(p => {
    const progEnrolls = enrollments.filter(e => e.program_id === p.id);
    const avg = progEnrolls.length > 0 ? Math.round(progEnrolls.reduce((s, e) => s + e.adherence_pct, 0) / progEnrolls.length) : 0;
    const compliant = progEnrolls.filter(e => e.adherence_pct >= 80).length;
    return {
      name: p.name.length > 18 ? p.name.slice(0, 18) + "…" : p.name,
      avgAdherence: avg,
      compliant,
      total: progEnrolls.length,
    };
  }).filter(p => p.total > 0);

  // Risk distribution
  const riskData = [
    { name: "Compliant (≥80%)", value: compliantCount },
    { name: "Moderate (50-79%)", value: enrollments.filter(e => e.adherence_pct >= 50 && e.adherence_pct < 80).length },
    { name: "Non-Compliant (<50%)", value: nonCompliantCount },
  ].filter(d => d.value > 0);

  // Non-compliant patient list
  const nonCompliantPatients = enrollments
    .filter(e => e.adherence_pct < 50 && e.status === "active")
    .map(e => {
      const patient = patients.find(p => p.id === e.patient_id);
      const program = programs.find(p => p.id === e.program_id);
      return {
        id: e.id,
        patientName: patient?.full_name || "Unknown",
        programName: program?.name || "Unknown",
        adherence: e.adherence_pct,
      };
    })
    .sort((a, b) => a.adherence - b.adherence);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Compliance Reports</h1>
        <p className="text-muted-foreground text-sm">Patient adherence and compliance analytics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 text-center">
          <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-foreground">{avgAdherence}%</p>
          <p className="text-xs text-muted-foreground">Avg Adherence</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <CheckCircle className="w-5 h-5 text-whatsapp mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-foreground">{compliantCount}</p>
          <p className="text-xs text-muted-foreground">Compliant (≥80%)</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <AlertTriangle className="w-5 h-5 text-destructive mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-foreground">{nonCompliantCount}</p>
          <p className="text-xs text-muted-foreground">Non-Compliant</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <Users className="w-5 h-5 text-accent mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-foreground">{atRiskPatients.length}</p>
          <p className="text-xs text-muted-foreground">At-Risk Patients</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Program Compliance */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Compliance by Program</h3>
          {programCompliance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrollment data yet.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={programCompliance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 15%, 88%)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(180, 8%, 46%)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "hsl(180, 8%, 46%)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(160, 15%, 88%)", fontSize: 13 }} />
                  <Bar dataKey="avgAdherence" name="Avg Adherence %" fill="hsl(168, 80%, 30%)" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Risk Distribution Pie */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Risk Distribution</h3>
          {riskData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <div className="h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" nameKey="name" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {riskData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(160, 15%, 88%)", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 space-y-1">
            {riskData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[i] }} />
                <span className="text-muted-foreground">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Non-Compliant Patients */}
      {nonCompliantPatients.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Non-Compliant Patients (Active, &lt;50%)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Patient</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Program</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Adherence</th>
                </tr>
              </thead>
              <tbody>
                {nonCompliantPatients.map(p => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="px-4 py-2.5 font-medium text-foreground">{p.patientName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.programName}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-destructive font-medium">{p.adherence}%</span>
                    </td>
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

export default ComplianceReports;

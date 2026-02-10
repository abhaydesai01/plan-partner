import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Users, Layers, Activity, AlertTriangle, TrendingUp, CalendarDays, Building2, Plus, ArrowRight } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Stats {
  totalPatients: number;
  activePrograms: number;
  activeEnrollments: number;
  atRiskPatients: number;
}

interface Enrollment {
  enrolled_at: string;
  adherence_pct: number | null;
  status: string;
  program_id: string;
}

interface Program {
  id: string;
  name: string;
  type: string;
}

interface Appointment {
  scheduled_at: string;
  status: string;
}

const CHART_COLORS = [
  "hsl(168, 80%, 30%)",  // primary
  "hsl(24, 95%, 54%)",   // accent
  "hsl(142, 70%, 45%)",  // whatsapp
  "hsl(200, 70%, 50%)",  // blue
  "hsl(280, 60%, 50%)",  // purple
];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalPatients: 0, activePrograms: 0, activeEnrollments: 0, atRiskPatients: 0 });
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasClinic, setHasClinic] = useState<boolean | null>(null);
  const [clinicName, setClinicName] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      // Check clinic membership
      const { data: membership } = await supabase
        .from("clinic_members")
        .select("clinic_id, clinics(name)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      
      setHasClinic(!!membership);
      if (membership) {
        setClinicName((membership.clinics as any)?.name || "");
      }

      const [patients, progs, enrolls, atRisk, appts] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("doctor_id", user.id),
        supabase.from("programs").select("id, name, type").eq("doctor_id", user.id),
        supabase.from("enrollments").select("enrolled_at, adherence_pct, status, program_id").eq("doctor_id", user.id),
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("doctor_id", user.id).eq("status", "at_risk"),
        supabase.from("appointments").select("scheduled_at, status").eq("doctor_id", user.id),
      ]);

      const activeProgs = progs.data?.filter((p) => true) || [];
      const activeEnrolls = enrolls.data?.filter((e) => e.status === "active") || [];

      setStats({
        totalPatients: patients.count ?? 0,
        activePrograms: activeProgs.length,
        activeEnrollments: activeEnrolls.length,
        atRiskPatients: atRisk.count ?? 0,
      });
      setPrograms(progs.data || []);
      setEnrollments(enrolls.data || []);
      setAppointments(appts.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  // --- Chart Data ---

  // Enrollment growth over time (last 6 months)
  const enrollmentGrowth = (() => {
    const now = new Date();
    const months: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en", { month: "short", year: "2-digit" });
      const count = enrollments.filter((e) => {
        const ed = new Date(e.enrolled_at);
        return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
      }).length;
      months.push({ label, count });
    }
    return months;
  })();

  // Adherence distribution
  const adherenceDistribution = (() => {
    const buckets = [
      { name: "0–25%", min: 0, max: 25, count: 0 },
      { name: "26–50%", min: 26, max: 50, count: 0 },
      { name: "51–75%", min: 51, max: 75, count: 0 },
      { name: "76–100%", min: 76, max: 100, count: 0 },
    ];
    enrollments.forEach((e) => {
      const val = e.adherence_pct ?? 0;
      const bucket = buckets.find((b) => val >= b.min && val <= b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  })();

  // Program performance (enrollments per program)
  const programPerformance = programs.map((p) => {
    const progEnrollments = enrollments.filter((e) => e.program_id === p.id);
    const avgAdherence = progEnrollments.length > 0
      ? Math.round(progEnrollments.reduce((sum, e) => sum + (e.adherence_pct ?? 0), 0) / progEnrollments.length)
      : 0;
    return { name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name, enrolled: progEnrollments.length, avgAdherence };
  });

  // Enrollment status breakdown for pie chart
  const statusBreakdown = (() => {
    const map: Record<string, number> = {};
    enrollments.forEach((e) => { map[e.status] = (map[e.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  })();

  // Upcoming appointments (next 7 days)
  const upcomingCount = appointments.filter((a) => {
    const d = new Date(a.scheduled_at);
    const now = new Date();
    const week = new Date(now.getTime() + 7 * 86400000);
    return d >= now && d <= week && a.status === "scheduled";
  }).length;

  const cards = [
    { label: "Total Patients", value: stats.totalPatients, icon: Users, color: "text-primary" },
    { label: "Active Programs", value: stats.activePrograms, icon: Layers, color: "text-accent" },
    { label: "Active Enrollments", value: stats.activeEnrollments, icon: Activity, color: "text-whatsapp" },
    { label: "At-Risk Patients", value: stats.atRiskPatients, icon: AlertTriangle, color: "text-destructive" },
    { label: "Upcoming (7d)", value: upcomingCount, icon: CalendarDays, color: "text-primary" },
    { label: "Avg. Adherence", value: enrollments.length > 0 ? Math.round(enrollments.reduce((s, e) => s + (e.adherence_pct ?? 0), 0) / enrollments.length) + "%" : "—", icon: TrendingUp, color: "text-whatsapp" },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const hasData = enrollments.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          {clinicName ? `${clinicName}` : "Welcome back, Doctor"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Here's your practice overview</p>
      </div>

      {/* Clinic Setup Prompt */}
      {hasClinic === false && (
        <div className="glass-card rounded-xl p-5 border-2 border-dashed border-primary/30 bg-primary/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-foreground">Set Up Your Clinic</h3>
              <p className="text-sm text-muted-foreground">Create a clinic to manage your team, or join an existing one with an invite code.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => navigate("/clinic-setup")} className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" /> Create
              </button>
              <button onClick={() => navigate("/join-clinic")} className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-muted text-muted-foreground font-semibold text-sm hover:bg-muted/80 transition-colors">
                Join <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{card.label}</span>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className="text-2xl font-heading font-bold text-foreground">{card.value}</div>
          </div>
        ))}
      </div>

      {!hasData ? (
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-heading font-semibold text-foreground mb-3">Getting Started</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Add your first patients from the Patients tab</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" /> Create care programs (NCD, Post-Discharge, Elder-Care)</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-whatsapp" /> Enroll patients into programs to track adherence</li>
          </ul>
        </div>
      ) : (
        <>
          {/* Row 1: Enrollment Growth + Adherence Distribution */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Enrollment Growth */}
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-heading font-semibold text-foreground mb-4">Enrollment Growth</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={enrollmentGrowth}>
                    <defs>
                      <linearGradient id="enrollGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(168, 80%, 30%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(168, 80%, 30%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 15%, 88%)" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(180, 8%, 46%)" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(180, 8%, 46%)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(160, 15%, 88%)", fontSize: 13 }} />
                    <Area type="monotone" dataKey="count" stroke="hsl(168, 80%, 30%)" strokeWidth={2} fill="url(#enrollGradient)" name="Enrollments" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Adherence Distribution */}
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-heading font-semibold text-foreground mb-4">Adherence Distribution</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={adherenceDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 15%, 88%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(180, 8%, 46%)" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(180, 8%, 46%)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(160, 15%, 88%)", fontSize: 13 }} />
                    <Bar dataKey="count" name="Patients" radius={[6, 6, 0, 0]}>
                      {adherenceDistribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 2: Program Performance + Status Breakdown */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Program Performance */}
            <div className="lg:col-span-2 glass-card rounded-xl p-5">
              <h3 className="font-heading font-semibold text-foreground mb-4">Program Performance</h3>
              {programPerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No programs yet.</p>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={programPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 15%, 88%)" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(180, 8%, 46%)" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "hsl(180, 8%, 46%)" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(160, 15%, 88%)", fontSize: 13 }} />
                      <Bar dataKey="enrolled" name="Enrolled" fill="hsl(168, 80%, 30%)" radius={[0, 6, 6, 0]} barSize={20} />
                      <Bar dataKey="avgAdherence" name="Avg Adherence %" fill="hsl(24, 95%, 54%)" radius={[0, 6, 6, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Enrollment Status Pie */}
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-heading font-semibold text-foreground mb-4">Enrollment Status</h3>
              {statusBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                <div className="h-52 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {statusBreakdown.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(160, 15%, 88%)", fontSize: 13 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;

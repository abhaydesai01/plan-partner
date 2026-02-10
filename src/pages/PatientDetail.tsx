import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Phone, User, Calendar, Activity, TrendingUp, AlertTriangle } from "lucide-react";
import DoctorCopilot from "@/components/DoctorCopilot";
import { format } from "date-fns";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Patient {
  id: string;
  full_name: string;
  phone: string;
  age: number | null;
  gender: string | null;
  conditions: string[] | null;
  medications: string[] | null;
  emergency_contact: string | null;
  status: string;
  created_at: string;
  last_check_in: string | null;
}

interface Enrollment {
  id: string;
  program_id: string;
  status: string;
  adherence_pct: number | null;
  enrolled_at: string;
  completed_at: string | null;
  program_name?: string;
  program_type?: string;
}

interface Appointment {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
}

const statusColors: Record<string, string> = {
  active: "bg-whatsapp/10 text-whatsapp",
  inactive: "bg-muted text-muted-foreground",
  at_risk: "bg-destructive/10 text-destructive",
  completed: "bg-primary/10 text-primary",
  paused: "bg-muted text-muted-foreground",
  dropped: "bg-destructive/10 text-destructive",
  scheduled: "bg-primary/10 text-primary",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-muted text-muted-foreground",
};

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    const fetchAll = async () => {
      const [patientRes, enrollRes, apptRes, programRes] = await Promise.all([
        supabase.from("patients").select("*").eq("id", id).eq("doctor_id", user.id).maybeSingle(),
        supabase.from("enrollments").select("*").eq("patient_id", id).eq("doctor_id", user.id).order("enrolled_at", { ascending: false }),
        supabase.from("appointments").select("*").eq("patient_id", id).eq("doctor_id", user.id).order("scheduled_at", { ascending: false }),
        supabase.from("programs").select("id, name, type").eq("doctor_id", user.id),
      ]);

      if (patientRes.data) setPatient(patientRes.data as Patient);

      const programMap: Record<string, { name: string; type: string }> = {};
      programRes.data?.forEach((p) => { programMap[p.id] = { name: p.name, type: p.type }; });

      if (enrollRes.data) {
        setEnrollments(enrollRes.data.map((e) => ({
          ...e,
          adherence_pct: e.adherence_pct ? Number(e.adherence_pct) : null,
          program_name: programMap[e.program_id]?.name || "Unknown",
          program_type: programMap[e.program_id]?.type || "",
        })));
      }
      if (apptRes.data) setAppointments(apptRes.data);
      setLoading(false);
    };
    fetchAll();
  }, [user, id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!patient) return <div className="text-center py-12 text-muted-foreground">Patient not found.</div>;

  const avgAdherence = enrollments.length > 0
    ? Math.round(enrollments.reduce((s, e) => s + (e.adherence_pct ?? 0), 0) / enrollments.length)
    : null;

  // Adherence trend from enrollments (sorted by enrolled_at)
  const adherenceTrend = [...enrollments]
    .sort((a, b) => new Date(a.enrolled_at).getTime() - new Date(b.enrolled_at).getTime())
    .map((e) => ({
      label: e.program_name || "Program",
      adherence: e.adherence_pct ?? 0,
    }));

  const upcomingAppts = appointments.filter((a) => new Date(a.scheduled_at) >= new Date() && a.status === "scheduled");
  const pastAppts = appointments.filter((a) => new Date(a.scheduled_at) < new Date() || a.status !== "scheduled");

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/dashboard/patients" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Patients
      </Link>

      {/* Patient Header */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-heading font-bold text-foreground">{patient.full_name}</h1>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[patient.status] || ""}`}>
                  {patient.status.replace("_", " ")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                {patient.age && <span>{patient.age} years</span>}
                {patient.gender && <span className="capitalize">{patient.gender}</span>}
                {patient.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {patient.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Added {format(new Date(patient.created_at), "MMM d, yyyy")}</p>
            {patient.last_check_in && <p>Last check-in: {format(new Date(patient.last_check_in), "MMM d, yyyy")}</p>}
          </div>
        </div>

        {/* Conditions & Medications */}
        <div className="grid sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-border/50">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Conditions</p>
            <div className="flex flex-wrap gap-1.5">
              {patient.conditions?.length ? patient.conditions.map((c) => (
                <span key={c} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{c}</span>
              )) : <span className="text-sm text-muted-foreground">None recorded</span>}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Medications</p>
            <div className="flex flex-wrap gap-1.5">
              {patient.medications?.length ? patient.medications.map((m) => (
                <span key={m} className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">{m}</span>
              )) : <span className="text-sm text-muted-foreground">None recorded</span>}
            </div>
          </div>
          {patient.emergency_contact && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Emergency Contact</p>
              <p className="text-sm text-foreground">{patient.emergency_contact}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 text-center">
          <Activity className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-foreground">{enrollments.length}</p>
          <p className="text-xs text-muted-foreground">Enrollments</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <TrendingUp className="w-5 h-5 text-whatsapp mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-foreground">{avgAdherence !== null ? `${avgAdherence}%` : "—"}</p>
          <p className="text-xs text-muted-foreground">Avg Adherence</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <Calendar className="w-5 h-5 text-accent mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-foreground">{appointments.length}</p>
          <p className="text-xs text-muted-foreground">Appointments</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <AlertTriangle className="w-5 h-5 text-destructive mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-foreground">{upcomingAppts.length}</p>
          <p className="text-xs text-muted-foreground">Upcoming</p>
        </div>
      </div>

      {/* Adherence Trend Chart */}
      {adherenceTrend.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Adherence by Program</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={adherenceTrend}>
                <defs>
                  <linearGradient id="adhGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 15%, 88%)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(180, 8%, 46%)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(180, 8%, 46%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(160, 15%, 88%)", fontSize: 13 }} formatter={(val: number) => [`${val}%`, "Adherence"]} />
                <Area type="monotone" dataKey="adherence" stroke="hsl(142, 70%, 45%)" strokeWidth={2} fill="url(#adhGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Enrollments & Appointments */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Enrollments */}
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h3 className="font-heading font-semibold text-foreground">Program Enrollments</h3>
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enrolled in any programs.</p>
          ) : (
            <div className="space-y-2">
              {enrollments.map((e) => (
                <div key={e.id} className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground">{e.program_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[e.status] || ""}`}>{e.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Enrolled {format(new Date(e.enrolled_at), "MMM d, yyyy")}</span>
                    <span className={`font-medium ${(e.adherence_pct ?? 0) >= 80 ? "text-whatsapp" : (e.adherence_pct ?? 0) >= 50 ? "text-primary" : "text-destructive"}`}>
                      {e.adherence_pct ?? 0}% adherence
                    </span>
                  </div>
                  {/* Adherence bar */}
                  <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${(e.adherence_pct ?? 0) >= 80 ? "bg-whatsapp" : (e.adherence_pct ?? 0) >= 50 ? "bg-primary" : "bg-destructive"}`}
                      style={{ width: `${Math.min(e.adherence_pct ?? 0, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Appointments */}
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h3 className="font-heading font-semibold text-foreground">Appointments</h3>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments scheduled.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {upcomingAppts.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upcoming</p>
              )}
              {upcomingAppts.map((a) => (
                <div key={a.id} className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground">{a.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[a.status] || ""}`}>{a.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{format(new Date(a.scheduled_at), "MMM d, yyyy 'at' HH:mm")}</span>
                    <span>{a.duration_minutes} min</span>
                  </div>
                  {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                </div>
              ))}
              {pastAppts.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-3">Past</p>
              )}
              {pastAppts.map((a) => (
                <div key={a.id} className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground">{a.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[a.status] || ""}`}>{a.status.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{format(new Date(a.scheduled_at), "MMM d, yyyy 'at' HH:mm")}</span>
                    <span>{a.duration_minutes} min</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clinical Copilot FAB */}
      <DoctorCopilot patientId={patient.id} patientName={patient.full_name} />
    </div>
  );
};

export default PatientDetail;

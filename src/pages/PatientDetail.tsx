import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Phone, User, Calendar, Activity, TrendingUp, AlertTriangle,
  FileText, FlaskConical, Heart, ClipboardList, Stethoscope
} from "lucide-react";
import DoctorCopilot from "@/components/DoctorCopilot";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PatientVitalsTab from "@/components/patient-detail/PatientVitalsTab";
import PatientLabsTab from "@/components/patient-detail/PatientLabsTab";
import PatientDocsTab from "@/components/patient-detail/PatientDocsTab";
import PatientAlertsTab from "@/components/patient-detail/PatientAlertsTab";

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
  const [counts, setCounts] = useState({ vitals: 0, labs: 0, docs: 0, alerts: 0 });

  useEffect(() => {
    if (!user || !id) return;
    const fetchAll = async () => {
      const [patientRes, enrollRes, apptRes, programRes, vitalsCount, labsCount, docsCount, alertsCount] = await Promise.all([
        supabase.from("patients").select("*").eq("id", id).eq("doctor_id", user.id).maybeSingle(),
        supabase.from("enrollments").select("*").eq("patient_id", id).eq("doctor_id", user.id).order("enrolled_at", { ascending: false }),
        supabase.from("appointments").select("*").eq("patient_id", id).eq("doctor_id", user.id).order("scheduled_at", { ascending: false }),
        supabase.from("programs").select("id, name, type").eq("doctor_id", user.id),
        supabase.from("vitals").select("id", { count: "exact", head: true }).eq("patient_id", id).eq("doctor_id", user.id),
        supabase.from("lab_results").select("id", { count: "exact", head: true }).eq("patient_id", id).eq("doctor_id", user.id),
        supabase.from("patient_documents").select("id", { count: "exact", head: true }).eq("patient_id", id).eq("doctor_id", user.id),
        supabase.from("alerts").select("id", { count: "exact", head: true }).eq("patient_id", id).eq("doctor_id", user.id).eq("status", "open"),
      ]);

      if (patientRes.data) setPatient(patientRes.data as Patient);
      setCounts({
        vitals: vitalsCount.count ?? 0,
        labs: labsCount.count ?? 0,
        docs: docsCount.count ?? 0,
        alerts: alertsCount.count ?? 0,
      });

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
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <div className="glass-card rounded-xl p-3 text-center">
          <Activity className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-heading font-bold text-foreground">{enrollments.length}</p>
          <p className="text-[10px] text-muted-foreground">Programs</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <TrendingUp className="w-4 h-4 text-whatsapp mx-auto mb-1" />
          <p className="text-lg font-heading font-bold text-foreground">{avgAdherence !== null ? `${avgAdherence}%` : "—"}</p>
          <p className="text-[10px] text-muted-foreground">Adherence</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <Heart className="w-4 h-4 text-destructive mx-auto mb-1" />
          <p className="text-lg font-heading font-bold text-foreground">{counts.vitals}</p>
          <p className="text-[10px] text-muted-foreground">Vitals</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <FlaskConical className="w-4 h-4 text-accent mx-auto mb-1" />
          <p className="text-lg font-heading font-bold text-foreground">{counts.labs}</p>
          <p className="text-[10px] text-muted-foreground">Lab Results</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <FileText className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-heading font-bold text-foreground">{counts.docs}</p>
          <p className="text-[10px] text-muted-foreground">Documents</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <AlertTriangle className="w-4 h-4 text-destructive mx-auto mb-1" />
          <p className="text-lg font-heading font-bold text-foreground">{counts.alerts}</p>
          <p className="text-[10px] text-muted-foreground">Open Alerts</p>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full flex overflow-x-auto bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="flex-1 gap-1.5 text-xs sm:text-sm">
            <Stethoscope className="w-3.5 h-3.5 hidden sm:block" /> Overview
          </TabsTrigger>
          <TabsTrigger value="vitals" className="flex-1 gap-1.5 text-xs sm:text-sm">
            <Heart className="w-3.5 h-3.5 hidden sm:block" /> Vitals
          </TabsTrigger>
          <TabsTrigger value="labs" className="flex-1 gap-1.5 text-xs sm:text-sm">
            <FlaskConical className="w-3.5 h-3.5 hidden sm:block" /> Labs
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex-1 gap-1.5 text-xs sm:text-sm">
            <FileText className="w-3.5 h-3.5 hidden sm:block" /> Docs
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex-1 gap-1.5 text-xs sm:text-sm">
            <Calendar className="w-3.5 h-3.5 hidden sm:block" /> Appts
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex-1 gap-1.5 text-xs sm:text-sm">
            <AlertTriangle className="w-3.5 h-3.5 hidden sm:block" /> Alerts
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Enrollments */}
            <div className="glass-card rounded-xl p-5 space-y-3">
              <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" /> Program Enrollments
              </h3>
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

            {/* Recent Appointments */}
            <div className="glass-card rounded-xl p-5 space-y-3">
              <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" /> Recent Appointments
              </h3>
              {appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No appointments.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {upcomingAppts.slice(0, 3).map((a) => (
                    <div key={a.id} className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-foreground">{a.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[a.status] || ""}`}>{a.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{format(new Date(a.scheduled_at), "MMM d, yyyy 'at' HH:mm")} • {a.duration_minutes} min</p>
                    </div>
                  ))}
                  {pastAppts.slice(0, 3).map((a) => (
                    <div key={a.id} className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-foreground">{a.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[a.status] || ""}`}>{a.status.replace("_", " ")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{format(new Date(a.scheduled_at), "MMM d, yyyy 'at' HH:mm")} • {a.duration_minutes} min</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Vitals Tab */}
        <TabsContent value="vitals">
          <PatientVitalsTab patientId={patient.id} doctorId={user!.id} />
        </TabsContent>

        {/* Labs Tab */}
        <TabsContent value="labs">
          <PatientLabsTab patientId={patient.id} doctorId={user!.id} />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <PatientDocsTab patientId={patient.id} doctorId={user!.id} />
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-4">
          <div className="glass-card rounded-xl p-5 space-y-3">
            <h3 className="font-heading font-semibold text-foreground">All Appointments</h3>
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments scheduled.</p>
            ) : (
              <div className="space-y-2">
                {upcomingAppts.length > 0 && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upcoming ({upcomingAppts.length})</p>
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-3">Past ({pastAppts.length})</p>
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
                    {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <PatientAlertsTab patientId={patient.id} doctorId={user!.id} />
        </TabsContent>
      </Tabs>

      {/* Clinical Copilot FAB */}
      <DoctorCopilot patientId={patient.id} patientName={patient.full_name} />
    </div>
  );
};

export default PatientDetail;

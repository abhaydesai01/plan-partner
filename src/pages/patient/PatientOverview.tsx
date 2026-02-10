import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Activity, FileText, CalendarDays, TrendingUp, Heart } from "lucide-react";
import { format } from "date-fns";

const PatientOverview = () => {
  const { user } = useAuth();
  const [patientData, setPatientData] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [upcomingAppts, setUpcomingAppts] = useState<any[]>([]);
  const [recentVitals, setRecentVitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Get patient record linked to this user
      const { data: patient } = await supabase
        .from("patients")
        .select("*")
        .eq("patient_user_id", user.id)
        .maybeSingle();

      if (!patient) { setLoading(false); return; }
      setPatientData(patient);

      const [enrollRes, apptRes, vitalsRes] = await Promise.all([
        supabase.from("enrollments").select("*, programs(name, type)").eq("patient_id", patient.id).order("enrolled_at", { ascending: false }).limit(5),
        supabase.from("appointments").select("*").eq("patient_id", patient.id).gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(5),
        supabase.from("vitals").select("*").eq("patient_id", patient.id).order("recorded_at", { ascending: false }).limit(5),
      ]);

      setEnrollments(enrollRes.data?.map(e => ({ ...e, adherence_pct: e.adherence_pct ? Number(e.adherence_pct) : null })) || []);
      setUpcomingAppts(apptRes.data || []);
      setRecentVitals(vitalsRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  if (!patientData) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-heading font-bold text-foreground mb-2">Welcome to Your Health Vault</h2>
        <p className="text-muted-foreground">Your doctor hasn't linked your account yet. Please ask your doctor to connect your patient record to your account.</p>
      </div>
    );
  }

  const avgAdherence = enrollments.length > 0
    ? Math.round(enrollments.reduce((s, e) => s + (e.adherence_pct ?? 0), 0) / enrollments.length)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Hello, {patientData.full_name}</h1>
        <p className="text-muted-foreground text-sm mt-1">Your health overview</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 text-center">
          <Activity className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-foreground">{enrollments.length}</p>
          <p className="text-xs text-muted-foreground">Programs</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <TrendingUp className="w-5 h-5 text-whatsapp mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-foreground">{avgAdherence !== null ? `${avgAdherence}%` : "—"}</p>
          <p className="text-xs text-muted-foreground">Adherence</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <CalendarDays className="w-5 h-5 text-accent mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-foreground">{upcomingAppts.length}</p>
          <p className="text-xs text-muted-foreground">Upcoming Appts</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <FileText className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-foreground">{recentVitals.length}</p>
          <p className="text-xs text-muted-foreground">Recent Vitals</p>
        </div>
      </div>

      {/* Health Info */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-heading font-semibold text-foreground mb-3">Health Profile</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Conditions</p>
            <div className="flex flex-wrap gap-1.5">
              {patientData.conditions?.length ? patientData.conditions.map((c: string) => (
                <span key={c} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{c}</span>
              )) : <span className="text-sm text-muted-foreground">None recorded</span>}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Medications</p>
            <div className="flex flex-wrap gap-1.5">
              {patientData.medications?.length ? patientData.medications.map((m: string) => (
                <span key={m} className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">{m}</span>
              )) : <span className="text-sm text-muted-foreground">None recorded</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h3 className="font-heading font-semibold text-foreground">Upcoming Appointments</h3>
          {upcomingAppts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
          ) : (
            <div className="space-y-2">
              {upcomingAppts.map((a) => (
                <div key={a.id} className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1">
                  <p className="font-medium text-sm text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(a.scheduled_at), "MMM d, yyyy 'at' HH:mm")} • {a.duration_minutes} min</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Vitals */}
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h3 className="font-heading font-semibold text-foreground">Recent Vitals</h3>
          {recentVitals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vitals recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentVitals.map((v) => (
                <div key={v.id} className="p-3 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-foreground capitalize">{v.vital_type.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(v.recorded_at), "MMM d, yyyy")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-bold text-foreground">{v.value_text}</p>
                    {v.unit && <p className="text-xs text-muted-foreground">{v.unit}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientOverview;

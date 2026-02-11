import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Activity, FileText, CalendarDays, TrendingUp, Heart, Search, CheckCircle, Clock, Send, Edit3, Save, X } from "lucide-react";
import { format } from "date-fns";

const PatientOverview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [patientData, setPatientData] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [upcomingAppts, setUpcomingAppts] = useState<any[]>([]);
  const [recentVitals, setRecentVitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkRequest, setLinkRequest] = useState<any>(null);

  // Health profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ medications: "", conditions: "", emergency_contact: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  // Link request form state
  const [doctorCode, setDoctorCode] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      // Get patient record linked to this user
      const { data: patient } = await supabase
        .from("patients")
        .select("*")
        .eq("patient_user_id", user.id)
        .maybeSingle();

      if (!patient) {
        // Check if there's a pending link request
        const { data: existingReq } = await supabase
          .from("link_requests")
          .select("*")
          .eq("patient_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setLinkRequest(existingReq);
        setLoading(false);
        return;
      }
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
    fetchAll();
  }, [user]);

  const handleLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !doctorCode.trim()) return;
    setSubmitting(true);

    // Look up doctor by code
    const { data: doctorProfile } = await supabase
      .from("profiles")
      .select("user_id, full_name, doctor_code")
      .eq("doctor_code", doctorCode.trim().toUpperCase())
      .maybeSingle();

    if (!doctorProfile) {
      toast({ title: "Doctor not found", description: "No doctor found with that code. Please check and try again.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Get user's profile name
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const { error } = await supabase.from("link_requests").insert({
      patient_user_id: user.id,
      patient_name: myProfile?.full_name || "Unknown",
      doctor_id: doctorProfile.user_id,
      message: message || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Request sent!", description: `Your link request has been sent to Dr. ${doctorProfile.full_name}.` });
      // Refresh to show pending state
      const { data: newReq } = await supabase
        .from("link_requests")
        .select("*")
        .eq("patient_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLinkRequest(newReq);
    }
    setSubmitting(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  if (!patientData) {
    // Show link request form or pending status
    if (linkRequest?.status === "pending") {
      return (
        <div className="glass-card rounded-xl p-12 text-center">
          <Clock className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-xl font-heading font-bold text-foreground mb-2">Request Pending</h2>
          <p className="text-muted-foreground mb-1">Your link request has been sent to your doctor.</p>
          <p className="text-sm text-muted-foreground">You'll gain access once your doctor approves it.</p>
        </div>
      );
    }

    if (linkRequest?.status === "denied") {
      return (
        <div className="glass-card rounded-xl p-12 text-center space-y-4">
          <Heart className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-heading font-bold text-foreground">Request Denied</h2>
          <p className="text-muted-foreground">Your previous request was denied. You can try again with the correct doctor code.</p>
          <button onClick={() => setLinkRequest(null)} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
            Try Again
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="glass-card rounded-xl p-8 text-center space-y-4">
          <Search className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-xl font-heading font-bold text-foreground">Connect to Your Doctor</h2>
          <p className="text-muted-foreground text-sm">Enter your doctor's code to request access to your health records.</p>
        </div>
        <form onSubmit={handleLinkRequest} className="glass-card rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Doctor Code</label>
            <input
              required
              placeholder="e.g. A1B2C3"
              value={doctorCode}
              onChange={e => setDoctorCode(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-center text-lg font-heading tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary/50"
              maxLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Message (optional)</label>
            <input
              placeholder="e.g. My name on file is Jane Smith"
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !doctorCode.trim()}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Send className="w-4 h-4" />
            {submitting ? "Sending..." : "Send Link Request"}
          </button>
        </form>
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

      {/* Health Info - Editable */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold text-foreground">Health Profile</h3>
          {!editingProfile ? (
            <button
              onClick={() => {
                setProfileForm({
                  medications: patientData.medications?.join("; ") || "",
                  conditions: patientData.conditions?.join("; ") || "",
                  emergency_contact: patientData.emergency_contact || "",
                });
                setEditingProfile(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditingProfile(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
              <button
                disabled={savingProfile}
                onClick={async () => {
                  if (!patientData?.id) return;
                  setSavingProfile(true);
                  const { error } = await supabase
                    .from("patients")
                    .update({
                      medications: profileForm.medications ? profileForm.medications.split(";").map(m => m.trim()).filter(Boolean) : [],
                      conditions: profileForm.conditions ? profileForm.conditions.split(";").map(c => c.trim()).filter(Boolean) : [],
                      emergency_contact: profileForm.emergency_contact || null,
                    })
                    .eq("id", patientData.id);
                  if (error) {
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Profile updated" });
                    setPatientData({
                      ...patientData,
                      medications: profileForm.medications ? profileForm.medications.split(";").map(m => m.trim()).filter(Boolean) : [],
                      conditions: profileForm.conditions ? profileForm.conditions.split(";").map(c => c.trim()).filter(Boolean) : [],
                      emergency_contact: profileForm.emergency_contact || null,
                    });
                    setEditingProfile(false);
                  }
                  setSavingProfile(false);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                <Save className="w-3 h-3" /> {savingProfile ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        {editingProfile ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Conditions (semicolon-separated)</label>
              <input
                value={profileForm.conditions}
                onChange={(e) => setProfileForm({ ...profileForm, conditions: e.target.value })}
                placeholder="e.g. Diabetes; Hypertension"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Medications (semicolon-separated)</label>
              <input
                value={profileForm.medications}
                onChange={(e) => setProfileForm({ ...profileForm, medications: e.target.value })}
                placeholder="e.g. Metformin 500mg; Amlodipine 5mg"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Emergency Contact</label>
              <input
                value={profileForm.emergency_contact}
                onChange={(e) => setProfileForm({ ...profileForm, emergency_contact: e.target.value })}
                placeholder="e.g. Rahul Sharma - 9876543210"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        ) : (
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
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Emergency Contact</p>
              <p className="text-sm text-foreground">{patientData.emergency_contact || <span className="text-muted-foreground">Not set</span>}</p>
            </div>
            {patientData.consent_given_at && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Consent</p>
                <p className="text-xs text-whatsapp font-medium">✓ Given on {format(new Date(patientData.consent_given_at), "MMM d, yyyy")}</p>
              </div>
            )}
          </div>
        )}
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

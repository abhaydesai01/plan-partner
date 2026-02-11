import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Star, Video, MessageSquare, Filter, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Feedback {
  id: string;
  doctor_id: string;
  doctor_rating: number | null;
  clinic_rating: number | null;
  review_text: string | null;
  video_url: string | null;
  is_testimonial: boolean;
  consent_to_publish: boolean;
  created_at: string;
  patient_name: string;
  appointment_title: string;
  doctor_name?: string;
}

const StarDisplay = ({ rating, size = "sm" }: { rating: number | null; size?: "sm" | "md" }) => {
  if (!rating) return <span className="text-xs text-muted-foreground">—</span>;
  const s = size === "md" ? "w-5 h-5" : "w-4 h-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={cn(s, n <= rating ? "fill-accent text-accent" : "text-border")} />
      ))}
    </div>
  );
};

const DoctorFeedbacks = () => {
  const { user } = useAuth();
  const [myFeedbacks, setMyFeedbacks] = useState<Feedback[]>([]);
  const [clinicFeedbacks, setClinicFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "testimonials" | "with_video">("all");
  const [scope, setScope] = useState<"mine" | "clinic">("mine");
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch clinic membership
    const { data: membership } = await supabase
      .from("clinic_members")
      .select("clinic_id, clinics(name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const cId = membership?.clinic_id || null;
    setClinicId(cId);
    setClinicName((membership?.clinics as any)?.name || "");

    // Fetch my feedbacks
    const { data: myData } = await supabase
      .from("feedbacks")
      .select(`
        id, doctor_id, doctor_rating, clinic_rating, review_text, video_url,
        is_testimonial, consent_to_publish, created_at,
        patients!feedbacks_patient_id_fkey ( full_name ),
        appointments!feedbacks_appointment_id_fkey ( title )
      `)
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false });

    const mapFeedback = (f: any, doctorName?: string): Feedback => ({
      id: f.id,
      doctor_id: f.doctor_id,
      doctor_rating: f.doctor_rating,
      clinic_rating: f.clinic_rating,
      review_text: f.review_text,
      video_url: f.video_url,
      is_testimonial: f.is_testimonial,
      consent_to_publish: f.consent_to_publish,
      created_at: f.created_at,
      patient_name: f.patients?.full_name || "Unknown",
      appointment_title: f.appointments?.title || "—",
      doctor_name: doctorName,
    });

    if (myData) setMyFeedbacks(myData.map(f => mapFeedback(f)));

    // Fetch clinic-wide feedbacks if in a clinic
    if (cId) {
      const { data: clinicData } = await supabase
        .from("feedbacks")
        .select(`
          id, doctor_id, doctor_rating, clinic_rating, review_text, video_url,
          is_testimonial, consent_to_publish, created_at,
          patients!feedbacks_patient_id_fkey ( full_name ),
          appointments!feedbacks_appointment_id_fkey ( title )
        `)
        .eq("clinic_id", cId)
        .order("created_at", { ascending: false });

      if (clinicData) {
        // Fetch doctor names for clinic feedbacks
        const doctorIds = [...new Set(clinicData.map((f: any) => f.doctor_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", doctorIds);

        const doctorMap: Record<string, string> = {};
        (profiles || []).forEach((p: any) => { doctorMap[p.user_id] = p.full_name; });

        setClinicFeedbacks(clinicData.map((f: any) => mapFeedback(f, doctorMap[f.doctor_id] || "Doctor")));
      }
    }

    setLoading(false);
  };

  const feedbacks = scope === "clinic" ? clinicFeedbacks : myFeedbacks;

  const filtered = feedbacks.filter(f => {
    if (filter === "testimonials") return f.is_testimonial || f.consent_to_publish;
    if (filter === "with_video") return !!f.video_url;
    return true;
  });

  const ratedDoctor = feedbacks.filter(f => f.doctor_rating);
  const avgDoctor = ratedDoctor.length
    ? (ratedDoctor.reduce((s, f) => s + (f.doctor_rating || 0), 0) / ratedDoctor.length).toFixed(1)
    : "—";
  const ratedClinic = feedbacks.filter(f => f.clinic_rating);
  const avgClinic = ratedClinic.length
    ? (ratedClinic.reduce((s, f) => s + (f.clinic_rating || 0), 0) / ratedClinic.length).toFixed(1)
    : "—";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Feedbacks & Testimonials</h1>
          <p className="text-muted-foreground text-sm">{feedbacks.length} {scope === "clinic" ? "clinic-wide" : "personal"} responses</p>
        </div>

        {/* Scope toggle */}
        {clinicId && (
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => setScope("mine")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                scope === "mine" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="w-3.5 h-3.5" /> My Feedbacks
            </button>
            <button
              onClick={() => setScope("clinic")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                scope === "clinic" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="w-3.5 h-3.5" /> {clinicName || "Clinic"}
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Feedbacks", value: feedbacks.length },
          { label: scope === "clinic" ? "Avg Doctor Rating" : "Avg My Rating", value: avgDoctor },
          { label: "Avg Clinic Rating", value: avgClinic },
          { label: "Video Testimonials", value: feedbacks.filter(f => f.video_url).length },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-4 text-center space-y-1">
            <p className="text-2xl font-heading font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {(["all", "testimonials", "with_video"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "all" ? "All" : f === "testimonials" ? "Testimonials" : "With Video"}
          </button>
        ))}
      </div>

      {/* Feedback Cards */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No feedbacks yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(f => (
            <div key={f.id} className="glass-card rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">{f.patient_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.appointment_title} · {format(new Date(f.created_at), "MMM d, yyyy")}
                    {scope === "clinic" && f.doctor_name && (
                      <span className="ml-1">· <span className="text-primary font-medium">{f.doctor_name}</span></span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {scope === "clinic" && f.doctor_id === user?.id && (
                    <span className="px-2 py-0.5 rounded-full bg-muted text-foreground text-[10px] font-semibold">You</span>
                  )}
                  {f.is_testimonial && (
                    <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold">Testimonial</span>
                  )}
                  {f.consent_to_publish && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">Public</span>
                  )}
                  {f.video_url && (
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold flex items-center gap-1">
                      <Video className="w-3 h-3" /> Video
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Doctor</p>
                  <StarDisplay rating={f.doctor_rating} size="md" />
                </div>
                {f.clinic_rating && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Clinic</p>
                    <StarDisplay rating={f.clinic_rating} size="md" />
                  </div>
                )}
              </div>

              {f.review_text && (
                <p className="text-sm text-foreground/80 bg-muted/50 rounded-lg p-3 italic">"{f.review_text}"</p>
              )}

              {f.video_url && (
                <video src={f.video_url} controls className="w-full max-h-56 rounded-lg" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorFeedbacks;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Star, Video, MessageSquare, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Feedback {
  id: string;
  doctor_rating: number | null;
  clinic_rating: number | null;
  review_text: string | null;
  video_url: string | null;
  is_testimonial: boolean;
  consent_to_publish: boolean;
  created_at: string;
  patient_name: string;
  appointment_title: string;
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
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "testimonials" | "with_video">("all");

  useEffect(() => {
    if (!user) return;
    fetchFeedbacks();
  }, [user]);

  const fetchFeedbacks = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("feedbacks")
      .select(`
        id, doctor_rating, clinic_rating, review_text, video_url,
        is_testimonial, consent_to_publish, created_at,
        patients!feedbacks_patient_id_fkey ( full_name ),
        appointments!feedbacks_appointment_id_fkey ( title )
      `)
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setFeedbacks(data.map((f: any) => ({
        ...f,
        patient_name: f.patients?.full_name || "Unknown",
        appointment_title: f.appointments?.title || "—",
      })));
    }
    setLoading(false);
  };

  const filtered = feedbacks.filter(f => {
    if (filter === "testimonials") return f.is_testimonial || f.consent_to_publish;
    if (filter === "with_video") return !!f.video_url;
    return true;
  });

  const avgDoctor = feedbacks.length
    ? (feedbacks.reduce((s, f) => s + (f.doctor_rating || 0), 0) / feedbacks.filter(f => f.doctor_rating).length).toFixed(1)
    : "—";
  const avgClinic = feedbacks.filter(f => f.clinic_rating).length
    ? (feedbacks.reduce((s, f) => s + (f.clinic_rating || 0), 0) / feedbacks.filter(f => f.clinic_rating).length).toFixed(1)
    : "—";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Feedbacks & Testimonials</h1>
        <p className="text-muted-foreground text-sm">{feedbacks.length} total responses</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Feedbacks", value: feedbacks.length },
          { label: "Avg Doctor Rating", value: avgDoctor },
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
                  <p className="text-xs text-muted-foreground">{f.appointment_title} · {format(new Date(f.created_at), "MMM d, yyyy")}</p>
                </div>
                <div className="flex items-center gap-2">
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

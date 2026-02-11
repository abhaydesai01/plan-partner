import { useEffect, useState } from "react";
import { Star, Video, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RealTestimonial {
  id: string;
  doctor_rating: number | null;
  clinic_rating: number | null;
  review_text: string | null;
  video_url: string | null;
  patient_name: string;
  doctor_name: string;
  clinic_name: string | null;
}

const staticTestimonials = [
  {
    quote: "Mediimate's AI agents reduced our no-show rate from 35% to under 12%. We didn't hire a single extra staff member — the bots handle everything.",
    name: "Dr. Priya Sharma",
    role: "Cardiologist, HeartCare Clinic, Mumbai",
    metric: "65% fewer no-shows",
    stars: 5,
  },
  {
    quote: "Our diabetic care program runs completely on autopilot now. Patients get daily WhatsApp check-ins, and I only step in when the AI flags something critical.",
    name: "Dr. Rajesh Mehta",
    role: "Endocrinologist, LifeLine Hospital, Delhi",
    metric: "94% adherence rate",
    stars: 5,
  },
  {
    quote: "We went from managing 80 patients manually to 300+ with the same team. The voice check-in feature alone saved us 4 hours of phone calls every day.",
    name: "Dr. Ananya Reddy",
    role: "General Physician, Wellness First Clinic, Bangalore",
    metric: "3.5x more patients",
    stars: 5,
  },
];

const logos = [
  "HeartCare Clinic",
  "LifeLine Hospital",
  "Wellness First",
  "Apollo Connect",
  "MediBridge",
  "CarePoint Health",
];

const StarRow = ({ count, size = "w-4 h-4" }: { count: number; size?: string }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <Star key={n} className={cn(size, n <= count ? "fill-accent text-accent" : "text-border")} />
    ))}
  </div>
);

const TestimonialsSection = () => {
  const [realTestimonials, setRealTestimonials] = useState<RealTestimonial[]>([]);

  useEffect(() => {
    const fetchPublished = async () => {
      const { data } = await supabase
        .from("feedbacks")
        .select(`
          id, doctor_rating, clinic_rating, review_text, video_url,
          patients!feedbacks_patient_id_fkey ( full_name ),
          profiles:doctor_id ( full_name ),
          clinics:clinic_id ( name )
        `)
        .eq("consent_to_publish", true)
        .not("review_text", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);

      if (data) {
        setRealTestimonials(data.map((f: any) => ({
          id: f.id,
          doctor_rating: f.doctor_rating,
          clinic_rating: f.clinic_rating,
          review_text: f.review_text,
          video_url: f.video_url,
          patient_name: f.patients?.full_name || "Patient",
          doctor_name: f.profiles?.full_name || "Doctor",
          clinic_name: f.clinics?.name || null,
        })));
      }
    };
    fetchPublished();
  }, []);

  return (
    <section className="py-24 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-3 opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">
            Trusted by clinics across India
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            See how doctors are transforming patient care with AI-powered automation.
          </p>
        </div>

        {/* Real patient testimonials */}
        {realTestimonials.length > 0 && (
          <div className="mb-16">
            <p className="text-center text-xs text-muted-foreground uppercase tracking-widest mb-8 font-medium">
              What patients are saying
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {realTestimonials.map((t, i) => (
                <div
                  key={t.id}
                  className="glass-card rounded-2xl p-6 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 opacity-0 animate-fade-up"
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: "forwards" }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <StarRow count={t.doctor_rating || 0} />
                      {t.video_url && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          <Video className="w-3 h-3" /> Video
                        </span>
                      )}
                    </div>
                    <Quote className="w-5 h-5 text-primary/30 mb-2" />
                    <p className="text-sm text-foreground leading-relaxed mb-4">"{t.review_text}"</p>
                  </div>
                  {t.video_url && (
                    <video src={t.video_url} controls className="w-full max-h-40 rounded-lg mb-4" />
                  )}
                  <div>
                    <p className="text-sm font-heading font-bold text-foreground">{t.patient_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Patient of {t.doctor_name}{t.clinic_name ? ` · ${t.clinic_name}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Static testimonials */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {staticTestimonials.map((t, i) => (
            <div
              key={t.name}
              className="glass-card rounded-2xl p-6 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 opacity-0 animate-fade-up"
              style={{ animationDelay: `${(realTestimonials.length + i) * 100}ms`, animationFillMode: "forwards" }}
            >
              <div>
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-4">"{t.quote}"</p>
              </div>
              <div>
                <div className="inline-block px-2.5 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary mb-3">
                  {t.metric}
                </div>
                <div>
                  <p className="text-sm font-heading font-bold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Logo strip */}
        <div className="opacity-0 animate-fade-up" style={{ animationDelay: "0.5s", animationFillMode: "forwards" }}>
          <p className="text-center text-xs text-muted-foreground uppercase tracking-widest mb-6 font-medium">
            Powering clinics & hospitals
          </p>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
            {logos.map((name) => (
              <span
                key={name}
                className="text-sm font-heading font-bold text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

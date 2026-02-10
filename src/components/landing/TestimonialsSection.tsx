import { Star } from "lucide-react";
import heartcareLogo from "@/assets/logos/heartcare.png";
import lifelineLogo from "@/assets/logos/lifeline.png";
import wellnessLogo from "@/assets/logos/wellnessfirst.png";
import apolloLogo from "@/assets/logos/apolloconnect.png";
import medibridgeLogo from "@/assets/logos/medibridge.png";
import carepointLogo from "@/assets/logos/carepoint.png";

const testimonials = [
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
  { name: "HeartCare Clinic", src: heartcareLogo },
  { name: "LifeLine Hospital", src: lifelineLogo },
  { name: "Wellness First", src: wellnessLogo },
  { name: "Apollo Connect", src: apolloLogo },
  { name: "MediBridge", src: medibridgeLogo },
  { name: "CarePoint Health", src: carepointLogo },
];

const TestimonialsSection = () => (
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

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
        {testimonials.map((t, i) => (
          <div
            key={t.name}
            className="glass-card rounded-2xl p-6 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 opacity-0 animate-fade-up"
            style={{ animationDelay: `${i * 150}ms`, animationFillMode: "forwards" }}
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
        <p className="text-center text-xs text-muted-foreground uppercase tracking-widest mb-8 font-medium">
          Powering clinics & hospitals
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-6">
          {logos.map((logo) => (
            <img
              key={logo.name}
              src={logo.src}
              alt={logo.name}
              className="h-12 w-auto object-contain opacity-60 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0"
            />
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default TestimonialsSection;

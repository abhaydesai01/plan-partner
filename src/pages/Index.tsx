import { MessageSquare, Calendar, Activity, Shield, BarChart3, Phone } from "lucide-react";
import heroImage from "@/assets/hero-illustration.png";

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
    <div className="container mx-auto flex items-center justify-between h-16 px-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-xl font-heading font-bold text-foreground">FlyCure</span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
        <a href="#features" className="hover:text-foreground transition-colors">Features</a>
        <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
        <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
      </div>
      <div className="flex items-center gap-3">
        <button className="hidden sm:inline-flex text-sm font-medium text-foreground hover:text-primary transition-colors">
          Log In
        </button>
        <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          Get Started
        </button>
      </div>
    </div>
  </nav>
);

const HeroSection = () => (
  <section className="pt-32 pb-20 px-4 overflow-hidden">
    <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-6 animate-fade-up">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-whatsapp/10 text-sm font-medium text-whatsapp border border-whatsapp/20">
          <MessageSquare className="w-3.5 h-3.5" />
          WhatsApp-First Healthcare
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold leading-tight text-foreground">
          Patient care that meets them on{" "}
          <span className="text-gradient">WhatsApp</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
          Automate follow-ups, manage NCD programs, and reduce no-shows by 60% — all through the platform your patients already use every day.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <button className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/25">
            Start Free Trial
          </button>
          <button className="px-6 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors">
            Book a Demo
          </button>
        </div>
        <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" /> HIPAA Ready</span>
          <span className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-primary" /> 92% Adherence</span>
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> 60% Fewer No-shows</span>
        </div>
      </div>
      <div className="relative animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/10 rounded-3xl blur-3xl -z-10" />
        <img
          src={heroImage}
          alt="FlyCure platform showing WhatsApp patient engagement connected to doctor dashboard"
          className="w-full rounded-2xl shadow-2xl animate-float"
        />
      </div>
    </div>
  </section>
);

const stats = [
  { value: "30–40%", label: "Patient no-show rate in India" },
  { value: "128+", label: "Active patients per doctor" },
  { value: "92%", label: "Average adherence rate" },
  { value: "₹12L+", label: "Monthly clinic revenue potential" },
];

const StatsSection = () => (
  <section className="py-16 border-y border-border bg-card">
    <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
      {stats.map((stat) => (
        <div key={stat.label} className="text-center space-y-1">
          <div className="text-3xl font-heading font-extrabold text-gradient">{stat.value}</div>
          <div className="text-sm text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  </section>
);

const features = [
  {
    icon: MessageSquare,
    title: "WhatsApp Engagement",
    description: "Automated reminders, 2-way messaging, appointment booking — all inside WhatsApp.",
  },
  {
    icon: Activity,
    title: "Care Programs",
    description: "NCD management, post-discharge care, and elder-care with structured 90-day workflows.",
  },
  {
    icon: Phone,
    title: "Voice-AI Check-ins",
    description: "Automated IVR calls for medication compliance, symptom assessment, and escalation.",
  },
  {
    icon: BarChart3,
    title: "Doctor Dashboard",
    description: "Real-time analytics, patient compliance reports, and program management in one view.",
  },
  {
    icon: Shield,
    title: "Patient Health Vault",
    description: "Centralized records — appointments, labs, medications, vitals — all securely stored.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Automated appointment reminders with confirm/reschedule via WhatsApp replies.",
  },
];

const FeaturesSection = () => (
  <section id="features" className="py-24 px-4">
    <div className="container mx-auto">
      <div className="text-center mb-16 space-y-3">
        <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">
          Everything your clinic needs
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          From patient engagement to clinical analytics — one platform, powered by WhatsApp.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => (
          <div
            key={f.title}
            className="group glass-card rounded-xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <f.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-heading font-bold text-foreground mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const steps = [
  { step: "01", title: "Onboard Your Clinic", desc: "Sign up, connect WhatsApp Business, and add your doctors in under 10 minutes." },
  { step: "02", title: "Enroll Patients", desc: "Bulk import via CSV or let patients self-enroll through QR codes and WhatsApp links." },
  { step: "03", title: "Automate Care", desc: "Programs run automatically — reminders, check-ins, voice calls, and escalations." },
  { step: "04", title: "Track & Grow", desc: "Monitor adherence, revenue, and outcomes from your analytics dashboard." },
];

const HowItWorksSection = () => (
  <section id="how-it-works" className="py-24 px-4 bg-card">
    <div className="container mx-auto">
      <div className="text-center mb-16 space-y-3">
        <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">
          Up and running in minutes
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Get your clinic connected and start engaging patients the same day.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((s) => (
          <div key={s.step} className="relative space-y-3">
            <span className="text-5xl font-heading font-extrabold text-primary/15">{s.step}</span>
            <h3 className="text-lg font-heading font-bold text-foreground">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const pricingTiers = [
  {
    name: "Starter",
    price: "₹10,000",
    period: "/month",
    description: "For small clinics getting started",
    features: ["Up to 5 doctors", "200 patients", "WhatsApp engagement", "Appointment reminders", "Patient health vault"],
    highlighted: false,
  },
  {
    name: "Growth",
    price: "₹25,000",
    period: "/month",
    description: "For growing multi-specialty clinics",
    features: ["Up to 20 doctors", "1,000 patients", "All Starter features", "Analytics dashboard", "Program templates", "Bulk patient import"],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For hospitals & health programs",
    features: ["Unlimited doctors", "5,000+ patients", "Dedicated support", "Custom integrations", "White-label option", "Advanced reporting"],
    highlighted: false,
  },
];

const PricingSection = () => (
  <section id="pricing" className="py-24 px-4">
    <div className="container mx-auto">
      <div className="text-center mb-16 space-y-3">
        <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">
          Simple, transparent pricing
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Start small, scale as you grow. Annual plans save up to 20%.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {pricingTiers.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-2xl p-8 flex flex-col ${
              tier.highlighted
                ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/25 scale-105"
                : "glass-card"
            }`}
          >
            <h3 className={`text-lg font-heading font-bold ${tier.highlighted ? "" : "text-foreground"}`}>
              {tier.name}
            </h3>
            <div className="mt-2 mb-1">
              <span className={`text-4xl font-heading font-extrabold ${tier.highlighted ? "" : "text-foreground"}`}>
                {tier.price}
              </span>
              <span className={`text-sm ${tier.highlighted ? "opacity-80" : "text-muted-foreground"}`}>
                {tier.period}
              </span>
            </div>
            <p className={`text-sm mb-6 ${tier.highlighted ? "opacity-80" : "text-muted-foreground"}`}>
              {tier.description}
            </p>
            <ul className="space-y-2.5 mb-8 flex-1">
              {tier.features.map((f) => (
                <li key={f} className={`flex items-center gap-2 text-sm ${tier.highlighted ? "opacity-90" : "text-muted-foreground"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${tier.highlighted ? "bg-accent" : "bg-primary"}`} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 ${
                tier.highlighted
                  ? "bg-accent text-accent-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {tier.price === "Custom" ? "Contact Sales" : "Start Free Trial"}
            </button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CTASection = () => (
  <section className="py-24 px-4">
    <div className="container mx-auto">
      <div className="relative rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-12 md:p-20 text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-primary-foreground">
            Ready to transform patient engagement?
          </h2>
          <p className="text-primary-foreground/80 text-lg">
            Join clinics across India using FlyCure to reduce no-shows, improve adherence, and grow revenue through WhatsApp.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button className="px-8 py-3 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-opacity shadow-lg">
              Get Started Free
            </button>
            <button className="px-8 py-3 rounded-lg border border-primary-foreground/30 text-primary-foreground font-semibold hover:bg-primary-foreground/10 transition-colors">
              Schedule Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="border-t border-border py-12 px-4">
    <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <MessageSquare className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <span className="font-heading font-bold text-foreground">FlyCure</span>
      </div>
      <div className="flex gap-6 text-sm text-muted-foreground">
        <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
        <a href="#" className="hover:text-foreground transition-colors">Terms</a>
        <a href="#" className="hover:text-foreground transition-colors">Contact</a>
      </div>
      <p className="text-xs text-muted-foreground">© 2026 FlyCure. All rights reserved.</p>
    </div>
  </footer>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

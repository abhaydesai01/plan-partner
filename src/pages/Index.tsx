import { useState } from "react";
import { MessageSquare, Calendar, Activity, Shield, BarChart3, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-illustration.png";
import ContactDialog, { type ContactType } from "@/components/ContactDialog";
import AIAgentsFlowSection from "@/components/landing/AIAgentsFlowSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";
import ComparePlansTable from "@/components/landing/ComparePlansTable";

const Navbar = ({ onContact }: { onContact: (type: ContactType) => void }) => (
  <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
    <div className="container mx-auto flex items-center justify-between h-16 px-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-xl font-heading font-bold text-foreground">Mediimate</span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
        <a href="#features" className="hover:text-foreground transition-colors">Features</a>
        <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
        <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/auth" className="hidden sm:inline-flex text-sm font-medium text-foreground hover:text-primary transition-colors">
          Log In
        </Link>
        <button onClick={() => onContact("free_trial")} className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          Get Started
        </button>
      </div>
    </div>
  </nav>
);

const HeroSection = ({ onContact }: { onContact: (type: ContactType) => void }) => (
  <section className="pt-32 pb-20 px-4 overflow-hidden">
    <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-6 animate-fade-up">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-whatsapp/10 text-sm font-medium text-whatsapp border border-whatsapp/20">
          <MessageSquare className="w-3.5 h-3.5" />
          AI-Powered • Zero Manual Work
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold leading-tight text-foreground">
          AI agents that run your clinic on{" "}
          <span className="text-gradient">WhatsApp</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
          No manual follow-ups, no missed reminders. Our AI agents handle patient engagement, care programs, and scheduling automatically — zero staff effort required.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <button onClick={() => onContact("free_trial")} className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/25">
            Start Free Trial
          </button>
          <button onClick={() => onContact("demo")} className="px-6 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors">
            Book a Demo
          </button>
        </div>
        <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" /> HIPAA Ready</span>
          <span className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-primary" /> 100% Automated</span>
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> Zero Manual Work</span>
        </div>
      </div>
      <div className="relative animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/10 rounded-3xl blur-3xl -z-10" />
        <img
          src={heroImage}
          alt="Mediimate platform showing WhatsApp patient engagement connected to doctor dashboard"
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
    title: "AI WhatsApp Agent",
    description: "An AI agent handles reminders, 2-way messaging, and appointment booking — no staff needed.",
  },
  {
    icon: Activity,
    title: "Autonomous Care Programs",
    description: "AI agents run NCD management, post-discharge care, and elder-care workflows end-to-end, automatically.",
  },
  {
    icon: Phone,
    title: "AI Voice Check-ins",
    description: "AI-powered voice calls for medication compliance, symptom assessment, and auto-escalation to doctors.",
  },
  {
    icon: BarChart3,
    title: "AI-Powered Insights",
    description: "AI analyzes patient data in real-time, flags risks, and generates compliance reports — zero manual review.",
  },
  {
    icon: Shield,
    title: "Patient Health Vault",
    description: "Centralized records — appointments, labs, medications, vitals — auto-organized by AI agents.",
  },
  {
    icon: Calendar,
    title: "AI Scheduling Agent",
    description: "AI handles appointment reminders, confirmations, and rescheduling via WhatsApp — fully autonomous.",
  },
];

const FeaturesSection = () => (
  <section id="features" className="py-24 px-4">
    <div className="container mx-auto">
      <div className="text-center mb-16 space-y-3">
        <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">
          AI agents that replace manual work
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Every follow-up, reminder, and check-in is handled by AI — your staff focuses on what matters.
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
  { step: "03", title: "AI Takes Over", desc: "AI agents handle all follow-ups, reminders, check-ins, voice calls, and escalations — zero manual effort." },
  { step: "04", title: "Track & Grow", desc: "AI surfaces insights, flags at-risk patients, and helps you grow revenue on autopilot." },
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
    price: "₹999",
    period: "/month",
    description: "For small clinics getting started",
    features: ["Up to 5 doctors", "200 patients", "WhatsApp engagement", "Appointment reminders", "Patient health vault"],
    highlighted: false,
  },
  {
    name: "Growth",
    price: "₹4,999",
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

const PricingSection = ({ onContact }: { onContact: (type: ContactType) => void }) => (
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
              onClick={() => onContact("pricing")}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 ${
                tier.highlighted
                  ? "bg-accent text-accent-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              Contact Us
            </button>
          </div>
        ))}
      </div>
      <ComparePlansTable />
    </div>
  </section>
);

const CTASection = ({ onContact }: { onContact: (type: ContactType) => void }) => (
  <section className="py-24 px-4">
    <div className="container mx-auto">
      <div className="relative rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-12 md:p-20 text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-primary-foreground">
            Ready to transform patient engagement?
          </h2>
          <p className="text-primary-foreground/80 text-lg">
            Join clinics across India using Mediimate to reduce no-shows, improve adherence, and grow revenue through WhatsApp.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={() => onContact("free_trial")} className="px-8 py-3 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-opacity shadow-lg">
              Get Started Free
            </button>
            <button onClick={() => onContact("demo")} className="px-8 py-3 rounded-lg border border-primary-foreground/30 text-primary-foreground font-semibold hover:bg-primary-foreground/10 transition-colors">
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
        <span className="font-heading font-bold text-foreground">Mediimate</span>
      </div>
      <div className="flex gap-6 text-sm text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
      </div>
      <p className="text-xs text-muted-foreground">© 2026 Mediimate. All rights reserved.</p>
    </div>
  </footer>
);

const Index = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactType, setContactType] = useState<ContactType>("contact");

  const openContact = (type: ContactType) => {
    setContactType(type);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onContact={openContact} />
      <main>
        <HeroSection onContact={openContact} />
        <StatsSection />
        <FeaturesSection />
        <AIAgentsFlowSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <PricingSection onContact={openContact} />
        <FAQSection />
        <CTASection onContact={openContact} />
      </main>
      <Footer />
      <ContactDialog open={dialogOpen} onOpenChange={setDialogOpen} type={contactType} />
    </div>
  );
};

export default Index;

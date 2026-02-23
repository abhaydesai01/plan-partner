import { useState } from "react";
import {
  HeartPulse,
  Menu,
  X,
  Building2,
  Plane,
  Globe,
  Users,
  Shield,
  FileText,
  Search,
  UserCheck,
  IndianRupee,
  Clock,
  CheckCircle2,
  ArrowRight,
  Star,
  ShieldCheck,
  Stethoscope,
  BarChart3,
  HeartHandshake,
  BadgeCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import ContactDialog, { type ContactType } from "@/components/ContactDialog";
import BackedBySection from "@/components/landing/BackedBySection";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#treatments", label: "Treatments" },
  { href: "#for-hospitals", label: "Partner With Us" },
  { href: "#pricing", label: "Pricing" },
];

const Navbar = ({ onContact }: { onContact: (type: ContactType) => void }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
      <div className="container mx-auto flex items-center justify-between h-14 sm:h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <HeartPulse className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg sm:text-xl font-heading font-bold text-foreground">Mediimate</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-foreground transition-colors">{l.label}</a>
          ))}
          <Link to="/for-clinics" className="hover:text-foreground transition-colors">For Clinics</Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/auth/patient" className="hidden sm:inline-flex text-sm font-medium text-foreground hover:text-primary transition-colors">Patient Login</Link>
          <button onClick={() => onContact("demo")} className="hidden xs:inline-flex px-3 sm:px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:opacity-90 transition-opacity">
            Partner With Us
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors touch-manipulation" aria-label="Toggle menu">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-lg px-4 py-3 space-y-1">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors touch-manipulation">{l.label}</a>
          ))}
          <Link to="/for-clinics" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors touch-manipulation">For Clinics</Link>
          <div className="flex items-center gap-3 pt-2 border-t border-border/50 mt-2">
            <Link to="/auth/patient" className="flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-medium text-foreground border border-border hover:bg-muted transition-colors">Patient Login</Link>
            <button onClick={() => { onContact("demo"); setMobileOpen(false); }} className="flex-1 px-3 py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:opacity-90 transition-opacity">Partner</button>
          </div>
        </div>
      )}
    </nav>
  );
};

const HeroSection = ({ onContact }: { onContact: (type: ContactType) => void }) => (
  <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4">
    <div className="container mx-auto max-w-4xl text-center space-y-6 animate-fade-up">
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-sm font-medium text-emerald-600 border border-emerald-500/20">
        <Building2 className="w-3.5 h-3.5" />
        For Hospitals & Health Systems
      </span>
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold leading-tight text-foreground">
        Get a steady pipeline of <span className="text-gradient">verified patients</span>
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
        Mediimate brings pre-qualified domestic and international patients to your hospital. We handle sourcing,
        case management, and coordination — you focus on treatment.
      </p>
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <button onClick={() => onContact("demo")} className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/25">
          Partner With Mediimate
        </button>
        <Link to="/auth/patient" className="px-6 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors">
          I'm a Patient
        </Link>
      </div>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Pre-qualified leads</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Zero upfront cost</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Full case management</span>
      </div>
    </div>
  </section>
);

const stats = [
  { value: "12+", label: "Partner hospitals" },
  { value: "60–80%", label: "Savings for patients vs US/UK" },
  { value: "48hrs", label: "Average response time" },
  { value: "100%", label: "Verified & pre-qualified leads" },
];

const StatsBar = () => (
  <section className="py-12 border-y border-border bg-card">
    <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
      {stats.map((s) => (
        <div key={s.label} className="text-center space-y-1">
          <div className="text-2xl sm:text-3xl font-heading font-extrabold text-gradient">{s.value}</div>
          <div className="text-xs sm:text-sm text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
  </section>
);

const patientJourney = [
  { step: "01", icon: FileText, title: "Patient Submits Request", description: "Patient shares condition, budget, medical reports, and health vault code on our platform.", color: "from-blue-500 to-blue-600" },
  { step: "02", icon: Search, title: "Mediimate Matches Hospitals", description: "Our medical team reviews the case and identifies the best hospitals within the patient's budget.", color: "from-indigo-500 to-violet-600" },
  { step: "03", icon: Building2, title: "Hospital Provides Quote", description: "Your team reviews the case and provides a fixed-price quote with treatment inclusions and timeline.", color: "from-purple-500 to-purple-600" },
  { step: "04", icon: UserCheck, title: "Patient Selects & Books", description: "Patient chooses your hospital. Mediimate coordinates scheduling, travel, visa, and admission.", color: "from-emerald-500 to-emerald-600" },
];

const HowItWorksSection = () => (
  <section id="how-it-works" className="py-12 sm:py-24 px-4">
    <div className="container mx-auto max-w-5xl">
      <div className="text-center mb-12 space-y-3">
        <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">How patient acquisition works</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">From patient request to hospital admission — fully managed by Mediimate.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {patientJourney.map((item) => (
          <div key={item.step} className="group relative rounded-2xl border border-border bg-card p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.color}`} />
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Step {item.step}</span>
            </div>
            <h4 className="font-heading font-bold text-foreground mb-2">{item.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const treatments = [
  { name: "Knee Replacement", range: "₹2.5L – ₹5L", icon: "🦵" },
  { name: "Heart Bypass (CABG)", range: "₹3L – ₹8L", icon: "🫀" },
  { name: "Liver Transplant", range: "₹15L – ₹30L", icon: "🏥" },
  { name: "Dental Implants", range: "₹30K – ₹1.2L", icon: "🦷" },
  { name: "IVF Treatment", range: "₹1L – ₹3L", icon: "👶" },
  { name: "Spine Surgery", range: "₹3L – ₹10L", icon: "🩻" },
  { name: "Eye Surgery (LASIK)", range: "₹25K – ₹1L", icon: "👁️" },
  { name: "Cancer Treatment", range: "₹5L – ₹25L", icon: "🎗️" },
];

const TreatmentsSection = () => (
  <section id="treatments" className="py-12 sm:py-24 px-4 bg-card">
    <div className="container mx-auto max-w-5xl">
      <div className="text-center mb-10 space-y-3">
        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Treatments patients are looking for</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">Top requested treatments from domestic and international patients. Price ranges at our partner hospitals.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {treatments.map((t) => (
          <div key={t.name} className="rounded-xl border border-border bg-background p-4 text-center hover:shadow-md transition-shadow">
            <span className="text-2xl sm:text-3xl">{t.icon}</span>
            <p className="text-sm font-semibold text-foreground mt-2">{t.name}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">{t.range}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const hospitalBenefits = [
  { icon: Users, title: "Pre-Qualified Leads Only", description: "Every patient comes with medical reports, budget, and consent. No tire-kickers." },
  { icon: IndianRupee, title: "Revenue On Your Terms", description: "You set the price. We negotiate within the patient's budget. No undercut." },
  { icon: Clock, title: "Zero Admin Overhead", description: "Mediimate handles patient coordination, documentation, travel, and follow-ups." },
  { icon: Globe, title: "International Patients", description: "Visa support, translator services, airport pickup — all handled by our team." },
  { icon: ShieldCheck, title: "Verified Vault Access", description: "Patient health vault codes give you instant, secure access to medical history." },
  { icon: BarChart3, title: "Dashboard & Analytics", description: "Track incoming cases, conversion rates, revenue, and patient feedback in real-time." },
];

const HospitalBenefitsSection = () => (
  <section id="for-hospitals" className="py-12 sm:py-24 px-4">
    <div className="container mx-auto max-w-5xl">
      <div className="text-center mb-12 space-y-3">
        <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">Why hospitals partner with Mediimate</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">Revenue-focused patient acquisition with zero admin burden.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {hospitalBenefits.map((b) => (
          <div key={b.title} className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <b.icon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">{b.title}</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{b.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const patientBenefits = [
  { icon: BadgeCheck, title: "Verified Hospitals Only", desc: "Every hospital is NABH/JCI accredited and vetted by our team." },
  { icon: IndianRupee, title: "Fixed Price Guarantee", desc: "The quoted price covers everything — surgery, stay, medications, follow-ups." },
  { icon: HeartHandshake, title: "Dedicated Coordinator", desc: "One person handles your entire journey — from first call to recovery." },
  { icon: Stethoscope, title: "Free Second Opinion", desc: "Get a specialist second opinion before making your decision." },
];

const ForPatientsSection = () => (
  <section className="py-12 sm:py-24 px-4 bg-card">
    <div className="container mx-auto max-w-4xl">
      <div className="text-center mb-10 space-y-3">
        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">For patients seeking treatment</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">Submit your request in 2 minutes. We handle the rest.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-5 mb-8">
        {patientBenefits.map((b) => (
          <div key={b.title} className="flex items-start gap-4 rounded-xl border border-border bg-background p-5">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <b.icon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">{b.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center">
        <Link to="/auth/patient" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/25">
          Submit Treatment Request <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-xs text-muted-foreground mt-3">Free consultation. No obligation. Response within 48 hours.</p>
      </div>
    </div>
  </section>
);

const pricingModels = [
  { name: "Pay Per Lead", price: "Commission", desc: "For hospitals starting out", features: ["Per-converted-patient commission", "Zero upfront cost", "Case management included", "Patient coordination"], highlighted: false },
  { name: "Premium Partner", price: "Custom", desc: "For high-volume hospitals", features: ["Priority patient matching", "Dedicated account manager", "Custom hospital profile", "International patient funnel", "Analytics dashboard"], highlighted: true },
  { name: "Enterprise", price: "Custom", desc: "For hospital chains", features: ["Multi-location support", "White-label portal", "API integrations", "Bulk case management", "Revenue reporting suite"], highlighted: false },
];

const PricingSection = ({ onContact }: { onContact: (type: ContactType) => void }) => (
  <section id="pricing" className="py-12 sm:py-24 px-4">
    <div className="container mx-auto">
      <div className="text-center mb-16 space-y-3">
        <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">Hospital partnership plans</h2>
        <p className="text-muted-foreground">Zero upfront cost. Pay only when you get patients.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {pricingModels.map((t) => (
          <div key={t.name} className={`rounded-2xl p-5 sm:p-8 flex flex-col ${t.highlighted ? "bg-emerald-600 text-white shadow-2xl shadow-emerald-500/25 md:scale-105" : "glass-card"}`}>
            <h3 className={`text-lg font-heading font-bold ${t.highlighted ? "" : "text-foreground"}`}>{t.name}</h3>
            <div className="mt-2 mb-1"><span className={`text-3xl font-heading font-extrabold ${t.highlighted ? "" : "text-foreground"}`}>{t.price}</span></div>
            <p className={`text-sm mb-6 ${t.highlighted ? "opacity-80" : "text-muted-foreground"}`}>{t.desc}</p>
            <ul className="space-y-2.5 mb-8 flex-1">{t.features.map((f) => (<li key={f} className={`flex items-center gap-2 text-sm ${t.highlighted ? "opacity-90" : "text-muted-foreground"}`}><span className={`w-1.5 h-1.5 rounded-full ${t.highlighted ? "bg-white" : "bg-emerald-600"}`} />{f}</li>))}</ul>
            <button onClick={() => onContact("pricing")} className={`w-full py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 ${t.highlighted ? "bg-white text-emerald-700" : "bg-emerald-600 text-white"}`}>
              Contact Sales
            </button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CTASection = ({ onContact }: { onContact: (type: ContactType) => void }) => (
  <section className="py-12 sm:py-24 px-4">
    <div className="container mx-auto">
      <div className="relative rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 sm:p-14 text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-white">Ready to grow your patient pipeline?</h2>
          <p className="text-white/80 text-lg">Partner with Mediimate and receive pre-qualified patient leads with zero upfront investment.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={() => onContact("demo")} className="px-8 py-3 rounded-lg bg-white text-emerald-700 font-semibold hover:opacity-90 transition-opacity shadow-lg">
              Partner With Us
            </button>
            <Link to="/auth/patient" className="px-8 py-3 rounded-lg border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors">
              I'm a Patient
            </Link>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="border-t border-border py-10 px-4">
    <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <HeartPulse className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <span className="font-heading font-bold text-foreground">Mediimate</span>
      </Link>
      <div className="flex gap-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
        <Link to="/for-clinics" className="hover:text-foreground transition-colors">For Clinics</Link>
        <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
      </div>
      <p className="text-xs text-muted-foreground">&copy; 2026 Mediimate</p>
    </div>
  </footer>
);

const ForHospitals = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactType, setContactType] = useState<ContactType>("contact");
  const openContact = (type: ContactType) => { setContactType(type); setDialogOpen(true); };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onContact={openContact} />
      <main>
        <HeroSection onContact={openContact} />
        <StatsBar />
        <HowItWorksSection />
        <TreatmentsSection />
        <HospitalBenefitsSection />
        <ForPatientsSection />
        <BackedBySection />
        <PricingSection onContact={openContact} />
        <CTASection onContact={openContact} />
      </main>
      <Footer />
      <ContactDialog open={dialogOpen} onOpenChange={setDialogOpen} type={contactType} />
    </div>
  );
};

export default ForHospitals;

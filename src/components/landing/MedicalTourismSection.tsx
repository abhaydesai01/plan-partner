import {
  Plane,
  Search,
  Building2,
  ShieldCheck,
  IndianRupee,
  Clock,
  FileText,
  UserCheck,
  HeartPulse,
  Globe,
  CheckCircle2,
  ArrowRight,
  Stethoscope,
} from "lucide-react";
import { Link } from "react-router-dom";

const howItWorks = [
  {
    step: "01",
    icon: FileText,
    title: "Submit Your Request",
    description:
      "Tell us your condition, budget, and preferred location. Upload your medical reports for accurate hospital matching.",
    color: "from-blue-500 to-blue-600",
  },
  {
    step: "02",
    icon: Search,
    title: "We Find the Best Hospitals",
    description:
      "Our medical team contacts verified hospitals, negotiates the best packages, and gets confirmed quotes within your budget.",
    color: "from-indigo-500 to-violet-600",
  },
  {
    step: "03",
    icon: Building2,
    title: "Review Hospital Options",
    description:
      "We present curated hospital options with fixed pricing, treatment inclusions, estimated stay, and doctor details.",
    color: "from-purple-500 to-purple-600",
  },
  {
    step: "04",
    icon: UserCheck,
    title: "You Choose, We Coordinate",
    description:
      "Select your hospital. Our coordinator handles scheduling, travel assistance, visa support, and end-to-end guidance.",
    color: "from-emerald-500 to-emerald-600",
  },
];

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

const whyMediimate = [
  {
    icon: ShieldCheck,
    title: "Verified Hospitals Only",
    description: "Every hospital in our network is NABH/JCI accredited and vetted by our medical team.",
  },
  {
    icon: IndianRupee,
    title: "Fixed Price Guarantee",
    description: "No hidden charges. The quoted price includes everything — surgery, stay, medications, and follow-ups.",
  },
  {
    icon: Clock,
    title: "End-to-End Coordination",
    description: "From airport pickup to hospital admission to post-treatment follow-up — one dedicated coordinator for you.",
  },
  {
    icon: Globe,
    title: "International Patient Support",
    description: "Visa assistance, travel insurance, translator services, and accommodation for international patients.",
  },
  {
    icon: HeartPulse,
    title: "Second Opinion Included",
    description: "Get a free second opinion from our panel of specialists before making your treatment decision.",
  },
  {
    icon: Stethoscope,
    title: "Post-Treatment Care",
    description: "Virtual follow-ups, medication management, and recovery tracking after you return home.",
  },
];

const MedicalTourismSection = () => (
  <section id="medical-tourism" className="py-12 sm:py-24 px-4">
    <div className="container mx-auto">
      {/* Section Header */}
      <div className="text-center mb-12 sm:mb-20 space-y-4">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-sm font-semibold text-emerald-600 border border-emerald-500/20">
          <Plane className="w-4 h-4" />
          Medical Tourism
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold text-foreground">
          World-class treatment, <span className="text-gradient">affordable prices</span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          India saves international patients 60–80% on treatment costs. Mediimate connects you with the right hospital, at the right price, with zero hassle.
        </p>
      </div>

      {/* How it Works */}
      <div className="max-w-5xl mx-auto mb-16 sm:mb-24">
        <h3 className="text-2xl font-heading font-bold text-foreground text-center mb-10">
          How it works — 4 simple steps
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {howItWorks.map((item) => (
            <div key={item.step} className="group relative rounded-2xl border border-border bg-card p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.color}`} />
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-bold text-primary/60 uppercase tracking-wider">Step {item.step}</span>
              </div>
              <h4 className="font-heading font-bold text-foreground mb-2">{item.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Treatments */}
      <div className="max-w-5xl mx-auto mb-16 sm:mb-24">
        <h3 className="text-2xl font-heading font-bold text-foreground text-center mb-3">
          Popular treatments
        </h3>
        <p className="text-muted-foreground text-center mb-8 max-w-lg mx-auto">
          Indicative price ranges at our partner hospitals. Actual quotes depend on your specific case.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {treatments.map((t) => (
            <div key={t.name} className="rounded-xl border border-border bg-card p-4 text-center hover:shadow-md transition-shadow">
              <span className="text-2xl sm:text-3xl">{t.icon}</span>
              <p className="text-sm font-semibold text-foreground mt-2">{t.name}</p>
              <p className="text-xs text-primary font-medium mt-1">{t.range}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why Mediimate */}
      <div className="max-w-5xl mx-auto mb-16 sm:mb-20">
        <h3 className="text-2xl font-heading font-bold text-foreground text-center mb-10">
          Why patients trust Mediimate
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {whyMediimate.map((item) => (
            <div key={item.title} className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-primary/5 to-blue-500/10 border border-emerald-500/20 p-8 sm:p-10 text-center">
          <h3 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground mb-3">
            Need treatment abroad?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Submit your request in 2 minutes. Our medical team will get back with verified hospital options within 24–48 hours.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/auth/patient"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/25"
            >
              Submit Treatment Request <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors"
            >
              Talk to Our Team
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Free consultation</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> No obligation</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Response within 48hrs</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default MedicalTourismSection;

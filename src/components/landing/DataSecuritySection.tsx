import { Shield, Lock, Eye, FileCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

const securityItems = [
  {
    icon: FileCheck,
    title: "NDA + Clinic Ownership",
    description: "All vitals/RX owned by YOUR clinic. We're just the tech.",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description: "WhatsApp messages | Voice calls | Lab results — AES-256 encrypted.",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    icon: Eye,
    title: "Role-Based Access",
    description: "Patient: Own data only. Doctor: Assigned patients. Admin: Clinic overview. Us: Zero access.",
    color: "from-purple-500 to-violet-600",
  },
  {
    icon: Shield,
    title: "Indian Compliance",
    description: "DPDP Act 2023 compliant. NDHM ABDM ready (sandbox live). NPCDCS reports auto-generated.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: AlertTriangle,
    title: "Breach Protection",
    description: "Real-time alerts | Annual penetration testing | Incident response SLA.",
    color: "from-red-500 to-red-600",
  },
];

const complianceBadges = [
  "DPDP Act 2023",
  "NDHM ABDM",
  "NPCDCS",
  "AES-256",
  "HIPAA Ready",
  "ISO 27001",
];

const DataSecuritySection = () => (
  <section id="security" className="py-12 sm:py-24 px-4">
    <div className="container mx-auto">
      <div className="text-center mb-16 space-y-3">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-sm font-medium text-emerald-600 border border-emerald-500/20">
          <Shield className="w-3.5 h-3.5" />
          Data Safe
        </span>
        <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">
          Your patient data is sacred
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Bank-grade encryption. Indian compliance. Zero access from our side.
        </p>
      </div>

      <div className="max-w-4xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {securityItems.map((item) => (
          <div
            key={item.title}
            className="group rounded-2xl border border-border bg-card p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <item.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-heading font-bold text-foreground mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
          </div>
        ))}

        {/* Privacy callout card */}
        <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 flex flex-col items-center justify-center text-center">
          <Lock className="w-8 h-8 text-primary mb-3" />
          <p className="text-sm font-medium text-foreground leading-relaxed">
            &ldquo;BP 142 is private.<br />Family sees only adherence.&rdquo;
          </p>
          <p className="text-xs text-muted-foreground mt-2">Privacy by design, always.</p>
        </div>
      </div>

      {/* Compliance badges */}
      <div className="mt-12 max-w-3xl mx-auto">
        <p className="text-xs font-medium text-muted-foreground text-center mb-4 uppercase tracking-wider">Compliance & Certifications</p>
        <div className="flex flex-wrap justify-center gap-3">
          {complianceBadges.map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20"
            >
              <CheckCircle2 className="w-3 h-3" />
              {badge}
            </span>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default DataSecuritySection;

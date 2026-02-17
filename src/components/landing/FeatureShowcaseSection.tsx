import {
  MessageSquare,
  Activity,
  Stethoscope,
  Mic,
  Pill,
  UtensilsCrossed,
  Trophy,
  Bell,
  FileText,
  Users,
  BarChart3,
  Globe,
  Heart,
  Camera,
  Shield,
  Flame,
} from "lucide-react";

const showcaseFeatures = [
  {
    icon: Stethoscope,
    title: "AI Doctor Consultation",
    description: "Voice-based AI doctor (Dr. Priya / Dr. Abhay) that speaks 10+ Indian languages. Daily health check-ins with real conversation flow.",
    tag: "Voice AI",
    color: "from-teal-500 to-emerald-600",
  },
  {
    icon: Mic,
    title: "Voice Health Logging",
    description: "Just speak your BP, sugar, meals in any language. AI extracts and logs everything automatically — no typing needed.",
    tag: "Hands-Free",
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: Activity,
    title: "Smart Vitals Tracking",
    description: "Track BP, blood sugar, heart rate, SpO2, weight, and temperature. Visual trends, alerts on abnormal readings.",
    tag: "Real-time",
    color: "from-red-500 to-rose-600",
  },
  {
    icon: UtensilsCrossed,
    title: "AI Meal Analysis",
    description: "Snap a photo of your meal — AI identifies items, estimates calories, carbs, protein and logs it instantly.",
    tag: "Camera AI",
    color: "from-green-500 to-emerald-600",
  },
  {
    icon: Pill,
    title: "Medication Management",
    description: "Upload prescriptions — AI reads medicine names, dosage, frequency. Smart reminders at the right time, every day.",
    tag: "AI Powered",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Trophy,
    title: "Gamification & Rewards",
    description: "Streaks, badges, levels, weekly challenges. Real rewards: PharmEasy vouchers, Apollo lab discounts, health checkups.",
    tag: "Motivation",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Medication reminders, BP logging nudges, missed-log escalations. One-tap quick logging from the notification itself.",
    tag: "Automated",
    color: "from-cyan-500 to-blue-600",
  },
  {
    icon: MessageSquare,
    title: "AI Health Chat",
    description: "ChatGPT-like assistant that knows your complete health history. Ask anything — it auto-logs health data from your conversation.",
    tag: "Contextual AI",
    color: "from-primary to-primary/80",
  },
  {
    icon: Camera,
    title: "Document Vault",
    description: "Upload prescriptions, lab reports, X-rays. All stored securely, organized by date, accessible to your doctor anytime.",
    tag: "Organized",
    color: "from-gray-500 to-gray-700",
  },
  {
    icon: Users,
    title: "Family Dashboard",
    description: "Family members see adherence scores and get alerts on missed medications. Indian-style accountability that actually works.",
    tag: "Family",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: BarChart3,
    title: "Doctor Analytics",
    description: "Doctors see all patients at a glance: adherence rates, at-risk alerts, trends. AI flags who needs attention today.",
    tag: "Dashboard",
    color: "from-indigo-500 to-blue-600",
  },
  {
    icon: Globe,
    title: "10+ Indian Languages",
    description: "Hindi, Kannada, Tamil, Telugu, Malayalam, Marathi, Bengali, Gujarati, Punjabi — voice & text in your mother tongue.",
    tag: "Multilingual",
    color: "from-emerald-500 to-teal-600",
  },
];

const FeatureShowcaseSection = () => (
  <section id="showcase" className="py-12 sm:py-24 px-4">
    <div className="container mx-auto">
      <div className="text-center mb-16 space-y-3">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-sm font-medium text-primary border border-primary/20">
          <Heart className="w-3.5 h-3.5" />
          Everything You Need
        </span>
        <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">
          Built for Indian healthcare, powered by AI
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Every feature designed around how Indian patients and doctors actually work — WhatsApp-first, voice-first, family-first.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {showcaseFeatures.map((f) => (
          <div
            key={f.title}
            className="group relative rounded-2xl border border-border bg-card p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
          >
            {/* Gradient accent */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${f.color}`} />

            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-md`}>
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60 bg-primary/5 px-2 py-1 rounded-full">
                {f.tag}
              </span>
            </div>
            <h3 className="font-heading font-bold text-foreground text-sm mb-1.5">{f.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>

      {/* Bottom stats */}
      <div className="mt-16 max-w-3xl mx-auto">
        <div className="rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 p-6 sm:p-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-primary">12+</p>
              <p className="text-xs text-muted-foreground mt-1">Core Features</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-primary">10+</p>
              <p className="text-xs text-muted-foreground mt-1">Languages</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-heading font-extrabold text-primary">24/7</p>
              <p className="text-xs text-muted-foreground mt-1">AI Available</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default FeatureShowcaseSection;

import {
  Stethoscope,
  Smartphone,
  HeartPulse,
  TrendingUp,
  CalendarCheck,
  ShieldAlert,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Star,
  Flame,
  Trophy,
} from "lucide-react";

const timeline = [
  {
    step: "1",
    icon: Stethoscope,
    color: "from-blue-500 to-blue-600",
    title: "Doctor Leads",
    subtitle: "Senior Specialist designs your program",
    points: [
      '"Diabetes Program" by Dr. Sharma (20+ yrs Apollo)',
      "Drag-drop timeline + Weekly video review",
    ],
  },
  {
    step: "2",
    icon: Smartphone,
    color: "from-green-500 to-green-600",
    title: "Patient Starts",
    subtitle: "WhatsApp onboarding — FREE Week 1",
    points: [
      "\"ನಮಸ್ಕಾರ ಅಭಯ್! Diabetes program LIVE\"",
      "Family added | SPOC assigned | Points: 0/1000",
    ],
  },
  {
    step: "3",
    icon: HeartPulse,
    color: "from-red-500 to-rose-600",
    title: "Daily Support",
    subtitle: "Tech + Human, every single day",
    points: [
      '8AM: "Metformin now?" → +10pts 🟢 STREAK: 7',
      'Voice: "BP ಓದಿ?" (Kannada AI) → +25pts',
      'Diet: "Roti 2 | Dal 1 | Walk 30min" → +15pts',
    ],
  },
  {
    step: "4",
    icon: TrendingUp,
    color: "from-amber-500 to-orange-500",
    title: "Weekly Boost",
    subtitle: "Doctor Zoom + Community + Rewards",
    points: [
      'Dr. Sharma Zoom (15min): "Abhay — Sugar ↓12%!"',
      "Community WhatsApp: Feb Diabetes batch",
      "Points → ₹100 PharmEasy | ₹200 Apollo lab",
    ],
  },
  {
    step: "5",
    icon: CalendarCheck,
    color: "from-purple-500 to-violet-600",
    title: "Monthly Check",
    subtitle: "Lab tests + Personalized nutrition",
    points: [
      "HbA1c lab ₹800 (50% off) → +100pts",
      "Personalized diet by NIMHANS nutritionist",
      '"Abhay 92% | Streak 28 🥇" — Family update',
    ],
  },
  {
    step: "6",
    icon: ShieldAlert,
    color: "from-red-600 to-red-700",
    title: "Emergency Support",
    subtitle: "24/7 SPOC + Doctor + ER linkage",
    points: [
      "SPOC Priya: 24/7 WhatsApp + Calls",
      'BP>160 → "Dr Sharma slot Apollo NOW"',
      '"Chest pain" → ER guidance + family alert',
    ],
  },
  {
    step: "7",
    icon: GraduationCap,
    color: "from-emerald-500 to-teal-600",
    title: "Graduation",
    subtitle: "90 days complete — real results",
    points: [
      "Adherence 92% 🟢 | Sugar ↓14%",
      "Points: 1875/2000 🥇 TOP 10%",
      "Reward: ₹300 voucher + Certificate",
    ],
  },
];

const rewardTiers = [
  { tier: "Bronze", pts: "500pts", reward: "₹100 PharmEasy", color: "from-amber-700 to-amber-800" },
  { tier: "Silver", pts: "1000pts", reward: "₹200 Apollo Lab", color: "from-gray-400 to-gray-500" },
  { tier: "Gold", pts: "1500pts", reward: "₹300 Swiggy Health", color: "from-yellow-400 to-amber-500" },
];

const ProgramPlanSection = () => (
  <section id="program" className="py-12 sm:py-24 px-4 bg-card">
    <div className="container mx-auto">
      {/* Header */}
      <div className="text-center mb-16 space-y-3">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-sm font-medium text-primary border border-primary/20">
          <CalendarCheck className="w-3.5 h-3.5" />
          92% Completion Guaranteed
        </span>
        <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">
          How we run your 90-day program
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Doctor builds once. Tech + Humans deliver daily. Real results, real rewards.
        </p>
      </div>

      {/* Horizontal Timeline */}
      <div className="relative w-full max-w-7xl mx-auto">
        {/* Scrollable on mobile, wrapped grid on desktop */}
        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto pb-4 md:pb-0 md:overflow-visible snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {timeline.map((item, i) => (
            <div key={item.step} className="relative flex-shrink-0 w-[260px] sm:w-[280px] md:w-auto snap-center group">
              {/* Card content */}
              <div className="rounded-xl border border-border bg-background p-4 sm:p-5 h-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
                {/* Top gradient accent */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.color}`} />

                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-primary/60 uppercase tracking-wider">Step {item.step}</span>
                      {i === timeline.length - 1 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-semibold">Finish</span>}
                    </div>
                    <h3 className="text-sm font-heading font-bold text-foreground truncate">{item.title}</h3>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2.5">{item.subtitle}</p>
                <ul className="space-y-1">
                  {item.points.map((pt, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-xs text-foreground/80">
                      <ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rewards & Gamification */}
      <div className="mt-20 max-w-4xl mx-auto">
        <div className="text-center mb-10 space-y-2">
          <h3 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground flex items-center justify-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            Rewards & Gamification
          </h3>
          <p className="text-muted-foreground">Points that convert to real-world rewards your patients actually want.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          {/* Points system */}
          <div className="rounded-2xl border border-border bg-background p-6 space-y-4">
            <h4 className="font-heading font-bold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Points System
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between"><span>Daily check-in</span><span className="font-semibold text-foreground">+10 pts</span></div>
              <div className="flex justify-between"><span>Voice BP reading</span><span className="font-semibold text-foreground">+25 pts</span></div>
              <div className="flex justify-between"><span>Lab result upload</span><span className="font-semibold text-foreground">+100 pts</span></div>
              <div className="flex justify-between"><span>7-day streak bonus</span><span className="font-semibold text-foreground">+50 pts</span></div>
              <div className="flex justify-between"><span>30-day streak bonus</span><span className="font-semibold text-foreground">+200 pts 🥇</span></div>
            </div>
          </div>

          {/* Family Dashboard */}
          <div className="rounded-2xl border border-border bg-background p-6 space-y-4">
            <h4 className="font-heading font-bold text-foreground flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500" />
              Family Dashboard
            </h4>
            <div className="rounded-xl bg-muted/50 p-4 font-mono text-sm space-y-1.5">
              <p className="text-foreground font-semibold">Abhay: 92% 🟢 | Streak 21 | Silver</p>
              <p className="text-muted-foreground text-xs">Spouse sees: Adherence + miss alerts</p>
              <p className="text-muted-foreground text-xs">Kids see: "Dad 85% this week 🟡"</p>
              <p className="text-muted-foreground text-xs">Emergency: All family numbers alerted</p>
            </div>
            <p className="text-xs text-muted-foreground italic">Visible to family — Indian accountability that works.</p>
          </div>
        </div>

        {/* Reward Tiers */}
        <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4">
          {rewardTiers.map((t) => (
            <div key={t.tier} className="rounded-xl border border-border bg-background p-3 sm:p-4 text-center hover:shadow-lg transition-shadow">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 mx-auto rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center mb-2`}>
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <p className="font-heading font-bold text-foreground text-sm">{t.tier}</p>
              <p className="text-xs text-primary font-semibold">{t.pts}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.reward}</p>
            </div>
          ))}
        </div>

        {/* Completion promise */}
        <div className="mt-10 rounded-2xl bg-gradient-to-br from-primary/5 to-emerald-500/5 border border-primary/20 p-6 sm:p-8">
          <h4 className="text-xl font-heading font-bold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            100% Completion Promise
          </h4>
          <p className="text-sm text-muted-foreground mb-4">We guarantee you'll finish 90 days because:</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              "Daily dopamine (points + streaks)",
              "Family accountability (Indian reality)",
              "SPOC backup (human when AI fails)",
              "Weekly doctor Zoom (motivation)",
              "Rewards that actually matter (₹300 real)",
              "WhatsApp forever (no app fatigue)",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold text-primary">92% of 127 patients graduated last month.</p>
        </div>
      </div>
    </div>
  </section>
);

export default ProgramPlanSection;

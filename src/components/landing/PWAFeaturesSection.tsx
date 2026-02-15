import { Smartphone, Download, Bell, Wifi, WifiOff, Zap, Globe, Shield, ArrowRight } from "lucide-react";

const pwaFeatures = [
  {
    icon: Download,
    title: "Install Like an App",
    description: "Add Mediimate to your home screen in one tap. Feels like a native app — no App Store or Play Store needed.",
  },
  {
    icon: Bell,
    title: "Push Notifications",
    description: "Get medication reminders, appointment alerts, and health tips even when the browser is closed.",
  },
  {
    icon: WifiOff,
    title: "Works Offline",
    description: "View your health records, past vitals, and medication schedule even without internet. Syncs when back online.",
  },
  {
    icon: Zap,
    title: "Instant Loading",
    description: "Loads in under 2 seconds. No heavy downloads. Service workers cache everything for blazing-fast access.",
  },
  {
    icon: Globe,
    title: "Multi-Language AI",
    description: "Voice AI Doctor speaks Hindi, Kannada, Tamil, Telugu, Malayalam, Marathi, Bengali, Gujarati, and Punjabi.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "HTTPS everywhere. Data encrypted on device. Biometric lock support on compatible phones.",
  },
];

const installSteps = {
  android: [
    "Open mediimate.in in Chrome",
    "Tap the menu (3 dots) at top right",
    "Select \"Add to Home Screen\"",
    "Tap \"Install\" — done!",
  ],
  ios: [
    "Open mediimate.in in Safari",
    "Tap the Share button (box with arrow)",
    "Scroll down, tap \"Add to Home Screen\"",
    "Tap \"Add\" — done!",
  ],
};

const PWAFeaturesSection = () => (
  <section id="pwa" className="py-12 sm:py-24 px-4 bg-card">
    <div className="container mx-auto">
      <div className="text-center mb-8 sm:mb-16 space-y-3">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 text-sm font-medium text-violet-600 border border-violet-500/20">
          <Smartphone className="w-3.5 h-3.5" />
          Works on Every Phone
        </span>
        <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">
          App experience, no app store
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Mediimate is a Progressive Web App — install it on Android or iOS in seconds. Full offline support, push notifications, and native-app feel.
        </p>
      </div>

      {/* Feature grid */}
      <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
        {pwaFeatures.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-border bg-background p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
              <f.icon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="font-heading font-bold text-foreground mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>

      {/* Install instructions */}
      <div className="max-w-3xl mx-auto">
        <h3 className="text-2xl font-heading font-extrabold text-foreground text-center mb-8">
          Install in 30 seconds
        </h3>
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Android */}
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-foreground">Android</h4>
                <p className="text-xs text-muted-foreground">Chrome browser</p>
              </div>
            </div>
            <ol className="space-y-2">
              {installSteps.android.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* iOS */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-foreground">iPhone / iPad</h4>
                <p className="text-xs text-muted-foreground">Safari browser</p>
              </div>
            </div>
            <ol className="space-y-2">
              {installSteps.ios.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default PWAFeaturesSection;

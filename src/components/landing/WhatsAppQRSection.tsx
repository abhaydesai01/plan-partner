import { MessageSquare, Smartphone, Clock, Shield, ArrowRight } from "lucide-react";
import whatsappQr from "@/assets/whatsapp-qr.png";

const features = [
  { icon: Smartphone, text: "Scan with any phone camera" },
  { icon: MessageSquare, text: "Log vitals, meals & meds via WhatsApp" },
  { icon: Clock, text: "24/7 — send data anytime" },
  { icon: Shield, text: "End-to-end encrypted" },
];

const WhatsAppQRSection = () => (
  <section id="whatsapp" className="py-12 sm:py-24 px-4">
    <div className="container mx-auto">
      <div className="max-w-5xl mx-auto rounded-2xl sm:rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 border border-green-200/50 dark:border-green-800/30 overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Left: Content */}
          <div className="p-5 sm:p-8 md:p-12 flex flex-col justify-center">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/15 text-sm font-medium text-green-700 dark:text-green-400 border border-green-500/25 w-fit mb-6">
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp Always-On
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground mb-4">
              Your health, one scan away
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Scan this QR code to connect with Mediimate on WhatsApp. Log your BP, sugar, meals, and medications
              — all from the app you already use every day. No downloads needed.
            </p>

            <ul className="space-y-3 mb-8">
              {features.map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-sm text-foreground">
                  <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  {f.text}
                </li>
              ))}
            </ul>

            <div className="rounded-xl bg-white/80 dark:bg-white/10 border border-green-200/50 dark:border-green-800/30 p-4 space-y-2">
              <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">24/7 Lifeline</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-1.5"><ArrowRight className="w-3 h-3 text-green-500" /> &ldquo;Sugar 250?&rdquo; — Call Dr. Sharma + auto-log</p>
                <p className="flex items-center gap-1.5"><ArrowRight className="w-3 h-3 text-green-500" /> &ldquo;Side effects?&rdquo; — Photo triage + SPOC</p>
                <p className="flex items-center gap-1.5"><ArrowRight className="w-3 h-3 text-green-500" /> &ldquo;Emergency&rdquo; — Apollo ER 5km + family alert</p>
              </div>
              <p className="text-xs text-muted-foreground italic mt-2">Program ends — WhatsApp stays active forever.</p>
            </div>
          </div>

          {/* Right: QR Code */}
          <div className="flex items-center justify-center p-8 sm:p-12 bg-white/50 dark:bg-white/5">
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <div className="absolute -inset-3 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-3xl blur-xl" />
                <img
                  src={whatsappQr}
                  alt="Scan to connect on WhatsApp"
                  className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl shadow-xl border-4 border-white dark:border-gray-800"
                />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-heading font-bold text-foreground">Scan to connect</p>
                <p className="text-sm text-muted-foreground">Open camera &rarr; Point at QR &rarr; Start logging</p>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500 text-white text-sm font-semibold shadow-lg">
                <MessageSquare className="w-4 h-4" />
                WhatsApp Ready
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default WhatsAppQRSection;

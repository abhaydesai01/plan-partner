import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How do the AI agents work?",
    a: "Our AI agents run 24/7 on WhatsApp, handling patient follow-ups, appointment reminders, medication check-ins, and symptom assessments automatically. They understand natural language — patients can text in Hindi or English — and escalate to the doctor only when something needs human attention.",
  },
  {
    q: "Do I need the WhatsApp Business API?",
    a: "Yes, Mediimate connects to the official WhatsApp Business API (Meta Cloud API). We guide you through the setup — it typically takes under 15 minutes. You'll need a dedicated phone number and a verified Meta Business account.",
  },
  {
    q: "Is patient data secure and HIPAA-compliant?",
    a: "Absolutely. All data is encrypted at rest and in transit. We follow HIPAA-ready security practices including role-based access, audit logs, and patient consent management. Patients control their own Health Vault and can grant or revoke doctor access anytime.",
  },
  {
    q: "Can patients use Mediimate without downloading an app?",
    a: "Yes — that's the whole point. Patients interact entirely through WhatsApp, which they already have. No app downloads, no logins, no friction. They can also access a web-based Health Vault for their records.",
  },
  {
    q: "What happens if the AI can't handle a patient query?",
    a: "The AI agent automatically escalates to the assigned doctor with full context — the patient's message, recent vitals, and care history. The doctor gets a real-time alert on their dashboard and can respond directly.",
  },
  {
    q: "How is pricing calculated?",
    a: "Pricing is based on the number of doctors and patients in your clinic. Our Starter plan at ₹999/month covers up to 5 doctors and 200 patients. Growth and Enterprise plans scale with your needs. Annual plans save 20%.",
  },
  {
    q: "Can I try Mediimate before committing?",
    a: "Yes! We offer a free trial so you can experience the full platform — AI agents, WhatsApp automation, and the doctor dashboard — before choosing a plan.",
  },
];

const FAQSection = () => (
  <section className="py-24 px-4 bg-card border-y border-border">
    <div className="container mx-auto max-w-3xl">
      <div className="text-center mb-12 space-y-3 opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
        <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">
          Frequently asked questions
        </h2>
        <p className="text-muted-foreground">
          Everything you need to know about Mediimate and AI-powered clinic automation.
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="border border-border rounded-xl px-6 bg-background data-[state=open]:shadow-md transition-shadow opacity-0 animate-fade-up"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "forwards" }}
          >
            <AccordionTrigger className="text-sm font-heading font-bold text-foreground hover:no-underline py-4">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default FAQSection;

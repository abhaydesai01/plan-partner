import { Check, Minus } from "lucide-react";

type FeatureValue = boolean | string;

interface ComparisonRow {
  feature: string;
  starter: FeatureValue;
  growth: FeatureValue;
  enterprise: FeatureValue;
}

const comparisonData: ComparisonRow[] = [
  { feature: "Doctors", starter: "Up to 5", growth: "Up to 20", enterprise: "Unlimited" },
  { feature: "Patients", starter: "200", growth: "1,000", enterprise: "5,000+" },
  { feature: "WhatsApp AI Agent", starter: true, growth: true, enterprise: true },
  { feature: "Appointment Reminders", starter: true, growth: true, enterprise: true },
  { feature: "Patient Health Vault", starter: true, growth: true, enterprise: true },
  { feature: "AI Voice Check-ins", starter: false, growth: true, enterprise: true },
  { feature: "Care Program Automation", starter: false, growth: true, enterprise: true },
  { feature: "Analytics Dashboard", starter: false, growth: true, enterprise: true },
  { feature: "Program Templates", starter: false, growth: true, enterprise: true },
  { feature: "Bulk Patient Import", starter: false, growth: true, enterprise: true },
  { feature: "Smart Escalation Alerts", starter: false, growth: true, enterprise: true },
  { feature: "Custom Integrations", starter: false, growth: false, enterprise: true },
  { feature: "White-Label Option", starter: false, growth: false, enterprise: true },
  { feature: "Advanced Reporting", starter: false, growth: false, enterprise: true },
  { feature: "Dedicated Support", starter: false, growth: false, enterprise: true },
  { feature: "SLA & Uptime Guarantee", starter: false, growth: false, enterprise: true },
];

const plans = ["Starter", "Growth", "Enterprise"] as const;

const CellValue = ({ value }: { value: FeatureValue }) => {
  if (typeof value === "string") {
    return <span className="text-sm font-medium text-foreground">{value}</span>;
  }
  return value ? (
    <Check className="w-4.5 h-4.5 text-primary mx-auto" />
  ) : (
    <Minus className="w-4 h-4 text-muted-foreground/30 mx-auto" />
  );
};

const ComparePlansTable = () => (
  <div className="mt-16 max-w-5xl mx-auto opacity-0 animate-fade-up" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
    <h3 className="text-center text-xl font-heading font-bold text-foreground mb-8">
      Compare plans in detail
    </h3>
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-muted/50">
            <th className="py-4 px-5 text-sm font-heading font-bold text-foreground w-[40%]">Feature</th>
            {plans.map((plan) => (
              <th key={plan} className="py-4 px-4 text-sm font-heading font-bold text-foreground text-center">
                {plan}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparisonData.map((row, i) => (
            <tr
              key={row.feature}
              className={`border-t border-border ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
            >
              <td className="py-3.5 px-5 text-sm text-muted-foreground">{row.feature}</td>
              <td className="py-3.5 px-4 text-center"><CellValue value={row.starter} /></td>
              <td className="py-3.5 px-4 text-center bg-primary/5"><CellValue value={row.growth} /></td>
              <td className="py-3.5 px-4 text-center"><CellValue value={row.enterprise} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default ComparePlansTable;

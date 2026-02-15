import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Activity, Droplets, UtensilsCrossed, Pill, Check, X } from "lucide-react";

type TodayStatus = { bp: boolean; food: boolean; sugar: boolean; medication: boolean };
type PatientRow = {
  patient_user_id: string;
  full_name: string;
  relationship: string;
  today: TodayStatus;
};

export default function FamilyDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["family", "dashboard"],
    queryFn: () => api.get<{ patients: PatientRow[] }>("family/dashboard"),
  });

  const patients = data?.patients ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Activity className="w-7 h-7 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-heading font-semibold text-foreground mb-2">No one linked yet</h2>
        <p className="text-sm text-muted-foreground">
          When a family member (patient) adds you by your email and you sign up as Family, their daily log status will appear here.
        </p>
      </div>
    );
  }

  const StatusCell = ({ done }: { done: boolean }) =>
    done ? (
      <span className="inline-flex items-center gap-1 text-whatsapp font-medium">
        <Check className="w-4 h-4" /> Logged
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <X className="w-4 h-4" /> Missed
      </span>
    );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-heading font-semibold text-foreground">Daily health at a glance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">See whether your loved one logged today</p>
      </div>

      <div className="space-y-4">
        {patients.map((p) => (
          <div key={p.patient_user_id} className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-foreground">{p.full_name}</h2>
              <span className="text-xs font-medium text-muted-foreground capitalize">{p.relationship}</span>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <dt className="text-xs text-muted-foreground">BP</dt>
                  <dd><StatusCell done={p.today.bp} /></dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-whatsapp flex-shrink-0" />
                <div>
                  <dt className="text-xs text-muted-foreground">Food</dt>
                  <dd><StatusCell done={p.today.food} /></dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-accent flex-shrink-0" />
                <div>
                  <dt className="text-xs text-muted-foreground">Sugar</dt>
                  <dd><StatusCell done={p.today.sugar} /></dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-violet-500 flex-shrink-0" />
                <div>
                  <dt className="text-xs text-muted-foreground">Medication</dt>
                  <dd><StatusCell done={p.today.medication} /></dd>
                </div>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

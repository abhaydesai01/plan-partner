import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { FileText } from "lucide-react";

const statusColors: Record<string, string> = {
  normal: "bg-whatsapp/10 text-whatsapp",
  abnormal: "bg-accent/10 text-accent",
  critical: "bg-destructive/10 text-destructive",
};

const PatientLabResults = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: patient } = await supabase.from("patients").select("id").eq("patient_user_id", user.id).maybeSingle();
      if (!patient) { setLoading(false); return; }
      const { data } = await supabase.from("lab_results").select("*").eq("patient_id", patient.id).order("tested_at", { ascending: false });
      setResults(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Lab Results</h1>
        <p className="text-muted-foreground text-sm">Your test results and diagnostics</p>
      </div>

      {results.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No lab results recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {results.map(r => (
            <div key={r.id} className="glass-card rounded-xl p-5 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{r.test_name}</h3>
                  <p className="text-xs text-muted-foreground">{format(new Date(r.tested_at), "MMM d, yyyy")}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[r.status] || ""}`}>
                  {r.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground">Result</p>
                  <p className="font-heading font-bold text-foreground">{r.result_value} {r.unit && <span className="text-xs font-normal text-muted-foreground">{r.unit}</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reference Range</p>
                  <p className="text-sm text-foreground">{r.reference_range || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm text-foreground">{r.notes || "—"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientLabResults;

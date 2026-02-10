import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { FileText, Plus, X } from "lucide-react";

const statusColors: Record<string, string> = {
  normal: "bg-whatsapp/10 text-whatsapp",
  abnormal: "bg-accent/10 text-accent",
  critical: "bg-destructive/10 text-destructive",
};

const PatientLabResults = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [testName, setTestName] = useState("");
  const [resultValue, setResultValue] = useState("");
  const [unit, setUnit] = useState("");
  const [refRange, setRefRange] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchResults = async () => {
    if (!user) return;
    const { data: patient } = await supabase.from("patients").select("id").eq("patient_user_id", user.id).maybeSingle();
    if (!patient) { setLoading(false); return; }
    setPatientId(patient.id);
    const { data } = await supabase.from("lab_results").select("*").eq("patient_id", patient.id).order("tested_at", { ascending: false });
    setResults(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchResults(); }, [user]);

  const handleAdd = async () => {
    if (!patientId || !user || !testName.trim() || !resultValue.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("lab_results").insert({
      patient_id: patientId,
      doctor_id: user.id,
      test_name: testName,
      result_value: resultValue,
      unit: unit || null,
      reference_range: refRange || null,
      notes: notes || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lab result added" });
      setShowAdd(false);
      setTestName(""); setResultValue(""); setUnit(""); setRefRange(""); setNotes("");
      fetchResults();
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Lab Results</h1>
          <p className="text-muted-foreground text-sm">Your test results and diagnostics</p>
        </div>
        {patientId && (
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Add Lab Result
          </button>
        )}
      </div>

      {/* Add Lab Result Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-foreground">Add Lab Result</h2>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Test Name *" value={testName} onChange={e => setTestName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <input placeholder="Result Value *" value={resultValue} onChange={e => setResultValue(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Unit (e.g., mg/dL)" value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input placeholder="Ref. Range" value={refRange} onChange={e => setRefRange(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <button onClick={handleAdd} disabled={!testName.trim() || !resultValue.trim() || saving} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving ? "Saving..." : "Save Lab Result"}
              </button>
            </div>
          </div>
        </div>
      )}

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

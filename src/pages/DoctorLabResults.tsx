import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, FileText } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  normal: "bg-whatsapp/10 text-whatsapp",
  abnormal: "bg-accent/10 text-accent",
  critical: "bg-destructive/10 text-destructive",
};

const DoctorLabResults = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [results, setResults] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: "", test_name: "", result_value: "", reference_range: "", unit: "", status: "normal", notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const [resultsRes, patientsRes] = await Promise.all([
      supabase.from("lab_results").select("*, patients(full_name)").eq("doctor_id", user.id).order("tested_at", { ascending: false }).limit(50),
      supabase.from("patients").select("id, full_name").eq("doctor_id", user.id).order("full_name"),
    ]);
    setResults(resultsRes.data || []);
    setPatients(patientsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("lab_results").insert({
      doctor_id: user.id,
      patient_id: form.patient_id,
      test_name: form.test_name,
      result_value: form.result_value,
      reference_range: form.reference_range || null,
      unit: form.unit || null,
      status: form.status,
      notes: form.notes || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lab result added" });
      setShowForm(false);
      setForm({ patient_id: "", test_name: "", result_value: "", reference_range: "", unit: "", status: "normal", notes: "" });
      fetchData();
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Lab Results</h1>
          <p className="text-muted-foreground text-sm">Manage patient lab results</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add Lab Result
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-foreground">Add Lab Result</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <select required value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              <input required placeholder="Test Name" value={form.test_name} onChange={e => setForm({ ...form, test_name: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="Result Value" value={form.result_value} onChange={e => setForm({ ...form, result_value: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input placeholder="Unit" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <input placeholder="Reference Range (e.g. 70-100)" value={form.reference_range} onChange={e => setForm({ ...form, reference_range: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="normal">Normal</option>
                <option value="abnormal">Abnormal</option>
                <option value="critical">Critical</option>
              </select>
              <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <button type="submit" disabled={saving} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50">
                {saving ? "Adding..." : "Add Lab Result"}
              </button>
            </form>
          </div>
        </div>
      )}

      {results.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No lab results yet.
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Test</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Result</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Range</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{(r.patients as any)?.full_name || "—"}</td>
                    <td className="px-4 py-3 text-foreground">{r.test_name}</td>
                    <td className="px-4 py-3 font-heading font-bold text-foreground">{r.result_value} {r.unit && <span className="text-xs font-normal text-muted-foreground">{r.unit}</span>}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.reference_range || "—"}</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[r.status] || ""}`}>{r.status}</span></td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{format(new Date(r.tested_at), "MMM d, yyyy")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorLabResults;

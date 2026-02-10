import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Activity } from "lucide-react";
import { format } from "date-fns";

const VITAL_TYPES = [
  { value: "blood_pressure", label: "Blood Pressure", unit: "mmHg" },
  { value: "heart_rate", label: "Heart Rate", unit: "bpm" },
  { value: "temperature", label: "Temperature", unit: "°F" },
  { value: "weight", label: "Weight", unit: "kg" },
  { value: "blood_sugar", label: "Blood Sugar", unit: "mg/dL" },
  { value: "spo2", label: "SpO2", unit: "%" },
];

const DoctorVitals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vitals, setVitals] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: "", vital_type: "blood_pressure", value_text: "", value_numeric: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const [vitalsRes, patientsRes] = await Promise.all([
      supabase.from("vitals").select("*, patients(full_name)").eq("doctor_id", user.id).order("recorded_at", { ascending: false }).limit(50),
      supabase.from("patients").select("id, full_name").eq("doctor_id", user.id).order("full_name"),
    ]);
    setVitals(vitalsRes.data || []);
    setPatients(patientsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const vitalType = VITAL_TYPES.find(t => t.value === form.vital_type);
    const { error } = await supabase.from("vitals").insert({
      doctor_id: user.id,
      patient_id: form.patient_id,
      vital_type: form.vital_type,
      value_text: form.value_text,
      value_numeric: form.value_numeric ? parseFloat(form.value_numeric) : null,
      unit: vitalType?.unit || null,
      notes: form.notes || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vital recorded" });
      setShowForm(false);
      setForm({ patient_id: "", vital_type: "blood_pressure", value_text: "", value_numeric: "", notes: "" });
      fetchData();
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Vitals</h1>
          <p className="text-muted-foreground text-sm">Track patient vital signs</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Record Vital
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-foreground">Record Vital</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <select required value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              <select value={form.vital_type} onChange={e => setForm({ ...form, vital_type: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                {VITAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} ({t.unit})</option>)}
              </select>
              <input required placeholder="Value (e.g. 120/80)" value={form.value_text} onChange={e => setForm({ ...form, value_text: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <input placeholder="Numeric value (for charts)" type="number" step="0.1" value={form.value_numeric} onChange={e => setForm({ ...form, value_numeric: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <button type="submit" disabled={saving} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50">
                {saving ? "Recording..." : "Record Vital"}
              </button>
            </form>
          </div>
        </div>
      )}

      {vitals.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No vitals recorded yet. Start by recording a patient's vitals.
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {vitals.map(v => (
                  <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{(v.patients as any)?.full_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{v.vital_type.replace("_", " ")}</td>
                    <td className="px-4 py-3 font-heading font-bold text-foreground">{v.value_text} <span className="text-xs font-normal text-muted-foreground">{v.unit}</span></td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{format(new Date(v.recorded_at), "MMM d, yyyy")}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{v.notes || "—"}</td>
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

export default DoctorVitals;

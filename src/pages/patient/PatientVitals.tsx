import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Activity, Plus, X } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const VITAL_TYPES = [
  { value: "blood_pressure", label: "Blood Pressure", unit: "mmHg" },
  { value: "heart_rate", label: "Heart Rate", unit: "bpm" },
  { value: "temperature", label: "Temperature", unit: "°F" },
  { value: "weight", label: "Weight", unit: "kg" },
  { value: "blood_sugar", label: "Blood Sugar", unit: "mg/dL" },
  { value: "spo2", label: "SpO2", unit: "%" },
];

const PatientVitals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vitals, setVitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("all");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState("blood_pressure");
  const [addValue, setAddValue] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchVitals = async () => {
    if (!user) return;
    const { data: patient } = await supabase.from("patients").select("id").eq("patient_user_id", user.id).maybeSingle();
    if (!patient) { setLoading(false); return; }
    setPatientId(patient.id);
    const { data } = await supabase.from("vitals").select("*").eq("patient_id", patient.id).order("recorded_at", { ascending: false });
    setVitals(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchVitals(); }, [user]);

  const handleAddVital = async () => {
    if (!patientId || !user || !addValue.trim()) return;
    setSaving(true);
    const vitalInfo = VITAL_TYPES.find(t => t.value === addType);
    const numericVal = parseFloat(addValue);
    const { error } = await supabase.from("vitals").insert({
      patient_id: patientId,
      doctor_id: user.id,
      vital_type: addType,
      value_text: addValue,
      value_numeric: isNaN(numericVal) ? null : numericVal,
      unit: vitalInfo?.unit || null,
      notes: addNotes || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vital added" });
      setShowAdd(false);
      setAddValue("");
      setAddNotes("");
      fetchVitals();
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const filtered = selectedType === "all" ? vitals : vitals.filter(v => v.vital_type === selectedType);

  // Chart data for selected type (if not "all")
  const chartData = selectedType !== "all"
    ? [...filtered].reverse().map(v => ({
        date: format(new Date(v.recorded_at), "MMM d"),
        value: v.value_numeric ?? 0,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Vitals</h1>
          <p className="text-muted-foreground text-sm">Your recorded vital signs</p>
        </div>
        {patientId && (
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Add Vital
          </button>
        )}
      </div>

      {/* Add Vital Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-foreground">Add Vital</h2>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <select value={addType} onChange={e => setAddType(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                {VITAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} ({t.unit})</option>)}
              </select>
              <input placeholder="Value" value={addValue} onChange={e => setAddValue(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <input placeholder="Notes (optional)" value={addNotes} onChange={e => setAddNotes(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <button onClick={handleAddVital} disabled={!addValue.trim() || saving} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving ? "Saving..." : "Save Vital"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSelectedType("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedType === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>All</button>
        {VITAL_TYPES.map(t => (
          <button key={t.value} onClick={() => setSelectedType(t.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedType === t.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{t.label}</button>
        ))}
      </div>

      {/* Chart */}
      {selectedType !== "all" && chartData.length > 1 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">{VITAL_TYPES.find(t => t.value === selectedType)?.label} Trend</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="vitalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(168, 80%, 30%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(168, 80%, 30%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 15%, 88%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(180, 8%, 46%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(180, 8%, 46%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(160, 15%, 88%)", fontSize: 13 }} />
                <Area type="monotone" dataKey="value" stroke="hsl(168, 80%, 30%)" strokeWidth={2} fill="url(#vitalGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Vitals List */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No vitals recorded yet.
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Unit</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground capitalize">{v.vital_type.replace("_", " ")}</td>
                    <td className="px-4 py-3 font-heading font-bold text-foreground">{v.value_text}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{v.unit || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(v.recorded_at), "MMM d, yyyy")}</td>
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

export default PatientVitals;

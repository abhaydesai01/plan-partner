import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePatientRecord } from "@/hooks/usePatientRecord";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { Activity, Plus, X, Upload } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { getVitalsAnalysis } from "@/lib/vitalsAnalysis";
import { VitalsAnalysisCard } from "@/components/VitalsAnalysisCard";

const VITAL_TYPES = [
  { value: "blood_pressure", label: "Blood Pressure", unit: "mmHg" },
  { value: "heart_rate", label: "Heart Rate", unit: "bpm" },
  { value: "temperature", label: "Temperature", unit: "°F" },
  { value: "weight", label: "Weight", unit: "kg" },
  { value: "blood_sugar", label: "Blood Sugar", unit: "mg/dL" },
  { value: "spo2", label: "SpO2", unit: "%" },
];

type BulkRow = { vital_type: string; value_text: string; value_numeric: string; notes: string };
const emptyBulkRow = (): BulkRow => ({ vital_type: "blood_pressure", value_text: "", value_numeric: "", notes: "" });

const PatientVitals = () => {
  const { toast } = useToast();
  const { patientId, loading: patientLoading } = usePatientRecord();
  const [vitals, setVitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [addType, setAddType] = useState("blood_pressure");
  const [addValue, setAddValue] = useState("");
  const [addBpUpper, setAddBpUpper] = useState("");
  const [addBpLower, setAddBpLower] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([emptyBulkRow(), emptyBulkRow(), emptyBulkRow()]);
  const [savingBulk, setSavingBulk] = useState(false);

  const fetchVitals = async () => {
    if (!patientId) { setLoading(false); return; }
    try {
      const data = await api.get<any[]>("me/vitals");
      setVitals(Array.isArray(data) ? data : []);
    } catch {
      setVitals([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (patientLoading) return;
    if (!patientId) {
      setLoading(false);
      return;
    }
    fetchVitals();
  }, [patientId, patientLoading]);

  const vitalsAnalysis = useMemo(() => {
    const sorted = [...vitals].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    return getVitalsAnalysis(sorted);
  }, [vitals]);

  const handleAddVital = async () => {
    const isBp = addType === "blood_pressure";
    const valueText = isBp ? `${addBpUpper.trim()}/${addBpLower.trim()}` : addValue.trim();
    if (!patientId || !valueText) return;
    if (isBp && (!addBpUpper.trim() || !addBpLower.trim())) return;
    setSaving(true);
    const vitalInfo = VITAL_TYPES.find(t => t.value === addType);
    const numericVal = isBp ? parseFloat(addBpUpper) : parseFloat(addValue);
    try {
      await api.post("me/vitals", {
        vital_type: addType,
        value_text: valueText,
        value_numeric: Number.isFinite(numericVal) ? numericVal : null,
        unit: vitalInfo?.unit || null,
        notes: addNotes || null,
      });
      toast({ title: "Vital added" });
      setShowAdd(false);
      setAddValue("");
      setAddBpUpper("");
      setAddBpLower("");
      setAddNotes("");
      fetchVitals();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAdd = async () => {
    if (!patientId) return;
    const vitalsList = bulkRows
      .map((r) => {
        const value_text = r.value_text.trim();
        if (!value_text) return null;
        const vitalInfo = VITAL_TYPES.find((t) => t.value === r.vital_type);
        const value_numeric = r.value_numeric.trim() ? parseFloat(r.value_numeric) : null;
        return {
          vital_type: r.vital_type,
          value_text,
          value_numeric: Number.isFinite(value_numeric) ? value_numeric : null,
          unit: vitalInfo?.unit || null,
          notes: r.notes.trim() || null,
        };
      })
      .filter(Boolean);
    if (vitalsList.length === 0) {
      toast({ title: "Add at least one vital with a value", variant: "destructive" });
      return;
    }
    setSavingBulk(true);
    try {
      const res = await api.post<{ created: number }>("me/vitals/bulk", { vitals: vitalsList });
      toast({ title: "Vitals recorded", description: `${res.created} vital(s) added.` });
      setShowBulkAdd(false);
      setBulkRows([emptyBulkRow(), emptyBulkRow(), emptyBulkRow()]);
      fetchVitals();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSavingBulk(false);
    }
  };

  const addBulkRow = () => setBulkRows((prev) => [...prev, emptyBulkRow()]);
  const updateBulkRow = (i: number, field: keyof BulkRow, value: string) => {
    setBulkRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  };
  const removeBulkRow = (i: number) => setBulkRows((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));

  const filtered = selectedType === "all" ? vitals : vitals.filter(v => v.vital_type === selectedType);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  // Chart data for selected type (if not "all")
  const chartData = selectedType !== "all"
    ? [...filtered].reverse().map(v => ({
        date: format(new Date(v.recorded_at), "MMM d"),
        value: v.value_numeric ?? 0,
      }))
    : [];

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground truncate">Vitals</h1>
          <p className="text-muted-foreground text-sm">Your recorded vital signs</p>
        </div>
        {patientId && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4 shrink-0" /> Add Vital
            </button>
            <button onClick={() => setShowBulkAdd(true)} className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border border-primary text-primary font-semibold text-sm hover:bg-primary/10 transition-colors">
              <Upload className="w-4 h-4 shrink-0" /> Bulk Upload
            </button>
          </div>
        )}
      </div>

      {/* Bulk Upload Modal */}
      {showBulkAdd && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowBulkAdd(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-2xl my-8 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-foreground">Bulk upload vitals</h2>
              <button type="button" onClick={() => setShowBulkAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Value</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Numeric</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Notes</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="px-3 py-2">
                          <select value={row.vital_type} onChange={(e) => updateBulkRow(i, "vital_type", e.target.value)} className="w-full min-w-[120px] px-2 py-1.5 rounded border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50">
                            {VITAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input placeholder={row.vital_type === "blood_pressure" ? "120/80" : "e.g. 72"} value={row.value_text} onChange={(e) => updateBulkRow(i, "value_text", e.target.value)} className="w-full min-w-[80px] px-2 py-1.5 rounded border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        </td>
                        <td className="px-3 py-2 hidden sm:table-cell">
                          <input type="number" step="0.1" placeholder="—" value={row.value_numeric} onChange={(e) => updateBulkRow(i, "value_numeric", e.target.value)} className="w-full min-w-[60px] px-2 py-1.5 rounded border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        </td>
                        <td className="px-3 py-2">
                          <input placeholder="Optional" value={row.notes} onChange={(e) => updateBulkRow(i, "notes", e.target.value)} className="w-full min-w-[80px] px-2 py-1.5 rounded border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        </td>
                        <td className="px-2 py-1">
                          <button type="button" onClick={() => removeBulkRow(i)} className="text-muted-foreground hover:text-destructive p-1"><X className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-2 border-t border-border bg-muted/30">
                <button type="button" onClick={addBulkRow} className="text-sm text-primary font-medium hover:underline">+ Add row</button>
              </div>
            </div>
            <button onClick={handleBulkAdd} disabled={savingBulk} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50">
              {savingBulk ? "Uploading..." : `Upload ${bulkRows.filter((r) => r.value_text.trim()).length} vital(s)`}
            </button>
          </div>
        </div>
      )}

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
              {addType === "blood_pressure" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Upper (Systolic) mmHg</label>
                    <input type="number" min={60} max={250} placeholder="120" value={addBpUpper} onChange={e => setAddBpUpper(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Lower (Diastolic) mmHg</label>
                    <input type="number" min={40} max={150} placeholder="80" value={addBpLower} onChange={e => setAddBpLower(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
              ) : (
                <input placeholder={`Value (${VITAL_TYPES.find(t => t.value === addType)?.unit || ""})`} value={addValue} onChange={e => setAddValue(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              )}
              <input placeholder="Notes (optional)" value={addNotes} onChange={e => setAddNotes(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <button
                onClick={handleAddVital}
                disabled={saving || (addType === "blood_pressure" ? !addBpUpper.trim() || !addBpLower.trim() : !addValue.trim())}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? "Saving..." : "Save Vital"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis & recommendations */}
      <VitalsAnalysisCard data={vitalsAnalysis} emptyMessage="No vitals recorded yet. Add readings to see analysis and recommendations." />

      {/* Filter tabs: wrap on small screens, no horizontal scroll */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSelectedType("all")} className={`min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0 touch-manipulation ${selectedType === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>All</button>
        {VITAL_TYPES.map(t => (
          <button key={t.value} onClick={() => setSelectedType(t.value)} className={`min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0 touch-manipulation ${selectedType === t.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{t.label}</button>
        ))}
      </div>

      {/* Chart */}
      {selectedType !== "all" && chartData.length > 1 && (
        <div className="glass-card rounded-xl p-4 sm:p-5 min-w-0">
          <h3 className="font-heading font-semibold text-foreground mb-4 truncate">{VITAL_TYPES.find(t => t.value === selectedType)?.label} Trend</h3>
          <div className="h-40 sm:h-48 min-w-0 w-full">
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
        <div className="glass-card rounded-xl overflow-hidden min-w-0">
          <div className="overflow-x-auto -mx-px">
            <table className="w-full min-w-[280px] text-sm table-fixed sm:table-auto">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2.5 sm:px-4 sm:py-3 font-medium text-muted-foreground w-24 sm:w-auto">Type</th>
                  <th className="text-left px-3 py-2.5 sm:px-4 sm:py-3 font-medium text-muted-foreground">Value</th>
                  <th className="text-left px-3 py-2.5 sm:px-4 sm:py-3 font-medium text-muted-foreground hidden sm:table-cell">Unit</th>
                  <th className="text-left px-3 py-2.5 sm:px-4 sm:py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-3 py-2.5 sm:px-4 sm:py-3 font-medium text-muted-foreground hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium text-foreground capitalize truncate">{v.vital_type.replace("_", " ")}</td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-heading font-bold text-foreground truncate">{v.value_text}</td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-muted-foreground hidden sm:table-cell">{v.unit || "—"}</td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-muted-foreground text-xs sm:text-sm">{format(new Date(v.recorded_at), "MMM d, yyyy")}</td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-muted-foreground hidden md:table-cell truncate max-w-[120px]">{v.notes || "—"}</td>
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

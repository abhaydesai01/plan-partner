import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, FlaskConical, Check } from "lucide-react";

const COMMON_TESTS = [
  { value: "Complete Blood Count", unit: "g/dL" },
  { value: "Fasting Blood Sugar", unit: "mg/dL" },
  { value: "HbA1c", unit: "%" },
  { value: "Cholesterol (Total)", unit: "mg/dL" },
  { value: "TSH", unit: "mIU/L" },
  { value: "Vitamin D", unit: "ng/mL" },
  { value: "Creatinine", unit: "mg/dL" },
  { value: "Hemoglobin", unit: "g/dL" },
];

interface Props {
  patientId: string;
  userId: string;
  onClose: () => void;
  onSuccess: (summary: string) => void;
}

const ChatLabForm = ({ patientId, userId, onClose, onSuccess }: Props) => {
  const { toast } = useToast();
  const [testName, setTestName] = useState("");
  const [resultValue, setResultValue] = useState("");
  const [unit, setUnit] = useState("");
  const [refRange, setRefRange] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const selectPreset = (test: typeof COMMON_TESTS[0]) => {
    setTestName(test.value);
    setUnit(test.unit);
  };

  const handleSubmit = async () => {
    if (!testName.trim() || !resultValue.trim()) return;
    setSaving(true);

    const { error } = await supabase.from("lab_results").insert({
      patient_id: patientId,
      doctor_id: userId,
      test_name: testName.trim(),
      result_value: resultValue.trim(),
      unit: unit.trim() || null,
      reference_range: refRange.trim() || null,
      status: "normal",
      notes: notes.trim() || null,
      tested_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to save lab result", variant: "destructive" });
      return;
    }

    onSuccess(`✅ Logged **${testName.trim()}**: ${resultValue.trim()}${unit ? ` ${unit}` : ""}${refRange ? ` (ref: ${refRange})` : ""}`);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 max-w-md w-full shadow-lg animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-accent" />
          <span className="font-medium text-sm">Log Lab Result</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick select presets */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {COMMON_TESTS.map((t) => (
          <button
            key={t.value}
            onClick={() => selectPreset(t)}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              testName === t.value
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.value}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
          placeholder="Test name (e.g. Hemoglobin)"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={resultValue}
            onChange={(e) => setResultValue(e.target.value)}
            placeholder="Result value"
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unit"
            className="w-24 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <input
          type="text"
          value={refRange}
          onChange={(e) => setRefRange(e.target.value)}
          placeholder="Reference range (e.g. 70-100)"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={handleSubmit}
          disabled={!testName.trim() || !resultValue.trim() || saving}
          className="w-full py-2 rounded-xl bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          {saving ? "Saving..." : "Log Lab Result"}
        </button>
      </div>
    </div>
  );
};

export default ChatLabForm;

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, Activity, Check } from "lucide-react";

const VITAL_TYPES = [
  { value: "blood_pressure", label: "Blood Pressure", unit: "mmHg", placeholder: "120/80" },
  { value: "heart_rate", label: "Heart Rate", unit: "bpm", placeholder: "72" },
  { value: "temperature", label: "Temperature", unit: "°F", placeholder: "98.6" },
  { value: "blood_sugar", label: "Blood Sugar", unit: "mg/dL", placeholder: "95" },
  { value: "weight", label: "Weight", unit: "kg", placeholder: "70" },
  { value: "spo2", label: "SpO2", unit: "%", placeholder: "98" },
];

interface Props {
  patientId: string;
  userId: string;
  onClose: () => void;
  onSuccess: (summary: string) => void;
}

const ChatVitalsForm = ({ patientId, userId, onClose, onSuccess }: Props) => {
  const { toast } = useToast();
  const [type, setType] = useState(VITAL_TYPES[0].value);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = VITAL_TYPES.find((v) => v.value === type)!;

  const handleSubmit = async () => {
    if (!value.trim()) return;
    setSaving(true);

    const numericValue = parseFloat(value.replace(/[^\d.]/g, "")) || null;

    const { error } = await supabase.from("vitals").insert({
      patient_id: patientId,
      doctor_id: userId,
      vital_type: type,
      value_text: value.trim(),
      value_numeric: numericValue,
      unit: selected.unit,
      notes: notes.trim() || null,
      recorded_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to save vital", variant: "destructive" });
      return;
    }

    onSuccess(`✅ Logged **${selected.label}**: ${value.trim()} ${selected.unit}${notes ? ` — ${notes}` : ""}`);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 max-w-md w-full shadow-lg animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Log Vital</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {VITAL_TYPES.map((v) => (
          <button
            key={v.value}
            onClick={() => { setType(v.value); setValue(""); }}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              type === v.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={selected.placeholder}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
          <span className="px-3 py-2 text-xs text-muted-foreground bg-muted rounded-lg flex items-center">
            {selected.unit}
          </span>
        </div>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || saving}
          className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          {saving ? "Saving..." : "Log Vital"}
        </button>
      </div>
    </div>
  );
};

export default ChatVitalsForm;

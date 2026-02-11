import { useState } from "react";
import { X, CheckCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AppointmentCompletionModalProps {
  appointment: {
    id: string;
    patient_id: string;
    title: string;
    patient_name?: string;
    scheduled_at: string;
  };
  userId: string;
  onClose: () => void;
  onCompleted: () => void;
}

export function AppointmentCompletionModal({ appointment, userId, onClose, onCompleted }: AppointmentCompletionModalProps) {
  const { toast } = useToast();
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    setSaving(true);
    try {
      // 1. Update appointment status
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "completed", notes: remarks || null })
        .eq("id", appointment.id);

      if (updateError) throw updateError;

      // 2. Create feedback request & send notification via edge function
      const { error: fnError } = await supabase.functions.invoke("send-completion-email", {
        body: {
          appointment_id: appointment.id,
          doctor_id: userId,
          patient_id: appointment.patient_id,
          completion_remarks: remarks,
        },
      });

      if (fnError) {
        console.error("Notification error:", fnError);
        // Don't block completion on notification failure
      }

      toast({ title: "Appointment Completed ✅", description: "Patient has been notified for feedback." });
      onCompleted();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 w-full max-w-md space-y-5 shadow-xl border border-border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-whatsapp/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-whatsapp" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-foreground">Complete Appointment</h2>
              <p className="text-xs text-muted-foreground">{appointment.patient_name} — {appointment.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            Completion Remarks
          </label>
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Summary, prescriptions, follow-up notes..."
            rows={4}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        <div className="glass-card rounded-lg p-3 space-y-1.5">
          <p className="text-xs font-medium text-foreground">After completion:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li className="flex items-center gap-2"><Send className="w-3 h-3 text-primary" /> Email notification sent to patient</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-primary" /> In-app notification created</li>
            <li className="flex items-center gap-2"><Send className="w-3 h-3 text-primary" /> Feedback link shared (valid 7 days)</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-whatsapp text-whatsapp-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {saving ? "Completing..." : <>
              <CheckCircle className="w-4 h-4" /> Mark Complete
            </>}
          </button>
        </div>
      </div>
    </div>
  );
}

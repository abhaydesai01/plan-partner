import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Ensures the current patient user has a `patients` record.
 * If one doesn't exist (self-registered patient), auto-creates it.
 * Returns { patientId, loading }
 */
export function usePatientRecord() {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const ensureRecord = async () => {
      // Check existing
      const { data: existing } = await supabase
        .from("patients")
        .select("id")
        .eq("patient_user_id", user.id)
        .maybeSingle();

      if (existing) {
        setPatientId(existing.id);
        setLoading(false);
        return;
      }

      // Get profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      // Auto-create a self-managed patient record
      // doctor_id is set to user's own ID since there's no doctor yet
      const { data: newPatient, error } = await supabase
        .from("patients")
        .insert({
          patient_user_id: user.id,
          doctor_id: user.id, // self-managed
          full_name: profile?.full_name || user.email?.split("@")[0] || "Patient",
          phone: "",
          status: "active",
        })
        .select("id")
        .single();

      if (!error && newPatient) {
        setPatientId(newPatient.id);
      }
      setLoading(false);
    };

    ensureRecord();
  }, [user]);

  return { patientId, loading };
}

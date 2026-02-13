import { useAuth } from "@/hooks/useAuth";

/**
 * Returns the current patient user's linked patient id (from auth/me).
 * Returns { patientId, loading }
 */
export function usePatientRecord() {
  const { session, loading } = useAuth();
  const patient = session?.patient as { id?: string } | undefined;
  return { patientId: patient?.id ?? null, loading };
}

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Building2 } from "lucide-react";

interface Patient {
  id: string;
  full_name: string;
  phone?: string;
  status?: string;
}

const ClinicPatients = () => {
  const { session } = useAuth();
  const clinic = session?.clinic as { id?: string } | null;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinic?.id) return;
    api.get<Patient[]>("patients", { clinic_id: clinic.id }).then((list) => setPatients(Array.isArray(list) ? list : [])).catch(() => setPatients([])).finally(() => setLoading(false));
  }, [clinic?.id]);

  if (!clinic) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-heading font-bold text-foreground mb-2">Clinic not found</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Patients</h1>
        <p className="text-muted-foreground text-sm">Patients linked to doctors at this clinic</p>
      </div>
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{p.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.phone || "—"}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{p.status || "active"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {patients.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">No patients yet. When clinic doctors add patients and book at this clinic, they will appear here.</div>
        )}
      </div>
    </div>
  );
};

export default ClinicPatients;

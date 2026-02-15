import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { UserPlus, Check, X, Clock, Link } from "lucide-react";

const DoctorLinkRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedPatientMap, setSelectedPatientMap] = useState<Record<string, string>>({});

  const fetchData = async () => {
    if (!user) return;
    try {
      const [reqList, patList] = await Promise.all([
        api.get<any[]>("link_requests").catch(() => []),
        api.get<{ items: any[] }>("patients", { limit: "200", skip: "0" }).then((r) => r.items ?? []).catch(() => []),
      ]);
      setRequests(Array.isArray(reqList) ? reqList : []);
      setPatients(Array.isArray(patList) ? patList : []);
    } catch {
      setRequests([]);
      setPatients([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleApprove = async (request: any) => {
    const selectedPatientId = selectedPatientMap[request.id];
    setProcessingId(request.id);

    try {
      if (selectedPatientId) {
        await api.patch(`patients/${selectedPatientId}`, { patient_user_id: request.patient_user_id });
        await api.patch(`link_requests/${request.id}`, { status: "approved", linked_patient_id: selectedPatientId, resolved_at: new Date().toISOString() });
      } else {
        await api.patch(`link_requests/${request.id}`, { status: "approved", resolved_at: new Date().toISOString() });
      }
      toast({ title: "Request approved", description: `${request.patient_name} is now connected. They can connect to multiple doctors.` });
      fetchData();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
    setProcessingId(null);
  };

  const handleDeny = async (request: any) => {
    setProcessingId(request.id);
    try {
      await api.patch(`link_requests/${request.id}`, { status: "denied", resolved_at: new Date().toISOString() });
      toast({ title: "Request denied" });
      fetchData();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
    setProcessingId(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const pending = requests.filter(r => r.status === "pending");
  const resolved = requests.filter(r => r.status !== "pending");
  const unlinkablePatients = patients.filter(p => !p.patient_user_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Link Requests</h1>
        <p className="text-muted-foreground text-sm">Approve or deny patient account link requests</p>
      </div>

      {/* Doctor Code */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-heading font-semibold text-foreground mb-2">Your Doctor Code</h3>
        <DoctorCode userId={user?.id} />
      </div>

      {/* Pending Requests */}
      <div>
        <h3 className="font-heading font-semibold text-foreground mb-3">Pending ({pending.length})</h3>
        {pending.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No pending requests.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(r => (
              <div key={r.id} className="glass-card rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{r.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy 'at' HH:mm")}</p>
                    {r.message && <p className="text-sm text-muted-foreground mt-1">"{r.message}"</p>}
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">Pending</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={selectedPatientMap[r.id] || ""}
                    onChange={e => setSelectedPatientMap(prev => ({ ...prev, [r.id]: e.target.value }))}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Approve (link to existing or create)</option>
                    {unlinkablePatients.map(p => (
                      <option key={p.id} value={p.id}>Link to: {p.full_name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(r)}
                      disabled={processingId === r.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleDeny(r)}
                      disabled={processingId === r.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-muted text-muted-foreground font-semibold text-sm hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 transition-colors"
                    >
                      <X className="w-4 h-4" /> Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-foreground mb-3">History</h3>
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map(r => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="px-4 py-3 font-medium text-foreground">{r.patient_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === "approved" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {r.resolved_at ? format(new Date(r.resolved_at), "MMM d, yyyy") : "—"}
                    </td>
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

function DoctorCode({ userId }: { userId?: string }) {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    api.get<{ doctor_code?: string }[]>("profiles", { user_id: userId }).then((data) => {
      setCode(Array.isArray(data) && data[0] ? data[0].doctor_code || null : null);
    }).catch(() => setCode(null));
  }, [userId]);

  if (!code) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="flex items-center gap-3">
      <code className="text-2xl font-heading font-bold tracking-widest text-primary bg-primary/10 px-4 py-2 rounded-lg">{code}</code>
      <p className="text-sm text-muted-foreground">Share this code with your patients so they can request to link their account.</p>
    </div>
  );
}

export default DoctorLinkRequests;

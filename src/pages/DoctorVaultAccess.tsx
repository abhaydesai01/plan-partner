import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Shield, Search, Check, Clock, X, UserPlus } from "lucide-react";

type LinkEntry = {
  id: string;
  patient_user_id: string;
  status: string;
  requested_at: string;
  doctor_name: string | null;
  patient_name?: string;
};

const DoctorVaultAccess = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [links, setLinks] = useState<LinkEntry[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .get<LinkEntry[]>("patient_doctor_links", { doctor_id: user.id })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setLinks(list.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()));
      })
      .catch(() => setLinks([]))
      .finally(() => setLoadingLinks(false));
  }, [user]);

  const requestAccess = async () => {
    if (!code.trim() || !user) return;
    setSearching(true);
    try {
      const vaultList = await api.get<any[]>("patient_vault_codes", { vault_code: code.trim().toUpperCase() });
      const vault = Array.isArray(vaultList) ? vaultList[0] : null;
      if (!vault?.patient_user_id) {
        toast({ title: "Not found", description: "No patient found with this vault code", variant: "destructive" });
        setSearching(false);
        return;
      }
      const profile = (await api.get<any>("profiles/me").catch(() => null)) as { full_name?: string } | null;
      await api.post("patient_doctor_links", {
        patient_user_id: vault.patient_user_id,
        doctor_user_id: user.id,
        doctor_name: profile?.full_name || "Doctor",
      });
      toast({ title: "Access requested", description: "Waiting for patient approval" });
      setCode("");
      const data = await api.get<LinkEntry[]>("patient_doctor_links", { doctor_id: user.id });
      setLinks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = (err as Error).message || "";
      if (msg.includes("duplicate") || msg.includes("23505")) {
        toast({ title: "Already requested", description: "You've already sent a request to this patient" });
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    } finally {
      setSearching(false);
    }
  };

  const pending = links.filter(l => l.status === "pending");
  const approved = links.filter(l => l.status === "approved");
  const rejected = links.filter(l => l.status === "rejected");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Patient Vault Access</h1>
        <p className="text-muted-foreground text-sm">Enter a patient's vault code to request access to their health records</p>
      </div>

      {/* Code Entry */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-foreground">Enter Vault Code</h2>
            <p className="text-xs text-muted-foreground">Ask your patient for their vault code or scan their QR</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. A3F82K1B"
            maxLength={10}
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground font-mono text-lg tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-primary/50"
            onKeyDown={e => e.key === "Enter" && requestAccess()}
          />
          <button
            onClick={requestAccess}
            disabled={!code.trim() || searching}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {searching ? "Searching..." : "Request Access"}
          </button>
        </div>
      </div>

      {/* Approved Patients */}
      <div className="space-y-3">
        <h2 className="font-heading font-semibold text-foreground">Connected Patients ({approved.length})</h2>
        {approved.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground text-sm">
            No patients connected yet.
          </div>
        ) : (
          approved.map(link => (
            <div key={link.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-whatsapp/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-whatsapp" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">Patient (vault-linked)</p>
                <p className="text-xs text-muted-foreground">Access approved</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" /> Pending ({pending.length})
          </h2>
          {pending.map(link => (
            <div key={link.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">Awaiting patient approval</p>
                <p className="text-xs text-muted-foreground">Requested {new Date(link.requested_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading font-semibold text-muted-foreground">Rejected ({rejected.length})</h2>
          {rejected.map(link => (
            <div key={link.id} className="glass-card rounded-xl p-4 flex items-center gap-3 opacity-50">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <X className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm text-foreground">Access denied</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorVaultAccess;

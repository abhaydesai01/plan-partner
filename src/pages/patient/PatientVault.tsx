import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Shield, Copy, QrCode, Check, X, Clock, UserPlus, RefreshCw } from "lucide-react";

type VaultCode = { id: string; vault_code: string; is_active: boolean };
type DoctorLink = {
  id: string;
  doctor_user_id: string;
  doctor_name: string | null;
  status: string;
  requested_at: string;
};

const PatientVault = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vaultCode, setVaultCode] = useState<VaultCode | null>(null);
  const [links, setLinks] = useState<DoctorLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      const list = await api.get<{ id?: string; _id?: string; vault_code?: string }[]>("patient_vault_codes", { patient_user_id: user.id });
      let vc = Array.isArray(list) ? list[0] : null;
      if (!vc) {
        vc = await api.post<any>("patient_vault_codes", { patient_user_id: user.id });
      }
      setVaultCode(vc ? { ...vc, id: vc.id || vc._id } : null);

      const linkData = await api.get<DoctorLink[]>("patient_doctor_links", { patient_user_id: user.id });
      const sorted = Array.isArray(linkData) ? linkData.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()) : [];
      setLinks(sorted);
    } catch {
      setVaultCode(null);
      setLinks([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const copyCode = () => {
    if (!vaultCode) return;
    navigator.clipboard.writeText(vaultCode.vault_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Code copied!" });
  };

  const regenerateCode = async () => {
    if (!user || !vaultCode?.id) return;
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let newCode = "";
    for (let i = 0; i < 8; i++) newCode += chars[Math.floor(Math.random() * chars.length)];
    try {
      const updated = await api.patch<{ vault_code?: string }>(`patient_vault_codes/${vaultCode.id}`, { vault_code: newCode });
      setVaultCode({ ...vaultCode, vault_code: updated?.vault_code ?? newCode });
      toast({ title: "Code regenerated" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
  };

  const updateLinkStatus = async (linkId: string, status: "approved" | "rejected") => {
    try {
      await api.patch(`patient_doctor_links/${linkId}`, { status, responded_at: new Date().toISOString() });
      toast({ title: status === "approved" ? "Doctor approved" : "Request rejected" });
      fetchData();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const pendingLinks = links.filter(l => l.status === "pending");
  const approvedLinks = links.filter(l => l.status === "approved");
  const rejectedLinks = links.filter(l => l.status === "rejected");

  const qrUrl = vaultCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(vaultCode.vault_code)}`
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Health Vault</h1>
        <p className="text-muted-foreground text-sm">Share your health data securely with doctors</p>
      </div>

      {/* Vault Code Card */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-foreground">Your Vault Code</h2>
            <p className="text-xs text-muted-foreground">Share this code with doctors to give them access</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 bg-muted rounded-xl px-5 py-4 font-mono text-2xl font-bold text-foreground tracking-[0.3em] text-center">
            {vaultCode?.vault_code || "—"}
          </div>
          <button onClick={copyCode} className="p-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors" title="Copy">
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
          <button onClick={() => setShowQR(!showQR)} className="p-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors" title="QR Code">
            <QrCode className="w-5 h-5" />
          </button>
          <button onClick={regenerateCode} className="p-3 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent transition-colors" title="Regenerate">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {showQR && (
          <div className="flex justify-center py-4">
            <div className="bg-white p-4 rounded-xl">
              <img src={qrUrl} alt="Vault QR Code" className="w-48 h-48" />
            </div>
          </div>
        )}
      </div>

      {/* Pending Requests */}
      {pendingLinks.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" /> Pending Requests ({pendingLinks.length})
          </h2>
          {pendingLinks.map(link => (
            <div key={link.id} className="glass-card rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{link.doctor_name || "Doctor"}</p>
                  <p className="text-xs text-muted-foreground">Wants to view your health records</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateLinkStatus(link.id, "approved")} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Approve
                </button>
                <button onClick={() => updateLinkStatus(link.id, "rejected")} className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approved Doctors */}
      <div className="space-y-3">
        <h2 className="font-heading font-semibold text-foreground">Connected Doctors ({approvedLinks.length})</h2>
        {approvedLinks.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground text-sm">
            No doctors connected yet. Share your vault code to get started.
          </div>
        ) : (
          approvedLinks.map(link => (
            <div key={link.id} className="glass-card rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-whatsapp/10 flex items-center justify-center">
                  <Check className="w-5 h-5 text-whatsapp" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{link.doctor_name || "Doctor"}</p>
                  <p className="text-xs text-muted-foreground">Has access to your records</p>
                </div>
              </div>
              <button onClick={() => updateLinkStatus(link.id, "rejected")} className="px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
                Revoke
              </button>
            </div>
          ))
        )}
      </div>

      {/* Rejected */}
      {rejectedLinks.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading font-semibold text-foreground text-muted-foreground">Rejected ({rejectedLinks.length})</h2>
          {rejectedLinks.map(link => (
            <div key={link.id} className="glass-card rounded-xl p-4 flex items-center gap-3 opacity-50">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <X className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm text-foreground">{link.doctor_name || "Doctor"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientVault;

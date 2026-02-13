import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Building2, Users, Send, Copy, X, UserPlus, Crown, Shield, Stethoscope, KeyRound } from "lucide-react";

const ROLE_ICONS: Record<string, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  doctor: Stethoscope,
  nurse: Users,
  staff: Users,
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-accent/10 text-accent",
  admin: "bg-primary/10 text-primary",
  doctor: "bg-primary/10 text-primary",
  nurse: "bg-muted text-muted-foreground",
  staff: "bg-muted text-muted-foreground",
};

const ClinicTeam = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  const clinic = session?.clinic as { id?: string; name?: string } | null;
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showAddByCode, setShowAddByCode] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("doctor");
  const [doctorCode, setDoctorCode] = useState("");
  const [addRole, setAddRole] = useState("doctor");
  const [sending, setSending] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, { full_name?: string }>>({});

  const fetchData = async () => {
    if (!clinic?.id) return;
    try {
      const [membersList, invitesList] = await Promise.all([
        api.get<any[]>("clinic_members", { clinic_id: clinic.id }),
        api.get<any[]>("clinic_invites", { clinic_id: clinic.id }),
      ]);
      const mems = Array.isArray(membersList) ? membersList : [];
      const invs = Array.isArray(invitesList) ? invitesList : [];
      setMembers(mems);
      setInvites(invs);
      const profilesByUser: Record<string, { full_name?: string }> = {};
      await Promise.all(
        mems.map(async (m: any) => {
          try {
            const list = await api.get<any[]>("profiles", { user_id: m.user_id });
            const p = Array.isArray(list) ? list[0] : list;
            if (p?.user_id) profilesByUser[p.user_id] = { full_name: p.full_name };
          } catch { /* ignore */ }
        })
      );
      setMemberProfiles(profilesByUser);
    } catch {
      setMembers([]);
      setInvites([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [clinic?.id]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id || !inviteEmail.trim()) return;
    setSending(true);
    try {
      await api.post("clinic_invites", { clinic_id: clinic.id, email: inviteEmail.trim(), role: inviteRole });
      toast({ title: "Invite created", description: "Share the invite code with them." });
      setShowInvite(false);
      setInviteEmail("");
      setInviteRole("doctor");
      fetchData();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleAddByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id || !doctorCode.trim()) return;
    setSending(true);
    try {
      await api.post(`clinics/${clinic.id}/add-by-doctor-code`, { doctor_code: doctorCode.trim(), role: addRole });
      toast({ title: "Doctor added", description: "The doctor has been added to your clinic." });
      setShowAddByCode(false);
      setDoctorCode("");
      setAddRole("doctor");
      fetchData();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Invite code copied to clipboard." });
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Team</h1>
          <p className="text-muted-foreground text-sm">Manage doctors, nurses and staff</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddByCode(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90"
          >
            <KeyRound className="w-4 h-4" />
            Add by doctor code
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90"
          >
            <UserPlus className="w-4 h-4" />
            Invite by email
          </button>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const RoleIcon = ROLE_ICONS[m.role] || Users;
                const fullName = memberProfiles[m.user_id]?.full_name;
                return (
                  <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{fullName || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_COLORS[m.role] || ""}`}>
                        <RoleIcon className="w-3 h-3" /> {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{m.joined_at ? format(new Date(m.joined_at), "MMM d, yyyy") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {members.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">No team members yet. Invite by email or add by doctor code.</div>
        )}
      </div>

      {invites.filter((i: any) => i.status === "pending").length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading font-semibold text-foreground">Pending invites</h3>
          <div className="space-y-2">
            {invites.filter((i: any) => i.status === "pending").map((inv: any) => (
              <div key={inv.id} className="glass-card rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm text-foreground">{inv.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{inv.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded text-foreground">{inv.invite_code}</code>
                  <button onClick={() => copyCode(inv.invite_code)} className="p-1.5 rounded hover:bg-muted">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-foreground">Invite by email</h2>
              <button onClick={() => setShowInvite(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="doctor@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <button type="submit" disabled={sending} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50">
                <Send className="w-4 h-4" /> {sending ? "Creating…" : "Create invite"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showAddByCode && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setShowAddByCode(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-foreground">Add by doctor code</h2>
              <button onClick={() => setShowAddByCode(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground">Ask the doctor for their doctor code. One doctor can be in multiple clinics.</p>
            <form onSubmit={handleAddByCode} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Doctor code</label>
                <input
                  required
                  type="text"
                  value={doctorCode}
                  onChange={(e) => setDoctorCode(e.target.value.toUpperCase())}
                  placeholder="e.g. DRABC12"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role at this clinic</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <button type="submit" disabled={sending} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50">
                <KeyRound className="w-4 h-4" /> {sending ? "Adding…" : "Add to clinic"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicTeam;

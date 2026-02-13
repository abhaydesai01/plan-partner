import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { Building2, Users, Send, Copy, X, UserPlus, Crown, Shield, Stethoscope, QrCode, ExternalLink, KeyRound } from "lucide-react";

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

const ClinicSettings = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [clinic, setClinic] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("doctor");
  const [sending, setSending] = useState(false);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [doctorCode, setDoctorCode] = useState<string | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, { full_name?: string }>>({});
  const [hasClinicLogin, setHasClinicLogin] = useState<boolean | null>(null);
  const [clinicLoginEmail, setClinicLoginEmail] = useState("");
  const [clinicLoginPassword, setClinicLoginPassword] = useState("");
  const [creatingLogin, setCreatingLogin] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [clinicsList, profileRes] = await Promise.all([
        api.get<any[]>("clinics").catch(() => []),
        api.get<{ doctor_code?: string }[]>("profiles", { user_id: user.id }).catch(() => []),
      ]);
      const profile = Array.isArray(profileRes) ? profileRes[0] : profileRes;
      setDoctorCode((profile as { doctor_code?: string })?.doctor_code ?? null);

      const clinics = Array.isArray(clinicsList) ? clinicsList : [];
      const clinic = clinics[0] ?? null;
      if (!clinic) { setLoading(false); return; }

      const [membersList, invitesList] = await Promise.all([
        api.get<any[]>("clinic_members", { clinic_id: clinic.id }).catch(() => []),
        api.get<any[]>("clinic_invites", { clinic_id: clinic.id }).catch(() => []),
      ]);
      const members = Array.isArray(membersList) ? membersList : [];
      const invites = Array.isArray(invitesList) ? invitesList : [];
      const membership = members.find((m: any) => m.user_id === user.id);
      setMyRole(membership?.role ?? null);
      setClinic(clinic);
      setMembers(members);
      setInvites(invites);
      const profilesByUser: Record<string, { full_name?: string }> = {};
      await Promise.all(
        members.map(async (m: any) => {
          try {
            const list = await api.get<any[]>("profiles", { user_id: m.user_id });
            const p = Array.isArray(list) ? list[0] : list;
            if (p?.user_id) profilesByUser[p.user_id] = { full_name: p.full_name };
          } catch { /* ignore */ }
        })
      );
      setMemberProfiles(profilesByUser);
      if (clinic?.id) {
        try {
          const hasLoginRes = await api.get<{ hasLogin: boolean }>(`clinics/${clinic.id}/has-login`);
          setHasClinicLogin(hasLoginRes.hasLogin);
        } catch {
          setHasClinicLogin(null);
        }
      } else {
        setHasClinicLogin(null);
      }
    } catch {
      setClinic(null);
      setMembers([]);
      setInvites([]);
      setHasClinicLogin(null);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic || !user) return;
    setSending(true);
    try {
      await api.post("clinic_invites", {
        clinic_id: clinic.id,
        email: inviteEmail,
        role: inviteRole,
        invited_by: user.id,
      });
      toast({ title: "Invite created", description: `Invite for ${inviteEmail} created. Share the invite code with them.` });
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

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Invite code copied to clipboard." });
  };

  const handleCreateClinicLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id || !clinicLoginEmail.trim() || !clinicLoginPassword) return;
    setCreatingLogin(true);
    try {
      await api.post(`clinics/${clinic.id}/create-login`, { email: clinicLoginEmail.trim(), password: clinicLoginPassword });
      toast({ title: "Clinic login created", description: "The clinic can now sign in with this email." });
      setClinicLoginEmail("");
      setClinicLoginPassword("");
      setHasClinicLogin(true);
    } catch (err) {
      const msg = (err as Error).message || "Failed to create clinic login";
      toast({ title: "Error", description: msg, variant: "destructive" });
      if (String(msg).toLowerCase().includes("already has a login")) setHasClinicLogin(true);
    } finally {
      setCreatingLogin(false);
    }
  };

  const isAdmin = myRole === "owner" || myRole === "admin";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  if (!clinic) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-heading font-bold text-foreground mb-2">No Clinic Found</h2>
        <p className="text-muted-foreground">You haven't set up or joined a clinic yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Clinic Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your clinic and team</p>
      </div>

      {/* Clinic Info */}
      <div className="glass-card rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-foreground">{clinic.name}</h2>
            {clinic.address && <p className="text-sm text-muted-foreground">{clinic.address}</p>}
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 pt-2">
          {clinic.phone && (
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium text-foreground">{clinic.phone}</p>
            </div>
          )}
          {clinic.email && (
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium text-foreground">{clinic.email}</p>
            </div>
          )}
          {clinic.specialties?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Specialties</p>
              <div className="flex flex-wrap gap-1">
                {clinic.specialties.map((s: string) => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clinic login (separate credentials for clinic) */}
      {isAdmin && hasClinicLogin === false && (
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">Clinic login</h3>
              <p className="text-xs text-muted-foreground">Create separate credentials so the clinic can sign in as &quot;Clinic&quot; (e.g. for front desk).</p>
            </div>
          </div>
          <form onSubmit={handleCreateClinicLogin} className="space-y-3 max-w-sm">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email for clinic login</label>
              <input
                type="email"
                required
                value={clinicLoginEmail}
                onChange={(e) => setClinicLoginEmail(e.target.value)}
                placeholder="clinic@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Password</label>
              <input
                type="password"
                required
                value={clinicLoginPassword}
                onChange={(e) => setClinicLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              type="submit"
              disabled={creatingLogin}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              {creatingLogin ? "Creating…" : "Create clinic login"}
            </button>
          </form>
        </div>
      )}
      {isAdmin && hasClinicLogin === true && (
        <div className="glass-card rounded-xl p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground">Clinic login</h3>
            <p className="text-xs text-muted-foreground">This clinic already has separate login credentials. As clinic owner/admin you can switch to the clinic portal from the sidebar (Switch to clinic). The clinic can also sign in with email and password on the auth page as a backup.</p>
          </div>
        </div>
      )}

      {/* Patient Enrollment Link */}
      {doctorCode && (
        <div className="glass-card rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-whatsapp/10 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-whatsapp" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">Patient Enrollment Link</h3>
              <p className="text-xs text-muted-foreground">Share this link or QR code so patients can self-enroll</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 rounded-lg bg-muted text-sm text-foreground font-mono truncate">
              {window.location.origin}/enroll/{doctorCode}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/enroll/${doctorCode}`);
                toast({ title: "Copied!", description: "Enrollment link copied to clipboard." });
              }}
              className="p-2.5 rounded-lg border border-border hover:bg-muted transition-colors shrink-0"
            >
              <Copy className="w-4 h-4 text-muted-foreground" />
            </button>
            <a
              href={`/enroll/${doctorCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-lg border border-border hover:bg-muted transition-colors shrink-0"
            >
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <strong>How it works:</strong> Patients visit this link, give consent, fill their health profile, optionally select a care program, and get enrolled automatically. You'll receive a notification when a new patient enrolls.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/enroll/${doctorCode}`)}`}
              alt="Enrollment QR Code"
              className="w-32 h-32 rounded-lg border border-border"
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Print this QR code on:</p>
              <ul className="list-disc list-inside">
                <li>Clinic visiting cards</li>
                <li>Reception desk standees</li>
                <li>Patient discharge sheets</li>
                <li>Promotional materials</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-foreground">Team ({members.length})</h3>
          {isAdmin && (
            <button onClick={() => setShowInvite(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
              <UserPlus className="w-4 h-4" /> Invite Member
            </button>
          )}
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
                {members.map(m => {
                  const RoleIcon = ROLE_ICONS[m.role] || Users;
                  const fullName = memberProfiles[m.user_id]?.full_name;
                  return (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{fullName || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_COLORS[m.role] || ""}`}>
                          <RoleIcon className="w-3 h-3" /> {m.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{format(new Date(m.joined_at), "MMM d, yyyy")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pending Invites */}
      {invites.filter(i => i.status === "pending").length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading font-semibold text-foreground">Pending Invites</h3>
          <div className="space-y-2">
            {invites.filter(i => i.status === "pending").map(inv => (
              <div key={inv.id} className="glass-card rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm text-foreground">{inv.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{inv.role} • {format(new Date(inv.created_at), "MMM d, yyyy")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded text-foreground">{inv.invite_code}</code>
                  <button onClick={() => copyCode(inv.invite_code)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-foreground">Invite Team Member</h2>
              <button onClick={() => setShowInvite(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="doctor@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">An invite code will be generated. Share it with the person so they can join your clinic.</p>
              <button
                type="submit"
                disabled={sending}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Send className="w-4 h-4" />
                {sending ? "Creating..." : "Create Invite"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicSettings;

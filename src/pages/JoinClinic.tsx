import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowRight } from "lucide-react";

const JoinClinic = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [clinicName, setClinicName] = useState("");

  const handleLookup = async () => {
    if (!code.trim()) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("clinic_invites")
      .select("*, clinics(name)")
      .eq("invite_code", code.trim().toUpperCase())
      .eq("status", "pending")
      .maybeSingle();

    if (error || !data) {
      toast({ title: "Invalid code", description: "No pending invite found with that code.", variant: "destructive" });
      setLoading(false);
      return;
    }

    setInvite(data);
    setClinicName((data.clinics as any)?.name || "Unknown Clinic");
    setLoading(false);
  };

  const handleAccept = async () => {
    if (!invite || !user) return;
    setLoading(true);

    // Add as member
    const { error: memberError } = await supabase
      .from("clinic_members")
      .insert({
        clinic_id: invite.clinic_id,
        user_id: user.id,
        role: invite.role,
      });

    if (memberError) {
      toast({ title: "Error", description: memberError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Mark invite as accepted
    await supabase
      .from("clinic_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    toast({ title: "Joined clinic!", description: `Welcome to ${clinicName}.` });
    navigate("/dashboard");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Join a Clinic</h1>
          <p className="text-muted-foreground text-sm">Enter the invite code shared by your clinic admin</p>
        </div>

        {!invite ? (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Invite Code</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. A1B2C3D4"
                maxLength={8}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-center text-lg font-heading tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={handleLookup}
              disabled={loading || !code.trim()}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Looking up..." : "Find Clinic"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-heading font-bold text-foreground text-lg">{clinicName}</h2>
              <p className="text-sm text-muted-foreground">You've been invited as <span className="font-medium capitalize text-foreground">{invite.role}</span></p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setInvite(null)} className="flex-1 py-3 rounded-lg bg-muted text-muted-foreground font-semibold hover:bg-muted/80 transition-colors">Cancel</button>
              <button
                onClick={handleAccept}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? "Joining..." : "Join Clinic"}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Don't have a code?{" "}
          <button onClick={() => navigate("/clinic-setup")} className="text-primary font-medium hover:underline">
            Create your own clinic
          </button>
        </p>
      </div>
    </div>
  );
};

export default JoinClinic;

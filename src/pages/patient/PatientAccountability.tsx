import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Eye, Users, MessageSquare, Plus, Trash2, Loader2 } from "lucide-react";

type FamilyConn = { id: string; relationship: string; invite_email: string | null; status: string; family_user_id: string | null };
type DoctorMsg = { id: string; message: string; created_at: string; doctor_name?: string };

export default function PatientAccountability() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRelationship, setInviteRelationship] = useState<"son" | "daughter" | "spouse" | "other">("other");
  const [adding, setAdding] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["me", "accountability"],
    queryFn: () =>
      api.get<{
        doctor_can_see_logs: boolean;
        doctor_name: string | null;
        family_connections: FamilyConn[];
        doctor_messages: DoctorMsg[];
      }>("me/accountability"),
  });

  const doctor_can_see_logs = data?.doctor_can_see_logs ?? false;
  const doctor_name = data?.doctor_name ?? null;
  const family_connections = data?.family_connections ?? [];
  const doctor_messages = data?.doctor_messages ?? [];

  const handleAddFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      toast({ title: "Enter email", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      await api.post("me/family-connections", { invite_email: email, relationship: inviteRelationship });
      toast({ title: "Invitation added", description: "When they sign up with this email as Family, they'll see your daily log status." });
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["me", "accountability"] });
    } catch (err: unknown) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Could not add", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFamily = async (id: string) => {
    try {
      await api.delete(`me/family-connections/${id}`);
      queryClient.invalidateQueries({ queryKey: ["me", "accountability"] });
      toast({ title: "Removed" });
    } catch {
      toast({ title: "Could not remove", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-heading font-semibold text-foreground">Accountability & visibility</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Who can see your health activity</p>
      </div>

      {/* Feature 1: Doctor visibility */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-foreground">Your doctor can see your health logs</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {doctor_can_see_logs
                ? doctor_name
                  ? `${doctor_name} can see your vitals, food logs, and medication. Even passive monitoring increases compliance.`
                  : "Your care team can see your vitals, food logs, and medication."
                : "Connect to a doctor from Connect to doctor to share your logs with them."}
            </p>
          </div>
        </div>
      </section>

      {/* Feature 3: Doctor messages */}
      {doctor_messages.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            Messages from your doctor
          </h2>
          <ul className="space-y-3">
            {doctor_messages.slice(0, 5).map((msg) => (
              <li key={msg.id} className="rounded-xl bg-muted/50 border border-border/50 px-4 py-3">
                {msg.doctor_name && (
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">{msg.doctor_name} requested</p>
                )}
                <p className="text-sm text-foreground">{msg.message}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Feature 2: Family visibility */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-primary" />
          Family visibility
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Add family members by email. Once they sign up as &quot;Family&quot;, they can see whether you logged BP, Food, Sugar, and Medication today.
        </p>

        <form onSubmit={handleAddFamily} className="flex flex-wrap gap-2 mb-4">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="family@example.com"
            className="flex-1 min-w-[180px] px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <select
            value={inviteRelationship}
            onChange={(e) => setInviteRelationship(e.target.value as typeof inviteRelationship)}
            className="px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="son">Son</option>
            <option value="daughter">Daughter</option>
            <option value="spouse">Spouse</option>
            <option value="other">Other</option>
          </select>
          <button
            type="submit"
            disabled={adding}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </form>

        {family_connections.length > 0 ? (
          <ul className="space-y-2">
            {family_connections.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-2.5"
              >
                <span className="text-sm text-foreground capitalize">{c.relationship}</span>
                <span className="text-sm text-muted-foreground">{c.invite_email || "—"}</span>
                <span className="text-xs font-medium text-muted-foreground">{c.status}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFamily(c.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No family members added yet.</p>
        )}
      </section>
    </div>
  );
}

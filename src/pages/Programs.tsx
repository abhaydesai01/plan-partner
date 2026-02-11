import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Plus, X, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Program {
  id: string;
  name: string;
  type: string;
  duration_days: number;
  description: string;
  is_active: boolean;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  ncd: "NCD Management",
  post_discharge: "Post-Discharge",
  elder_care: "Elder Care",
  corporate_wellness: "Corporate Wellness",
  custom: "Custom",
};

const typeColors: Record<string, string> = {
  ncd: "bg-primary/10 text-primary",
  post_discharge: "bg-accent/10 text-accent",
  elder_care: "bg-whatsapp/10 text-whatsapp",
  corporate_wellness: "bg-muted text-muted-foreground",
  custom: "bg-muted text-muted-foreground",
};

const Programs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "ncd", duration_days: "90", description: "" });
  const [saving, setSaving] = useState(false);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});

  const fetchPrograms = async () => {
    if (!user) return;
    try {
      const [data, enrolls] = await Promise.all([
        api.get<Program[]>("programs"),
        api.get<{ program_id: string }[]>("enrollments"),
      ]);
      setPrograms(data || []);
      const counts: Record<string, number> = {};
      (enrolls || []).filter((e: { program_id: string; status?: string }) => e.status === "active").forEach((e) => {
        counts[e.program_id] = (counts[e.program_id] || 0) + 1;
      });
      setEnrollmentCounts(counts);
    } catch {
      setPrograms([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPrograms(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await api.post("programs", {
        name: form.name,
        type: form.type,
        duration_days: parseInt(form.duration_days),
        description: form.description,
      });
      toast({ title: "Program created" });
      setShowForm(false);
      setForm({ name: "", type: "ncd", duration_days: "90", description: "" });
      fetchPrograms();
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Programs</h1>
          <p className="text-muted-foreground text-sm">{programs.length} care programs</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Create Program
        </button>
      </div>

      {/* Create Program Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-foreground">Create Program</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <input required placeholder="Program Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="ncd">NCD Management</option>
                <option value="post_discharge">Post-Discharge Care</option>
                <option value="elder_care">Elder Care</option>
                <option value="corporate_wellness">Corporate Wellness</option>
                <option value="custom">Custom</option>
              </select>
              <input required placeholder="Duration (days)" type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              <button type="submit" disabled={saving} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50">
                {saving ? "Creating..." : "Create Program"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Program Cards */}
      {programs.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
          No programs yet. Create your first care program to start enrolling patients.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((p) => (
            <div key={p.id} className="glass-card rounded-xl p-5 space-y-3 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeColors[p.type] || ""}`}>
                  {typeLabels[p.type] || p.type}
                </span>
              </div>
              <div>
                <h3 className="font-heading font-bold text-foreground">{p.name}</h3>
                {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border/50">
                <span>{p.duration_days} days</span>
                <span>{enrollmentCounts[p.id] || 0} enrolled</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Programs;

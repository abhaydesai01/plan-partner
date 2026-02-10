import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Patient {
  id: string;
  full_name: string;
  phone: string;
  age: number | null;
  gender: string | null;
  conditions: string[];
  status: string;
  last_check_in: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  active: "bg-whatsapp/10 text-whatsapp",
  inactive: "bg-muted text-muted-foreground",
  at_risk: "bg-destructive/10 text-destructive",
};

const Patients = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", age: "", gender: "male", conditions: "" });
  const [saving, setSaving] = useState(false);

  const fetchPatients = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setPatients(data as Patient[]);
    setLoading(false);
  };

  useEffect(() => { fetchPatients(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("patients").insert({
      doctor_id: user.id,
      full_name: form.full_name,
      phone: form.phone,
      age: form.age ? parseInt(form.age) : null,
      gender: form.gender,
      conditions: form.conditions ? form.conditions.split(",").map((c) => c.trim()) : [],
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Patient added" });
      setShowForm(false);
      setForm({ full_name: "", phone: "", age: "", gender: "male", conditions: "" });
      fetchPatients();
    }
    setSaving(false);
  };

  const filtered = patients.filter((p) => p.full_name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Patients</h1>
          <p className="text-muted-foreground text-sm">{patients.length} total patients</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add Patient
        </button>
      </div>

      {/* Add Patient Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-foreground">Add Patient</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <input required placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <input required placeholder="Phone (+91...)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <input placeholder="Conditions (comma-separated)" value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <button type="submit" disabled={saving} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50">
                {saving ? "Adding..." : "Add Patient"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
          {patients.length === 0 ? "No patients yet. Add your first patient to get started." : "No patients match your search."}
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Age</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Conditions</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{p.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{p.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.age ?? "—"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {p.conditions?.map((c) => (
                          <span key={c} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{c}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[p.status] || ""}`}>
                        {p.status.replace("_", " ")}
                      </span>
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

export default Patients;

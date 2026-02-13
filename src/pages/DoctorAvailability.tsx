import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Clock, Plus, X, Trash2, Building2 } from "lucide-react";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface AvailabilityRow {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
  clinic_id?: string | null;
}

interface Clinic {
  id: string;
  name: string;
}

const DoctorAvailability = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState<AvailabilityRow[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    day_of_week: 1,
    start_time: "09:00",
    end_time: "17:00",
    slot_duration_minutes: 15,
    clinic_id: "" as string,
  });

  const fetchList = async () => {
    if (!user) return;
    try {
      const data = await api.get<AvailabilityRow[]>("doctor_availability");
      setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    }
    setLoading(false);
  };

  const fetchClinics = async () => {
    try {
      const data = await api.get<Clinic[]>("clinics");
      setClinics(Array.isArray(data) ? data : []);
    } catch {
      setClinics([]);
    }
  };

  useEffect(() => {
    fetchList();
  }, [user]);

  useEffect(() => {
    if (user && showForm) fetchClinics();
  }, [user, showForm]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("doctor_availability", {
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        slot_duration_minutes: form.slot_duration_minutes,
        is_active: true,
        ...(form.clinic_id ? { clinic_id: form.clinic_id } : {}),
      });
      toast({ title: "Availability added" });
      setShowForm(false);
      setForm({ day_of_week: 1, start_time: "09:00", end_time: "17:00", slot_duration_minutes: 15, clinic_id: "" });
      fetchList();
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`doctor_availability/${id}`);
      toast({ title: "Removed" });
      fetchList();
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const clinicName = (clinicId: string | null | undefined) => {
    if (!clinicId) return null;
    return clinics.find((c) => c.id === clinicId)?.name ?? clinicId;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const byDay = DAYS.map((d) => ({ ...d, slots: list.filter((s) => s.day_of_week === d.value && s.is_active) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Availability</h1>
          <p className="text-muted-foreground text-sm">Set when you’re available so patients can book slots. Only free slots are shown to them.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add slot
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        Availability is by <strong>day of the week</strong> (repeating weekly). You can add <strong>multiple slots per day</strong> (e.g. morning 9–12 and afternoon 2–5) and set different hours <strong>per clinic</strong> if you work at more than one.
      </p>

      {showForm && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-foreground">Add availability</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Day of week</label>
                <select
                  value={form.day_of_week}
                  onChange={e => setForm({ ...form, day_of_week: parseInt(e.target.value, 10) })}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">This repeats every week (no specific dates).</p>
              </div>
              {clinics.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Clinic (optional)</label>
                  <select
                    value={form.clinic_id}
                    onChange={e => setForm({ ...form, clinic_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All locations / no specific clinic</option>
                    {clinics.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Set different slots per clinic if you work at multiple.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">From</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={e => setForm({ ...form, start_time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">To</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={e => setForm({ ...form, end_time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Slot length (minutes)</label>
                <select
                  value={form.slot_duration_minutes}
                  onChange={e => setForm({ ...form, slot_duration_minutes: parseInt(e.target.value, 10) })}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">Patients will see bookable slots of this length within this window.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-border font-medium text-sm hover:bg-muted/50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50">
                  {saving ? "Adding…" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="font-heading font-semibold text-foreground">Weekly schedule</h2>
          <p className="text-xs text-muted-foreground mt-1">Patients see only free slots (booked appointments are hidden). Add multiple blocks per day or per clinic as needed.</p>
        </div>
        <div className="divide-y divide-border">
          {byDay.map((d) => (
            <div key={d.value} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-28 font-medium text-foreground shrink-0">{d.label}</div>
              <div className="flex flex-wrap gap-2 flex-1">
                {d.slots.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No availability</span>
                ) : (
                  d.slots.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm flex-wrap"
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      {s.start_time} – {s.end_time}
                      {s.slot_duration_minutes !== 15 && ` (${s.slot_duration_minutes} min slots)`}
                      {s.clinic_id && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Building2 className="w-3 h-3" />
                          {clinicName(s.clinic_id)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        className="p-0.5 rounded hover:bg-primary/20 text-primary shrink-0"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DoctorAvailability;

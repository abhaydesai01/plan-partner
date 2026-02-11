import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Clock, Plus, Trash2, Save, MapPin, Filter } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TYPES = [
  { value: "in_person", label: "In-Person" },
  { value: "teleconsult", label: "Teleconsult" },
  { value: "walk_in", label: "Walk-in" },
];

interface Clinic {
  id: string;
  name: string;
}

interface Slot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  appointment_types: string[];
  is_active: boolean;
  max_patients: number;
  clinic_id: string | null;
  isNew?: boolean;
}

const DoctorAvailability = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterClinic, setFilterClinic] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [slotsRes, clinicsRes] = await Promise.all([
        supabase
          .from("doctor_availability")
          .select("*")
          .eq("doctor_id", user.id)
          .order("day_of_week")
          .order("start_time"),
        supabase
          .from("clinics")
          .select("id, name"),
      ]);
      setSlots((slotsRes.data as any[]) || []);
      setClinics((clinicsRes.data as Clinic[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const addSlot = () => {
    setSlots([...slots, {
      day_of_week: 1,
      start_time: "09:00",
      end_time: "17:00",
      slot_duration_minutes: 30,
      appointment_types: ["in_person"],
      clinic_id: clinics.length > 0 ? clinics[0].id : null,
      is_active: true,
      max_patients: 20,
      isNew: true,
    }]);
  };

  const updateSlot = (index: number, field: string, value: any) => {
    const updated = [...slots];
    (updated[index] as any)[field] = value;
    setSlots(updated);
  };

  const toggleType = (index: number, type: string) => {
    const updated = [...slots];
    const types = updated[index].appointment_types;
    if (types.includes(type)) {
      updated[index].appointment_types = types.filter(t => t !== type);
    } else {
      updated[index].appointment_types = [...types, type];
    }
    setSlots(updated);
  };

  const removeSlot = async (index: number) => {
    const slot = slots[index];
    if (slot.id) {
      await supabase.from("doctor_availability").delete().eq("id", slot.id);
    }
    setSlots(slots.filter((_, i) => i !== index));
    toast({ title: "Removed", description: "Slot removed." });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    for (const slot of slots) {
      const payload = {
        doctor_id: user.id,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        slot_duration_minutes: slot.slot_duration_minutes,
        appointment_types: slot.appointment_types,
        is_active: slot.is_active,
        max_patients: slot.max_patients,
        clinic_id: slot.clinic_id || null,
      };

      if (slot.id) {
        await supabase.from("doctor_availability").update(payload as any).eq("id", slot.id);
      } else {
        await supabase.from("doctor_availability").insert(payload as any);
      }
    }

    // Refetch
    const { data } = await supabase
      .from("doctor_availability")
      .select("*")
      .eq("doctor_id", user.id)
      .order("day_of_week")
      .order("start_time");
    setSlots((data as any[]) || []);
    toast({ title: "Saved! ✅", description: "Your availability has been updated." });
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Availability</h1>
          <p className="text-muted-foreground text-sm">Set your weekly schedule for patient bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addSlot} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <Plus className="w-4 h-4" /> Add Slot
          </button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {clinics.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterClinic("all")}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                filterClinic === "all"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              All Locations
            </button>
            <button
              onClick={() => setFilterClinic("none")}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                filterClinic === "none"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              No Clinic
            </button>
            {clinics.map(c => (
              <button
                key={c.id}
                onClick={() => setFilterClinic(c.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  filterClinic === c.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(() => {
        const filtered = filterClinic === "all"
          ? slots
          : filterClinic === "none"
            ? slots.filter(s => !s.clinic_id)
            : slots.filter(s => s.clinic_id === filterClinic);

        return filtered.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground mb-4">
              {slots.length === 0
                ? "No availability slots set up yet. Patients won't be able to book."
                : "No slots match the selected filter."}
            </p>
            {slots.length === 0 && (
              <button onClick={addSlot} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
                Add Your First Slot
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((slot) => {
              const i = slots.indexOf(slot);
              return (<div key={slot.id || `new-${i}`} className={`glass-card rounded-xl p-4 space-y-3 ${!slot.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={slot.day_of_week}
                    onChange={e => updateSlot(i, "day_of_week", parseInt(e.target.value))}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {DAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
                  </select>
                  {clinics.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <select
                        value={slot.clinic_id || ""}
                        onChange={e => updateSlot(i, "clinic_id", e.target.value || null)}
                        className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="">No Clinic</option>
                        {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slot.is_active}
                      onChange={e => updateSlot(i, "is_active", e.target.checked)}
                      className="rounded border-border"
                    />
                    Active
                  </label>
                </div>
                <button onClick={() => removeSlot(i)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Start</label>
                  <input
                    type="time"
                    value={slot.start_time}
                    onChange={e => updateSlot(i, "start_time", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">End</label>
                  <input
                    type="time"
                    value={slot.end_time}
                    onChange={e => updateSlot(i, "end_time", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Slot Duration</label>
                  <select
                    value={slot.slot_duration_minutes}
                    onChange={e => updateSlot(i, "slot_duration_minutes", parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value={15}>15 min</option>
                    <option value={20}>20 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Max Patients</label>
                  <input
                    type="number"
                    value={slot.max_patients}
                    onChange={e => updateSlot(i, "max_patients", parseInt(e.target.value) || 20)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Appointment Types</label>
                <div className="flex gap-2">
                  {TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => toggleType(i, type.value)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        slot.appointment_types.includes(type.value)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            );
          })}
          </div>
        );
      })()}
    </div>
  );
};

export default DoctorAvailability;

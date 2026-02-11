import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, X, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { AppointmentCompletionModal } from "@/components/AppointmentCompletionModal";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  patient_id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  patient_name?: string;
}

interface Patient {
  id: string;
  full_name: string;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-whatsapp/10 text-whatsapp border-whatsapp/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  no_show: "bg-muted text-muted-foreground border-border",
};

const Appointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: "", title: "", date: "", time: "10:00", duration_minutes: "30", notes: "" });
  const [saving, setSaving] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState<Appointment | null>(null);

  const fetchData = async () => {
    if (!user) return;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const [apptRes, patientRes] = await Promise.all([
      supabase.from("appointments").select("*").eq("doctor_id", user.id)
        .gte("scheduled_at", monthStart.toISOString())
        .lte("scheduled_at", monthEnd.toISOString())
        .order("scheduled_at"),
      supabase.from("patients").select("id, full_name").eq("doctor_id", user.id).order("full_name"),
    ]);

    const patientMap: Record<string, string> = {};
    if (patientRes.data) {
      setPatients(patientRes.data);
      patientRes.data.forEach((p) => { patientMap[p.id] = p.full_name; });
    }
    if (apptRes.data) {
      setAppointments(apptRes.data.map((a) => ({ ...a, patient_name: patientMap[a.patient_id] || "Unknown" })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, currentMonth]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const scheduledAt = new Date(`${form.date}T${form.time}`).toISOString();
    const { error } = await supabase.from("appointments").insert({
      doctor_id: user.id,
      patient_id: form.patient_id,
      title: form.title,
      scheduled_at: scheduledAt,
      duration_minutes: parseInt(form.duration_minutes),
      notes: form.notes || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Appointment scheduled" });
      setShowForm(false);
      setForm({ patient_id: "", title: "", date: "", time: "10:00", duration_minutes: "30", notes: "" });
      fetchData();
    }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string, appointment?: Appointment) => {
    // If completing, show the completion modal
    if (status === "completed" && appointment) {
      setCompletingAppointment(appointment);
      return;
    }
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const getAppointmentsForDay = (day: Date) =>
    appointments.filter((a) => isSameDay(new Date(a.scheduled_at), day));

  const selectedDayAppointments = appointments
    .filter((a) => isSameDay(new Date(a.scheduled_at), selectedDate))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground text-sm">{appointments.length} this month</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setForm({ ...form, date: format(selectedDate, "yyyy-MM-dd") }); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Schedule Appointment
        </button>
      </div>

      {/* Schedule Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-foreground">Schedule Appointment</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            {patients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add a patient first before scheduling appointments.</p>
            ) : (
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Patient</label>
                  <select required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">Select patient...</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
                <input required placeholder="Appointment Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Date</label>
                    <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Time</label>
                    <input required type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Duration (minutes)</label>
                  <select value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                  </select>
                </div>
                <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                <button type="submit" disabled={saving} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50">
                  {saving ? "Scheduling..." : "Schedule Appointment"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Calendar + Day Detail */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-heading font-bold text-foreground">{format(currentMonth, "MMMM yyyy")}</h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {calDays.map((day) => {
              const dayAppts = getAppointmentsForDay(day);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative min-h-[72px] p-1.5 rounded-lg text-left transition-colors border",
                    isSelected ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50",
                    !isCurrentMonth && "opacity-30"
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium",
                    isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : "text-foreground"
                  )}>
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayAppts.slice(0, 2).map((a) => (
                      <div key={a.id} className={cn("text-[10px] px-1 py-0.5 rounded truncate border", statusColors[a.status] || "")}>
                        {format(new Date(a.scheduled_at), "HH:mm")} {a.title}
                      </div>
                    ))}
                    {dayAppts.length > 2 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{dayAppts.length - 2} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="glass-card rounded-xl p-4 space-y-4">
          <h3 className="font-heading font-bold text-foreground">{format(selectedDate, "EEEE, MMM d")}</h3>
          {selectedDayAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments on this day.</p>
          ) : (
            <div className="space-y-3">
              {selectedDayAppointments.map((a) => (
                <div key={a.id} className={cn("rounded-lg border p-3 space-y-2", statusColors[a.status] || "")}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{a.title}</p>
                      <p className="text-xs opacity-80">{a.patient_name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs opacity-80">
                      <Clock className="w-3 h-3" />
                      {format(new Date(a.scheduled_at), "HH:mm")}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs opacity-70">{a.duration_minutes} min</span>
                      <select
                        value={a.status}
                        onChange={(e) => updateStatus(a.id, e.target.value, a)}
                        className="text-xs px-2 py-1 rounded border border-current/20 bg-transparent"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                      </select>
                    </div>
                    {a.notes && <p className="text-xs opacity-70">{a.notes}</p>}
                  </div>
                ))}
            </div>
          )}
          <button
            onClick={() => { setShowForm(true); setForm({ ...form, date: format(selectedDate, "yyyy-MM-dd") }); }}
            className="w-full py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            + Add to this day
          </button>
        </div>
      </div>

      {/* Completion Modal */}
      {completingAppointment && user && (
        <AppointmentCompletionModal
          appointment={completingAppointment}
          userId={user.id}
          onClose={() => setCompletingAppointment(null)}
          onCompleted={() => {
            setCompletingAppointment(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default Appointments;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, isSameDay, startOfDay } from "date-fns";
import {
  CalendarDays, Plus, Video, MapPin, Users, Clock, Check, ChevronRight,
  X, RefreshCw, QrCode, ArrowRight, Stethoscope, Building2, Phone
} from "lucide-react";

const typeIcons: Record<string, typeof MapPin> = { in_person: MapPin, teleconsult: Video, walk_in: Users };
const typeLabels: Record<string, string> = { in_person: "In-Person", teleconsult: "Teleconsult", walk_in: "Walk-in" };
const statusColors: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-whatsapp/10 text-whatsapp",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-muted text-muted-foreground",
};

interface LinkedDoctor {
  doctor_user_id: string;
  doctor_name: string | null;
  specialties: string[];
  clinic_name: string | null;
}

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  appointment_types: string[];
  clinic_id: string | null;
}

interface TimeSlot {
  time: string;
  display: string;
}

type BookingStep = "list" | "select-doctor" | "select-date" | "select-slot" | "confirm" | "done";

const PatientAppointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientData, setPatientData] = useState<any>(null);

  // Booking state
  const [step, setStep] = useState<BookingStep>("list");
  const [doctors, setDoctors] = useState<LinkedDoctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<LinkedDoctor | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("in_person");
  const [bookingTitle, setBookingTitle] = useState("Consultation");
  const [bookingNotes, setBookingNotes] = useState("");
  const [booking, setBooking] = useState(false);

  // Checkin state
  const [checkins, setCheckins] = useState<any[]>([]);

  const fetchAppointments = async () => {
    if (!user) return;
    const { data: patient } = await supabase.from("patients").select("*").eq("patient_user_id", user.id).limit(1).maybeSingle();
    if (!patient) { setLoading(false); return; }
    setPatientId(patient.id);
    setPatientData(patient);

    const [apptRes, checkinRes] = await Promise.all([
      supabase.from("appointments").select("*").eq("patient_id", patient.id).order("scheduled_at", { ascending: false }),
      supabase.from("appointment_checkins").select("*").eq("patient_id", patient.id).order("checked_in_at", { ascending: false }).limit(5),
    ]);
    setAppointments(apptRes.data || []);
    setCheckins(checkinRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, [user]);

  // Realtime checkin updates
  useEffect(() => {
    if (!patientId) return;
    const channel = supabase
      .channel("checkin-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointment_checkins" }, (payload) => {
        fetchAppointments();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [patientId]);

  const fetchDoctors = async () => {
    if (!user) return;
    // Get doctors via patient records (primary doctor)
    const { data: patients } = await supabase
      .from("patients")
      .select("doctor_id")
      .eq("patient_user_id", user.id);

    // Get doctors via approved links
    const { data: links } = await supabase
      .from("patient_doctor_links")
      .select("doctor_user_id, doctor_name")
      .eq("patient_user_id", user.id)
      .eq("status", "approved");

    const doctorIds = new Set<string>();
    const doctorList: LinkedDoctor[] = [];

    // Add primary doctors
    for (const p of patients || []) {
      if (!doctorIds.has(p.doctor_id)) {
        doctorIds.add(p.doctor_id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, specialties")
          .eq("user_id", p.doctor_id)
          .maybeSingle();
        const { data: membership } = await supabase
          .from("clinic_members")
          .select("clinics(name)")
          .eq("user_id", p.doctor_id)
          .limit(1)
          .maybeSingle();
        doctorList.push({
          doctor_user_id: p.doctor_id,
          doctor_name: profile?.full_name || null,
          specialties: profile?.specialties || [],
          clinic_name: (membership?.clinics as any)?.name || null,
        });
      }
    }

    // Add linked doctors
    for (const l of links || []) {
      if (!doctorIds.has(l.doctor_user_id)) {
        doctorIds.add(l.doctor_user_id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, specialties")
          .eq("user_id", l.doctor_user_id)
          .maybeSingle();
        const { data: membership } = await supabase
          .from("clinic_members")
          .select("clinics(name)")
          .eq("user_id", l.doctor_user_id)
          .limit(1)
          .maybeSingle();
        doctorList.push({
          doctor_user_id: l.doctor_user_id,
          doctor_name: profile?.full_name || l.doctor_name,
          specialties: profile?.specialties || [],
          clinic_name: (membership?.clinics as any)?.name || null,
        });
      }
    }

    setDoctors(doctorList);
  };

  const fetchAvailability = async (doctorId: string) => {
    const { data } = await supabase
      .from("doctor_availability")
      .select("*")
      .eq("doctor_id", doctorId)
      .eq("is_active", true);
    setAvailability((data as any[]) || []);
  };

  const startBooking = async () => {
    setStep("select-doctor");
    await fetchDoctors();
  };

  const selectDoctor = async (doc: LinkedDoctor) => {
    setSelectedDoctor(doc);
    await fetchAvailability(doc.doctor_user_id);
    setStep("select-date");
  };

  const getAvailableSlots = (date: Date): TimeSlot[] => {
    const dayOfWeek = date.getDay();
    const daySlots = availability.filter(a => a.day_of_week === dayOfWeek);
    const slots: TimeSlot[] = [];

    for (const avail of daySlots) {
      if (!avail.appointment_types.includes(selectedType)) continue;
      const [startH, startM] = avail.start_time.split(":").map(Number);
      const [endH, endM] = avail.end_time.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      for (let m = startMinutes; m + avail.slot_duration_minutes <= endMinutes; m += avail.slot_duration_minutes) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const time = `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
        const display = format(new Date(2000, 0, 1, h, min), "h:mm a");
        slots.push({ time, display });
      }
    }

    // Filter out already booked slots
    const dateStr = format(date, "yyyy-MM-dd");
    const bookedTimes = appointments
      .filter(a => a.status === "scheduled" && format(new Date(a.scheduled_at), "yyyy-MM-dd") === dateStr)
      .map(a => format(new Date(a.scheduled_at), "HH:mm"));

    return slots.filter(s => !bookedTimes.includes(s.time));
  };

  const handleBook = async () => {
    if (!selectedDoctor || !selectedTime || !patientId) return;
    setBooking(true);

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const scheduledAt = new Date(`${dateStr}T${selectedTime}:00`);

    const { error } = await supabase.from("appointments").insert({
      patient_id: patientId,
      doctor_id: selectedDoctor.doctor_user_id,
      title: bookingTitle,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: 30,
      appointment_type: selectedType,
      notes: bookingNotes || null,
      status: "scheduled",
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Booked! ✅", description: `Appointment with ${selectedDoctor.doctor_name} on ${format(scheduledAt, "MMM d 'at' h:mm a")}` });
      setStep("done");
      fetchAppointments();
    }
    setBooking(false);
  };

  const handleCheckin = async (appointment: any) => {
    if (!patientId) return;
    // Get current queue count for this doctor today
    const today = startOfDay(new Date()).toISOString();
    const { count } = await supabase
      .from("appointment_checkins")
      .select("*", { count: "exact", head: true })
      .eq("doctor_id", appointment.doctor_id)
      .gte("checked_in_at", today);

    const queueNumber = (count || 0) + 1;

    const { error } = await supabase.from("appointment_checkins").insert({
      appointment_id: appointment.id,
      patient_id: patientId,
      doctor_id: appointment.doctor_id,
      clinic_id: appointment.clinic_id,
      queue_number: queueNumber,
      estimated_wait_minutes: queueNumber * 15,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Checked In! 🎉", description: `You're #${queueNumber} in queue. Estimated wait: ~${queueNumber * 15} min` });
      fetchAppointments();
    }
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (!error) {
      toast({ title: "Cancelled", description: "Appointment cancelled." });
      fetchAppointments();
    }
  };

  const handleRebook = (appointment: any) => {
    const doc = doctors.find(d => d.doctor_user_id === appointment.doctor_id);
    if (doc) {
      setSelectedDoctor(doc);
      fetchAvailability(doc.doctor_user_id);
    }
    setBookingTitle(appointment.title);
    setSelectedType(appointment.appointment_type || "in_person");
    setStep("select-date");
  };

  const resetBooking = () => {
    setStep("list");
    setSelectedDoctor(null);
    setSelectedTime(null);
    setSelectedType("in_person");
    setBookingTitle("Consultation");
    setBookingNotes("");
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const upcoming = appointments.filter(a => new Date(a.scheduled_at) >= new Date() && a.status === "scheduled");
  const past = appointments.filter(a => new Date(a.scheduled_at) < new Date() || a.status !== "scheduled");
  const dateSlots = getAvailableSlots(selectedDate);
  const next7Days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));
  const availableDays = next7Days.filter(d => {
    const dayOfWeek = d.getDay();
    return availability.some(a => a.day_of_week === dayOfWeek && a.appointment_types.includes(selectedType));
  });

  // Booking flow
  if (step !== "list") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={resetBooking} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Book Appointment</h1>
            <p className="text-muted-foreground text-sm">
              {step === "select-doctor" && "Choose a doctor"}
              {step === "select-date" && `Booking with ${selectedDoctor?.doctor_name}`}
              {step === "select-slot" && `Select a time on ${format(selectedDate, "MMM d, yyyy")}`}
              {step === "confirm" && "Review & confirm"}
              {step === "done" && "Appointment booked!"}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1">
          {["select-doctor", "select-date", "select-slot", "confirm"].map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${
              ["select-doctor", "select-date", "select-slot", "confirm", "done"].indexOf(step) >= i
                ? "bg-primary" : "bg-muted"
            }`} />
          ))}
        </div>

        {/* Step: Select Doctor */}
        {step === "select-doctor" && (
          <div className="space-y-3">
            {doctors.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                <Stethoscope className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No linked doctors found. Link to a doctor first from your Overview page.</p>
              </div>
            ) : (
              doctors.map(doc => (
                <button
                  key={doc.doctor_user_id}
                  onClick={() => selectDoctor(doc)}
                  className="w-full glass-card rounded-xl p-4 text-left hover:bg-muted/30 transition-colors flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold text-foreground">{doc.doctor_name || "Doctor"}</p>
                    {doc.clinic_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {doc.clinic_name}
                      </p>
                    )}
                    {doc.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {doc.specialties.map(s => (
                          <span key={s} className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </button>
              ))
            )}
          </div>
        )}

        {/* Step: Select Date + Type */}
        {step === "select-date" && (
          <div className="space-y-4">
            {/* Appointment Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Appointment Type</label>
              <div className="flex gap-2">
                {(["in_person", "teleconsult", "walk_in"] as const).map(type => {
                  const Icon = typeIcons[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors ${
                        selectedType === type
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{typeLabels[type]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Reason</label>
              <input
                value={bookingTitle}
                onChange={e => setBookingTitle(e.target.value)}
                placeholder="e.g. Follow-up, Check-up"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Select Date</label>
              {availableDays.length === 0 ? (
                <div className="glass-card rounded-xl p-6 text-center text-muted-foreground text-sm">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No availability found for this doctor. They may not have set up their schedule yet.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableDays.map(date => (
                    <button
                      key={date.toISOString()}
                      onClick={() => { setSelectedDate(date); setSelectedTime(null); setStep("select-slot"); }}
                      className={`p-3 rounded-xl border text-center transition-colors hover:bg-primary/5 hover:border-primary ${
                        isSameDay(selectedDate, date) ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <p className="text-xs text-muted-foreground">{format(date, "EEE")}</p>
                      <p className="text-lg font-bold text-foreground">{format(date, "d")}</p>
                      <p className="text-[10px] text-muted-foreground">{format(date, "MMM")}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Select Time Slot */}
        {step === "select-slot" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep("select-date")} className="text-sm text-primary hover:underline">← Change date</button>
            </div>
            <p className="text-sm text-muted-foreground">
              Available slots for <strong>{format(selectedDate, "EEEE, MMM d")}</strong> • {typeLabels[selectedType]}
            </p>
            {dateSlots.length === 0 ? (
              <div className="glass-card rounded-xl p-6 text-center text-muted-foreground text-sm">
                No available slots for this date and type. Try another date.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {dateSlots.map(slot => (
                  <button
                    key={slot.time}
                    onClick={() => { setSelectedTime(slot.time); setStep("confirm"); }}
                    className={`p-3 rounded-xl border text-center transition-colors hover:bg-primary/5 hover:border-primary ${
                      selectedTime === slot.time ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground"
                    }`}
                  >
                    <Clock className="w-4 h-4 mx-auto mb-1 opacity-60" />
                    <p className="text-sm font-medium">{slot.display}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-5 space-y-3">
              <h3 className="font-heading font-semibold text-foreground">Confirm Booking</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Doctor</span>
                  <span className="font-medium text-foreground">{selectedDoctor?.doctor_name}</span>
                </div>
                {selectedDoctor?.clinic_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clinic</span>
                    <span className="font-medium text-foreground">{selectedDoctor.clinic_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium text-foreground">{format(selectedDate, "EEEE, MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium text-foreground">{selectedTime && format(new Date(`2000-01-01T${selectedTime}`), "h:mm a")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    {(() => { const Icon = typeIcons[selectedType]; return <Icon className="w-3.5 h-3.5" />; })()}
                    {typeLabels[selectedType]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reason</span>
                  <span className="font-medium text-foreground">{bookingTitle}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Notes (optional)</label>
                <textarea
                  value={bookingNotes}
                  onChange={e => setBookingNotes(e.target.value)}
                  placeholder="Any symptoms or notes for the doctor..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <button
                onClick={handleBook}
                disabled={booking}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {booking ? "Booking..." : "Confirm & Book"}
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="glass-card rounded-xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-whatsapp/10 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-whatsapp" />
            </div>
            <h2 className="text-xl font-heading font-bold text-foreground">Appointment Booked!</h2>
            <p className="text-muted-foreground text-sm">
              You're all set with <strong>{selectedDoctor?.doctor_name}</strong> on{" "}
              <strong>{format(selectedDate, "MMM d")}</strong> at{" "}
              <strong>{selectedTime && format(new Date(`2000-01-01T${selectedTime}`), "h:mm a")}</strong>
            </p>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p>📱 You'll receive a reminder 1 day before</p>
              <p>📍 Check in at the clinic using the QR check-in button</p>
            </div>
            <button onClick={resetBooking} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
              View Appointments
            </button>
          </div>
        )}
      </div>
    );
  }

  // Main appointment list
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground text-sm">Manage your appointments</p>
        </div>
        <button
          onClick={startBooking}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Book
        </button>
      </div>

      {/* Active Checkins */}
      {checkins.filter(c => c.status === "waiting" || c.status === "called").length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live Queue</h3>
          {checkins.filter(c => c.status === "waiting" || c.status === "called").map(c => (
            <div key={c.id} className="glass-card rounded-xl p-4 border-l-4 border-l-accent">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-accent" />
                    Queue #{c.queue_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.status === "called" ? "🔔 Doctor is ready for you!" : `Estimated wait: ~${c.estimated_wait_minutes} min`}
                  </p>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${
                  c.status === "called" ? "bg-accent/10 text-accent animate-pulse" : "bg-primary/10 text-primary"
                }`}>
                  {c.status === "called" ? "Your Turn!" : "Waiting"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upcoming ({upcoming.length})</h3>
          {upcoming.map(a => {
            const TypeIcon = typeIcons[(a as any).appointment_type] || MapPin;
            const isToday = isSameDay(new Date(a.scheduled_at), new Date());
            const hasCheckedIn = checkins.some(c => c.appointment_id === a.id);
            return (
              <div key={a.id} className={`glass-card rounded-xl p-4 space-y-2 ${isToday ? "border-l-4 border-l-primary" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-heading font-semibold text-foreground flex items-center gap-2">
                      {a.title}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">
                        <TypeIcon className="w-3 h-3" /> {typeLabels[(a as any).appointment_type] || "In-Person"}
                      </span>
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(a.scheduled_at), "EEEE, MMM d 'at' h:mm a")} • {a.duration_minutes} min
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[a.status]}`}>{a.status}</span>
                </div>
                {a.notes && <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">{a.notes}</p>}
                <div className="flex items-center gap-2 pt-1">
                  {isToday && !hasCheckedIn && (a as any).appointment_type !== "teleconsult" && (
                    <button onClick={() => handleCheckin(a)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-whatsapp text-whatsapp-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                      <QrCode className="w-3 h-3" /> Check In
                    </button>
                  )}
                  {isToday && (a as any).appointment_type === "teleconsult" && (
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                      <Video className="w-3 h-3" /> Join Call
                    </button>
                  )}
                  <button onClick={() => handleCancel(a.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Past ({past.length})</h3>
          {past.map(a => {
            const TypeIcon = typeIcons[(a as any).appointment_type] || MapPin;
            return (
              <div key={a.id} className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                      {a.title}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">
                        <TypeIcon className="w-3 h-3" /> {typeLabels[(a as any).appointment_type] || "In-Person"}
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground">{format(new Date(a.scheduled_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[a.status]}`}>{a.status.replace("_", " ")}</span>
                </div>
                {a.status === "completed" && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => { fetchDoctors(); handleRebook(a); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors">
                      <RefreshCw className="w-3 h-3" /> Rebook
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {appointments.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No appointments yet. Book your first one!</p>
          <button onClick={startBooking} className="mt-4 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
            Book Appointment
          </button>
        </div>
      )}
    </div>
  );
};

export default PatientAppointments;

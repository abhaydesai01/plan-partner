import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";

const statusColors: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-whatsapp/10 text-whatsapp",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-muted text-muted-foreground",
};

const PatientAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: patient } = await supabase.from("patients").select("id").eq("patient_user_id", user.id).maybeSingle();
      if (!patient) { setLoading(false); return; }
      const { data } = await supabase.from("appointments").select("*").eq("patient_id", patient.id).order("scheduled_at", { ascending: false });
      setAppointments(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const upcoming = appointments.filter(a => new Date(a.scheduled_at) >= new Date() && a.status === "scheduled");
  const past = appointments.filter(a => new Date(a.scheduled_at) < new Date() || a.status !== "scheduled");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Appointments</h1>
        <p className="text-muted-foreground text-sm">Your appointment history</p>
      </div>

      {appointments.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No appointments yet.
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upcoming</h3>
              {upcoming.map(a => (
                <div key={a.id} className="glass-card rounded-xl p-4 border-l-4 border-l-primary space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading font-semibold text-foreground">{a.title}</h4>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[a.status] || ""}`}>{a.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{format(new Date(a.scheduled_at), "EEEE, MMM d, yyyy 'at' HH:mm")} • {a.duration_minutes} min</p>
                  {a.notes && <p className="text-sm text-muted-foreground">{a.notes}</p>}
                </div>
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Past</h3>
              {past.map(a => (
                <div key={a.id} className="glass-card rounded-xl p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-foreground">{a.title}</h4>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[a.status] || ""}`}>{a.status.replace("_", " ")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{format(new Date(a.scheduled_at), "MMM d, yyyy 'at' HH:mm")} • {a.duration_minutes} min</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientAppointments;

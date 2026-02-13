import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Building2, CalendarDays } from "lucide-react";
import { format } from "date-fns";

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  clinic_id?: string;
}

const ClinicAppointments = () => {
  const { session } = useAuth();
  const clinic = session?.clinic as { id?: string } | null;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinic?.id) return;
    api
      .get<Appointment[]>("appointments", { clinic_id: clinic.id })
      .then((list) => setAppointments(Array.isArray(list) ? list : []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [clinic?.id]);

  if (!clinic) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-heading font-bold text-foreground mb-2">Clinic not found</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const sorted = [...appointments].sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
  const upcoming = sorted.filter((a) => new Date(a.scheduled_at) >= new Date() && a.status === "scheduled");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Appointments</h1>
        <p className="text-muted-foreground text-sm">Appointments at this clinic (when doctors choose a slot at this clinic)</p>
      </div>

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="w-5 h-5" /> Upcoming
          </h2>
          <div className="space-y-2">
            {upcoming.slice(0, 20).map((a) => (
              <div key={a.id} className="glass-card rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(a.scheduled_at), "EEE, MMM d, yyyy 'at' HH:mm")} • {a.duration_minutes} min
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-heading font-semibold text-foreground">All appointments</h2>
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date & time</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Duration</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, 50).map((a) => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{a.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(a.scheduled_at), "MMM d, yyyy HH:mm")}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.duration_minutes} min</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sorted.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No appointments yet. When doctors set availability at this clinic and book with a slot here, they will appear.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicAppointments;

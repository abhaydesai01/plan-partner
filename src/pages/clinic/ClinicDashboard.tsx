import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Building2, Users, UserPlus, CalendarDays, DollarSign, Layers } from "lucide-react";

const ClinicDashboard = () => {
  const { session } = useAuth();
  const clinic = session?.clinic as { id?: string; name?: string; address?: string; phone?: string } | null;
  const [stats, setStats] = useState({ members: 0, patients: 0, appointments: 0, revenue: 0, programs: 0 });

  useEffect(() => {
    if (!clinic?.id) return;
    Promise.all([
      api.get<any[]>("clinic_members", { clinic_id: clinic.id }).then((m) => (Array.isArray(m) ? m.length : 0)),
      api.get<{ items: unknown[]; total: number }>("patients", { clinic_id: clinic.id, limit: "1", skip: "0" }).then((r) => r?.total ?? 0),
      api.get<any[]>("appointments", { clinic_id: clinic.id }).then((a) => (Array.isArray(a) ? a.length : 0)),
      api.get<{ total: number }>("clinic/revenue").then((r) => r?.total ?? 0).catch(() => 0),
      api.get<any[]>("clinic/programs").then((p) => (Array.isArray(p) ? p.length : 0)).catch(() => 0),
    ]).then(([members, patients, appointments, revenue, programs]) => setStats({ members, patients, appointments, revenue, programs }));
  }, [clinic?.id]);

  if (!clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass-card rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-heading font-bold text-foreground mb-2">Clinic not found</h2>
          <p className="text-muted-foreground">Your clinic information could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Clinic Dashboard</h1>
        <p className="text-muted-foreground text-sm">Manage your clinic</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="glass-card rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">{stats.members}</p>
            <p className="text-sm text-muted-foreground">Team</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <UserPlus className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">{stats.patients}</p>
            <p className="text-sm text-muted-foreground">Patients</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">{stats.appointments}</p>
            <p className="text-sm text-muted-foreground">Appointments</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">{stats.revenue ? `₹${stats.revenue.toLocaleString("en-IN")}` : "₹0"}</p>
            <p className="text-sm text-muted-foreground">Revenue</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">{stats.programs}</p>
            <p className="text-sm text-muted-foreground">Programs</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-foreground">{clinic.name}</h2>
            {clinic.address && <p className="text-sm text-muted-foreground">{clinic.address}</p>}
            {clinic.phone && <p className="text-sm text-muted-foreground mt-1">Phone: {clinic.phone}</p>}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Use the sidebar to manage your team (invite by email or add by doctor code), view patients and appointments, and edit clinic settings.
        </p>
      </div>
    </div>
  );
};

export default ClinicDashboard;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Layers, Activity, AlertTriangle } from "lucide-react";

interface Stats {
  totalPatients: number;
  activePrograms: number;
  activeEnrollments: number;
  atRiskPatients: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalPatients: 0, activePrograms: 0, activeEnrollments: 0, atRiskPatients: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [patients, programs, enrollments, atRisk] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("doctor_id", user.id),
        supabase.from("programs").select("id", { count: "exact", head: true }).eq("doctor_id", user.id).eq("is_active", true),
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("doctor_id", user.id).eq("status", "active"),
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("doctor_id", user.id).eq("status", "at_risk"),
      ]);
      setStats({
        totalPatients: patients.count ?? 0,
        activePrograms: programs.count ?? 0,
        activeEnrollments: enrollments.count ?? 0,
        atRiskPatients: atRisk.count ?? 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, [user]);

  const cards = [
    { label: "Total Patients", value: stats.totalPatients, icon: Users, color: "text-primary" },
    { label: "Active Programs", value: stats.activePrograms, icon: Layers, color: "text-accent" },
    { label: "Active Enrollments", value: stats.activeEnrollments, icon: Activity, color: "text-whatsapp" },
    { label: "At-Risk Patients", value: stats.atRiskPatients, icon: AlertTriangle, color: "text-destructive" },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Welcome back, Doctor</h1>
        <p className="text-muted-foreground text-sm mt-1">Here's your practice overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="text-3xl font-heading font-bold text-foreground">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="font-heading font-semibold text-foreground mb-3">Getting Started</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Add your first patients from the Patients tab
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Create care programs (NCD, Post-Discharge, Elder-Care)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-whatsapp" />
            Enroll patients into programs to track adherence
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;

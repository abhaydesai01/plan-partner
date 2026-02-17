import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Layers, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Program {
  id: string;
  name: string;
  type: string;
  category?: string;
  duration_days: number;
  description: string;
  is_active: boolean;
  phases?: any[];
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
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});

  const fetchPrograms = async () => {
    if (!user) return;
    try {
      const [data, enrolls] = await Promise.all([
        api.get<Program[]>("doctor/programs"),
        api.get<{ program_id: string; status?: string }[]>("enrollments").catch(() => []),
      ]);
      setPrograms(data || []);
      const counts: Record<string, number> = {};
      (enrolls || []).filter((e) => e.status === "active").forEach((e) => {
        counts[e.program_id] = (counts[e.program_id] || 0) + 1;
      });
      setEnrollmentCounts(counts);
    } catch {
      setPrograms([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPrograms(); }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Programs</h1>
          <p className="text-muted-foreground text-sm">{programs.length} care program{programs.length !== 1 ? "s" : ""} assigned to you</p>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>Programs are assigned to you by your clinic. Contact your clinic admin to request changes or new program assignments.</span>
      </div>

      {/* Program Cards */}
      {programs.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
          No programs assigned to you yet. Your clinic will assign programs for you to work with.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((p) => (
            <div key={p.id} className="glass-card rounded-xl p-5 space-y-3 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeColors[p.type] || "bg-muted text-muted-foreground"}`}>
                  {p.category || typeLabels[p.type] || p.type}
                </span>
              </div>
              <div>
                <h3 className="font-heading font-bold text-foreground">{p.name}</h3>
                {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
              </div>
              {p.phases && p.phases.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.phases.map((phase: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{phase.name}</Badge>
                  ))}
                </div>
              )}
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

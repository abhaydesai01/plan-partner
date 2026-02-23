import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers,
  Activity,
  CheckCircle2,
  TrendingUp,
  Calendar,
} from "lucide-react";

type Enrollment = {
  id: string;
  program_id: string;
  program_name?: string;
  status: string;
  adherence_percentage?: number;
  enrolled_at?: string;
  completed_at?: string;
};

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

export default function PatientProgramDashboard() {
  const { data: enrollments = [], isLoading } = useQuery<Enrollment[]>({
    queryKey: ["patient", "enrollments"],
    queryFn: () => api.get<Enrollment[]>("me/enrollments"),
  });

  const stats = useMemo(() => {
    const total = enrollments.length;
    const active = enrollments.filter((e) => e.status === "active").length;
    const completed = enrollments.filter((e) => e.status === "completed").length;
    const adherences = enrollments
      .map((e) => e.adherence_percentage)
      .filter((v): v is number => v != null);
    const avgAdherence =
      adherences.length > 0 ? Math.round(adherences.reduce((a, b) => a + b, 0) / adherences.length) : 0;
    return { total, active, completed, avgAdherence };
  }, [enrollments]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Layers className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">My Programs</h1>
          <p className="text-sm text-muted-foreground">
            Track your health program enrollments and progress
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Layers}
          label="Total Enrollments"
          value={stats.total}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          icon={Activity}
          label="Active"
          value={stats.active}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats.completed}
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Adherence"
          value={`${stats.avgAdherence}%`}
          color="bg-amber-100 text-amber-600"
        />
      </div>

      {/* Enrollment cards */}
      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>You're not enrolled in any programs yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enrollments.map((e) => (
            <Card key={e.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {e.program_name || `Program ${e.program_id.slice(0, 8)}`}
                  </CardTitle>
                  <Badge variant={e.status === "active" ? "default" : "secondary"} className="capitalize">
                    {e.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Adherence */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Adherence</span>
                    <span className="font-medium">{e.adherence_percentage ?? 0}%</span>
                  </div>
                  <Progress value={e.adherence_percentage ?? 0} className="h-2" />
                </div>

                {/* Dates */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Enrolled: {formatDate(e.enrolled_at)}
                  </span>
                  {e.completed_at && (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Completed: {formatDate(e.completed_at)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

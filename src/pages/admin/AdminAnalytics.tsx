import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Building2, Stethoscope, Users, Layers, UserPlus, TrendingUp, CheckCircle, XCircle } from "lucide-react";

interface AnalyticsData {
  total_clinics: number;
  pending_clinics: number;
  total_doctors: number;
  pending_doctors: number;
  total_patients: number;
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
  completion_rate: number;
  total_programs: number;
  total_revenue: number;
}

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["admin-analytics"],
    queryFn: () => api.get<AnalyticsData>("admin/analytics"),
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const d = data!;
  const dropOffRate = d.total_enrollments > 0 ? Math.round(((d.total_enrollments - d.completed_enrollments - d.active_enrollments) / d.total_enrollments) * 100) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Building2 className="w-4 h-4" /> Clinics</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{d.total_clinics}</p>
            <p className="text-sm text-amber-600 mt-1">{d.pending_clinics} pending approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Doctors</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{d.total_doctors}</p>
            <p className="text-sm text-amber-600 mt-1">{d.pending_doctors} pending approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" /> Patients</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{d.total_patients}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Layers className="w-4 h-4" /> Programs</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{d.total_programs}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><UserPlus className="w-4 h-4" /> Total Enrollments</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{d.total_enrollments}</p>
            <p className="text-sm text-muted-foreground mt-1">{d.active_enrollments} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Revenue</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹{d.total_revenue.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Enrollment Funnel */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Enrollment Funnel</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> Completion Rate</span>
              <span className="font-medium">{d.completion_rate}%</span>
            </div>
            <Progress value={d.completion_rate} className="h-3" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-red-500" /> Drop-off Rate</span>
              <span className="font-medium">{dropOffRate}%</span>
            </div>
            <Progress value={dropOffRate} className="h-3 [&>div]:bg-red-500" />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t">
            <div><p className="text-2xl font-bold text-blue-600">{d.active_enrollments}</p><p className="text-xs text-muted-foreground">Active</p></div>
            <div><p className="text-2xl font-bold text-green-600">{d.completed_enrollments}</p><p className="text-xs text-muted-foreground">Completed</p></div>
            <div><p className="text-2xl font-bold text-red-600">{d.total_enrollments - d.active_enrollments - d.completed_enrollments}</p><p className="text-xs text-muted-foreground">Dropped</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

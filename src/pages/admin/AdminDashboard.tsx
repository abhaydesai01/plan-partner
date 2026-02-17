import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Stethoscope, Users, Layers, UserPlus, TrendingUp, DollarSign, Clock, BarChart3 } from "lucide-react";

interface AnalyticsData {
  pending_clinics: number;
  pending_doctors: number;
  total_clinics: number;
  total_doctors: number;
  total_patients: number;
  total_programs: number;
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
  completion_rate: number;
  total_revenue: number;
}

const stats = [
  { key: "pending_clinics", label: "Pending Clinics", icon: Building2, color: "amber", format: (v: number) => String(v) },
  { key: "pending_doctors", label: "Pending Doctors", icon: Stethoscope, color: "amber", format: (v: number) => String(v) },
  { key: "total_clinics", label: "Active Clinics", icon: Building2, color: "green", format: (v: number) => String(v) },
  { key: "total_doctors", label: "Active Doctors", icon: Stethoscope, color: "blue", format: (v: number) => String(v) },
  { key: "total_patients", label: "Total Patients", icon: Users, color: "purple", format: (v: number) => String(v) },
  { key: "total_programs", label: "Active Programs", icon: Layers, color: "teal", format: (v: number) => String(v) },
  { key: "total_enrollments", label: "Total Enrollments", icon: UserPlus, color: "indigo", format: (v: number) => String(v) },
  { key: "completion_rate", label: "Completion Rate", icon: TrendingUp, color: "emerald", format: (v: number) => `${v}%` },
  { key: "total_revenue", label: "Total Revenue", icon: DollarSign, color: "green", format: (v: number) => `₹${v.toLocaleString("en-IN")}` },
] as const;

const colorMap: Record<string, { bg: string; text: string }> = {
  amber: { bg: "bg-amber-100", text: "text-amber-600" },
  green: { bg: "bg-green-100", text: "text-green-600" },
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
  purple: { bg: "bg-purple-100", text: "text-purple-600" },
  teal: { bg: "bg-teal-100", text: "text-teal-600" },
  indigo: { bg: "bg-indigo-100", text: "text-indigo-600" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
};

export default function AdminDashboard() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["admin-analytics"],
    queryFn: () => api.get<AnalyticsData>("admin/analytics"),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const colors = colorMap[stat.color] || colorMap.green;
          const Icon = stat.icon;
          return (
            <Card key={stat.key}>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-xl font-bold">{stat.format((data as any)?.[stat.key] ?? 0)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

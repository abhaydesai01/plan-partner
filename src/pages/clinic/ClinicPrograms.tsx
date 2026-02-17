import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Layers, UserPlus, X, ChevronDown, ChevronUp, Users } from "lucide-react";

interface ProgramData {
  id: string;
  name: string;
  description?: string;
  category?: string;
  duration_days: number;
  duration_unit?: string;
  outcome_goal?: string;
  phases?: any[];
  is_active: boolean;
}

interface DoctorInfo {
  user_id: string;
  name: string;
  email: string;
  specialization?: string;
}

interface DoctorAssignment {
  id: string;
  doctor_user_id: string;
  doctor_name: string;
  assigned_at: string;
  is_owner?: boolean;
}

export default function ClinicPrograms() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);

  const { data: programs, isLoading } = useQuery<ProgramData[]>({
    queryKey: ["clinic-programs"],
    queryFn: () => api.get<ProgramData[]>("clinic/programs"),
  });

  const { data: doctors = [] } = useQuery<DoctorInfo[]>({
    queryKey: ["clinic-doctors"],
    queryFn: () => api.get<DoctorInfo[]>("clinic/doctors"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Assigned Programs</h1>
        <p className="text-muted-foreground text-sm">Programs assigned to your clinic by admin. Assign doctors to each program below.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : !programs?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">No Programs Assigned</p>
            <p className="text-muted-foreground text-sm">The admin has not yet assigned any programs to your clinic.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {programs.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              doctors={doctors}
              expanded={expandedProgram === p.id}
              onToggle={() => setExpandedProgram(expandedProgram === p.id ? null : p.id)}
              toast={toast}
              queryClient={queryClient}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProgramCard({ program, doctors, expanded, onToggle, toast, queryClient }: {
  program: ProgramData;
  doctors: DoctorInfo[];
  expanded: boolean;
  onToggle: () => void;
  toast: any;
  queryClient: any;
}) {
  const { data: assignedDoctors = [], isLoading: loadingAssignments } = useQuery<DoctorAssignment[]>({
    queryKey: ["clinic-program-doctors", program.id],
    queryFn: () => api.get<DoctorAssignment[]>(`clinic/programs/${program.id}/doctors`),
    enabled: expanded,
  });

  const assignMutation = useMutation({
    mutationFn: (doctorUserId: string) =>
      api.post(`clinic/programs/${program.id}/assign-doctor`, { doctor_user_id: doctorUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-program-doctors", program.id] });
      toast({ title: "Doctor assigned to program" });
    },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (doctorUserId: string) =>
      api.delete(`clinic/programs/${program.id}/assign-doctor/${doctorUserId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-program-doctors", program.id] });
      toast({ title: "Doctor removed from program" });
    },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const assignedIds = new Set(assignedDoctors.map((a) => a.doctor_user_id));
  const unassignedDoctors = doctors.filter((d) => !assignedIds.has(d.user_id));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <CardTitle className="text-sm sm:text-base truncate">{program.name}</CardTitle>
            {program.category && <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs">{program.category}</Badge>}
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle} className="gap-1 text-muted-foreground self-end sm:self-auto shrink-0">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Doctors</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {program.description && <p className="text-sm text-muted-foreground mb-3">{program.description}</p>}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium">{program.duration_days} {program.duration_unit || "days"}</span>
          </div>
          {program.outcome_goal && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Goal</span>
              <span className="font-medium">{program.outcome_goal}</span>
            </div>
          )}
          {program.phases && program.phases.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">{program.phases.length} Phase(s):</p>
              <div className="flex flex-wrap gap-1">
                {program.phases.map((phase: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{phase.name}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" /> Assigned Doctors
            </h4>

            {loadingAssignments ? (
              <Skeleton className="h-8 w-full" />
            ) : assignedDoctors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No doctors assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {assignedDoctors.map((a) => (
                  <div key={a.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-sm font-medium">{a.doctor_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        since {new Date(a.assigned_at).toLocaleDateString()}
                      </span>
                    </div>
                    {a.is_owner ? (
                      <Badge variant="outline" className="text-xs">Owner</Badge>
                    ) : (
                      <Button
                        size="sm" variant="ghost"
                        className="text-red-500 hover:text-red-700 h-7 px-2"
                        onClick={() => removeMutation.mutate(a.doctor_user_id)}
                        disabled={removeMutation.isPending}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {unassignedDoctors.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Add a doctor:</p>
                <div className="space-y-1">
                  {unassignedDoctors.map((d) => (
                    <div key={d.user_id} className="flex items-center justify-between bg-background border rounded-lg px-3 py-2">
                      <div>
                        <span className="text-sm font-medium">{d.name}</span>
                        {d.specialization && <span className="text-xs text-muted-foreground ml-2">{d.specialization}</span>}
                      </div>
                      <Button
                        size="sm" variant="outline" className="h-7 gap-1"
                        onClick={() => assignMutation.mutate(d.user_id)}
                        disabled={assignMutation.isPending}
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Assign
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {doctors.length === 0 && unassignedDoctors.length === 0 && assignedDoctors.filter(a => !a.is_owner).length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                You (owner) are auto-enrolled. To add more doctors, invite them from the Team page first.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

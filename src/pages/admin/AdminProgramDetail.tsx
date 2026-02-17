import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Building2 } from "lucide-react";

interface Phase {
  name: string;
  phase_type: string;
  duration_days: number;
  tasks: { title: string; frequency: string; description: string }[];
}

interface ProgramDetail {
  id: string;
  name: string;
  description?: string;
  category?: string;
  duration_days: number;
  duration_unit?: string;
  outcome_goal?: string;
  type?: string;
  is_active: boolean;
  phases: Phase[];
  assignments: { id: string; clinic_id: string; clinic_name: string; assigned_at: string; status: string }[];
  enrollment_count: number;
}

interface ClinicOption {
  id: string;
  name: string;
}

export default function AdminProgramDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [phaseOpen, setPhaseOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [newPhase, setNewPhase] = useState<Phase>({ name: "", phase_type: "engagement", duration_days: 7, tasks: [] });
  const [newTask, setNewTask] = useState({ title: "", frequency: "daily", description: "" });
  const [selectedClinic, setSelectedClinic] = useState("");

  const { data: program, isLoading } = useQuery<ProgramDetail>({
    queryKey: ["admin-program", id],
    queryFn: () => api.get<ProgramDetail>(`admin/programs/${id}`),
    enabled: !!id,
  });

  const { data: clinics } = useQuery<ClinicOption[]>({
    queryKey: ["admin-all-clinics"],
    queryFn: () => api.get<ClinicOption[]>("admin/all-clinics"),
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.patch(`admin/programs/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-program", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
      toast({ title: "Program updated" });
    },
    onError: (err: any) => toast({ title: "Update failed", description: err?.message, variant: "destructive" }),
  });

  const assignMutation = useMutation({
    mutationFn: (clinicId: string) => api.post(`admin/programs/${id}/assign`, { clinic_id: clinicId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-program", id] });
      toast({ title: "Program assigned to clinic" });
      setAssignOpen(false);
      setSelectedClinic("");
    },
    onError: (err: any) => toast({ title: "Assignment failed", description: err?.message, variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: (clinicId: string) => api.delete(`admin/programs/${id}/assign/${clinicId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-program", id] });
      toast({ title: "Assignment revoked" });
    },
  });

  const addPhase = () => {
    if (!newPhase.name.trim()) return toast({ title: "Phase name is required", variant: "destructive" });
    const updated = [...(program?.phases || []), newPhase];
    updateMutation.mutate({ phases: updated });
    setPhaseOpen(false);
    setNewPhase({ name: "", phase_type: "engagement", duration_days: 7, tasks: [] });
  };

  const addTaskToPhase = () => {
    if (!newTask.title.trim()) return;
    setNewPhase({ ...newPhase, tasks: [...newPhase.tasks, { ...newTask }] });
    setNewTask({ title: "", frequency: "daily", description: "" });
  };

  const removePhase = (idx: number) => {
    const updated = (program?.phases || []).filter((_, i) => i !== idx);
    updateMutation.mutate({ phases: updated });
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full rounded-xl" /></div>;
  if (!program) return <div className="text-center py-12 text-muted-foreground">Program not found</div>;

  return (
    <div>
      <button onClick={() => navigate("/admin/programs")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Programs
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{program.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {program.category && <Badge variant="secondary">{program.category}</Badge>}
            <Badge variant={program.is_active ? "default" : "destructive"}>{program.is_active ? "Active" : "Inactive"}</Badge>
            <span className="text-sm text-muted-foreground">{program.duration_days} days</span>
          </div>
        </div>
        <Button variant={program.is_active ? "destructive" : "default"} size="sm"
          onClick={() => updateMutation.mutate({ is_active: !program.is_active })}>
          {program.is_active ? "Deactivate" : "Activate"}
        </Button>
      </div>

      {program.description && <p className="text-muted-foreground mb-4">{program.description}</p>}
      {program.outcome_goal && <p className="text-sm mb-6"><strong>Outcome Goal:</strong> {program.outcome_goal}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phases Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Phases ({program.phases?.length || 0})</CardTitle>
            <Dialog open={phaseOpen} onOpenChange={setPhaseOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Phase</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Phase</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Phase Name *</Label><Input value={newPhase.name} onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })} /></div>
                  <div>
                    <Label>Phase Type</Label>
                    <Select value={newPhase.phase_type} onValueChange={(v) => setNewPhase({ ...newPhase, phase_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="engagement">Engagement</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                        <SelectItem value="completion">Completion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Duration (days)</Label><Input type="number" value={newPhase.duration_days} onChange={(e) => setNewPhase({ ...newPhase, duration_days: Number(e.target.value) })} /></div>
                  
                  <div className="border rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium">Tasks ({newPhase.tasks.length})</p>
                    {newPhase.tasks.map((t, i) => (
                      <div key={i} className="text-sm bg-muted rounded px-2 py-1">{t.title} — {t.frequency}</div>
                    ))}
                    <div className="flex gap-2">
                      <Input placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="text-sm" />
                      <Input placeholder="Frequency" value={newTask.frequency} onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value })} className="text-sm w-28" />
                      <Button size="sm" variant="outline" onClick={addTaskToPhase}>Add</Button>
                    </div>
                  </div>
                  <Button onClick={addPhase} className="w-full">Save Phase</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            {!program.phases?.length ? (
              <p className="text-sm text-muted-foreground">No phases defined yet.</p>
            ) : (
              program.phases.map((phase, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{phase.name}</span>
                      <Badge variant="outline" className="text-xs">{phase.phase_type}</Badge>
                    </div>
                    <button onClick={() => removePhase(i)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <p className="text-xs text-muted-foreground">{phase.duration_days} days</p>
                  {phase.tasks?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {phase.tasks.map((t: any, j: number) => (
                        <div key={j} className="text-xs bg-muted rounded px-2 py-1">{t.title} — {t.frequency}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Assignments Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Clinic Assignments</CardTitle>
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Assign</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Assign to Clinic</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Select value={selectedClinic} onValueChange={setSelectedClinic}>
                    <SelectTrigger><SelectValue placeholder="Select a clinic" /></SelectTrigger>
                    <SelectContent>
                      {clinics?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => selectedClinic && assignMutation.mutate(selectedClinic)} disabled={!selectedClinic || assignMutation.isPending} className="w-full">
                    Assign Program
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            {!program.assignments?.length ? (
              <p className="text-sm text-muted-foreground">Not assigned to any clinics yet.</p>
            ) : (
              program.assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{a.clinic_name}</span>
                    <Badge variant={a.status === "active" ? "default" : "destructive"} className="text-xs">{a.status}</Badge>
                  </div>
                  {a.status === "active" && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revokeMutation.mutate(a.clinic_id)}>
                      Revoke
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        Enrollments using this program: <strong>{program.enrollment_count}</strong>
      </div>
    </div>
  );
}

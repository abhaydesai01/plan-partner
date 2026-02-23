import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  X,
  Upload,
  Play,
  CheckCircle2,
  ClipboardList,
  Briefcase,
} from "lucide-react";

type CaseItem = {
  id: string;
  patient_name: string;
  condition: string;
  status: string;
  budget_min?: number;
  budget_max?: number;
  created_at?: string;
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  hospital_matched: { label: "Matched", variant: "secondary" },
  hospital_accepted: { label: "Accepted", variant: "default" },
  treatment_scheduled: { label: "Scheduled", variant: "default" },
  treatment_in_progress: { label: "In Progress", variant: "outline" },
  treatment_completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

const formatBudget = (min?: number, max?: number) => {
  if (!min && !max) return "—";
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt(min || max!);
};

export default function ClinicCases() {
  const queryClient = useQueryClient();
  const [rejectDialog, setRejectDialog] = useState<CaseItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [planDialog, setPlanDialog] = useState<CaseItem | null>(null);
  const [planForm, setPlanForm] = useState({ description: "", estimated_cost: "", estimated_duration: "" });
  const [completeDialog, setCompleteDialog] = useState<CaseItem | null>(null);
  const [programId, setProgramId] = useState("");

  const { data: cases = [], isLoading } = useQuery<CaseItem[]>({
    queryKey: ["clinic", "cases"],
    queryFn: () => api.get<CaseItem[]>("clinic/cases"),
  });

  const mutate = (label: string) => ({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic", "cases"] });
      toast.success(label);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => api.patch(`clinic/cases/${id}/accept`, {}),
    ...mutate("Case accepted"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patch(`clinic/cases/${id}/reject`, { reason }),
    ...mutate("Case rejected"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic", "cases"] });
      toast.success("Case rejected");
      setRejectDialog(null);
      setRejectReason("");
    },
  });

  const planMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; description: string; estimated_cost: number; estimated_duration: string }) =>
      api.patch(`clinic/cases/${id}/treatment-plan`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic", "cases"] });
      toast.success("Treatment plan uploaded");
      setPlanDialog(null);
      setPlanForm({ description: "", estimated_cost: "", estimated_duration: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => api.patch(`clinic/cases/${id}/start`, {}),
    ...mutate("Treatment started"),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, program_id }: { id: string; program_id?: string }) =>
      api.patch(`clinic/cases/${id}/complete`, { program_id: program_id || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic", "cases"] });
      toast.success("Treatment completed");
      setCompleteDialog(null);
      setProgramId("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const renderActions = (c: CaseItem) => {
    switch (c.status) {
      case "hospital_matched":
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => acceptMutation.mutate(c.id)}
              disabled={acceptMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1" /> Accept
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setRejectDialog(c)}
            >
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
          </div>
        );
      case "hospital_accepted":
        return (
          <Button size="sm" onClick={() => setPlanDialog(c)}>
            <Upload className="h-4 w-4 mr-1" /> Upload Treatment Plan
          </Button>
        );
      case "treatment_scheduled":
        return (
          <Button
            size="sm"
            onClick={() => startMutation.mutate(c.id)}
            disabled={startMutation.isPending}
          >
            <Play className="h-4 w-4 mr-1" /> Start Treatment
          </Button>
        );
      case "treatment_in_progress":
        return (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setCompleteDialog(c)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" /> Complete Treatment
          </Button>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Incoming Cases</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Briefcase className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Incoming Cases</h1>
          <p className="text-sm text-muted-foreground">
            Manage patient cases assigned to your clinic
          </p>
        </div>
      </div>

      {cases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No cases assigned yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c) => {
                const badge = STATUS_BADGE[c.status] ?? {
                  label: c.status.replace(/_/g, " "),
                  variant: "secondary" as const,
                };
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.patient_name}</TableCell>
                    <TableCell>{c.condition}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant} className="capitalize">
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatBudget(c.budget_min, c.budget_max)}</TableCell>
                    <TableCell>{formatDate(c.created_at)}</TableCell>
                    <TableCell>{renderActions(c)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => { setRejectDialog(null); setRejectReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting <strong>{rejectDialog?.patient_name}</strong>'s case.
            </p>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectReason(""); }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() => rejectDialog && rejectMutation.mutate({ id: rejectDialog.id, reason: rejectReason.trim() })}
              >
                {rejectMutation.isPending ? "Rejecting…" : "Reject Case"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Treatment Plan dialog */}
      <Dialog open={!!planDialog} onOpenChange={() => { setPlanDialog(null); setPlanForm({ description: "", estimated_cost: "", estimated_duration: "" }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Treatment Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define the treatment plan for <strong>{planDialog?.patient_name}</strong>.
            </p>
            <div>
              <Label>Description</Label>
              <Textarea
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                placeholder="Describe the treatment plan..."
              />
            </div>
            <div>
              <Label>Estimated Cost (₹)</Label>
              <Input
                type="number"
                value={planForm.estimated_cost}
                onChange={(e) => setPlanForm({ ...planForm, estimated_cost: e.target.value })}
                placeholder="e.g. 50000"
              />
            </div>
            <div>
              <Label>Estimated Duration</Label>
              <Input
                value={planForm.estimated_duration}
                onChange={(e) => setPlanForm({ ...planForm, estimated_duration: e.target.value })}
                placeholder="e.g. 2 weeks"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setPlanDialog(null); setPlanForm({ description: "", estimated_cost: "", estimated_duration: "" }); }}>
                Cancel
              </Button>
              <Button
                disabled={!planForm.description.trim() || !planForm.estimated_cost || planMutation.isPending}
                onClick={() =>
                  planDialog &&
                  planMutation.mutate({
                    id: planDialog.id,
                    description: planForm.description.trim(),
                    estimated_cost: Number(planForm.estimated_cost),
                    estimated_duration: planForm.estimated_duration.trim(),
                  })
                }
              >
                {planMutation.isPending ? "Saving…" : "Submit Plan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Treatment dialog */}
      <Dialog open={!!completeDialog} onOpenChange={() => { setCompleteDialog(null); setProgramId(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Treatment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mark <strong>{completeDialog?.patient_name}</strong>'s treatment as completed.
            </p>
            <div>
              <Label>Program ID (optional)</Label>
              <Input
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                placeholder="Link to a program if applicable"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setCompleteDialog(null); setProgramId(""); }}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={completeMutation.isPending}
                onClick={() =>
                  completeDialog &&
                  completeMutation.mutate({ id: completeDialog.id, program_id: programId.trim() || undefined })
                }
              >
                {completeMutation.isPending ? "Completing…" : "Mark Complete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

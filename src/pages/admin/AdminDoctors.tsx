import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Ban } from "lucide-react";

const statusVariant = (s: string) =>
  s === "approved" || s === "active" ? "default" : s === "pending_approval" ? "secondary" : s === "suspended" ? "outline" : "destructive";
const statusLabel = (s: string) => (s === "pending_approval" ? "Pending" : s.charAt(0).toUpperCase() + s.slice(1));

type Doctor = {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
  clinic_id?: string;
  clinic_name?: string;
  approval_status: string;
  email_verified?: boolean;
  created_at?: string;
};

export default function AdminDoctors() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: doctors = [], isLoading } = useQuery<Doctor[]>({
    queryKey: ["admin", "doctors"],
    queryFn: () => api.get<Doctor[]>("admin/doctors"),
  });

  const approveMutation = useMutation({
    mutationFn: (userId: string) => api.patch(`admin/doctors/${userId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors"] });
      toast({ title: "Success", description: "Doctor approved successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (userId: string) => api.patch(`admin/doctors/${userId}/reject`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors"] });
      toast({ title: "Success", description: "Doctor rejected." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (userId: string) => api.patch(`admin/doctors/${userId}/suspend`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors"] });
      toast({ title: "Success", description: "Doctor suspended." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const showApproveReject = (status: string) => status === "pending_approval";
  const showSuspend = (status: string) => status === "approved" || status === "active";

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Doctor Management</h1>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Clinic</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Doctor Management</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Clinic</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No doctors found</TableCell>
              </TableRow>
            )}
            {doctors.map((d) => (
              <TableRow key={d.user_id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{d.email}</TableCell>
                <TableCell>{d.clinic_name || "—"}</TableCell>
                <TableCell>{d.specialization ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(d.approval_status) as "default" | "secondary" | "destructive" | "outline"}>
                    {statusLabel(d.approval_status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {showApproveReject(d.approval_status) && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => approveMutation.mutate(d.user_id)}
                          disabled={approveMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectMutation.mutate(d.user_id)}
                          disabled={rejectMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {showSuspend(d.approval_status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-muted-foreground"
                        onClick={() => suspendMutation.mutate(d.user_id)}
                        disabled={suspendMutation.isPending}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Suspend
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

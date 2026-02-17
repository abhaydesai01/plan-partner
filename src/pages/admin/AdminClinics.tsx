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

type Clinic = {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  clinic_name?: string;
  clinic_id?: string;
  address?: string;
  approval_status: string;
  email_verified?: boolean;
  created_at?: string;
};

export default function AdminClinics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clinics = [], isLoading } = useQuery<Clinic[]>({
    queryKey: ["admin", "clinics"],
    queryFn: () => api.get<Clinic[]>("admin/clinics"),
  });

  const approveMutation = useMutation({
    mutationFn: (userId: string) => api.patch(`admin/clinics/${userId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "clinics"] });
      toast({ title: "Success", description: "Clinic approved successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (userId: string) => api.patch(`admin/clinics/${userId}/reject`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "clinics"] });
      toast({ title: "Success", description: "Clinic rejected." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (userId: string) => api.patch(`admin/clinics/${userId}/suspend`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "clinics"] });
      toast({ title: "Success", description: "Clinic suspended." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");

  const showApproveReject = (status: string) => status === "pending_approval";
  const showSuspend = (status: string) => status === "approved" || status === "active";

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Clinic Management</h1>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signed Up</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
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
      <h1 className="text-2xl font-semibold">Clinic Management</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Signed Up</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clinics.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No clinics found</TableCell>
              </TableRow>
            )}
            {clinics.map((c) => (
              <TableRow key={c.user_id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.phone ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(c.approval_status) as "default" | "secondary" | "destructive" | "outline"}>
                    {statusLabel(c.approval_status)}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(c.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {showApproveReject(c.approval_status) && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => approveMutation.mutate(c.user_id)}
                          disabled={approveMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectMutation.mutate(c.user_id)}
                          disabled={rejectMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {showSuspend(c.approval_status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-muted-foreground"
                        onClick={() => suspendMutation.mutate(c.user_id)}
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

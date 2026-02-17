import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, Plus, TrendingUp } from "lucide-react";

interface RevenueData {
  total: number;
  entry_count: number;
  by_month: Record<string, number>;
  entries: any[];
}

export default function ClinicRevenue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ amount: "", description: "" });

  const { data, isLoading } = useQuery<RevenueData>({
    queryKey: ["clinic-revenue"],
    queryFn: () => api.get<RevenueData>("clinic/revenue"),
  });

  const addMutation = useMutation({
    mutationFn: (body: any) => api.post("clinic/revenue", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-revenue"] });
      toast({ title: "Revenue entry added" });
      setAddOpen(false);
      setForm({ amount: "", description: "" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message, variant: "destructive" }),
  });

  const handleAdd = () => {
    if (!form.amount) return toast({ title: "Amount is required", variant: "destructive" });
    addMutation.mutate({ amount: Number(form.amount), description: form.description });
  };

  const fmt = (v: number) => `₹${v.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Revenue</h1>
          <p className="text-muted-foreground text-sm">Track your clinic revenue</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Entry</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Revenue Entry</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Amount (INR) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 5000" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Patient consultation" /></div>
              <Button onClick={handleAdd} disabled={addMutation.isPending} className="w-full">Add Entry</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              {isLoading ? <Skeleton className="h-7 w-24" /> : <p className="text-2xl font-bold">{fmt(data?.total || 0)}</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Entries</p>
              {isLoading ? <Skeleton className="h-7 w-16" /> : <p className="text-2xl font-bold">{data?.entry_count || 0}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Entries</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.entries?.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.entry_date).toLocaleDateString()}</TableCell>
                  <TableCell>{e.description || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(e.amount)}</TableCell>
                </TableRow>
              ))}
              {!data?.entries?.length && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No revenue entries yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Plus, TrendingUp, Building2, Layers } from "lucide-react";

interface RevenueData {
  total_revenue: number;
  currency: string;
  entry_count: number;
  by_month: Record<string, number>;
  recent_entries: any[];
}

interface ByClinic { clinic_id: string; clinic_name: string; total_revenue: number; entry_count: number }
interface ByProgram { program_id: string; program_name: string; total_revenue: number; entry_count: number }

export default function AdminRevenue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ clinic_id: "", amount: "", description: "", program_id: "" });

  const { data: revenue, isLoading: loadingRev } = useQuery<RevenueData>({
    queryKey: ["admin-revenue"],
    queryFn: () => api.get<RevenueData>("admin/revenue"),
  });

  const { data: byClinic } = useQuery<ByClinic[]>({
    queryKey: ["admin-revenue-clinic"],
    queryFn: () => api.get<ByClinic[]>("admin/revenue/by-clinic"),
  });

  const { data: byProgram } = useQuery<ByProgram[]>({
    queryKey: ["admin-revenue-program"],
    queryFn: () => api.get<ByProgram[]>("admin/revenue/by-program"),
  });

  const { data: clinics } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["admin-all-clinics"],
    queryFn: () => api.get("admin/all-clinics"),
  });

  const addMutation = useMutation({
    mutationFn: (body: any) => api.post("admin/revenue", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-revenue"] });
      queryClient.invalidateQueries({ queryKey: ["admin-revenue-clinic"] });
      queryClient.invalidateQueries({ queryKey: ["admin-revenue-program"] });
      toast({ title: "Revenue entry added" });
      setAddOpen(false);
      setForm({ clinic_id: "", amount: "", description: "", program_id: "" });
    },
    onError: (err: any) => toast({ title: "Failed to add entry", description: err?.message, variant: "destructive" }),
  });

  const handleAdd = () => {
    if (!form.clinic_id || !form.amount) return toast({ title: "Clinic and amount required", variant: "destructive" });
    addMutation.mutate({ clinic_id: form.clinic_id, amount: Number(form.amount), description: form.description, program_id: form.program_id || undefined });
  };

  const fmt = (v: number) => `₹${v.toLocaleString("en-IN")}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Revenue Dashboard</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Entry</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Revenue Entry</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Clinic *</Label>
                <Select value={form.clinic_id} onValueChange={(v) => setForm({ ...form, clinic_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select clinic" /></SelectTrigger>
                  <SelectContent>{clinics?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Amount (INR) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 5000" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Monthly subscription" /></div>
              <Button onClick={handleAdd} disabled={addMutation.isPending} className="w-full">Add Entry</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><DollarSign className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-sm text-muted-foreground">Total Revenue</p>
              {loadingRev ? <Skeleton className="h-6 w-24" /> : <p className="text-xl font-bold">{fmt(revenue?.total_revenue || 0)}</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-muted-foreground">Total Entries</p>
              {loadingRev ? <Skeleton className="h-6 w-16" /> : <p className="text-xl font-bold">{revenue?.entry_count || 0}</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"><Building2 className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-sm text-muted-foreground">Active Clinics</p>
              <p className="text-xl font-bold">{byClinic?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: By Clinic / By Program / Recent */}
      <Tabs defaultValue="by-clinic">
        <TabsList><TabsTrigger value="by-clinic">By Clinic</TabsTrigger><TabsTrigger value="by-program">By Program</TabsTrigger><TabsTrigger value="recent">Recent Entries</TabsTrigger></TabsList>
        <TabsContent value="by-clinic">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow><TableHead>Clinic</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Entries</TableHead></TableRow></TableHeader>
                <TableBody>
                  {byClinic?.map((c) => (
                    <TableRow key={c.clinic_id}><TableCell>{c.clinic_name}</TableCell><TableCell className="text-right font-medium">{fmt(c.total_revenue)}</TableCell><TableCell className="text-right">{c.entry_count}</TableCell></TableRow>
                  ))}
                  {!byClinic?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No revenue data yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="by-program">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow><TableHead>Program</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Entries</TableHead></TableRow></TableHeader>
                <TableBody>
                  {byProgram?.map((p) => (
                    <TableRow key={p.program_id}><TableCell>{p.program_name}</TableCell><TableCell className="text-right font-medium">{fmt(p.total_revenue)}</TableCell><TableCell className="text-right">{p.entry_count}</TableCell></TableRow>
                  ))}
                  {!byProgram?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No revenue data yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recent">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {revenue?.recent_entries?.map((e: any) => (
                    <TableRow key={e.id}><TableCell>{new Date(e.entry_date).toLocaleDateString()}</TableCell><TableCell>{e.description || "—"}</TableCell><TableCell className="text-right font-medium">{fmt(e.amount)}</TableCell></TableRow>
                  ))}
                  {!revenue?.recent_entries?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No entries yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

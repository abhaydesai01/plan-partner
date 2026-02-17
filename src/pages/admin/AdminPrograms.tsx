import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Layers, ChevronRight } from "lucide-react";

interface ProgramData {
  id: string;
  name: string;
  description?: string;
  category?: string;
  duration_days: number;
  duration_unit?: string;
  outcome_goal?: string;
  type?: string;
  is_active: boolean;
  phases?: any[];
  created_by?: string;
  createdAt?: string;
}

export default function AdminPrograms() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "", duration_days: 90, type: "" });

  const { data: programs, isLoading } = useQuery<ProgramData[]>({
    queryKey: ["admin-programs"],
    queryFn: () => api.get<ProgramData[]>("admin/programs"),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post("admin/programs", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
      toast({ title: "Program created" });
      setOpen(false);
      setForm({ name: "", description: "", category: "", duration_days: 90, type: "" });
    },
    onError: (err: any) => toast({ title: "Failed to create program", description: err?.message, variant: "destructive" }),
  });

  const handleCreate = () => {
    if (!form.name.trim()) return toast({ title: "Name is required", variant: "destructive" });
    createMutation.mutate({ ...form, type: form.type || form.category || "General" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Programs</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Program</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Program</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Program Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Diabetes Management" /></div>
              <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Diabetes, Dental, Cardiac" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" /></div>
              <div><Label>Duration (days)</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} /></div>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">Create Program</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : !programs?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No programs yet. Create your first program above.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/admin/programs/${p.id}`)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {p.category && <Badge variant="secondary" className="mb-2">{p.category}</Badge>}
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{p.description}</p>}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{p.duration_days} days</span>
                  <Badge variant={p.is_active ? "default" : "destructive"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                {p.phases?.length ? <p className="text-xs text-muted-foreground mt-1">{p.phases.length} phase(s)</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

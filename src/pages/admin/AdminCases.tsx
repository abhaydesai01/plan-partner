import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Eye,
  StickyNote,
  ShieldCheck,
  FolderKanban,
  Plus,
  Trash2,
  IndianRupee,
  Clock,
  MapPin,
  Phone,
  Mail,
  FileText,
  Shield,
  CheckCircle2,
  User,
  AlertCircle,
} from "lucide-react";

type ApprovedHospital = {
  clinic_id: string;
  clinic_name: string;
  city: string;
  quoted_price: number;
  treatment_includes: string;
  estimated_duration: string;
  notes: string;
  approved_at: string;
};

type CaseItem = {
  id: string;
  patient_user_id: string;
  patient_name: string;
  patient_profile_phone?: string;
  patient_email?: string;
  patient_phone?: string;
  condition: string;
  condition_details?: string;
  status: string;
  matched_clinic_id?: string;
  matched_clinic_name?: string;
  selected_hospital_name?: string;
  selected_hospital_price?: number;
  budget_min?: number;
  budget_max?: number;
  preferred_location?: string;
  preferred_country?: string;
  admin_notes?: string;
  vault_code?: string;
  consent_terms_accepted?: boolean;
  document_ids?: string[];
  medical_documents?: string[];
  created_at?: string;
  approved_hospitals?: ApprovedHospital[];
  status_history?: { status: string; message: string; timestamp: string }[];
};

type ClinicOption = { id: string; name: string; address?: string; city?: string };

const ALL_STATUSES = [
  "submitted",
  "reviewing",
  "hospital_matched",
  "hospital_accepted",
  "treatment_scheduled",
  "treatment_in_progress",
  "treatment_completed",
  "cancelled",
] as const;

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-800 border-yellow-300",
  reviewing: "bg-blue-100 text-blue-800 border-blue-300",
  hospital_matched: "bg-indigo-100 text-indigo-800 border-indigo-300",
  hospital_accepted: "bg-green-100 text-green-800 border-green-300",
  treatment_scheduled: "bg-purple-100 text-purple-800 border-purple-300",
  treatment_in_progress: "bg-orange-100 text-orange-800 border-orange-300",
  treatment_completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "New Request",
  reviewing: "Reviewing",
  hospital_matched: "Hospitals Sent",
  hospital_accepted: "Patient Selected",
  treatment_scheduled: "Scheduled",
  treatment_in_progress: "In Progress",
  treatment_completed: "Completed",
  cancelled: "Cancelled",
};

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

const formatBudget = (min?: number, max?: number) => {
  if (!min && !max) return "—";
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt(min || max!);
};

export default function AdminCases() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailCase, setDetailCase] = useState<CaseItem | null>(null);
  const [notesDialog, setNotesDialog] = useState<CaseItem | null>(null);
  const [notesText, setNotesText] = useState("");

  const [addHospitalCase, setAddHospitalCase] = useState<CaseItem | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [treatmentIncludes, setTreatmentIncludes] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [hospitalNotes, setHospitalNotes] = useState("");

  const { data: cases = [], isLoading } = useQuery<CaseItem[]>({
    queryKey: ["admin", "cases"],
    queryFn: () => api.get<CaseItem[]>("admin/cases"),
  });

  const { data: clinics = [] } = useQuery<ClinicOption[]>({
    queryKey: ["admin", "all-clinics"],
    queryFn: () => api.get<ClinicOption[]>("admin/all-clinics"),
  });

  const { data: caseDetail } = useQuery<CaseItem>({
    queryKey: ["admin", "case-detail", detailCase?.id],
    queryFn: () => api.get<CaseItem>(`admin/cases/${detailCase!.id}`),
    enabled: !!detailCase,
  });

  const addHospitalMutation = useMutation({
    mutationFn: (p: { caseId: string; clinic_id: string; quoted_price: number; treatment_includes: string; estimated_duration: string; notes: string }) =>
      api.post(`admin/cases/${p.caseId}/approved-hospitals`, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Hospital added");
      resetAddForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeHospitalMutation = useMutation({
    mutationFn: ({ caseId, clinicId }: { caseId: string; clinicId: string }) =>
      api.delete(`admin/cases/${caseId}/approved-hospitals/${clinicId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Hospital removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, message }: { id: string; status: string; message?: string }) =>
      api.patch(`admin/cases/${id}/status`, { status, message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const notesMutation = useMutation({
    mutationFn: ({ id, admin_notes }: { id: string; admin_notes: string }) =>
      api.patch(`admin/cases/${id}/notes`, { admin_notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Notes saved");
      setNotesDialog(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = useMemo(
    () => (statusFilter === "all" ? cases : cases.filter((c) => c.status === statusFilter)),
    [cases, statusFilter],
  );

  function resetAddForm() {
    setAddHospitalCase(null);
    setSelectedClinicId("");
    setQuotedPrice("");
    setTreatmentIncludes("");
    setEstimatedDuration("");
    setHospitalNotes("");
  }

  const detail = caseDetail || detailCase;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Case Management</h1>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Case Management</h1>
            <p className="text-sm text-muted-foreground">
              {cases.filter((c) => c.status === "submitted").length} new ·{" "}
              {cases.filter((c) => c.status === "hospital_accepted").length} patient selected
            </p>
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses ({cases.length})</SelectItem>
            {ALL_STATUSES.map((s) => {
              const count = cases.filter((c) => c.status === s).length;
              return (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]} ({count})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No cases found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Patient Choice</TableHead>
                <TableHead>Hospitals</TableHead>
                <TableHead>Vault</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const hospitalCount = (c.approved_hospitals || []).length;
                const hasSelection = !!c.selected_hospital_name;
                return (
                  <TableRow key={c.id} className={c.status === "submitted" ? "bg-yellow-50/50 dark:bg-yellow-900/5" : hasSelection ? "bg-green-50/50 dark:bg-green-900/5" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{c.patient_name}</p>
                        <p className="text-xs text-muted-foreground">{c.patient_phone || c.patient_profile_phone || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{c.condition}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-800"}`}>
                        {STATUS_LABELS[c.status] || c.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{formatBudget(c.budget_min, c.budget_max)}</TableCell>
                    <TableCell>
                      {hasSelection ? (
                        <div>
                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {c.selected_hospital_name}
                          </p>
                          {c.selected_hospital_price && (
                            <p className="text-[11px] text-muted-foreground">
                              ₹{c.selected_hospital_price.toLocaleString("en-IN")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={hospitalCount ? "default" : "secondary"} className="text-[11px]">
                        {hospitalCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.vault_code ? "outline" : "secondary"} className="text-[10px]">
                        {c.vault_code ? <><Shield className="h-2.5 w-2.5 mr-0.5" />{c.vault_code}</> : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => setDetailCase(c)} title="View full details">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" onClick={() => setAddHospitalCase(c)} title="Add hospital with quote">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        {c.status === "submitted" && (
                          <Button size="sm" variant="outline"
                            onClick={() => statusMutation.mutate({ id: c.id, status: "reviewing", message: "Mediimate team is reviewing your request and contacting hospitals." })}
                            disabled={statusMutation.isPending}
                          >
                            Review
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { setNotesDialog(c); setNotesText(c.admin_notes || ""); }}>
                          <StickyNote className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Full Case Detail Dialog ──────────────────── */}
      <Dialog open={!!detailCase} onOpenChange={() => setDetailCase(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Case Details</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-5">
              {/* Patient Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" /> Patient
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium">{detail.patient_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {detail.patient_phone || detail.patient_profile_phone || "—"}
                    </p>
                  </div>
                  {detail.patient_email && (
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {detail.patient_email}
                      </p>
                    </div>
                  )}
                  {detail.vault_code && (
                    <div>
                      <p className="text-xs text-muted-foreground">Vault Code</p>
                      <p className="font-mono font-bold tracking-widest text-primary flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {detail.vault_code}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Request Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Request
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Condition</p>
                      <p className="font-medium">{detail.condition}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[detail.status] ?? ""}`}>
                        {STATUS_LABELS[detail.status] || detail.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Budget</p>
                      <p className="font-medium">{formatBudget(detail.budget_min, detail.budget_max)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="font-medium">{detail.preferred_location || "Any"} · {detail.preferred_country || "India"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-medium">{formatDate(detail.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Consent</p>
                      <p className="font-medium flex items-center gap-1">
                        {detail.consent_terms_accepted
                          ? <><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Accepted</>
                          : <><AlertCircle className="h-3 w-3 text-amber-500" /> Not given</>}
                      </p>
                    </div>
                  </div>
                  {detail.condition_details && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Condition Details</p>
                      <p className="text-muted-foreground">{detail.condition_details}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Documents */}
              {((detail.medical_documents?.length ?? 0) > 0 || (detail.document_ids?.length ?? 0) > 0) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Uploaded Documents ({detail.medical_documents?.length || detail.document_ids?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {(detail.medical_documents || []).map((doc, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-sm truncate">{doc}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Patient's Hospital Selection */}
              {detail.selected_hospital_name && (
                <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Patient Selected Hospital
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{detail.selected_hospital_name}</p>
                      {detail.selected_hospital_price && (
                        <p className="text-sm text-muted-foreground">₹{detail.selected_hospital_price.toLocaleString("en-IN")}</p>
                      )}
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-0">Selected by Patient</Badge>
                  </CardContent>
                </Card>
              )}

              {/* Hospital Options */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Hospital Options ({(detail.approved_hospitals || []).length})
                    </CardTitle>
                    <Button size="sm" onClick={() => { setDetailCase(null); setAddHospitalCase(detail); }}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(detail.approved_hospitals || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hospitals added. Add hospitals with quoted prices.
                    </p>
                  ) : (
                    (detail.approved_hospitals || []).map((h) => {
                      const isSelected = detail.matched_clinic_id === h.clinic_id && detail.status !== "hospital_matched";
                      return (
                        <div key={h.clinic_id}
                          className={`border rounded-lg p-3 flex items-start justify-between gap-3 ${isSelected ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10" : ""}`}
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{h.clinic_name}</p>
                              {isSelected && (
                                <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] gap-0.5">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Patient's Choice
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {h.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {h.city}</span>}
                              <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> ₹{h.quoted_price?.toLocaleString("en-IN")}</span>
                              {h.estimated_duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {h.estimated_duration}</span>}
                            </div>
                            {h.treatment_includes && <p className="text-xs text-muted-foreground mt-1">{h.treatment_includes}</p>}
                          </div>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive shrink-0"
                            onClick={() => removeHospitalMutation.mutate({ caseId: detail.id, clinicId: h.clinic_id })}
                            disabled={removeHospitalMutation.isPending}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Status History */}
              {(detail.status_history || []).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Status History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(detail.status_history || []).map((h, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div>
                            <p className="text-foreground">{h.message}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(h.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Admin Notes */}
              {detail.admin_notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <StickyNote className="h-4 w-4" /> Admin Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{detail.admin_notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                {detail.status === "submitted" && (
                  <Button size="sm"
                    onClick={() => { statusMutation.mutate({ id: detail.id, status: "reviewing", message: "Mediimate team is reviewing your request and contacting hospitals." }); setDetailCase(null); }}
                    disabled={statusMutation.isPending}>
                    Start Review
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setDetailCase(null); setAddHospitalCase(detail); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Hospital
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setNotesDialog(detail); setNotesText(detail.admin_notes || ""); setDetailCase(null); }}>
                  <StickyNote className="h-3.5 w-3.5 mr-1" /> Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Hospital Dialog ──────────────────── */}
      <Dialog open={!!addHospitalCase} onOpenChange={() => resetAddForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Hospital Option</DialogTitle>
          </DialogHeader>
          {addHospitalCase && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium">{addHospitalCase.patient_name}</p>
                <p className="text-muted-foreground">{addHospitalCase.condition}</p>
                <p className="text-muted-foreground">
                  Budget: {formatBudget(addHospitalCase.budget_min, addHospitalCase.budget_max)}
                  {addHospitalCase.preferred_location && ` · ${addHospitalCase.preferred_location}`}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Hospital *</Label>
                <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
                  <SelectTrigger><SelectValue placeholder="Select a hospital..." /></SelectTrigger>
                  <SelectContent>
                    {clinics.map((cl) => (
                      <SelectItem key={cl.id} value={cl.id}>
                        {cl.name}{cl.city ? ` — ${cl.city}` : cl.address ? ` — ${cl.address}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Quoted Price (₹) *</Label>
                  <Input type="number" min={0} placeholder="e.g. 350000" value={quotedPrice} onChange={(e) => setQuotedPrice(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Duration</Label>
                  <Input placeholder="e.g. 2 weeks" value={estimatedDuration} onChange={(e) => setEstimatedDuration(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Treatment Includes</Label>
                <Textarea placeholder="Surgery + hospitalization + physiotherapy + medications..." value={treatmentIncludes} onChange={(e) => setTreatmentIncludes(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea placeholder="Internal notes..." value={hospitalNotes} onChange={(e) => setHospitalNotes(e.target.value)} rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetAddForm}>Cancel</Button>
                <Button disabled={!selectedClinicId || !quotedPrice || addHospitalMutation.isPending}
                  onClick={() => addHospitalMutation.mutate({
                    caseId: addHospitalCase.id,
                    clinic_id: selectedClinicId,
                    quoted_price: Number(quotedPrice),
                    treatment_includes: treatmentIncludes.trim(),
                    estimated_duration: estimatedDuration.trim(),
                    notes: hospitalNotes.trim(),
                  })}>
                  {addHospitalMutation.isPending ? "Adding…" : "Add Hospital"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Notes Dialog ──────────────────── */}
      <Dialog open={!!notesDialog} onOpenChange={() => { setNotesDialog(null); setNotesText(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Admin Notes</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Notes for {notesDialog?.patient_name}</Label>
              <Textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="Add internal notes..." rows={4} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setNotesDialog(null); setNotesText(""); }}>Cancel</Button>
              <Button disabled={notesMutation.isPending}
                onClick={() => notesDialog && notesMutation.mutate({ id: notesDialog.id, admin_notes: notesText.trim() })}>
                {notesMutation.isPending ? "Saving…" : "Save Notes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

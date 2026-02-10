import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Upload, FileText, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";

const categoryColors: Record<string, string> = {
  general: "bg-muted text-muted-foreground",
  lab: "bg-primary/10 text-primary",
  prescription: "bg-accent/10 text-accent",
  imaging: "bg-whatsapp/10 text-whatsapp",
  insurance: "bg-muted text-muted-foreground",
};

const DoctorDocuments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_id: "", category: "general", notes: "" });
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const [docsRes, patientsRes] = await Promise.all([
      supabase.from("patient_documents").select("*, patients(full_name)").eq("doctor_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("patients").select("id, full_name").eq("doctor_id", user.id).order("full_name"),
    ]);
    setDocuments(docsRes.data || []);
    setPatients(patientsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !form.patient_id || !user) return;
    setUploading(true);

    const filePath = `${user.id}/${form.patient_id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("patient-documents").upload(filePath, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("patient_documents").insert({
      patient_id: form.patient_id,
      doctor_id: user.id,
      uploaded_by: user.id,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size_bytes: file.size,
      category: form.category,
      notes: form.notes || null,
    });

    if (dbError) {
      toast({ title: "Error", description: dbError.message, variant: "destructive" });
    } else {
      toast({ title: "Document uploaded" });
      setShowForm(false);
      setForm({ patient_id: "", category: "general", notes: "" });
      fetchData();
    }
    setUploading(false);
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from("patient-documents").download(filePath);
    if (error) { toast({ title: "Download failed", description: error.message, variant: "destructive" }); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  };

  const deleteDoc = async (id: string, filePath: string) => {
    await supabase.storage.from("patient-documents").remove([filePath]);
    await supabase.from("patient_documents").delete().eq("id", id);
    fetchData();
    toast({ title: "Document deleted" });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground text-sm">{documents.length} patient documents</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-foreground">Upload Document</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <select required value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="general">General</option>
                <option value="lab">Lab Report</option>
                <option value="prescription">Prescription</option>
                <option value="imaging">Imaging</option>
                <option value="insurance">Insurance</option>
              </select>
              <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <label className={`block w-full py-8 rounded-lg border-2 border-dashed border-border bg-muted/30 text-center transition-colors ${form.patient_id ? "cursor-pointer hover:border-primary/50" : "opacity-50 cursor-not-allowed"}`}>
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{uploading ? "Uploading..." : form.patient_id ? "Click to select a file" : "Select a patient first"}</p>
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading || !form.patient_id} />
              </label>
            </div>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
          <Upload className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No documents yet.
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(d => (
            <div key={d.id} className="glass-card rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{d.file_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{(d.patients as any)?.full_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${categoryColors[d.category] || ""}`}>{d.category}</span>
                    <span>{format(new Date(d.created_at), "MMM d, yyyy")}</span>
                    {d.file_size_bytes && <span>{formatSize(d.file_size_bytes)}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => downloadFile(d.file_path, d.file_name)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => deleteDoc(d.id, d.file_path)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorDocuments;

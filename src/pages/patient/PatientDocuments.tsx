import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Upload, FileText, Download, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const categoryColors: Record<string, string> = {
  general: "bg-muted text-muted-foreground",
  lab: "bg-primary/10 text-primary",
  prescription: "bg-accent/10 text-accent",
  imaging: "bg-whatsapp/10 text-whatsapp",
  insurance: "bg-muted text-muted-foreground",
};

const PatientDocuments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("general");
  const [uploadNotes, setUploadNotes] = useState("");

  const fetchDocuments = async () => {
    if (!user) return;
    const { data: patient } = await supabase.from("patients").select("id, doctor_id").eq("patient_user_id", user.id).maybeSingle();
    if (!patient) { setLoading(false); return; }
    setPatientId(patient.id);
    setDoctorId(patient.doctor_id);
    const { data } = await supabase.from("patient_documents").select("*").eq("patient_id", patient.id).order("created_at", { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patientId || !doctorId || !user) return;
    setUploading(true);

    const filePath = `${doctorId}/${patientId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("patient-documents").upload(filePath, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("patient_documents").insert({
      patient_id: patientId,
      doctor_id: doctorId,
      uploaded_by: user.id,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size_bytes: file.size,
      category: uploadCategory,
      notes: uploadNotes || null,
    });

    if (dbError) {
      toast({ title: "Error saving document", description: dbError.message, variant: "destructive" });
    } else {
      toast({ title: "Document uploaded" });
      setShowUpload(false);
      setUploadCategory("general");
      setUploadNotes("");
      fetchDocuments();
    }
    setUploading(false);
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from("patient-documents").download(filePath);
    if (error) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
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
          <p className="text-muted-foreground text-sm">{documents.length} documents</p>
        </div>
        {patientId && (
          <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Upload Document
          </button>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-foreground">Upload Document</h2>
              <button onClick={() => setShowUpload(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="general">General</option>
                <option value="lab">Lab Report</option>
                <option value="prescription">Prescription</option>
                <option value="imaging">Imaging</option>
                <option value="insurance">Insurance</option>
              </select>
              <input placeholder="Notes (optional)" value={uploadNotes} onChange={e => setUploadNotes(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <label className="block w-full py-8 rounded-lg border-2 border-dashed border-border bg-muted/30 text-center cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to select a file"}</p>
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
          <Upload className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No documents uploaded yet.
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
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${categoryColors[d.category] || ""}`}>{d.category}</span>
                    <span>{format(new Date(d.created_at), "MMM d, yyyy")}</span>
                    {d.file_size_bytes && <span>{formatSize(d.file_size_bytes)}</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => downloadFile(d.file_path, d.file_name)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0">
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientDocuments;

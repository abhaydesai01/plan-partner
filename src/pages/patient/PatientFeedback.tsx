import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { MessageSquare, Star, X, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeedbackRequestItem {
  id: string;
  token: string;
  doctor_name: string;
  clinic_name: string | null;
  appointment_title?: string;
  scheduled_at?: string;
  has_clinic?: boolean;
}

const PatientFeedback = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<FeedbackRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalRequest, setModalRequest] = useState<FeedbackRequestItem | null>(null);
  const [form, setForm] = useState({
    doctor_rating: 0,
    clinic_rating: 0,
    review_text: "",
    consent_to_publish: false,
    is_testimonial: false,
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      const data = await api.get<FeedbackRequestItem[]>("me/feedback_requests");
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const openForm = (req: FeedbackRequestItem) => {
    setModalRequest(req);
    setForm({
      doctor_rating: 0,
      clinic_rating: 0,
      review_text: "",
      consent_to_publish: false,
      is_testimonial: false,
    });
    setVideoFile(null);
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalRequest || form.doctor_rating < 1 || form.doctor_rating > 5) {
      toast({ title: "Please rate your doctor (1–5 stars)", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("feedback_request_id", modalRequest.id);
      formData.append("doctor_rating", String(form.doctor_rating));
      if (modalRequest.clinic_name && form.clinic_rating) formData.append("clinic_rating", String(form.clinic_rating));
      if (form.review_text.trim()) formData.append("review_text", form.review_text.trim());
      formData.append("consent_to_publish", form.consent_to_publish ? "true" : "false");
      formData.append("is_testimonial", form.is_testimonial ? "true" : "false");
      if (videoFile) formData.append("video", videoFile);
      await api.upload("me/feedbacks", formData);
      toast({ title: "Thank you! Your feedback was submitted." });
      setModalRequest(null);
      fetchRequests();
    } catch (err: unknown) {
      toast({ title: "Failed to submit", description: (err as Error).message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const StarRating = ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (n: number) => void;
    label: string;
  }) => (
    <div>
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star
              className={`w-8 h-8 ${value >= n ? "fill-amber-400 text-amber-500" : "text-muted-foreground/40"}`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground truncate">Feedback</h1>
        <p className="text-muted-foreground text-sm mt-1">
          After your doctor marks an appointment as completed, you can share your experience here. Your feedback helps the doctor and clinic improve.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground">No feedback requests right now</p>
          <p className="text-sm mt-2">
            When a doctor marks your appointment as completed, you’ll get a request here to rate your visit and leave a review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Pending feedback</h3>
          {requests.map((req) => (
            <div
              key={req.id}
              className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border"
            >
              <div>
                <p className="font-medium text-foreground">{req.doctor_name}</p>
                {req.clinic_name && <p className="text-sm text-muted-foreground">{req.clinic_name}</p>}
                {req.appointment_title && (
                  <p className="text-sm text-muted-foreground mt-1">{req.appointment_title}</p>
                )}
                {req.scheduled_at && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(req.scheduled_at), "MMM d, yyyy")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => openForm(req)}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <Star className="w-4 h-4" /> Give feedback
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Feedback form modal */}
      {modalRequest && (
        <div
          className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4"
          onClick={() => !submitting && setModalRequest(null)}
        >
          <div
            className="glass-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-bold text-foreground">Share your experience</h2>
              <button
                type="button"
                onClick={() => !submitting && setModalRequest(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {modalRequest.doctor_name}
              {modalRequest.clinic_name && ` · ${modalRequest.clinic_name}`}
              {modalRequest.appointment_title && ` · ${modalRequest.appointment_title}`}
            </p>

            <form onSubmit={submitFeedback} className="space-y-4">
              <StarRating
                label="Rate your doctor (required)"
                value={form.doctor_rating}
                onChange={(n) => setForm((f) => ({ ...f, doctor_rating: n }))}
              />
              {modalRequest.clinic_name && (
                <StarRating
                  label="Rate the clinic"
                  value={form.clinic_rating}
                  onChange={(n) => setForm((f) => ({ ...f, clinic_rating: n }))}
                />
              )}
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Review (optional)</label>
                <textarea
                  placeholder="How was your experience?"
                  value={form.review_text}
                  onChange={(e) => setForm((f) => ({ ...f, review_text: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-2">
                  <Video className="w-4 h-4" /> Video testimonial (optional)
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary"
                />
                {videoFile && (
                  <p className="text-xs text-muted-foreground mt-1">{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent_to_publish}
                  onChange={(e) => setForm((f) => ({ ...f, consent_to_publish: e.target.checked }))}
                  className="rounded border-border"
                />
                <span className="text-sm text-foreground">I’m happy for my review to be shown to the doctor and clinic</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_testimonial}
                  onChange={(e) => setForm((f) => ({ ...f, is_testimonial: e.target.checked }))}
                  className="rounded border-border"
                />
                <span className="text-sm text-foreground">Use this as a testimonial (may be shown publicly)</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalRequest(null)}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg border border-border font-medium text-sm hover:bg-muted/50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || form.doctor_rating < 1}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientFeedback;

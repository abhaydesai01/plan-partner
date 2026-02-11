import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Star, Upload, Video, Send, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const PublicFeedback = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [feedbackRequest, setFeedbackRequest] = useState<any>(null);
  const [doctorName, setDoctorName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [doctorRating, setDoctorRating] = useState(0);
  const [clinicRating, setClinicRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [consentToPublish, setConsentToPublish] = useState(false);
  const [isTestimonial, setIsTestimonial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) { setError("Invalid feedback link."); setLoading(false); return; }
    fetchRequest();
  }, [token]);

  const fetchRequest = async () => {
    const { data, error: fetchErr } = await supabase
      .from("feedback_requests")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (fetchErr || !data) { setError("Feedback link not found or expired."); setLoading(false); return; }
    if (data.status === "submitted") { setSubmitted(true); setLoading(false); return; }
    if (new Date(data.expires_at) < new Date()) { setError("This feedback link has expired."); setLoading(false); return; }

    setFeedbackRequest(data);

    // Fetch doctor name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", data.doctor_id)
      .maybeSingle();
    setDoctorName(profile?.full_name || "Your Doctor");

    // Fetch clinic name if applicable
    if (data.clinic_id) {
      const { data: clinic } = await supabase
        .from("clinics")
        .select("name")
        .eq("id", data.clinic_id)
        .maybeSingle();
      setClinicName(clinic?.name || "");
    }

    setLoading(false);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert("Video must be under 20MB");
      return;
    }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!feedbackRequest || doctorRating === 0) return;
    setSubmitting(true);

    try {
      let videoUrl: string | null = null;

      // Upload video if provided
      if (videoFile) {
        const ext = videoFile.name.split(".").pop();
        const path = `${feedbackRequest.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("feedback-videos")
          .upload(path, videoFile, { contentType: videoFile.type });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("feedback-videos").getPublicUrl(path);
        videoUrl = urlData.publicUrl;
      }

      // Insert feedback
      const { error: insertErr } = await supabase.from("feedbacks").insert({
        feedback_request_id: feedbackRequest.id,
        appointment_id: feedbackRequest.appointment_id,
        doctor_id: feedbackRequest.doctor_id,
        patient_id: feedbackRequest.patient_id,
        clinic_id: feedbackRequest.clinic_id,
        doctor_rating: doctorRating,
        clinic_rating: clinicRating || null,
        review_text: reviewText || null,
        video_url: videoUrl,
        is_testimonial: isTestimonial,
        consent_to_publish: consentToPublish,
      } as any);

      if (insertErr) throw insertErr;

      // Update feedback request status
      await supabase
        .from("feedback_requests")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", feedbackRequest.id);

      setSubmitted(true);
    } catch (err: any) {
      alert("Failed to submit: " + err.message);
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-3 max-w-sm">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h1 className="text-xl font-heading font-bold text-foreground">Oops!</h1>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-3 max-w-sm">
        <CheckCircle className="w-16 h-16 text-whatsapp mx-auto" />
        <h1 className="text-2xl font-heading font-bold text-foreground">Thank You! 🎉</h1>
        <p className="text-muted-foreground">Your feedback has been submitted. It helps us improve care quality.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-heading font-bold text-foreground">Share Your Experience</h1>
          <p className="text-muted-foreground text-sm">
            How was your visit with <span className="font-semibold text-foreground">{doctorName}</span>?
          </p>
          {feedbackRequest.completion_remarks && (
            <div className="mt-3 bg-muted/50 rounded-lg p-3 text-left">
              <p className="text-xs font-medium text-muted-foreground mb-1">Doctor's Notes:</p>
              <p className="text-sm text-foreground">{feedbackRequest.completion_remarks}</p>
            </div>
          )}
        </div>

        {/* Doctor Rating */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <label className="text-sm font-semibold text-foreground block">Rate Your Doctor</label>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setDoctorRating(n)} className="transition-transform hover:scale-110">
                <Star className={cn("w-10 h-10", n <= doctorRating ? "fill-accent text-accent" : "text-border")} />
              </button>
            ))}
          </div>
          {doctorRating > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][doctorRating]}
            </p>
          )}
        </div>

        {/* Clinic Rating */}
        {(clinicName || feedbackRequest.clinic_id) && (
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <label className="text-sm font-semibold text-foreground block">
              Rate the Clinic {clinicName && <span className="text-muted-foreground font-normal">({clinicName})</span>}
            </label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setClinicRating(n)} className="transition-transform hover:scale-110">
                  <Star className={cn("w-10 h-10", n <= clinicRating ? "fill-accent text-accent" : "text-border")} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text Review */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <label className="text-sm font-semibold text-foreground block">Your Review</label>
          <textarea
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            placeholder="Tell us about your experience..."
            rows={4}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        {/* Video Upload */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <label className="text-sm font-semibold text-foreground block flex items-center gap-2">
            <Video className="w-4 h-4" /> Video Testimonial (optional)
          </label>
          <p className="text-xs text-muted-foreground">Share a short video about your experience. Max 20MB.</p>
          {videoPreview ? (
            <div className="space-y-2">
              <video src={videoPreview} controls className="w-full rounded-lg max-h-48" />
              <button onClick={() => { setVideoFile(null); setVideoPreview(null); }} className="text-xs text-destructive hover:underline">
                Remove video
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Tap to upload video</span>
              <input type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
            </label>
          )}
        </div>

        {/* Consent */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isTestimonial}
              onChange={e => setIsTestimonial(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">I'd like this to be used as a testimonial</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentToPublish}
              onChange={e => setConsentToPublish(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">I consent to publishing my review publicly</span>
          </label>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || doctorRating === 0}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
        >
          {submitting ? "Submitting..." : <>
            <Send className="w-4 h-4" /> Submit Feedback
          </>}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Your feedback is confidential and helps improve healthcare quality.
        </p>
      </div>
    </div>
  );
};

export default PublicFeedback;

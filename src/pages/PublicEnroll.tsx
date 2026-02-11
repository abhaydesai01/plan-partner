import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CheckCircle,
  User,
  Phone,
  Shield,
  Heart,
  Stethoscope,
  Building2,
  Loader2,
  QrCode,
  Copy,
  ExternalLink,
} from "lucide-react";

interface DoctorInfo {
  doctor: { name: string; specialties: string[]; code: string };
  clinic: { name: string; address: string; phone: string } | null;
  programs: Array<{ id: string; name: string; type: string; description: string; duration_days: number }>;
}

const PublicEnroll = () => {
  const { doctorCode } = useParams<{ doctorCode: string }>();
  const [info, setInfo] = useState<DoctorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [step, setStep] = useState(1); // 1=consent, 2=profile, 3=program, 4=done
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    age: "",
    gender: "",
    conditions: "",
    medications: "",
    emergency_contact: "",
    language_preference: "en",
    program_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    const fetchDoctor = async () => {
      if (!doctorCode) return;
      try {
        const res = await fetch(`${apiBase}/patient-enroll?code=${encodeURIComponent(doctorCode)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError((err as { error?: string }).error || "Doctor not found");
          setLoading(false);
          return;
        }
        const result = await res.json();
        setInfo(result);
      } catch {
        setError("Doctor not found");
      }
      setLoading(false);
    };
    fetchDoctor();
  }, [doctorCode, apiBase]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`${apiBase}/patient-enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_code: doctorCode, ...form }),
      });
      const result = await res.json();
      if (!res.ok) {
        setSubmitError((result as { error?: string }).error || "Failed to enroll");
        setSubmitting(false);
        return;
      }
      setStep(4);
    } catch {
      setSubmitError("Failed to enroll");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 text-center max-w-md w-full">
          <Stethoscope className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-foreground mb-2">Invalid Link</h1>
          <p className="text-muted-foreground text-sm">{error || "This enrollment link is not valid. Please check the link or QR code and try again."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary/5 border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-heading font-bold text-foreground">
            {info.clinic?.name || `Dr. ${info.doctor.name}`}
          </h1>
          {info.clinic && (
            <p className="text-sm text-muted-foreground mt-1">{info.clinic.address}</p>
          )}
          <div className="flex flex-wrap justify-center gap-1.5 mt-2">
            {info.doctor.specialties.map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{s}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step > s ? "bg-whatsapp text-whatsapp-foreground" :
                step === s ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? "bg-whatsapp" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Consent */}
        {step === 1 && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-heading font-bold text-foreground">Consent & Privacy</h2>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
              <p>By enrolling in this care program, you consent to:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Sharing your health information with <strong className="text-foreground">Dr. {info.doctor.name}</strong> and their clinic</li>
                <li>Receiving health reminders and check-ins via WhatsApp, SMS, or phone calls</li>
                <li>Your data being securely stored and processed for care management</li>
                <li>Being contacted for appointment reminders and medication adherence follow-ups</li>
              </ul>
              <p className="text-xs mt-2">You can withdraw consent at any time by contacting your doctor or clinic.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Preferred Language</label>
              <select
                value={form.language_preference}
                onChange={(e) => setForm({ ...form, language_preference: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
                <option value="kn">Kannada</option>
                <option value="ml">Malayalam</option>
                <option value="mr">Marathi</option>
                <option value="bn">Bengali</option>
                <option value="gu">Gujarati</option>
              </select>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">
                I have read and agree to the above terms. I consent to share my health data with my doctor for care management.
              </span>
            </label>

            <button
              onClick={() => setStep(2)}
              disabled={!consentChecked}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              I Agree — Continue
            </button>
          </div>
        )}

        {/* Step 2: Health Profile */}
        {step === 2 && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-heading font-bold text-foreground">Your Health Profile</h2>
            </div>

            <div className="space-y-3">
              <input
                required
                placeholder="Full Name *"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                required
                placeholder="Phone Number * (e.g. 9876543210)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Age"
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <input
                placeholder="Current Conditions (e.g. Diabetes; Hypertension)"
                value={form.conditions}
                onChange={(e) => setForm({ ...form, conditions: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                placeholder="Current Medications (e.g. Metformin; Amlodipine)"
                value={form.medications}
                onChange={(e) => setForm({ ...form, medications: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                placeholder="Emergency Contact (name & phone)"
                value={form.emergency_contact}
                onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (!form.full_name.trim() || !form.phone.trim()) return;
                  setStep(3);
                }}
                disabled={!form.full_name.trim() || !form.phone.trim()}
                className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Program Selection */}
        {step === 3 && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Heart className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-heading font-bold text-foreground">Select Care Program</h2>
            </div>

            {info.programs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No programs available right now. You'll be enrolled without a specific program.</p>
            ) : (
              <div className="space-y-2">
                {info.programs.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setForm({ ...form, program_id: form.program_id === p.id ? "" : p.id })}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      form.program_id === p.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-foreground">{p.name}</h3>
                      <span className="text-xs text-muted-foreground">{p.duration_days} days</span>
                    </div>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                    )}
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium capitalize">
                      {p.type}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {submitError && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">{submitError}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {submitting ? "Enrolling..." : "Complete Enrollment"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="glass-card rounded-2xl p-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-whatsapp mx-auto" />
            <h2 className="text-xl font-heading font-bold text-foreground">Enrollment Complete!</h2>
            <p className="text-muted-foreground text-sm">
              You've been enrolled with <strong>Dr. {info.doctor.name}</strong>.
              {form.program_id && " Your care program will begin shortly."}
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-1">
              <p>What happens next:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                <li>Your doctor will review your profile</li>
                <li>You'll receive a welcome message</li>
                <li>Reminders and check-ins will begin as per your program</li>
              </ul>
            </div>
            {info.clinic?.phone && (
              <p className="text-xs text-muted-foreground">
                Questions? Contact the clinic at <strong>{info.clinic.phone}</strong>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicEnroll;

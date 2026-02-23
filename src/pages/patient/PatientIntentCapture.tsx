import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Stethoscope,
  IndianRupee,
  MapPin,
  Clock,
  Plane,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConditionItem {
  id: string;
  condition: string;
  specialty: string;
  category?: string;
}

const TIMELINE_OPTIONS = [
  { value: "immediate", label: "Immediate", desc: "As soon as possible" },
  { value: "1_month", label: "Within 1 Month", desc: "Flexible on exact date" },
  { value: "3_months", label: "Within 3 Months", desc: "Planning ahead" },
  { value: "flexible", label: "Flexible", desc: "No urgency" },
];

const TRAVEL_OPTIONS = [
  { value: "domestic", label: "Domestic", desc: "Treatment within my country" },
  { value: "international", label: "International", desc: "Open to traveling abroad" },
];

const STEPS = [
  { icon: Stethoscope, title: "Condition" },
  { icon: IndianRupee, title: "Budget" },
  { icon: MapPin, title: "Location" },
  { icon: Clock, title: "Timeline" },
  { icon: Plane, title: "Travel" },
];

const PatientIntentCapture = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const conditionInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    condition: "",
    budget_min: "",
    budget_max: "",
    preferred_location: "",
    preferred_country: "",
    timeline: "flexible",
    travel_type: "domestic",
  });

  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: conditions } = useQuery<ConditionItem[]>({
    queryKey: ["conditions-list"],
    queryFn: () => api.get<ConditionItem[]>("hospitals/conditions"),
    staleTime: 5 * 60 * 1000,
  });

  const filteredConditions = (conditions || []).filter(
    (c) =>
      form.condition.length >= 2 &&
      c.condition.toLowerCase().includes(form.condition.toLowerCase())
  );

  useEffect(() => {
    if (step === 0) conditionInputRef.current?.focus();
  }, [step]);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const canProceed = () => {
    if (step === 0) return form.condition.trim().length >= 2;
    return true;
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!form.condition.trim()) {
      toast.error("Please enter your condition");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        condition: form.condition.trim(),
        budget_min: form.budget_min ? Number(form.budget_min) : undefined,
        budget_max: form.budget_max ? Number(form.budget_max) : undefined,
        preferred_location: form.preferred_location.trim() || undefined,
        preferred_country: form.preferred_country.trim() || undefined,
        timeline: form.timeline,
        travel_type: form.travel_type,
      };

      const result = await api.post<{ hospitals: any[]; intent: any }>("hospitals/match", payload);

      const intentParam = encodeURIComponent(JSON.stringify(result.intent));
      const hospitalsParam = encodeURIComponent(JSON.stringify(result.hospitals));
      sessionStorage.setItem("matchedHospitals", JSON.stringify(result.hospitals));
      sessionStorage.setItem("matchIntent", JSON.stringify(result.intent));

      navigate(`/patient/hospitals?matched=true`);
    } catch (err: any) {
      toast.error(err.message || "Failed to find hospitals");
    } finally {
      setSubmitting(false);
    }
  };

  const StepIcon = STEPS[step].icon;

  return (
    <div className="w-full max-w-full min-w-0 flex flex-col items-center justify-center min-h-[70vh] px-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <button
              onClick={() => i < step && setStep(i)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i === step
                  ? "bg-primary text-primary-foreground scale-110"
                  : i < step
                    ? "bg-primary/20 text-primary cursor-pointer"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <s.icon className="w-3.5 h-3.5" />
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-6 sm:w-10 h-0.5 rounded ${i < step ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="w-full max-w-lg">
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Step 0: Condition */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    What condition do you need treatment for?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    We'll match you with the best hospitals
                  </p>
                </div>
              </div>

              <div className="relative">
                <Input
                  ref={conditionInputRef}
                  placeholder="e.g. Knee Replacement, Heart Bypass, Dental Implants..."
                  value={form.condition}
                  onChange={(e) => {
                    update("condition", e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="text-base py-3"
                  onKeyDown={(e) => e.key === "Enter" && canProceed() && next()}
                />
                {showSuggestions && filteredConditions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredConditions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => {
                          update("condition", c.condition);
                          setShowSuggestions(false);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors text-sm"
                      >
                        <span className="font-medium text-foreground">{c.condition}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{c.specialty}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Budget */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    What's your budget range?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Optional -- helps find hospitals within your range
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Minimum (INR)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 200000"
                    value={form.budget_min}
                    onChange={(e) => update("budget_min", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Maximum (INR)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 500000"
                    value={form.budget_max}
                    onChange={(e) => update("budget_max", e.target.value)}
                  />
                </div>
              </div>

              {form.budget_min && form.budget_max && (
                <p className="text-xs text-muted-foreground text-center">
                  Budget: ₹{Number(form.budget_min).toLocaleString("en-IN")} – ₹{Number(form.budget_max).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    Where do you prefer treatment?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Leave empty for anywhere
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">City</Label>
                  <Input
                    placeholder="e.g. Mumbai, Bangalore, Chennai"
                    value={form.preferred_location}
                    onChange={(e) => update("preferred_location", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Country</Label>
                  <Input
                    placeholder="e.g. India, Thailand"
                    value={form.preferred_country}
                    onChange={(e) => update("preferred_country", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Timeline */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    How soon do you need treatment?
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {TIMELINE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("timeline", opt.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.timeline === opt.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <span className={`text-sm font-medium ${form.timeline === opt.value ? "text-primary" : "text-foreground"}`}>
                      {opt.label}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Travel */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plane className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    Are you traveling from another country?
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {TRAVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("travel_type", opt.value)}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      form.travel_type === opt.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <span className={`text-sm font-medium block ${form.travel_type === opt.value ? "text-primary" : "text-foreground"}`}>
                      {opt.label}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5 block">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              onClick={prev}
              disabled={step === 0}
              className="gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                onClick={next}
                disabled={!canProceed()}
                className="gap-1"
              >
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting || !form.condition.trim()}
                className="gap-2"
              >
                {submitting ? (
                  <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {submitting ? "Finding..." : "Find Best Hospitals"}
              </Button>
            )}
          </div>
        </div>

        {/* Skip option */}
        <div className="text-center mt-4">
          <button
            onClick={() => navigate("/patient/hospitals")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip and browse all hospitals
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientIntentCapture;

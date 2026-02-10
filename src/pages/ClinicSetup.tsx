import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowRight, Check } from "lucide-react";

const SPECIALTIES = [
  "General Medicine", "Cardiology", "Endocrinology", "Orthopedics",
  "Pediatrics", "Dermatology", "Neurology", "Oncology",
  "Gynecology", "Pulmonology", "Nephrology", "Gastroenterology",
];

const ClinicSetup = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    specialties: [] as string[],
    bed_count: "",
    opd_capacity: "",
  });

  const toggleSpecialty = (s: string) => {
    setForm(prev => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter(x => x !== s)
        : [...prev.specialties, s],
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);

    // Create clinic
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .insert({
        name: form.name,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        specialties: form.specialties,
        bed_count: form.bed_count ? parseInt(form.bed_count) : null,
        opd_capacity: form.opd_capacity ? parseInt(form.opd_capacity) : null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (clinicError) {
      toast({ title: "Error", description: clinicError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Add creator as owner
    const { error: memberError } = await supabase
      .from("clinic_members")
      .insert({
        clinic_id: clinic.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      toast({ title: "Error adding you as member", description: memberError.message, variant: "destructive" });
    } else {
      toast({ title: "Clinic created!", description: `${form.name} is ready.` });
      navigate("/dashboard");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Set Up Your Clinic</h1>
          <p className="text-muted-foreground text-sm">Let's get your clinic onboarded in minutes</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${s <= step ? "bg-primary w-10" : "bg-muted w-6"}`} />
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="font-heading font-semibold text-foreground">Clinic Details</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Clinic / Hospital Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. City Health Clinic"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Address</label>
                <input
                  value={form.address}
                  onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full address"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 ..."
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <input
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="clinic@example.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!form.name.trim()}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Specialties */}
        {step === 2 && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="font-heading font-semibold text-foreground">Specialties</h2>
            <p className="text-sm text-muted-foreground">Select the specialties your clinic offers</p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSpecialty(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.specialties.includes(s)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {form.specialties.includes(s) && <Check className="w-3 h-3 inline mr-1" />}
                  {s}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Number of Beds</label>
                <input
                  type="number"
                  value={form.bed_count}
                  onChange={e => setForm(prev => ({ ...prev, bed_count: e.target.value }))}
                  placeholder="e.g. 50"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">OPD Capacity</label>
                <input
                  type="number"
                  value={form.opd_capacity}
                  onChange={e => setForm(prev => ({ ...prev, opd_capacity: e.target.value }))}
                  placeholder="e.g. 100"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-lg bg-muted text-muted-foreground font-semibold hover:bg-muted/80 transition-colors">Back</button>
              <button onClick={() => setStep(3)} className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Create */}
        {step === 3 && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="font-heading font-semibold text-foreground">Review & Create</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Clinic Name</span>
                <span className="font-medium text-foreground">{form.name}</span>
              </div>
              {form.address && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-medium text-foreground text-right max-w-[60%]">{form.address}</span>
                </div>
              )}
              {form.phone && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium text-foreground">{form.phone}</span>
                </div>
              )}
              {form.specialties.length > 0 && (
                <div className="py-2 border-b border-border">
                  <span className="text-muted-foreground block mb-1.5">Specialties</span>
                  <div className="flex flex-wrap gap-1.5">
                    {form.specialties.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {(form.bed_count || form.opd_capacity) && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium text-foreground">
                    {form.bed_count ? `${form.bed_count} beds` : ""}{form.bed_count && form.opd_capacity ? " / " : ""}{form.opd_capacity ? `${form.opd_capacity} OPD` : ""}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-lg bg-muted text-muted-foreground font-semibold hover:bg-muted/80 transition-colors">Back</button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Building2 className="w-4 h-4" />
                {saving ? "Creating..." : "Create Clinic"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicSetup;

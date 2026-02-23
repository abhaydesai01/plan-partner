import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Building2, Globe, Image, Award, DollarSign } from "lucide-react";

interface ClinicData {
  id?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  city?: string;
  country?: string;
  description?: string;
  website?: string;
  price_range_min?: number;
  price_range_max?: number;
  accreditations?: string[];
  gallery_urls?: string[];
  established_year?: number;
  is_public_listed?: boolean;
}

const ClinicSettingsPage = () => {
  const { session, refreshSession } = useAuth();
  const { toast } = useToast();
  const clinic = session?.clinic as ClinicData | null;
  const [form, setForm] = useState({
    name: "", address: "", phone: "", email: "",
    city: "", country: "", description: "", website: "",
    price_range_min: "", price_range_max: "",
    accreditations: "",
    established_year: "",
    is_public_listed: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (clinic) {
      setForm({
        name: clinic.name || "",
        address: clinic.address || "",
        phone: clinic.phone || "",
        email: clinic.email || "",
        city: clinic.city || "",
        country: clinic.country || "",
        description: clinic.description || "",
        website: clinic.website || "",
        price_range_min: clinic.price_range_min?.toString() || "",
        price_range_max: clinic.price_range_max?.toString() || "",
        accreditations: clinic.accreditations?.join(", ") || "",
        established_year: clinic.established_year?.toString() || "",
        is_public_listed: clinic.is_public_listed || false,
      });
    }
  }, [clinic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id) return;
    setSaving(true);
    try {
      await api.patch(`clinics/${clinic.id}`, {
        name: form.name.trim() || undefined,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
        description: form.description.trim() || undefined,
        website: form.website.trim() || undefined,
        price_range_min: form.price_range_min ? Number(form.price_range_min) : undefined,
        price_range_max: form.price_range_max ? Number(form.price_range_max) : undefined,
        accreditations: form.accreditations ? form.accreditations.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        established_year: form.established_year ? Number(form.established_year) : undefined,
        is_public_listed: form.is_public_listed,
      });
      await refreshSession();
      toast({ title: "Clinic updated", description: "Your changes have been saved." });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  if (!clinic) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-heading font-bold text-foreground mb-2">Clinic not found</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Clinic settings</h1>
        <p className="text-muted-foreground text-sm">Edit your clinic details and manage your public profile</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Clinic name</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="Clinic name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="clinic@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="+91..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Established year</label>
              <input type="number" value={form.established_year} onChange={(e) => setForm((f) => ({ ...f, established_year: e.target.value }))} className={inputClass} placeholder="2010" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Address</label>
              <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className={inputClass} placeholder="Street, area" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">City</label>
              <input type="text" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={inputClass} placeholder="Mumbai" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Country</label>
              <input type="text" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className={inputClass} placeholder="India" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" /> Public Profile
          </h2>
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_public_listed}
                  onChange={(e) => setForm((f) => ({ ...f, is_public_listed: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
              <span className="text-sm font-medium text-foreground">List on Mediimate hospital directory</span>
            </div>
            <p className="text-xs text-muted-foreground">When enabled, patients can discover your hospital on Mediimate and submit treatment requests.</p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={`${inputClass} min-h-[100px]`}
                placeholder="Describe your hospital, specialties, and what makes you unique..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Website</label>
              <input type="url" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className={inputClass} placeholder="https://www.yourhospital.com" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Price range (min, INR)</label>
              <input type="number" value={form.price_range_min} onChange={(e) => setForm((f) => ({ ...f, price_range_min: e.target.value }))} className={inputClass} placeholder="5000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Price range (max, INR)</label>
              <input type="number" value={form.price_range_max} onChange={(e) => setForm((f) => ({ ...f, price_range_max: e.target.value }))} className={inputClass} placeholder="500000" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" /> Accreditations
          </h2>
          <div className="max-w-2xl">
            <label className="block text-sm font-medium text-foreground mb-1">Accreditations (comma-separated)</label>
            <input type="text" value={form.accreditations} onChange={(e) => setForm((f) => ({ ...f, accreditations: e.target.value }))} className={inputClass} placeholder="NABH, JCI, ISO 9001" />
            <p className="text-xs text-muted-foreground mt-1">Separate multiple accreditations with commas</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save all changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClinicSettingsPage;

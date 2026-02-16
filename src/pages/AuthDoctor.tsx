import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Stethoscope, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AuthDoctor = () => {
  const { user, loading, role, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<"doctor" | "clinic">("doctor");
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (user && role) {
    const to = role === "patient" ? "/patient" : role === "clinic" ? "/clinic" : role === "family" ? "/family" : "/dashboard";
    return <Navigate to={to} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Login failed",
            description: "Invalid email or password. Make sure you signed up as a Doctor or Clinic.",
            variant: "destructive",
          });
        }
      } else {
        if (selectedRole === "clinic") {
          if (!clinicName.trim()) { toast({ title: "Clinic name is required", variant: "destructive" }); setSubmitting(false); return; }
          if (!clinicAddress.trim()) { toast({ title: "Clinic address is required", variant: "destructive" }); setSubmitting(false); return; }
          if (!clinicPhone.trim()) { toast({ title: "Phone number is required", variant: "destructive" }); setSubmitting(false); return; }
        } else {
          if (!fullName.trim()) { toast({ title: "Full name is required", variant: "destructive" }); setSubmitting(false); return; }
          if (!phone.trim()) { toast({ title: "Phone number is required", variant: "destructive" }); setSubmitting(false); return; }
        }
        if (!email.trim()) { toast({ title: "Email is required", variant: "destructive" }); setSubmitting(false); return; }
        if (password.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); setSubmitting(false); return; }

        const name = selectedRole === "clinic" ? clinicName.trim() : fullName.trim();
        const phoneValue = selectedRole === "clinic" ? clinicPhone.trim() : phone.trim();
        const extra = selectedRole === "clinic"
          ? { clinic_name: clinicName.trim(), address: clinicAddress.trim(), phone: phoneValue }
          : { phone: phoneValue };

        const { error } = await signUp(email, password, name, selectedRole, extra);
        if (error) toast({ title: "Signup failed", description: error.message, variant: "destructive" });
        else toast({ title: "Account created!", description: "You are now signed in." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto">
            <Stethoscope className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            {isLogin ? "Doctor / Clinic Login" : "Create Doctor / Clinic Account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Sign in to your practice dashboard" : "Set up your practice on Mediimate"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 sm:p-8 space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">I am a</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setSelectedRole("doctor")}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors border ${selectedRole === "doctor" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}>
                    Doctor
                  </button>
                  <button type="button" onClick={() => setSelectedRole("clinic")}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors border ${selectedRole === "clinic" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}>
                    Clinic
                  </button>
                </div>
              </div>

              {selectedRole === "clinic" ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Clinic Name <span className="text-red-500">*</span></label>
                    <input type="text" required value={clinicName} onChange={(e) => setClinicName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. City Care Clinic" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Address <span className="text-red-500">*</span></label>
                    <input type="text" required value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Street, City, State" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Phone <span className="text-red-500">*</span></label>
                    <input type="tel" required value={clinicPhone} onChange={(e) => setClinicPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="+91 98765 43210" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Full Name <span className="text-red-500">*</span></label>
                    <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Dr. Sharma" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Phone <span className="text-red-500">*</span></label>
                    <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="+91 98765 43210" />
                  </div>
                </>
              )}
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email <span className="text-red-500">*</span></label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="email@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 pr-10"
                placeholder="Min 6 characters" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
            {submitting ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
          <p className="text-sm text-muted-foreground">
            Not a doctor? <Link to="/auth/patient" className="text-primary font-medium hover:underline">Go to Patient / Family login</Link>
          </p>
          <Link to="/auth" className="inline-block text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to role selection
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthDoctor;

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { HeartPulse, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AuthPatient = () => {
  const { user, loading, role, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<"patient" | "family">("patient");
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
            description: "Invalid email or password. If you are new, create an account first.",
            variant: "destructive",
          });
        }
      } else {
        if (!fullName.trim()) { toast({ title: "Full name is required", variant: "destructive" }); setSubmitting(false); return; }
        if (!phone.trim()) { toast({ title: "Phone number is required", variant: "destructive" }); setSubmitting(false); return; }
        if (!email.trim()) { toast({ title: "Email is required", variant: "destructive" }); setSubmitting(false); return; }
        if (password.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); setSubmitting(false); return; }

        const { error } = await signUp(email, password, fullName.trim(), selectedRole, { phone: phone.trim() });
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
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center mx-auto">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            {isLogin ? "Patient / Family Login" : "Create Patient / Family Account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Sign in to your health dashboard" : "Start tracking your health with Mediimate"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 sm:p-8 space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">I am a</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setSelectedRole("patient")}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors border ${selectedRole === "patient" ? "bg-emerald-600 text-white border-emerald-600" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}>
                    Patient
                  </button>
                  <button type="button" onClick={() => setSelectedRole("family")}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors border ${selectedRole === "family" ? "bg-emerald-600 text-white border-emerald-600" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}>
                    Family Member
                  </button>
                </div>
                {selectedRole === "family" && (
                  <p className="text-xs text-muted-foreground mt-1">View a loved one's daily health logs (they must invite you first).</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Full Name <span className="text-red-500">*</span></label>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Your full name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Phone <span className="text-red-500">*</span></label>
                <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="+91 98765 43210" />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email <span className="text-red-500">*</span></label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="email@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 pr-10"
                placeholder="Min 6 characters" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
            {submitting ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-emerald-600 font-medium hover:underline">
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
          <p className="text-sm text-muted-foreground">
            Are you a doctor? <Link to="/auth/doctor" className="text-primary font-medium hover:underline">Go to Doctor / Clinic login</Link>
          </p>
          <Link to="/auth" className="inline-block text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to role selection
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPatient;

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { Mail, CheckCircle, RefreshCw, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const VerifyEmail = () => {
  const { user, loading, role, session, signOut, refreshSession, emailVerified } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const dashboardPath = role === "patient" ? "/patient" : role === "clinic" ? "/clinic" : role === "family" ? "/family" : "/dashboard";

  useEffect(() => {
    if (verified) {
      const t = setTimeout(() => {
        navigate(dashboardPath, { replace: true });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [verified, role, navigate, dashboardPath]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  // If email is already verified (e.g. after refreshSession or page reload), redirect out
  if (emailVerified || session?.email_verified) return <Navigate to={dashboardPath} replace />;

  const email = (session as any)?.user?.email || user?.email || "";

  const handleChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newCode = [...code];
    newCode[idx] = val.slice(-1);
    setCode(newCode);
    if (val && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setCode(text.split(""));
      inputsRef.current[5]?.focus();
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      toast({ title: "Please enter the 6-digit code", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await api.post("auth/verify-email", { email, code: fullCode });
      await refreshSession();
      setVerified(true);
      toast({ title: "Email verified!", description: "Redirecting to your dashboard..." });
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message || "Invalid or expired code", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.post("auth/resend-verification", { email });
      setResendCooldown(60);
      toast({ title: "Code sent!", description: "Check your inbox for the new code." });
    } catch (err: any) {
      toast({ title: "Could not resend", description: err.message, variant: "destructive" });
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Email Verified!</h1>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Verify Your Email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to <strong className="text-foreground">{email}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={el => { inputsRef.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold rounded-lg border-2 border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                autoFocus={idx === 0}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting || code.join("").length !== 6}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Verifying..." : "Verify Email"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Check your spam folder if you don't see the email. Code expires in 10 minutes.
        </p>

        <div className="flex flex-col items-center gap-3 pt-2">
          <button
            type="button"
            onClick={async () => { await signOut(); navigate("/auth", { replace: true }); }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out &amp; use a different account
          </button>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const ForgotPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const handleSendCode = async () => {
    if (!email.trim()) { toast({ title: "Email required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      await api.post("auth/forgot-password", { email: email.trim() });
      setStep("code");
      setResendCooldown(60);
      toast({ title: "Code sent", description: "Check your email for the reset code." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCodeChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newCode = [...code];
    newCode[idx] = val.slice(-1);
    setCode(newCode);
    if (val && idx < 5) codeRefs.current[idx + 1]?.focus();
    if (newCode.join("").length === 6) setStep("reset");
  };
  const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) codeRefs.current[idx - 1]?.focus();
  };
  const handleCodePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) { setCode(text.split("")); setStep("reset"); e.preventDefault(); }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      await api.post("auth/reset-password", { email: email.trim(), code: code.join(""), new_password: newPassword });
      setStep("done");
      toast({ title: "Password reset!" });
      setTimeout(() => navigate("/auth", { replace: true }), 3000);
    } catch (err: any) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.post("auth/forgot-password", { email: email.trim() });
      setResendCooldown(60);
      toast({ title: "Code resent!" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Password Reset!</h1>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto">
            <KeyRound className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">
            {step === "email" ? "Forgot Password" : step === "code" ? "Enter Reset Code" : "Set New Password"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === "email" ? "Enter your email to receive a reset code" : step === "code" ? `Code sent to ${email}` : "Choose a strong password"}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 sm:p-8 space-y-4">
          {step === "email" && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="email@example.com" onKeyDown={(e) => e.key === "Enter" && handleSendCode()} />
              </div>
              <button onClick={handleSendCode} disabled={submitting}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50">
                {submitting ? "Sending..." : "Send Reset Code"}
              </button>
            </>
          )}

          {step === "code" && (
            <>
              <div className="flex justify-center gap-1.5 sm:gap-2" onPaste={handleCodePaste}>
                {code.map((digit, idx) => (
                  <input key={idx} ref={el => { codeRefs.current[idx] = el; }}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={e => handleCodeChange(idx, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(idx, e)}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-lg border-2 border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                    autoFocus={idx === 0} />
                ))}
              </div>
              <div className="text-center">
                <button onClick={handleResend} disabled={resendCooldown > 0}
                  className="text-sm text-muted-foreground hover:text-primary disabled:opacity-50">
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </>
          )}

          {step === "reset" && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Min 6 characters" minLength={6} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Repeat password" />
              </div>
              <button onClick={handleResetPassword} disabled={submitting}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50">
                {submitting ? "Resetting..." : "Reset Password"}
              </button>
            </>
          )}
        </div>

        <div className="text-center">
          <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

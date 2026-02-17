import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { CheckCircle2, UserCheck, Stethoscope, Building2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";

interface DoctorInfo {
  doctor_name: string;
  doctor_code: string;
  doctor_user_id: string;
  specialties: string[];
  clinic_name: string | null;
}

const ConnectDoctor = () => {
  const { doctorCode } = useParams<{ doctorCode: string }>();
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<DoctorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [alreadyConnected, setAlreadyConnected] = useState(false);

  useEffect(() => {
    if (!doctorCode) return;
    api.get<DoctorInfo>("doctor-by-code", { code: doctorCode })
      .then((data) => { setDoctor(data); setLoading(false); })
      .catch(() => { setError("Doctor not found. Please check the QR code and try again."); setLoading(false); });
  }, [doctorCode]);

  const handleConnect = async () => {
    if (!doctor) return;
    setConnecting(true);
    try {
      const res = await api.post<{ connected?: boolean; already_connected?: boolean; doctor_name?: string; message?: string }>(
        "me/connect-doctor",
        { doctor_code: doctor.doctor_code }
      );
      if (res.already_connected) {
        setAlreadyConnected(true);
      } else {
        setConnected(true);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect. Please try again.");
    }
    setConnecting(false);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-heading font-bold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Connected!</h1>
          <p className="text-muted-foreground">
            You are now connected with <span className="font-semibold text-foreground">{doctor?.doctor_name}</span>.
          </p>
          {doctor?.clinic_name && (
            <p className="text-sm text-muted-foreground">at <span className="font-semibold text-foreground">{doctor.clinic_name}</span></p>
          )}
          <p className="text-xs text-muted-foreground">Your doctor can now view your health data and manage your care.</p>
          {role === "patient" ? (
            <button onClick={() => navigate("/patient")} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
              Go to Dashboard
            </button>
          ) : (
            <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
              Go to Home
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (alreadyConnected) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <UserCheck className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Already Connected</h1>
          <p className="text-muted-foreground">
            You are already connected with <span className="font-semibold text-foreground">{doctor?.doctor_name}</span>.
          </p>
          {role === "patient" ? (
            <button onClick={() => navigate("/patient")} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
              Go to Dashboard
            </button>
          ) : (
            <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
              Go to Home
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Doctor Card */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Stethoscope className="w-8 h-8 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-heading font-bold text-foreground truncate">{doctor?.doctor_name}</h1>
              {doctor?.specialties && doctor.specialties.length > 0 && (
                <p className="text-sm text-muted-foreground">{doctor.specialties.join(", ")}</p>
              )}
            </div>
          </div>
          {doctor?.clinic_name && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4 shrink-0" />
              <span>{doctor.clinic_name}</span>
            </div>
          )}
        </div>

        {/* Action area */}
        {!user ? (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm text-center">
            <h2 className="text-lg font-heading font-semibold text-foreground">Connect with this doctor</h2>
            <p className="text-sm text-muted-foreground">Sign in to your patient account to connect, or create a new account.</p>
            <div className="flex flex-col gap-3">
              <Link
                to={`/auth?redirect=/connect/${doctorCode}`}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm text-center hover:opacity-90 transition-opacity block"
              >
                Sign In / Sign Up
              </Link>
              <Link
                to={`/enroll/${doctorCode}`}
                className="w-full py-3 rounded-xl border border-border text-foreground font-semibold text-sm text-center hover:bg-muted transition-colors block"
              >
                Enroll without an account
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-heading font-semibold text-foreground text-center">Confirm Connection</h2>
            <p className="text-sm text-muted-foreground text-center">
              By connecting, you allow <span className="font-semibold text-foreground">{doctor?.doctor_name}</span> to view and manage your health data.
            </p>
            <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
              <p className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> Your doctor can view your vitals, lab results, and health logs</p>
              <p className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> Your doctor can enroll you in care programs</p>
              <p className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> You can disconnect at any time from your dashboard</p>
            </div>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {connecting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
              ) : (
                <><UserCheck className="w-4 h-4" /> Confirm and Connect</>
              )}
            </button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Back to Home</Link>
        </p>
      </div>
    </div>
  );
};

export default ConnectDoctor;

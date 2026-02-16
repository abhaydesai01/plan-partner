import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { MessageSquare, Stethoscope, HeartPulse } from "lucide-react";

const Auth = () => {
  const { user, loading, role } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (user && role) {
    const to = role === "patient" ? "/patient" : role === "clinic" ? "/clinic" : role === "family" ? "/family" : "/dashboard";
    return <Navigate to={to} replace />;
  }
  if (user && !role) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/25">
            <MessageSquare className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Welcome to Mediimate</h1>
          <p className="text-muted-foreground">Choose how you want to continue</p>
        </div>

        {/* Portal Cards */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Doctor / Clinic Portal */}
          <Link
            to="/auth/doctor"
            className="group glass-card rounded-2xl p-6 sm:p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-2 border-transparent hover:border-primary/30 text-left"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
              <Stethoscope className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-2">Doctor / Clinic</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Manage patients, view health records, prescribe medications, and run your practice digitally.
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Doctor Dashboard</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Clinic Management</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Patient Records & Analytics</li>
            </ul>
            <div className="mt-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-center text-sm font-semibold group-hover:opacity-90 transition-opacity">
              Continue as Doctor / Clinic →
            </div>
          </Link>

          {/* Patient / Family Portal */}
          <Link
            to="/auth/patient"
            className="group glass-card rounded-2xl p-6 sm:p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-2 border-transparent hover:border-emerald-500/30 text-left"
          >
            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5 group-hover:bg-emerald-500/20 transition-colors">
              <HeartPulse className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-2">Patient / Family</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Track your health, chat with AI doctor, log vitals & meals, and share access with family.
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> AI Health Assistant</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Health Logs & Vitals</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Family Health Monitoring</li>
            </ul>
            <div className="mt-5 py-2.5 rounded-lg bg-emerald-600 text-white text-center text-sm font-semibold group-hover:opacity-90 transition-opacity">
              Continue as Patient / Family →
            </div>
          </Link>
        </div>

        {/* Back link */}
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/" className="text-primary font-medium hover:underline">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
};

export default Auth;

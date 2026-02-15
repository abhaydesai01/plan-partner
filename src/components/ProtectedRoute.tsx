import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole?: "doctor" | "patient" | "clinic" | "family" }) {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // If role hasn't loaded yet, show spinner
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Redirect to correct portal if wrong role
  if (allowedRole && role !== allowedRole) {
    const to = role === "patient" ? "/patient" : role === "clinic" ? "/clinic" : role === "family" ? "/family" : "/dashboard";
    return <Navigate to={to} replace />;
  }

  return <>{children}</>;
}

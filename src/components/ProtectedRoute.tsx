import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole?: "admin" | "doctor" | "patient" | "clinic" | "family" }) {
  const { user, loading, role, emailVerified, approvalStatus } = useAuth();

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

  // Check approval status for doctors and clinics BEFORE email verification
  // Pending-approval accounts should see the approval page, not the verify page
  if (role === "doctor" || role === "clinic") {
    if (approvalStatus === "pending_approval") {
      return <Navigate to="/pending-approval" replace />;
    }
    if (approvalStatus === "rejected" || approvalStatus === "suspended") {
      return <Navigate to="/account-suspended" replace />;
    }
  }

  // Admin doesn't need email verification check
  if (role !== "admin") {
    // Redirect unverified users to verification page
    if (user && role && !emailVerified) {
      return <Navigate to="/auth/verify" replace />;
    }
  }

  // Redirect to correct portal if wrong role
  if (allowedRole && role !== allowedRole) {
    const to = role === "admin" ? "/admin" : role === "patient" ? "/patient" : role === "clinic" ? "/clinic" : role === "family" ? "/family" : "/dashboard";
    return <Navigate to={to} replace />;
  }

  return <>{children}</>;
}

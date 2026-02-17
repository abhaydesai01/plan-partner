import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PendingApproval() {
  const { signOut, session } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Account Under Review</h1>
        <p className="text-gray-600 mb-2">
          Your account is pending approval from the Mediimate admin team.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          You'll receive an email once your account has been approved. This usually takes 1-2 business days.
        </p>
        {session?.user?.email && (
          <p className="text-sm text-gray-400 mb-6">Signed in as {session.user.email}</p>
        )}
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
}

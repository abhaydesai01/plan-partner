import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ShieldX, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccountSuspended() {
  const { signOut, approvalStatus, session } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const isRejected = approvalStatus === "rejected";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          {isRejected ? "Account Not Approved" : "Account Suspended"}
        </h1>
        <p className="text-gray-600 mb-2">
          {isRejected
            ? "Unfortunately, your account application was not approved at this time."
            : "Your account has been suspended by the Mediimate admin team."}
        </p>
        <p className="text-gray-500 text-sm mb-8">
          If you believe this is an error, please contact support at{" "}
          <a href="mailto:support@mediimate.com" className="text-primary underline">support@mediimate.com</a>.
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

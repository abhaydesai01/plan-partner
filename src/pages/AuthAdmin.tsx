import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setStoredToken } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthAdmin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { refreshSession } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Please enter email and password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: { id: string; email: string } }>("auth/login", { email, password });
      setStoredToken(res.token);
      await refreshSession();
      navigate("/admin", { replace: true });
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Mediimate Admin</h1>
          <p className="text-gray-400 mt-2">Admin Portal — Restricted Access</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          <div>
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@mediimate.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}

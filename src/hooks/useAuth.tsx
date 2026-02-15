import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";
import { getStoredToken, setStoredToken, setStoredDoctorToken, getStoredDoctorToken } from "@/lib/api";

type AppRole = "doctor" | "patient" | "clinic" | "family";

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthSession {
  user: AuthUser;
  profile: { full_name?: string; user_id: string; id?: string; doctor_code?: string } | null;
  role: AppRole | null;
  patient: Record<string, unknown> | null;
  clinic: Record<string, unknown> | null;
}

interface AuthContextType {
  session: AuthSession | null;
  user: AuthUser | null;
  loading: boolean;
  role: AppRole | null;
  signUp: (email: string, password: string, fullName: string, role?: AppRole, extra?: { clinic_name?: string; address?: string; phone?: string }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  switchableClinics: () => Promise<{ id: string; name: string }[]>;
  switchToClinic: (clinicId: string) => Promise<{ error: Error | null }>;
  switchBackToDoctor: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    const token = getStoredToken();
    if (!token) {
      setSession(null);
      setUser(null);
      setRole(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<AuthSession>("auth/me");
      setSession(data);
      setUser(data.user);
      setRole(data.role);
    } catch {
      setStoredToken(null);
      setSession(null);
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    roleChoice: AppRole = "doctor",
    extra?: { clinic_name?: string; address?: string; phone?: string }
  ) => {
    try {
      const body: Record<string, unknown> = { email, password, full_name: fullName, role: roleChoice };
      if (extra?.phone) body.phone = extra.phone;
      if (roleChoice === "clinic" && extra?.clinic_name) {
        body.clinic_name = extra.clinic_name;
        if (extra.address) body.address = extra.address;
      }
      const res = await api.post<{ token: string; user: AuthUser }>("auth/register", body);
      setStoredToken(res.token);
      setUser(res.user);
      await refreshSession();
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const res = await api.post<{ token: string; user: AuthUser }>("auth/login", { email, password });
      setStoredToken(res.token);
      setUser(res.user);
      await refreshSession();
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signOut = async () => {
    setStoredToken(null);
    setStoredDoctorToken(null);
    setSession(null);
    setUser(null);
    setRole(null);
  };

  const switchableClinics = async () => {
    try {
      return await api.get<{ id: string; name: string }[]>("auth/switchable-clinics");
    } catch {
      return [];
    }
  };

  const switchToClinic = async (clinicId: string) => {
    const currentToken = getStoredToken();
    if (!currentToken) return { error: new Error("Not signed in") };
    try {
      setStoredDoctorToken(currentToken);
      const res = await api.post<{ token: string }>("auth/switch-to-clinic", { clinic_id: clinicId });
      setStoredToken(res.token);
      await refreshSession();
      return { error: null };
    } catch (e) {
      setStoredDoctorToken(null);
      return { error: e as Error };
    }
  };

  const switchBackToDoctor = async () => {
    const doctorToken = getStoredDoctorToken();
    if (!doctorToken) return;
    setStoredToken(doctorToken);
    setStoredDoctorToken(null);
    await refreshSession();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, role, signUp, signIn, signOut, refreshSession, switchableClinics, switchToClinic, switchBackToDoctor }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

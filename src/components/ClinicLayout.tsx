import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getStoredDoctorToken } from "@/lib/api";
import { Building2, LogOut, Stethoscope, LayoutDashboard, Users, UserPlus, CalendarDays, Settings, Menu, X, Star } from "lucide-react";

const navItems = [
  { to: "/clinic", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/clinic/team", icon: Users, label: "Team" },
  { to: "/clinic/patients", icon: UserPlus, label: "Patients" },
  { to: "/clinic/appointments", icon: CalendarDays, label: "Appointments" },
  { to: "/clinic/feedback", icon: Star, label: "Feedback" },
  { to: "/clinic/settings", icon: Settings, label: "Settings" },
];

export function ClinicLayout({ children }: { children: ReactNode }) {
  const { session, signOut, switchBackToDoctor } = useAuth();
  const navigate = useNavigate();
  const clinic = session?.clinic as { name?: string } | null;
  const canSwitchBack = !!getStoredDoctorToken();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSwitchBack = async () => {
    await switchBackToDoctor();
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-heading font-bold text-foreground truncate">{clinic?.name ?? "Clinic"}</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          {canSwitchBack && (
            <button
              onClick={handleSwitchBack}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Stethoscope className="w-5 h-5" />
              Doctor portal
            </button>
          )}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted-foreground lg:hidden">Clinic Portal</span>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

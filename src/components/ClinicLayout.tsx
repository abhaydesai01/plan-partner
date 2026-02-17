import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getStoredDoctorToken } from "@/lib/api";
import { Building2, LogOut, Stethoscope, LayoutDashboard, Users, UserPlus, CalendarDays, Settings, Menu, X, Star, Layers, DollarSign } from "lucide-react";

const navItems = [
  { to: "/clinic", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/clinic/programs", icon: Layers, label: "Programs" },
  { to: "/clinic/team", icon: Users, label: "Team" },
  { to: "/clinic/patients", icon: UserPlus, label: "Patients" },
  { to: "/clinic/appointments", icon: CalendarDays, label: "Appointments" },
  { to: "/clinic/revenue", icon: DollarSign, label: "Revenue" },
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
    <div className="min-h-[100dvh] pwa-screen flex bg-background w-full max-w-full overflow-x-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 w-64 max-w-[85vw] lg:max-w-none h-[100dvh] lg:h-screen bg-card border-r border-border flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="safe-area-header min-h-[4rem] flex items-center justify-between px-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-heading font-bold text-foreground truncate">{clinic?.name ?? "Clinic"}</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden touch-target rounded-xl text-muted-foreground hover:bg-muted p-2" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden min-h-0">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1 safe-area-bottom flex-shrink-0">
          {canSwitchBack && (
            <button
              onClick={handleSwitchBack}
              className="flex items-center gap-3 min-h-[44px] w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors touch-manipulation"
            >
              <Stethoscope className="w-5 h-5 flex-shrink-0" />
              Doctor portal
            </button>
          )}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 min-h-[44px] w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors touch-manipulation"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-[100dvh] w-full max-w-full overflow-x-hidden">
        <header className="safe-area-header min-h-[3.5rem] sm:min-h-[4rem] border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center min-w-0 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden touch-target mr-3 text-muted-foreground hover:bg-muted rounded-xl p-2 flex-shrink-0" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-muted-foreground lg:hidden truncate">Clinic Portal</span>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto pwa-safe-x min-w-0 safe-area-bottom">{children}</main>
      </div>
    </div>
  );
}

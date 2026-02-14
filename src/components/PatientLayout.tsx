import { ReactNode, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Heart,
  Activity,
  CalendarDays,
  Upload,
  LogOut,
  Menu,
  X,
  Home,
  MessageSquare,
  FlaskConical,
  Shield,
  UtensilsCrossed,
  Link2,
  Star,
} from "lucide-react";
import { PatientPwaLink } from "@/components/PatientPwaLink";

const navItems = [
  { to: "/patient", icon: MessageSquare, label: "AI Assistant", exact: true },
  { to: "/patient/overview", icon: Home, label: "Overview" },
  { to: "/patient/connect-doctor", icon: Link2, label: "Connect to doctor" },
  { to: "/patient/vitals", icon: Activity, label: "Vitals" },
  { to: "/patient/lab-results", icon: FlaskConical, label: "Lab Results" },
  { to: "/patient/documents", icon: Upload, label: "Documents" },
  { to: "/patient/appointments", icon: CalendarDays, label: "Appointments" },
  { to: "/patient/feedback", icon: Star, label: "Feedback" },
  { to: "/patient/food-analysis", icon: UtensilsCrossed, label: "Food Analysis" },
  { to: "/patient/vault", icon: Shield, label: "Health Vault" },
];

export function PatientLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background w-full max-w-full overflow-x-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/20 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="safe-area-header h-16 min-h-[4rem] flex items-center justify-between px-5 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-heading font-bold text-foreground truncate">My Health</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-2 -mr-1 rounded-lg hover:bg-muted text-muted-foreground flex-shrink-0 touch-manipulation">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <PatientPwaLink />
        <div className="p-3 border-t border-border safe-area-bottom">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden">
        <header className="safe-area-header h-16 min-h-[4rem] border-b border-border bg-card flex items-center gap-2 sticky top-0 z-30 flex-shrink-0 px-3 sm:px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 rounded-lg hover:bg-muted text-muted-foreground flex-shrink-0 touch-manipulation"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground truncate min-w-0 flex-1">
            {navItems.find((i) => i.exact ? location.pathname === i.to : location.pathname === i.to || location.pathname.startsWith(i.to + "/"))?.label || "My Health"}
          </h2>
          <Link
            to="/patient"
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors touch-manipulation"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </header>
        <main className="safe-area-bottom flex-1 p-4 lg:p-6 overflow-x-hidden overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

// Export the sidebar opener for use by chat page
export function PatientLayoutWithChat({ children }: { children: (onOpenMenu: () => void) => ReactNode }) {
  const { signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background w-full max-w-full overflow-x-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/20 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="safe-area-header h-16 min-h-[4rem] flex items-center justify-between px-5 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-heading font-bold text-foreground truncate">My Health</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-2 -mr-1 rounded-lg hover:bg-muted text-muted-foreground flex-shrink-0 touch-manipulation">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <PatientPwaLink />
        <div className="p-3 border-t border-border safe-area-bottom">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {children(() => setSidebarOpen(true))}
    </div>
  );
}

import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { NotificationCenter } from "@/components/NotificationCenter";
import {
  LayoutDashboard,
  Users,
  Layers,
  UserPlus,
  CalendarDays,
  LogOut,
  MessageSquare,
  Menu,
  X,
  Activity,
  FileText,
  Upload,
  ClipboardCheck,
  Building2,
  Link,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dashboard/patients", icon: Users, label: "Patients" },
  { to: "/dashboard/programs", icon: Layers, label: "Programs" },
  { to: "/dashboard/enrollments", icon: UserPlus, label: "Enrollments" },
  { to: "/dashboard/appointments", icon: CalendarDays, label: "Appointments" },
  { to: "/dashboard/vitals", icon: Activity, label: "Vitals" },
  { to: "/dashboard/lab-results", icon: FileText, label: "Lab Results" },
  { to: "/dashboard/documents", icon: Upload, label: "Documents" },
  { to: "/dashboard/link-requests", icon: Link, label: "Link Requests" },
  { to: "/dashboard/alerts", icon: AlertTriangle, label: "Alerts" },
  { to: "/dashboard/clinic", icon: Building2, label: "Clinic" },
  { to: "/dashboard/compliance", icon: ClipboardCheck, label: "Compliance" },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-heading font-bold text-foreground">Mediimate</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
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

        <div className="p-3 border-t border-border">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-3 text-muted-foreground">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-heading font-semibold text-foreground">
              {navItems.find((i) => location.pathname === i.to || (i.to !== "/dashboard" && location.pathname.startsWith(i.to)))?.label || "Dashboard"}
            </h2>
          </div>
          <NotificationCenter />
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

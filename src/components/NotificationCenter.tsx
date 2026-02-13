import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Bell, Check, X, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { format } from "date-fns";

const typeIcons: Record<string, any> = {
  info: Info,
  warning: AlertTriangle,
  alert: AlertTriangle,
  success: CheckCircle,
};

const typeColors: Record<string, string> = {
  info: "text-primary",
  warning: "text-accent",
  alert: "text-destructive",
  success: "text-whatsapp",
};

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.get<any[]>("notifications");
      setNotifications(Array.isArray(data) ? data.slice(0, 20) : []);
    } catch {
      setNotifications([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, user]);

  const markRead = async (id: string) => {
    try {
      await api.patch(`notifications/${id}`, { is_read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    if (!user) return;
    try {
      await api.patch("notifications/read-all", {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* ignore */ }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto glass-card rounded-xl shadow-xl z-50 border border-border">
            <div className="sticky top-0 bg-card p-3 border-b border-border flex items-center justify-between">
              <h3 className="font-heading font-semibold text-sm text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
              )}
            </div>
            {loading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No notifications</div>
            ) : (
              <div>
                {notifications.map(n => {
                  const Icon = typeIcons[n.type] || Info;
                  return (
                    <div
                      key={n.id}
                      className={`p-3 border-b border-border/50 hover:bg-muted/30 transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex gap-2.5">
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${typeColors[n.type] || "text-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.is_read ? "font-medium text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(n.created_at), "MMM d, HH:mm")}</p>
                        </div>
                        {!n.is_read && (
                          <button onClick={() => markRead(n.id)} className="p-1 hover:bg-muted rounded shrink-0 self-start">
                            <Check className="w-3 h-3 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

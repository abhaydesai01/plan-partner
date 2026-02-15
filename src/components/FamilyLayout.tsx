import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Users } from "lucide-react";

export function FamilyLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen pwa-screen flex flex-col bg-background w-full max-w-full overflow-x-hidden">
      <header className="safe-area-header border-b border-border bg-card flex items-center justify-between px-4 h-14 min-h-[3.5rem]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <span className="font-heading font-bold text-foreground">Family view</span>
        </div>
        <button
          onClick={() => signOut()}
          className="min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted touch-manipulation"
        >
          <LogOut className="w-4 h-4 inline-block mr-1.5 align-middle" />
          Sign out
        </button>
      </header>
      <main className="flex-1 p-4 sm:p-6 overflow-auto pwa-safe-x safe-area-bottom min-w-0">
        {children}
      </main>
    </div>
  );
}

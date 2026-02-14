import { useState, useEffect } from "react";
import { Copy, Check, Download } from "lucide-react";

/** App URL for the patient portal (PWA start URL). */
export function getPatientAppUrl(): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  return `${origin}/patient`;
}

export function PatientPwaLink() {
  const [installPrompt, setInstallPrompt] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);
  const appUrl = getPatientAppUrl();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt || typeof (installPrompt as { prompt?: () => Promise<void> }).prompt !== "function") return;
    await (installPrompt as { prompt: () => Promise<void> }).prompt();
  };

  const handleCopyLink = async () => {
    if (!appUrl) return;
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const isStandalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as { standalone?: boolean }).standalone === true);

  if (isStandalone) return null;

  return (
    <div className="p-3 border-t border-border space-y-2">
      <p className="text-xs font-medium text-muted-foreground px-1">Install or share app</p>
      <div className="space-y-1.5">
        {installPrompt && (
          <button
            type="button"
            onClick={handleInstall}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            Install app
          </button>
        )}
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy app link"}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground/80 px-1">
        On iPhone: open in Safari → Share → Add to Home Screen.
      </p>
    </div>
  );
}

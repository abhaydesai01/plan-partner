import { useState, useCallback } from "react";
import { api } from "@/lib/api";

const VAPID_PUBLIC = (import.meta.env.VITE_VAPID_PUBLIC_KEY || "").trim();

export function usePushSubscribe() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC) {
      setError("Push not configured (missing VITE_VAPID_PUBLIC_KEY)");
      return false;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setError("Push notifications are not supported");
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Permission denied");
        setSubscribed(false);
        return false;
      }
      const regs = await navigator.serviceWorker.getRegistrations();
      const ours = regs.find((r) => (r.active?.scriptURL || "").includes("/sw.js"));
      let swReg = ours || null;
      if (!swReg) {
        await Promise.all(regs.map((r) => r.unregister()));
        swReg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await new Promise<void>((r) => setTimeout(r, 800));
      }
      const sub = await swReg!.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
      await api.post("me/push-subscribe", {
        subscription: sub.toJSON(),
      });
      setSubscribed(true);
      return true;
    } catch (e) {
      const msg = (e as Error).message || "Failed to subscribe";
      setError(msg);
      setSubscribed(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkSubscribed = useCallback(async () => {
    try {
      const data = await api.get<{ subscribed?: boolean }>("me/push-subscribe");
      setSubscribed(!!data.subscribed);
    } catch {
      setSubscribed(false);
    }
  }, []);

  return { subscribe, subscribed, loading, error, checkSubscribed };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

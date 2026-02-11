import { supabase } from "@/integrations/supabase/client";

const API_BASE = import.meta.env.VITE_API_URL || "";

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (!params || Object.keys(params).length === 0) return url;
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  const q = search.toString();
  if (!q) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${q}`;
}

const noCache = { cache: "no-store" as RequestCache };

export const api = {
  async get<T = unknown>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const res = await fetch(buildUrl(path, params), { headers: await getAuthHeaders(), ...noCache });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error || res.statusText);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  },

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(buildUrl(path), {
      method: "POST",
      headers: await getAuthHeaders(),
      body: body != null ? JSON.stringify(body) : undefined,
      ...noCache,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error || res.statusText);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  },

  async patch<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await fetch(buildUrl(path), {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
      ...noCache,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error || res.statusText);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  },

  async delete(path: string): Promise<void> {
    const res = await fetch(buildUrl(path), { method: "DELETE", headers: await getAuthHeaders(), ...noCache });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error || res.statusText);
    }
  },
};

/**
 * In-process cron: auto-triggers reminder and routine push jobs in production.
 * Runs only when CRON_SECRET is set (so production gets auto notifications without external cron).
 */
import cron from "node-cron";

const CRON_SECRET = process.env.CRON_SECRET;
const PORT = parseInt(String(process.env.PORT || "3001"), 10) || 3001;
const BASE = `http://127.0.0.1:${PORT}/api`;

async function trigger(endpoint: string): Promise<void> {
  if (!CRON_SECRET) return;
  const url = `${BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": CRON_SECRET,
      },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[scheduler] ${endpoint} failed:`, res.status, text);
      return;
    }
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (process.env.NODE_ENV !== "production") console.log(`[scheduler] ${endpoint} ok`, data);
  } catch (err) {
    console.error(`[scheduler] ${endpoint} error:`, err);
  }
}

/** Start scheduled jobs. Call after server is listening. */
export function startScheduler(): void {
  if (!CRON_SECRET) {
    if (process.env.NODE_ENV !== "production") console.log("[scheduler] CRON_SECRET not set — reminder/routine jobs will not run automatically. Set it to enable.");
    return;
  }

  // Every hour at :00 (UTC): send routine pushes ("Log BP now" at user's usual time)
  cron.schedule("0 * * * *", () => trigger("/internal/send-routine-pushes"), { timezone: "UTC" });

  // Once per day at 09:00 UTC: process reminder escalations (Day 1 → 2 → 3 → 5)
  cron.schedule("0 9 * * *", () => trigger("/internal/process-reminder-escalations"), { timezone: "UTC" });

  if (process.env.NODE_ENV !== "production") console.log("[scheduler] Routine pushes: hourly (UTC); Reminder escalations: daily 09:00 UTC");
}

/**
 * Trigger the reminder-escalation cron locally for testing.
 * Usage (from server folder): npx tsx scripts/trigger-reminder-escalations.ts
 * Requires: server running (npm run dev), CRON_SECRET set in server/.env
 */
import "dotenv/config";

const BASE = process.env.API_BASE_URL || "http://localhost:3001";
const CRON_SECRET = process.env.CRON_SECRET;

async function main() {
  if (!CRON_SECRET) {
    console.error("CRON_SECRET is not set. Add it to server/.env (e.g. CRON_SECRET=test-secret-123)");
    process.exit(1);
  }
  const url = `${BASE}/api/internal/process-reminder-escalations`;
  console.log("POST", url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": CRON_SECRET,
      },
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      console.error("Error:", res.status, data);
      process.exit(1);
    }
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Request failed. Is the server running? (npm run dev:server)", err);
    process.exit(1);
  }
}

main();

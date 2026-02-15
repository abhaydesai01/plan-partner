# Testing Smart Reminders (Layer 2 & 3)

How to test the adaptive reminder escalation (Day 1 → Day 2 → Day 3 → Day 5) locally.

## Production: auto-triggered

In **production**, notifications are **automatically triggered** by the server — no external cron needed. When `CRON_SECRET` is set in the server environment:

- **Routine pushes** run every hour (UTC): users get "Log BP now" / "Log blood sugar now" at their usual time.
- **Reminder escalations** run once per day at **09:00 UTC**: Day 1 → 2 → 3 → 5 logic runs for users who haven’t logged.

Just deploy the server with `CRON_SECRET` set and keep the process running (e.g. on a VPS, Railway, Render, or similar). You can still call the endpoints manually (e.g. for testing) using the same secret.

## 1. Prerequisites

- **Server running** with MongoDB and env loaded:
  ```bash
  cd server && npm run dev
  ```
- **CRON_SECRET** set in `server/.env`:
  ```env
  CRON_SECRET=your-test-secret
  ```
- **At least one patient user** who:
  - Has a Patient record linked (`patient_user_id` = their auth user id)
  - Has **subscribed to push** (open the PWA as that patient → enable “Enable reminder notifications” on the AI Assistant screen)
  - Is eligible for reminders:
    - **BP / Blood sugar**: has a “usual” log time (log BP or sugar a few times in the app so routine is detected), **or**
    - **Medication**: has at least one medication in Overview → Health Profile

## 2. Trigger the escalation cron

From the **server** folder:

```bash
cd server
npx tsx scripts/trigger-reminder-escalations.ts
```

Or with `curl` (replace `your-test-secret` with your `CRON_SECRET`):

```bash
curl -X POST http://localhost:3001/api/internal/process-reminder-escalations \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your-test-secret"
```

Expected response when everything is configured:

```json
{ "ok": true, "results": { "day1": 0, "day2": 0, "day3": 0, "day5": 0, "resolved": 0 } }
```

- **First run** with a patient who **did not log today**: an escalation record is created (anchor = today). No notifications are sent yet (that’s “day 0”).
- If the patient **did log today** (BP, sugar, or medication): they are counted under `resolved` and no escalation is created.

## 3. See that an escalation was created (Day 0)

In MongoDB (Compass or `mongosh`):

```javascript
db.reminderescalations.find().pretty()
```

You should see a document with `trigger_type`, `anchor_date`, and `resolved_at: null`. No `day1_sent_at` yet.

## 4. Test Day 1 / Day 2 / Day 3 / Day 5 without waiting

To test sending **Day 1** (or 2, 3, 5) immediately, backdate `anchor_date` so that “today” is already day 1, 2, 3, or 5.

In **mongosh** (or Compass):

```javascript
// Use the _id of the escalation you found
const id = ObjectId("..."); // your ReminderEscalation _id

// Option A: Test Day 1 — set anchor to yesterday
db.reminderescalations.updateOne(
  { _id: id },
  { $set: { anchor_date: new Date(Date.now() - 24*60*60*1000) } }
);

// Option B: Test Day 2 — set anchor to 2 days ago
// (use 2 * 24*60*60*1000)

// Option C: Test Day 5 — set anchor to 5 days ago
// (use 5 * 24*60*60*1000)
```

Then run the cron again:

```bash
npx tsx scripts/trigger-reminder-escalations.ts
```

- **Day 1**: Patient gets a push + in-app notification (normal reminder). `day1_sent_at` is set.
- **Day 2**: Stronger push + in-app. `day2_sent_at` set.
- **Day 3**: Stronger push + in-app (WhatsApp placeholder in payload). `day3_sent_at` set.
- **Day 5**: An **Alert** is created for the doctor (Alerts in the dashboard) and the escalation gets `day5_sent_at` and `day5_alert_id`. Alert text includes the patient’s **emergency_contact**.

Check:

- **Patient**: In-app notifications (if your app has a notifications list) and push on the device/browser.
- **Doctor**: Dashboard → Alerts for the “Reminder escalation: … not logged for 5 days” alert.

## 5. Test resolution (user logs → escalation stops)

1. As the **patient**, log the missing item in the app:
   - Log BP or blood sugar (Quick Log or Vitals), or
   - Log medication (Quick Log → Medication).
2. Run the cron again:
   ```bash
   npx tsx scripts/trigger-reminder-escalations.ts
   ```
3. In the response, that user/trigger may appear under `resolved`.
4. In MongoDB, that escalation should now have `resolved_at` set:
   ```javascript
   db.reminderescalations.find({ resolved_at: { $ne: null } })
   ```

No further Day 2/3/5 messages will be sent for that escalation.

## 6. Optional: test routine push (Layer 1)

To test the **routine** push (e.g. “Log BP now” at the user’s usual time):

1. Set the patient’s “usual” time: log BP (or sugar) a few times at a fixed hour so the routine is detected.
2. In `server/.env`, ensure **VAPID** keys are set (run `node scripts/generate-vapid.cjs` if needed).
3. Call the routine cron at that hour (UTC):
   ```bash
   curl -X POST "http://localhost:3001/api/internal/send-routine-pushes?secret=your-test-secret"
   ```
   Or use the same `x-cron-secret` header as above.

If the current UTC hour matches the patient’s usual BP/sugar hour, they get a push. If they ignore it, the **next day** when you run `process-reminder-escalations`, Day 1 will be sent (because they didn’t log “today” and an escalation was created with anchor = today on the first run).

## 7. Quick checklist

| Step | What to do |
|------|------------|
| 1 | Add `CRON_SECRET` to `server/.env` |
| 2 | Start server: `cd server && npm run dev` |
| 3 | As patient: link to a doctor, add medications or log BP/sugar a few times, enable push in PWA |
| 4 | Run: `cd server && npx tsx scripts/trigger-reminder-escalations.ts` |
| 5 | Check MongoDB `reminderescalations` for a new row (anchor_date = today) |
| 6 | Backdate `anchor_date` (e.g. 1 day ago), run script again → Day 1 push + notification |
| 7 | As patient: log BP/sugar/medication → run script again → escalation resolved |

If anything doesn’t match (e.g. no escalation created), confirm the patient has `patient_user_id` set, has a push subscription, and either has a routine (BP/sugar) or medications, and **did not** log that trigger type today (UTC).

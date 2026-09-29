# Automatic alert text messages (Twilio)

## What you get
When your Python client adds a row to the alerts table, your verified emergency contacts get a text automatically. You don't need to change the Python script: its current insert is enough to set it off.

Message text:
"Rhythm alert: {user}'s monitoring noticed a sudden change in their typing pattern. Please check on them, and contact emergency services if you think it's needed. This is not a medical diagnosis."

## Findings from the existing project
- `alerts`: `id, user_id, triggered_at, combined_score, keystroke_score, sensor_score, notification_sent_at, channels_used, delivery_status, user_response`. It has no triggers yet.
- `emergency_contacts`: `user_id`, `phone`, `verification_status`. Only contacts marked `verified` are texted, the same rule as the current dispatcher.
- `dispatchAlert()` in `alert-dispatch.server.ts` already records simulated sends. It will be upgraded, not duplicated.
- Twilio sending already exists in `contact-verification.server.ts`. It goes through the Lovable Twilio connector, so the Twilio secret never reaches the browser.

## Why a database trigger, not a Supabase Edge Function
This project runs its backend logic as server routes in the app, so Supabase Edge Functions aren't used here. A database trigger works best:
- It catches every insert, including retries.
- Python needs no new code and holds no secrets.
- It keeps working even if Python stops running right after the insert.

```text
Python insert -> alerts row -> DB trigger (pg_net) -> /api/public/hooks/alert-sms
   -> checks shared secret -> claims the alert once -> Twilio -> verified contacts
```

## Steps
1. **Migration (no new tables):**
   - Enable `pg_net`.
   - Add an `AFTER INSERT` trigger on `alerts`. It POSTs `{ alert_id }` to the hook URL with the header `x-hook-secret`.
   - Store the secret in a private table in the `private` schema that no one can read through the app.
   - RLS on alerts and contacts stays the same.
2. **New route `src/routes/api/public/hooks/alert-sms.ts`:**
   - Checks the secret using a constant-time comparison.
   - Validates `alert_id` with zod.
   - Loads the admin client inside the handler.
3. **Upgrade `dispatchAlert`:**
   - Duplicate protection: an atomic claim `update alerts set notification_sent_at=now() where id=? and notification_sent_at is null returning *`. If no row comes back, it logs "duplicate" and sends nothing.
   - Makes the real Twilio call, sharing the `sendSms` helper moved into `twilio.server.ts`.
   - Validates each phone number as E.164.
   - Stores each attempt's `sent` / `failed` status and the Twilio error in `delivery_status`.
   - Logs these cases: missing credentials, no verified contacts, invalid number, Twilio error, missing alert.
   - The existing `/alerts/trigger` and `/notify` routes keep working through the same function.

## What you'll need to do
- **Connect Twilio:** I'll open the connection card and you enter your Account SID and Auth Token there. Secrets aren't typed into code.
- **Sender number:** save `TWILIO_FROM_NUMBER`, your Twilio trial number. I'll ask for it.
- **Mark your demo contact verified:** use the in-app code flow, or I can do it for you.

## Testing
First, a test insert with `ml/test_alert_insert.py` should reach your phone. Then do the full run with `live_monitor_v2.py`: type gibberish until 3 anomalous windows in a row, and a text should arrive. The alert stays in the alert history with its delivery results.

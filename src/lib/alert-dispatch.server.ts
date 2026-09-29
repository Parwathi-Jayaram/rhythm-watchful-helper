import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/integrations/supabase/types";
import { E164, sendSms } from "./twilio.server";

export type DeliveryAttempt = {
  contact_id: string;
  name: string;
  channel: "sms" | "email";
  destination: string;
  status: "simulated" | "sent" | "failed";
  provider: "twilio" | "resend";
  at: string;
  sid?: string;
  note?: string;
};

type AlertRow = Database["public"]["Tables"]["alerts"]["Row"];

function smsBody(name: string) {
  return `Rhythm alert: ${name}'s monitoring noticed a sudden change in their typing pattern. Please check on them, and contact emergency services if you think it's needed. This is not a medical diagnosis.`;
}

/**
 * Sends the alert SMS to the alert owner's verified contacts, exactly once.
 * Works with a user-scoped client (RLS) or the admin client (DB hook).
 */
export async function dispatchAlert(
  supabase: SupabaseClient<Database>,
  alertId: string,
): Promise<{ ok: true; alert: AlertRow; duplicate?: boolean } | { ok: false; status: number; error: string }> {
  const { data: alert, error: alertError } = await supabase
    .from("alerts")
    .select("*")
    .eq("id", alertId)
    .maybeSingle();
  if (alertError) return { ok: false, status: 400, error: alertError.message };
  if (!alert) {
    console.error(`[alert-sms] Alert ${alertId} not found`);
    return { ok: false, status: 404, error: "Alert not found" };
  }
  if (alert.user_response === "dismissed") {
    return { ok: false, status: 409, error: "Alert was dismissed and will not be sent" };
  }

  // Atomic claim: only the first caller gets the row back.
  const claimedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("alerts")
    .update({ notification_sent_at: claimedAt })
    .eq("id", alertId)
    .is("notification_sent_at", null)
    .select("*")
    .maybeSingle();
  if (claimError) return { ok: false, status: 400, error: claimError.message };
  if (!claimed) {
    console.warn(`[alert-sms] Duplicate notify for alert ${alertId} — already sent, skipping`);
    return { ok: true, alert, duplicate: true };
  }

  const { data: contacts, error: contactsError } = await supabase
    .from("emergency_contacts")
    .select("id, name, phone")
    .eq("user_id", alert.user_id)
    .eq("verification_status", "verified")
    .order("created_at", { ascending: true });
  if (contactsError) return { ok: false, status: 400, error: contactsError.message };
  if (!contacts?.length) console.warn(`[alert-sms] User ${alert.user_id} has no verified contacts`);

  const { data: profile } = await supabase.from("profiles").select("email").eq("id", alert.user_id).maybeSingle();
  const who = profile?.email?.split("@")[0] ?? "Your contact";

  const attempts: DeliveryAttempt[] = [];
  for (const c of contacts ?? []) {
    if (!c.phone) continue;
    const base = { contact_id: c.id, name: c.name, channel: "sms" as const, destination: c.phone, provider: "twilio" as const, at: new Date().toISOString() };
    if (!E164.test(c.phone)) {
      console.error(`[alert-sms] Invalid phone for contact ${c.id}: ${c.phone}`);
      attempts.push({ ...base, status: "failed", note: "Invalid phone number (use +countrycode format)" });
      continue;
    }
    const r = await sendSms(c.phone, smsBody(who));
    if (r.mode === "test") attempts.push({ ...base, status: "simulated", note: "Test mode — Twilio not configured" });
    else if (r.error) attempts.push({ ...base, status: "failed", note: r.error.slice(0, 500) });
    else attempts.push({ ...base, status: "sent", ...(r.sid ? { sid: r.sid } : {}) });
  }

  const channelsUsed = [...new Set(attempts.filter((a) => a.status !== "failed").map((a) => a.channel))];
  const { data: updated, error: updateError } = await supabase
    .from("alerts")
    .update({ channels_used: channelsUsed as unknown as Json, delivery_status: attempts as unknown as Json })
    .eq("id", alertId)
    .select("*")
    .single();
  if (updateError) return { ok: false, status: 400, error: updateError.message };
  return { ok: true, alert: updated };
}

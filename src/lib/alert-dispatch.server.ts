import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/integrations/supabase/types";

export type DeliveryAttempt = {
  contact_id: string;
  name: string;
  channel: "sms" | "email";
  destination: string;
  status: "simulated" | "sent" | "failed";
  provider: "twilio" | "resend";
  at: string;
  note?: string;
};

/**
 * Test mode: records exactly who would be reached, on which channel, with
 * which provider — without sending anything. When Twilio and Resend
 * credentials are added, replace the `status: "simulated"` branches with the
 * real provider calls; the stored shape stays the same.
 */
export async function dispatchAlert(
  supabase: SupabaseClient<Database>,
  alertId: string,
): Promise<
  | { ok: true; alert: Database["public"]["Tables"]["alerts"]["Row"] }
  | { ok: false; status: number; error: string }
> {
  const { data: alert, error: alertError } = await supabase
    .from("alerts")
    .select("*")
    .eq("id", alertId)
    .maybeSingle();

  if (alertError) return { ok: false, status: 400, error: alertError.message };
  if (!alert) return { ok: false, status: 404, error: "Alert not found" };
  if (alert.user_response === "dismissed") {
    return { ok: false, status: 409, error: "Alert was dismissed and will not be sent" };
  }

  const { data: contacts, error: contactsError } = await supabase
    .from("emergency_contacts")
    .select("id, name, phone, email")
    .order("created_at", { ascending: true });

  if (contactsError) return { ok: false, status: 400, error: contactsError.message };

  const now = new Date().toISOString();
  const attempts: DeliveryAttempt[] = [];

  for (const contact of contacts ?? []) {
    if (contact.phone) {
      attempts.push({
        contact_id: contact.id,
        name: contact.name,
        channel: "sms",
        destination: contact.phone,
        provider: "twilio",
        status: "simulated",
        at: now,
        note: "Test mode — no message sent",
      });
    }
    if (contact.email) {
      attempts.push({
        contact_id: contact.id,
        name: contact.name,
        channel: "email",
        destination: contact.email,
        provider: "resend",
        status: "simulated",
        at: now,
        note: "Test mode — no message sent",
      });
    }
  }

  const channelsUsed = [...new Set(attempts.map((attempt) => attempt.channel))];

  const { data: updated, error: updateError } = await supabase
    .from("alerts")
    .update({
      notification_sent_at: now,
      channels_used: channelsUsed as unknown as Json,
      delivery_status: attempts as unknown as Json,
    })
    .eq("id", alertId)
    .select("*")
    .single();

  if (updateError) return { ok: false, status: 400, error: updateError.message };
  return { ok: true, alert: updated };
}

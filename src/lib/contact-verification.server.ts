import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { sendEmail } from "./email.server";

export const CODE_TTL_MS = 15 * 60 * 1000;
export const PENDING_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000;
  return n.toString().padStart(6, "0");
}

type ContactRow = Database["public"]["Tables"]["emergency_contacts"]["Row"];

/** Pending contacts that never confirmed within 24h are reported as unverified. */
export function effectiveStatus(c: Pick<ContactRow, "verification_status" | "verification_sent_at">) {
  if (
    c.verification_status === "pending" &&
    (!c.verification_sent_at || Date.now() - new Date(c.verification_sent_at).getTime() > PENDING_TIMEOUT_MS)
  ) {
    return "unverified";
  }
  return c.verification_status;
}

export function publicContact(c: ContactRow) {
  const status = effectiveStatus(c);
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    relationship: c.relationship,
    created_at: c.created_at,
    verification_status: status,
    verification_sent_at: c.verification_sent_at,
    verified_at: c.verified_at,
    warning: status === "verified" ? null : "Not verified — this contact won't receive alerts yet",
  };
}

export async function sendVerification(
  supabase: SupabaseClient<Database>,
  contactId: string,
  senderName: string,
  opts: { enforceCooldown?: boolean } = {},
) {
  const { data: contact, error } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("id", contactId)
    .maybeSingle();
  if (error) return { ok: false as const, status: 400, error: error.message };
  if (!contact) return { ok: false as const, status: 404, error: "Contact not found" };
  if (!contact.phone) return { ok: false as const, status: 400, error: "Contact has no phone number" };
  if (contact.verification_status === "verified") {
    return { ok: false as const, status: 409, error: "Contact is already verified" };
  }
  if (
    opts.enforceCooldown &&
    contact.verification_sent_at &&
    Date.now() - new Date(contact.verification_sent_at).getTime() < RESEND_COOLDOWN_MS
  ) {
    return { ok: false as const, status: 429, error: "Please wait 30 seconds before resending" };
  }

    const code = generateCode();
  if (!contact.email) return { ok: false as const, status: 400, error: "Contact has no email address" };
  const sms = await sendEmail(
    contact.email,
    "Your Rhythm verification code",
    `${senderName} added you as an emergency contact. Your code is ${code}. It expires in 15 minutes.`,
  );
  if (sms.error) return { ok: false as const, status: 502, error: sms.error };

  const sentAt = new Date().toISOString();
  const { data: updated, error: upErr } = await supabase
    .from("emergency_contacts")
    .update({
      verification_status: "pending",
      verification_code: await sha256(`${contact.id}:${code}`),
      verification_sent_at: sentAt,
    })
    .eq("id", contactId)
    .select("*")
    .single();
  if (upErr) return { ok: false as const, status: 400, error: upErr.message };

  return {
    ok: true as const,
    contact: publicContact(updated),
    delivery: sms.mode,
    expires_at: new Date(Date.parse(sentAt) + CODE_TTL_MS).toISOString(),
    // In test mode only, return the code so the flow can be completed without a real SMS.
    ...(sms.mode === "test" ? { test_code: code } : {}),
  };
}

export async function verifyCode(supabase: SupabaseClient<Database>, contactId: string, code: string) {
  const { data: contact, error } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("id", contactId)
    .maybeSingle();
  if (error) return { ok: false as const, status: 400, error: error.message };
  if (!contact) return { ok: false as const, status: 404, error: "Contact not found" };
  if (contact.verification_status === "verified") return { ok: true as const, contact: publicContact(contact) };
  if (!contact.verification_code || !contact.verification_sent_at) {
    return { ok: false as const, status: 400, error: "No active code — request a new one" };
  }
  if (Date.now() - new Date(contact.verification_sent_at).getTime() > CODE_TTL_MS) {
    await supabase.from("emergency_contacts").update({ verification_code: null }).eq("id", contactId);
    return { ok: false as const, status: 410, error: "Code expired — request a new one" };
  }
  if ((await sha256(`${contact.id}:${code}`)) !== contact.verification_code) {
    return { ok: false as const, status: 400, error: "Incorrect code" };
  }

  const { data: updated, error: upErr } = await supabase
    .from("emergency_contacts")
    .update({ verification_status: "verified", verified_at: new Date().toISOString(), verification_code: null })
    .eq("id", contactId)
    .select("*")
    .single();
  if (upErr) return { ok: false as const, status: 400, error: upErr.message };
  return { ok: true as const, contact: publicContact(updated) };
}

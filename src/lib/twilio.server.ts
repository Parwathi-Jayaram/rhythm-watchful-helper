const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

export const E164 = /^\+[1-9]\d{7,14}$/;

export type SmsResult = { mode: "live" | "test"; sid?: string; error?: string };

/**
 * Sends one SMS. Uses the Twilio connector (gateway) when linked, otherwise
 * direct Twilio credentials (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).
 * With no credentials at all it runs in test mode and only logs.
 */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const from = process.env["TWILIO_FROM_NUMBER"] ?? process.env["TWILIO_PHONE_NUMBER"];
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["TWILIO_API_KEY"];
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];

  let url: string;
  let headers: Record<string, string>;
  if (lovableKey && connKey) {
    url = `${GATEWAY_URL}/Messages.json`;
    headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connKey };
  } else if (sid && token) {
    url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    headers = { Authorization: `Basic ${btoa(`${sid}:${token}`)}` };
  } else {
    console.warn(`[twilio:test-mode] Missing Twilio credentials. SMS to ${to} not sent: ${body}`);
    return { mode: "test" };
  }
  if (!from) {
    console.error("[twilio] Missing TWILIO_FROM_NUMBER — cannot send");
    return { mode: "live", error: "Missing sender number (TWILIO_FROM_NUMBER)" };
  }

    const res = await fetch(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      To: `whatsapp:${to}`,
      From: `whatsapp:${from}`,
      Body: body,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[twilio] Send to ${to} failed [${res.status}]: ${text}`);
    return { mode: "live", error: `Twilio error [${res.status}]: ${text}` };
  }
  let messageSid: string | undefined;
  try {
    messageSid = (JSON.parse(text) as { sid?: string }).sid;
  } catch {
    /* ignore */
  }
  console.log(`[twilio] Sent to ${to}, sid=${messageSid}`);
  return messageSid ? { mode: "live", sid: messageSid } : { mode: "live" };
}

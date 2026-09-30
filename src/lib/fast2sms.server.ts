/**
 * Sends SMS via Fast2SMS's "Quick SMS" route (no DLT template needed).
 * Works for Indian phone numbers, 10-digit, no country code.
 * Docs: https://docs.fast2sms.com
 */

export type SmsResult = { mode: "live" | "test"; error?: string };

/** Strips a leading +91 or 91, Fast2SMS Quick SMS wants plain 10-digit numbers. */
function toIndianLocal(phone: string): string {
  return phone.replace(/^\+?91/, "").replace(/\D/g, "");
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const apiKey = process.env["FAST2SMS_API_KEY"];
  if (!apiKey) {
    console.warn(`[fast2sms:test-mode] Missing FAST2SMS_API_KEY. SMS to ${to} not sent: ${body}`);
    return { mode: "test" };
  }

  const number = toIndianLocal(to);

  const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "q",
      message: body,
      language: "english",
      flash: 0,
      numbers: number,
    }),
  });

  const text = await res.text();
  let parsed: { return?: boolean; message?: string[] } = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    /* ignore parse failure, handled below */
  }

  if (!res.ok || parsed.return !== true) {
    console.error(`[fast2sms] Send to ${to} failed [${res.status}]: ${text}`);
    return { mode: "live", error: `Fast2SMS error [${res.status}]: ${text}` };
  }

  console.log(`[fast2sms] Sent to ${to}`);
  return { mode: "live" };
}
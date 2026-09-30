export type EmailResult = { mode: "live" | "test"; error?: string };

export async function sendEmail(to: string, subject: string, body: string): Promise<EmailResult> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    console.warn(`[email:test-mode] Missing RESEND_API_KEY. Email to ${to} not sent: ${body}`);
    return { mode: "test" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Rhythm Alerts <onboarding@resend.dev>",
      to: [to],
      subject,
      text: body,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`[email] Send to ${to} failed [${res.status}]: ${text}`);
    return { mode: "live", error: `Resend error [${res.status}]: ${text}` };
  }

  console.log(`[email] Sent to ${to}`);
  return { mode: "live" };
}
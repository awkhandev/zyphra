/**
 * Unified mailer — switches between Resend and Brevo based on env vars.
 *
 * Resend (recommended for production with verified domain):
 *   RESEND_API_KEY=re_xxx
 *
 * Brevo (free, sends to any email without domain verification):
 *   BREVO_API_KEY=xkeysib-xxx
 *   Get key at: app.brevo.com → Settings → API Keys
 *
 * RESEND_FROM_EMAIL / BREVO_FROM_EMAIL: sender address
 * ALERT_FROM_NAME: display name (default: "Zyphra Alerts")
 */

type SendOpts = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(
  opts: SendOpts,
): Promise<{ ok: boolean; error?: string }> {
  const { to, subject, html } = opts;

  const fromName = process.env.ALERT_FROM_NAME ?? "Zyphra Alerts";

  // ── Resend ────────────────────────────────────────────────────────────────
  if (process.env.RESEND_API_KEY) {
    const from =
      process.env.RESEND_FROM_EMAIL ?? `${fromName} <onboarding@resend.dev>`;
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({ from, to, subject, html });
      if (result.error)
        return { ok: false, error: `Resend: ${result.error.message}` };
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: `Resend threw: ${e instanceof Error ? e.message : e}`,
      };
    }
  }

  // ── Brevo (SMTP API) ──────────────────────────────────────────────────────
  if (process.env.BREVO_API_KEY) {
    const fromEmail = process.env.BREVO_FROM_EMAIL ?? "noreply@zyphra.app";
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        return { ok: false, error: `Brevo ${res.status}: ${errBody}` };
      }
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: `Brevo threw: ${e instanceof Error ? e.message : e}`,
      };
    }
  }

  return {
    ok: false,
    error:
      "No email provider configured. Set RESEND_API_KEY or BREVO_API_KEY in .env.local",
  };
}

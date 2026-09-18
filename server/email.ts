/**
 * Email provider abstraction — configured only via .env.
 * NOT_CONFIGURED when no provider keys; never throws on missing config for optional notify.
 */
import { ENV } from "./_core/env";

export type EmailResult = { status: "SENT" | "NOT_CONFIGURED" | "ERROR"; error?: string };

export function getEmailStatus(): { configured: boolean; provider: string; detail: string } {
  const p = ENV.emailProvider || "none";
  if (p === "none") return { configured: false, provider: "none", detail: "EMAIL_PROVIDER=none" };
  if (p === "resend") {
    const ok = Boolean(ENV.resendApiKey && ENV.emailFrom);
    return { configured: ok, provider: "resend", detail: ok ? "Resend ready" : "Set RESEND_API_KEY + EMAIL_FROM" };
  }
  if (p === "postmark") {
    const ok = Boolean(ENV.postmarkServerToken && ENV.emailFrom);
    return {
      configured: ok,
      provider: "postmark",
      detail: ok ? "Postmark ready" : "Set POSTMARK_SERVER_TOKEN + EMAIL_FROM",
    };
  }
  if (p === "smtp") {
    const ok = Boolean(ENV.smtpHost && ENV.emailFrom);
    return { configured: ok, provider: "smtp", detail: ok ? "SMTP ready" : "Set SMTP_HOST + EMAIL_FROM" };
  }
  return { configured: false, provider: p, detail: `Unknown EMAIL_PROVIDER=${p}` };
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  const st = getEmailStatus();
  if (!st.configured) {
    return { status: "NOT_CONFIGURED", error: st.detail };
  }

  try {
    if (st.provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ENV.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: ENV.emailFrom,
          to: [opts.to],
          subject: opts.subject,
          html: opts.html,
          text: opts.text,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        return { status: "ERROR", error: body.slice(0, 300) };
      }
      return { status: "SENT" };
    }

    if (st.provider === "postmark") {
      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "X-Postmark-Server-Token": ENV.postmarkServerToken,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          From: ENV.emailFrom,
          To: opts.to,
          Subject: opts.subject,
          HtmlBody: opts.html,
          TextBody: opts.text || opts.subject,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        return { status: "ERROR", error: body.slice(0, 300) };
      }
      return { status: "SENT" };
    }

    return { status: "NOT_CONFIGURED", error: `Provider ${st.provider} send path not fully wired` };
  } catch (e) {
    return { status: "ERROR", error: e instanceof Error ? e.message : "send failed" };
  }
}

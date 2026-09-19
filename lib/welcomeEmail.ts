// Server-side welcome email helpers for UstaadHub.
//
// ONLY the API route (app/api/welcome-email/route.ts) imports this module. It
// reads server-only environment variables (RESEND_API_KEY, WELCOME_EMAIL_FROM),
// so it must never be imported from a client component:
//  - the API key is read from a non-NEXT_PUBLIC variable and never reaches the
//    browser,
//  - nothing here is exposed through a NEXT_PUBLIC_* variable.
//
// The provider is Resend, called over its HTTPS REST API. No SDK dependency is
// added for this: @supabase/supabase-js stays the only runtime dependency.

export const WELCOME_EMAIL_SUBJECT = "Welcome to UstaadHub! 🎓";

export const USTAADHUB_SITE_URL = "https://www.ustaadhub.in";

// Student CTA target (existing public teacher listing route: app/teachers/page.tsx).
export const STUDENT_CTA_URL = `${USTAADHUB_SITE_URL}/teachers`;

// Teacher CTA target = existing teacher profile flow
// (app/teacher/dashboard/profile/edit/page.tsx). The welcome email is only sent
// once the teacher_profiles row exists, so that page is always valid here.
export const TEACHER_CTA_URL = `${USTAADHUB_SITE_URL}/teacher/dashboard/profile/edit`;

export type WelcomeRole = "student" | "teacher";

export type WelcomeEmailContent = {
  subject: string;
  html: string;
  text: string;
};

export type SendWelcomeEmailResult = {
  sent: boolean;
  /** Reason the email was not sent (missing configuration or delivery error). */
  reason?: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Fallback sender address. Resend requires the sending domain to be verified in
// the Resend dashboard; override with WELCOME_EMAIL_FROM (server-side only).
const DEFAULT_SENDER = "UstaadHub <no-reply@ustaadhub.in>";

// ---------------------------------------------------------------------------
// Best-effort duplicate protection
// ---------------------------------------------------------------------------
//
// The registration screens already make a duplicate send very unlikely (a
// repeated submit fails at signUp() with "already registered" and never reaches
// the email step again), but this in-process map also absorbs retries of the
// API route itself.
//
// LIMITATION: each serverless instance keeps its own map, so this is not true
// cross-instance idempotency. Real idempotency would need a durable marker (for
// example a welcome_email_sent_at column), which was deliberately NOT added
// because it would require a database change. See the final report.
const SENT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TRACKED_USERS = 1000;
const sentAtByUserId = new Map<string, number>();

export function hasRecentlySentWelcomeEmail(
  userId: string,
  now: number = Date.now()
): boolean {
  const sentAt = sentAtByUserId.get(userId);

  if (sentAt === undefined) {
    return false;
  }

  if (now - sentAt > SENT_TTL_MS) {
    sentAtByUserId.delete(userId);
    return false;
  }

  return true;
}

export function markWelcomeEmailSent(
  userId: string,
  now: number = Date.now()
): void {
  sentAtByUserId.set(userId, now);

  if (sentAtByUserId.size <= MAX_TRACKED_USERS) {
    return;
  }

  for (const [id, at] of sentAtByUserId) {
    if (now - at > SENT_TTL_MS) {
      sentAtByUserId.delete(id);
    }
  }
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

// The name is read from the verified Supabase account (never from request
// input), but it is still sanitised before it is embedded in the HTML.
export function normalizeRecipientName(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#0f172a;">${text}</p>`;
}

function ctaButton(label: string, url: string): string {
  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">',
    "<tr>",
    '<td align="center" bgcolor="#2563eb" style="border-radius:8px;">',
    `<a href="${url}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(
      label
    )}</a>`,
    "</td>",
    "</tr>",
    "</table>",
  ].join("");
}

function buildHtml(
  greetingName: string,
  introLines: string[],
  ctaLabel: string,
  ctaUrl: string
): string {
  return [
    "<!DOCTYPE html>",
    '<html lang="en"><body style="margin:0;padding:24px 12px;background-color:#f1f5f9;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">',
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">',
    '<tr><td style="padding:32px;">',
    '<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;color:#2563eb;">UstaadHub</p>',
    paragraph(`Assalamu Alaikum ${greetingName},`),
    ...introLines.map((line) => paragraph(line)),
    ctaButton(ctaLabel, ctaUrl),
    '<p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#0f172a;">Regards,<br />Team UstaadHub<br />' +
      `<a href="${USTAADHUB_SITE_URL}" style="color:#2563eb;">${USTAADHUB_SITE_URL}</a></p>`,
    "</td></tr>",
    "</table>",
    "</td></tr></table>",
    "</body></html>",
  ].join("");
}

const STUDENT_INTRO_LINES = [
  "Welcome to UstaadHub! We're happy to have you with us.",
  "Your UstaadHub account has been created successfully. You can now find suitable, verified teachers for your learning needs.",
];

const TEACHER_INTRO_LINES = [
  "Welcome to UstaadHub! We're happy to have you join our teaching community.",
  "Your UstaadHub account has been created successfully. You can now complete your teacher profile and connect with students looking for teachers.",
];

export function buildWelcomeEmail(
  role: WelcomeRole,
  recipientName: string
): WelcomeEmailContent {
  const name = recipientName || "there";
  const greetingName = escapeHtml(name);

  const introLines = role === "teacher" ? TEACHER_INTRO_LINES : STUDENT_INTRO_LINES;
  const ctaLabel = role === "teacher" ? "Complete Your Profile" : "Find a Teacher";
  const ctaUrl = role === "teacher" ? TEACHER_CTA_URL : STUDENT_CTA_URL;
  const plainCtaLabel = role === "teacher" ? "Complete Your Profile:" : "Find a Teacher:";

  return {
    subject: WELCOME_EMAIL_SUBJECT,
    html: buildHtml(greetingName, introLines, ctaLabel, ctaUrl),
    text: [
      `Assalamu Alaikum ${name},`,
      "",
      ...introLines.flatMap((line) => [line, ""]),
      plainCtaLabel,
      ctaUrl,
      "",
      "Regards,",
      "Team UstaadHub",
      USTAADHUB_SITE_URL,
    ].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Delivery (Resend REST API)
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(
  to: string,
  content: WelcomeEmailContent
): Promise<SendWelcomeEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    // Nothing is configured yet. Registration must keep working, so this is a
    // logged no-op instead of an error: set RESEND_API_KEY (server-side only)
    // to enable delivery. The welcome email is deliberately NOT marked as sent,
    // so the first successful configuration can still deliver it.
    console.warn(
      "[welcome-email] RESEND_API_KEY is not configured; welcome email was not sent."
    );

    return { sent: false, reason: "email_provider_not_configured" };
  }

  const from = process.env.WELCOME_EMAIL_FROM?.trim() || DEFAULT_SENDER;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: content.subject,
        html: content.html,
        text: content.text,
      }),
    });

    if (!response.ok) {
      // Log the provider status plus a short provider message only. The API key
      // and the recipient address are never logged.
      const detail = (await response.text()).slice(0, 300);
      console.error(
        `[welcome-email] Resend responded with status ${response.status}: ${detail}`
      );

      return { sent: false, reason: `resend_status_${response.status}` };
    }

    return { sent: true };
  } catch (error) {
    console.error(
      "[welcome-email] Resend request failed:",
      error instanceof Error ? error.message : error
    );

    return { sent: false, reason: "network_error" };
  }
}

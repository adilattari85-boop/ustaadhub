import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildWelcomeEmail,
  hasRecentlySentWelcomeEmail,
  markWelcomeEmailSent,
  normalizeRecipientName,
  sendWelcomeEmail,
  type WelcomeRole,
} from "@/lib/welcomeEmail";

// Server-side only endpoint. Triggered by the registration screens AFTER
// Supabase confirmed a successful signup (and, for teachers, AFTER the
// teacher_profiles row was created).
//
// Security model:
//  - the caller must present a valid Supabase access token,
//  - the recipient email, the display name and the role are read from the
//    verified Supabase account, never from the request body,
//  - the email provider key stays in a server-only environment variable,
//  - delivery failures never propagate to the registration flow.

export const runtime = "nodejs";

// Same shape used by the client-side teacher form validation.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    console.error(
      "[welcome-email] Supabase environment variables are missing; the caller cannot be verified."
    );

    return jsonResponse({ sent: false, reason: "not_configured" }, 503);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice("bearer ".length).trim()
    : "";

  if (!accessToken) {
    return jsonResponse({ sent: false, reason: "missing_token" }, 401);
  }

  // Verifies the token against Supabase. No email is sent for an unknown or
  // unauthenticated caller.
  const authClient = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } =
    await authClient.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return jsonResponse({ sent: false, reason: "invalid_token" }, 401);
  }

  const user = userData.user;
  const role = user.user_metadata?.role;

  // Only the two real registration roles get a welcome email. Anything else
  // (including a client-supplied role, which is ignored entirely) is skipped.
  if (role !== "student" && role !== "teacher") {
    return jsonResponse({ sent: false, reason: "unknown_role" }, 200);
  }

  if (!user.email || !EMAIL_PATTERN.test(user.email)) {
    return jsonResponse({ sent: false, reason: "invalid_recipient" }, 200);
  }

  if (hasRecentlySentWelcomeEmail(user.id)) {
    return jsonResponse({ sent: false, reason: "already_sent" }, 200);
  }

  const name = normalizeRecipientName(user.user_metadata?.name);
  const content = buildWelcomeEmail(role as WelcomeRole, name);
  const result = await sendWelcomeEmail(user.email, content);

  if (result.sent) {
    markWelcomeEmailSent(user.id);
    console.log(`[welcome-email] Welcome email sent for user ${user.id} (${role}).`);
  } else {
    console.warn(
      `[welcome-email] Welcome email not sent for user ${user.id} (${role}): ${
        result.reason ?? "delivery_failed"
      }`
    );
  }

  // Always 200 for a verified caller: the registration flow must not treat a
  // delivery problem as a failed registration.
  return jsonResponse({
    sent: result.sent,
    reason: result.sent ? undefined : result.reason ?? "delivery_failed",
  });
}
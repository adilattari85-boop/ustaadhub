import {
  createUserClient,
  extractBearerToken,
  jsonResponse,
  readPaymentSettings,
  releaseUnpaidRequirement,
  resolveUserId,
} from "@/lib/payments/server";

// Releases a requirement that is still waiting for a payment back to the free
// submission flow, but ONLY while the payment gateway is administratively OFF.
//
// This covers the "admin turned the gateway off while a student had an open
// draft" case: without it the draft would stay unpaid (and therefore permanently
// unmatchable) and the student could not submit a replacement without creating a
// duplicate requirement.
//
// Security model:
//  - a valid Supabase access token is required,
//  - the caller's own token is used to read the requirement, so Row Level
//    Security proves ownership (a forged requirement id returns nothing),
//  - the release itself runs through the service-role-only RPC, which only ever
//    touches a 'pending' requirement that has no captured payment,
//  - when the gateway is ON the request is refused: a live payment flow can
//    never be short-circuited by calling this route.

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const accessToken = extractBearerToken(request);

  if (!accessToken) {
    return jsonResponse({ error: "missing_token" }, 401);
  }

  const userId = await resolveUserId(accessToken);

  if (!userId) {
    return jsonResponse({ error: "invalid_token" }, 401);
  }

  let body: { requirementId?: string };

  try {
    body = (await request.json()) as { requirementId?: string };
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const requirementId = (body.requirementId ?? "").trim();

  if (!UUID_PATTERN.test(requirementId)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const settings = await readPaymentSettings();

  if (!settings) {
    return jsonResponse({ error: "payment_settings_unavailable" }, 503);
  }

  if (settings.enabled) {
    // Payments are required again: never release an open payment flow.
    return jsonResponse({ error: "payment_required" }, 409);
  }

  const userClient = createUserClient(accessToken);

  if (!userClient) {
    return jsonResponse({ error: "server_not_configured" }, 503);
  }

  // Ownership is enforced by RLS: only the student's own requirement is visible.
  const { data: requirement, error: requirementError } = await userClient
    .from("learning_requirements")
    .select("id, payment_status")
    .eq("id", requirementId)
    .maybeSingle();

  if (requirementError) {
    console.error(
      "[payments/release] requirement lookup failed:",
      requirementError.message,
    );

    return jsonResponse({ error: "lookup_failed" }, 500);
  }

  if (!requirement) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const status = String(
    (requirement as { payment_status?: string }).payment_status ??
      "not_required",
  );

  if (status !== "pending") {
    // Already resolved (paid, failed, cancelled or never required): nothing to
    // release, and no state is changed.
    return jsonResponse({ status: "unchanged" });
  }

  const released = await releaseUnpaidRequirement({ requirementId, userId });

  if (!released) {
    return jsonResponse({ error: "release_failed" }, 500);
  }

  return jsonResponse({ status: "released" });
}
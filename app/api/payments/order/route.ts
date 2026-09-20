import { getPaymentGatewayConfig, toMinorUnits } from "@/lib/payments/config";
import {
  createGatewayOrder,
  type GatewayFailureReason,
} from "@/lib/payments/razorpay";
import {
  createServiceClient,
  createUserClient,
  extractBearerToken,
  jsonResponse,
  readPaymentSettings,
  releaseUnpaidRequirement,
  resolveUserId,
} from "@/lib/payments/server";

// Server-side order creation for the optional student payment.
//
// Security model:
//  - the caller must present a valid Supabase access token,
//  - the requirement is read with the CALLER'S token, so Row Level Security
//    proves ownership (a student can never create an order for someone else),
//  - the amount is read from the database (platform_settings), never from the
//    request body,
//  - the gateway Key Secret stays on the server; only the public Key ID is
//    returned so the browser can open Checkout,
//  - at most one open (pending) order exists per requirement, so a repeated
//    "Pay Now" (double click, refresh, retry) reuses the same order instead of
//    creating a second payable one.

export const runtime = "nodejs";

type OrderRequestBody = {
  requirementId?: unknown;
};

type PendingPaymentRow = {
  gateway_order_id: string;
  amount: number | string;
  currency: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildReceipt(requirementId: string): string {
  return `req_${requirementId.replace(/-/g, "").slice(0, 30)}`;
}

function gatewayReasonToStatus(reason: GatewayFailureReason): number {
  if (reason === "gateway_auth_failed") {
    return 502;
  }

  if (reason === "gateway_request_failed" || reason === "gateway_invalid_response") {
    return 502;
  }

  return 503;
}

export async function POST(request: Request) {
  const config = getPaymentGatewayConfig();

  if (!config) {
    console.error(
      "[payments/order] PAYMENT_GATEWAY_KEY_ID / PAYMENT_GATEWAY_KEY_SECRET are not configured.",
    );

    return jsonResponse({ error: "gateway_not_configured" }, 503);
  }

  const accessToken = extractBearerToken(request);

  if (!accessToken) {
    return jsonResponse({ error: "missing_token" }, 401);
  }

  const userId = await resolveUserId(accessToken);

  if (!userId) {
    return jsonResponse({ error: "invalid_token" }, 401);
  }

  let body: OrderRequestBody;

  try {
    body = (await request.json()) as OrderRequestBody;
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const requirementId =
    typeof body.requirementId === "string" ? body.requirementId.trim() : "";

  if (!UUID_PATTERN.test(requirementId)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const userClient = createUserClient(accessToken);
  const serviceClient = createServiceClient();

  if (!userClient || !serviceClient) {
    console.error(
      "[payments/order] Supabase server configuration is incomplete (publishable key / service role key).",
    );

    return jsonResponse({ error: "server_not_configured" }, 503);
  }

  // RLS-scoped read: only the owning student can see this row.
  const { data: requirement, error: requirementError } = await userClient
    .from("learning_requirements")
    .select("id, payment_status, deleted_at")
    .eq("id", requirementId)
    .maybeSingle();

  if (requirementError) {
    console.error(
      "[payments/order] requirement lookup failed:",
      requirementError.message,
    );

    return jsonResponse({ error: "requirement_lookup_failed" }, 500);
  }

  if (!requirement) {
    return jsonResponse({ error: "requirement_not_found" }, 404);
  }

  if (requirement.deleted_at !== null) {
    return jsonResponse({ error: "requirement_inactive" }, 409);
  }

  if (requirement.payment_status === "paid") {
    return jsonResponse({ error: "already_paid" }, 409);
  }

  const settings = await readPaymentSettings();

  if (!settings) {
    return jsonResponse({ error: "server_not_configured" }, 503);
  }

  // The gateway switch can be turned off again while a requirement is open.
  if (!settings.enabled || settings.amount <= 0) {
    // A requirement created while the gateway was ON is still waiting for a
    // payment that can no longer be made. Release it back to the free flow
    // (the RPC never releases a requirement that is already paid) so it is not
    // stuck without a way forward.
    if (requirement.payment_status === "pending") {
      await releaseUnpaidRequirement({ requirementId, userId });
    }

    return jsonResponse({ error: "payment_not_required" }, 409);
  }

  const amount = settings.amount;
  const currency = settings.currency;
  const amountMinorUnits = toMinorUnits(amount);

  if (amountMinorUnits <= 0) {
    return jsonResponse({ error: "invalid_amount" }, 409);
  }

  // Duplicate-order protection: reuse the single open order of this
  // requirement when it already exists.
  const { data: pendingPayment, error: pendingError } = await serviceClient
    .from("payments")
    .select("gateway_order_id, amount, currency")
    .eq("requirement_id", requirementId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingError) {
    console.error(
      "[payments/order] pending order lookup failed:",
      pendingError.message,
    );

    return jsonResponse({ error: "payment_lookup_failed" }, 500);
  }

  const existing = pendingPayment as PendingPaymentRow | null;

  if (existing?.gateway_order_id) {
    const existingMatchesSettings =
      Number(existing.amount) === amount &&
      String(existing.currency ?? "").toUpperCase() ===
        String(currency ?? "").toUpperCase();

    if (existingMatchesSettings) {
      // Reuse the same order: a double click, refresh or retry never creates a
      // second payable order for the same requirement.
      return jsonResponse({
        orderId: existing.gateway_order_id,
        amount: Number(existing.amount),
        currency: existing.currency,
        amountMinorUnits: toMinorUnits(Number(existing.amount)),
        keyId: config.keyId,
        reused: true,
      });
    }

    // The admin changed the configured amount/currency since the open order was
    // created: retire it (never delete it, the ledger stays the audit trail)
    // and fall through so a fresh order with the configured amount is created.
    const { error: retireError } = await serviceClient
      .from("payments")
      .update({ status: "cancelled", failure_reason: "amount_changed" })
      .eq("requirement_id", requirementId)
      .eq("status", "pending");

    if (retireError) {
      console.error(
        "[payments/order] could not retire the stale pending order:",
        retireError.message,
      );

      return jsonResponse({ error: "payment_lookup_failed" }, 500);
    }
  }

  const orderResult = await createGatewayOrder(config, {
    amountMinorUnits,
    currency,
    receipt: buildReceipt(requirementId),
    notes: { requirement_id: requirementId, user_id: userId },
  });

  if (!orderResult.ok) {
    return jsonResponse(
      { error: orderResult.reason },
      gatewayReasonToStatus(orderResult.reason),
    );
  }

  const { error: insertError } = await serviceClient.from("payments").insert({
    requirement_id: requirementId,
    user_id: userId,
    gateway: config.provider,
    gateway_order_id: orderResult.data.id,
    amount,
    currency,
    status: "pending",
  });

  if (insertError) {
    // 23505 = the partial unique index "one open order per requirement" raced
    // with another request: reuse whatever order won the race.
    if (insertError.code === "23505") {
      const { data: raced } = await serviceClient
        .from("payments")
        .select("gateway_order_id, amount, currency")
        .eq("requirement_id", requirementId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const racedRow = raced as PendingPaymentRow | null;

      if (racedRow?.gateway_order_id) {
        return jsonResponse({
          orderId: racedRow.gateway_order_id,
          amount: Number(racedRow.amount),
          currency: racedRow.currency,
          amountMinorUnits: toMinorUnits(Number(racedRow.amount)),
          keyId: config.keyId,
          reused: true,
        });
      }
    }

    console.error(
      "[payments/order] could not record the gateway order:",
      insertError.message,
    );

    return jsonResponse({ error: "payment_record_failed" }, 500);
  }

  return jsonResponse({
    orderId: orderResult.data.id,
    amount,
    currency,
    amountMinorUnits,
    keyId: config.keyId,
    reused: false,
  });
}
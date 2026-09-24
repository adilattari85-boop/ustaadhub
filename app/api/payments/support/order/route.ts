import { getPaymentGatewayConfig, toMinorUnits } from "@/lib/payments/config";
import {
  createGatewayOrder,
  type GatewayFailureReason,
} from "@/lib/payments/razorpay";
import {
  createServiceClient,
  extractBearerToken,
  jsonResponse,
  readPaymentSettings,
  resolveUserId,
} from "@/lib/payments/server";

// Server-side order creation for "Support UstaadHub" payments
// (donation | sponsorship). It reuses the existing Razorpay gateway
// helpers - there is intentionally no second gateway implementation.
//
// Security model (mirrors /api/payments/order):
//  - the amount comes from the request body (the payer chooses it, unlike
//    the fixed requirement amount) but is server-validated against a
//    strict min/max range and rounded to whole rupees,
//  - authentication is OPTIONAL: a signed-in supporter is recorded in
//    user_id, an anonymous visitor is stored with user_id = null,
//  - the admin payment-gateway switch is honoured; when the gateway is
//    off, no support order is created,
//  - the gateway Key Secret stays on the server; only the public Key ID
//    is returned so the browser can open Checkout,
//  - the row is recorded BEFORE Checkout opens, keyed by the UNIQUE
//    razorpay_order_id, so verification and the webhook can only ever
//    transition this one record (idempotent paid update).
//
// This route does not read or write public.payments, so the existing
// learning-requirement payment flow is untouched.

export const runtime = "nodejs";

type OrderRequestBody = {
  paymentType?: unknown;
  amount?: unknown;
};

const SUPPORT_PAYMENT_TYPES = new Set(["donation", "sponsorship"]);
const SUPPORT_CURRENCY = "INR";
const MIN_SUPPORT_AMOUNT = 10; // ₹10
const MAX_SUPPORT_AMOUNT = 500000; // ₹5,00,000

function gatewayReasonToStatus(reason: GatewayFailureReason): number {
  if (
    reason === "gateway_auth_failed" ||
    reason === "gateway_request_failed" ||
    reason === "gateway_invalid_response"
  ) {
    return 502;
  }

  return 503;
}

/** Accepts finite numbers only; rounds to whole rupees inside [min, max]. */
function readSupportAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  const rounded = Math.round(value);

  if (rounded < MIN_SUPPORT_AMOUNT || rounded > MAX_SUPPORT_AMOUNT) {
    return 0;
  }

  return rounded;
}

export async function POST(request: Request) {
  const config = getPaymentGatewayConfig();

  if (!config) {
    console.error(
      "[payments/support/order] PAYMENT_GATEWAY_KEY_ID / PAYMENT_GATEWAY_KEY_SECRET are not configured.",
    );

    return jsonResponse({ error: "gateway_not_configured" }, 503);
  }

  let body: OrderRequestBody;

  try {
    body = (await request.json()) as OrderRequestBody;
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const paymentType =
    typeof body.paymentType === "string" ? body.paymentType.trim() : "";

  if (!SUPPORT_PAYMENT_TYPES.has(paymentType)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const amount = readSupportAmount(body.amount);

  if (amount <= 0) {
    return jsonResponse({ error: "invalid_amount" }, 400);
  }

  // Honour the existing admin gateway switch (same source as the
  // requirement payment). Support payments never bypass it.
  const settings = await readPaymentSettings();

  if (!settings) {
    return jsonResponse({ error: "server_not_configured" }, 503);
  }

  if (!settings.enabled) {
    return jsonResponse({ error: "gateway_disabled" }, 409);
  }

  // Optional identity: a valid token attaches the supporter; anonymous
  // donations are allowed, and an invalid/expired token is simply stored
  // as anonymous instead of blocking the payment.
  let userId: string | null = null;
  const accessToken = extractBearerToken(request);

  if (accessToken) {
    userId = await resolveUserId(accessToken);
  }

  const serviceClient = createServiceClient();

  if (!serviceClient) {
    console.error(
      "[payments/support/order] SUPABASE_SERVICE_ROLE_KEY is not configured; support payments cannot be recorded.",
    );

    return jsonResponse({ error: "server_not_configured" }, 503);
  }

  const amountMinorUnits = toMinorUnits(amount);

  if (amountMinorUnits <= 0) {
    return jsonResponse({ error: "invalid_amount" }, 400);
  }

  const receipt = `sup_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;

  const orderResult = await createGatewayOrder(config, {
    amountMinorUnits,
    currency: SUPPORT_CURRENCY,
    receipt,
    notes: {
      payment_type: paymentType,
      user_id: userId ?? "anonymous",
    },
  });

  if (!orderResult.ok) {
    return jsonResponse(
      { error: orderResult.reason },
      gatewayReasonToStatus(orderResult.reason),
    );
  }

  const { error: insertError } = await serviceClient
    .from("support_payments")
    .insert({
      payment_type: paymentType,
      user_id: userId,
      amount,
      currency: SUPPORT_CURRENCY,
      razorpay_order_id: orderResult.data.id,
      payment_status: "pending",
    });

  if (insertError) {
    console.error(
      "[payments/support/order] could not record the gateway order:",
      insertError.message,
    );

    return jsonResponse({ error: "payment_record_failed" }, 500);
  }

  return jsonResponse({
    orderId: orderResult.data.id,
    amount,
    currency: SUPPORT_CURRENCY,
    amountMinorUnits,
    keyId: config.keyId,
  });
}

import {
  getPaymentGatewayConfig,
  toMinorUnits,
} from "@/lib/payments/config";
import {
  captureGatewayPayment,
  fetchGatewayPayment,
  verifyCheckoutSignature,
  type GatewayFailureReason,
} from "@/lib/payments/razorpay";
import {
  applyPaymentResult,
  createServiceClient,
  extractBearerToken,
  jsonResponse,
  resolveUserId,
} from "@/lib/payments/server";

// Server-side verification of a completed checkout.
//
// Security model:
//  - the caller must present a valid Supabase access token,
//  - the order is looked up in our own payment ledger and must belong to the
//    authenticated user (a browser-supplied requirement/user id is ignored),
//  - the checkout signature is verified with the gateway Key Secret
//    (HMAC-SHA256) and the payment is then re-read from the gateway API, so a
//    forged "payment successful" flag cannot activate a requirement,
//  - the amount/currency/order are cross-checked against the amount we
//    recorded server-side,
//  - the final state change happens through one service-role-only RPC, so the
//    payment and its requirement can never disagree; a repeated verification
//    is a no-op (idempotent).

export const runtime = "nodejs";

type VerifyRequestBody = {
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
};

type PaymentRow = {
  id: string;
  requirement_id: string;
  user_id: string;
  amount: number | string;
  currency: string;
  status: string;
};

const MAX_IDENTIFIER_LENGTH = 200;
const MAX_SIGNATURE_LENGTH = 256;

function readIdentifier(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  if (trimmed === "" || trimmed.length > MAX_IDENTIFIER_LENGTH) {
    return "";
  }

  return trimmed;
}

function readSignature(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim().toLowerCase();

  if (
    trimmed === "" ||
    trimmed.length > MAX_SIGNATURE_LENGTH ||
    !/^[0-9a-f]+$/.test(trimmed)
  ) {
    return "";
  }

  return trimmed;
}

function gatewayReasonToStatus(reason: GatewayFailureReason): number {
  return reason === "gateway_auth_failed" ? 502 : 503;
}

export async function POST(request: Request) {
  const config = getPaymentGatewayConfig();

  if (!config) {
    console.error(
      "[payments/verify] PAYMENT_GATEWAY_KEY_ID / PAYMENT_GATEWAY_KEY_SECRET are not configured.",
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

  let body: VerifyRequestBody;

  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const orderId = readIdentifier(body.razorpay_order_id);
  const paymentId = readIdentifier(body.razorpay_payment_id);
  const signature = readSignature(body.razorpay_signature);

  if (!orderId || !paymentId || !signature) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const serviceClient = createServiceClient();

  if (!serviceClient) {
    console.error(
      "[payments/verify] SUPABASE_SERVICE_ROLE_KEY is not configured; verified payments cannot be stored.",
    );

    return jsonResponse({ error: "server_not_configured" }, 503);
  }

  const { data: paymentData, error: paymentError } = await serviceClient
    .from("payments")
    .select("id, requirement_id, user_id, amount, currency, status")
    .eq("gateway_order_id", orderId)
    .limit(1)
    .maybeSingle();

  if (paymentError) {
    console.error(
      "[payments/verify] payment lookup failed:",
      paymentError.message,
    );

    return jsonResponse({ error: "payment_lookup_failed" }, 500);
  }

  const payment = paymentData as PaymentRow | null;

  if (!payment) {
    return jsonResponse({ error: "unknown_order" }, 404);
  }

  if (payment.user_id !== userId) {
    console.warn("[payments/verify] rejected a payment that belongs to another user.");

    return jsonResponse({ error: "forbidden" }, 403);
  }

  if (payment.status === "paid") {
    // Idempotent: a refreshed/repeated verification returns the final state.
    return jsonResponse({
      status: "paid",
      alreadyProcessed: true,
      requirementId: payment.requirement_id,
    });
  }

  // 1. Signature check: the only proof that this browser callback is genuine.
  if (
    !verifyCheckoutSignature(config, {
      orderId,
      paymentId,
      signature,
    })
  ) {
    console.warn(
      "[payments/verify] checkout signature verification failed for a recorded order.",
    );

    // No state change: a forged/mismatched callback must not downgrade the
    // order (the legitimate payment may still complete through the webhook).
    return jsonResponse({ error: "signature_mismatch" }, 400);
  }

  // 2. Ask the gateway what actually happened with this payment.
  const paymentResult = await fetchGatewayPayment(config, paymentId);

  if (!paymentResult.ok) {
    return jsonResponse(
      { error: paymentResult.reason },
      gatewayReasonToStatus(paymentResult.reason),
    );
  }

  const gatewayPayment = paymentResult.data;
  const expectedMinorUnits = toMinorUnits(Number(payment.amount));

  if (gatewayPayment.orderId !== orderId) {
    console.warn("[payments/verify] gateway payment does not belong to this order.");

    return jsonResponse({ error: "order_mismatch" }, 400);
  }

  if (gatewayPayment.amount !== expectedMinorUnits) {
    console.warn("[payments/verify] gateway amount does not match the recorded amount.");

    return jsonResponse({ error: "amount_mismatch" }, 400);
  }

  if (
    gatewayPayment.currency.toUpperCase() !== payment.currency.toUpperCase()
  ) {
    console.warn("[payments/verify] gateway currency does not match the recorded currency.");

    return jsonResponse({ error: "currency_mismatch" }, 400);
  }

  if (gatewayPayment.status === "failed") {
    await applyPaymentResult({
      orderId,
      paymentId,
      status: "failed",
      signatureVerified: false,
      failureReason:
        gatewayPayment.errorDescription ?? gatewayPayment.errorCode ?? null,
    });

    return jsonResponse({ error: "payment_failed" }, 402);
  }

  // 3. A manually captured gateway account leaves the payment 'authorized'.
  if (gatewayPayment.status === "authorized") {
    const captureResult = await captureGatewayPayment(config, {
      paymentId,
      amountMinorUnits: expectedMinorUnits,
      currency: payment.currency,
    });

    if (!captureResult.ok || captureResult.data.status !== "captured") {
      console.error(
        "[payments/verify] capture did not complete; the signed webhook will retry.",
      );

      return jsonResponse({ error: "payment_not_completed" }, 402);
    }
  } else if (gatewayPayment.status !== "captured") {
    return jsonResponse({ error: "payment_not_completed" }, 402);
  }

  // 4. Final, transactional state change (payment + requirement together).
  const outcome = await applyPaymentResult({
    orderId,
    paymentId: gatewayPayment.id,
    status: "paid",
    signatureVerified: true,
  });

  if (!outcome.ok) {
    console.error("[payments/verify] verified payment could not be stored.");

    return jsonResponse({ error: outcome.reason }, 500);
  }

  if (!outcome.applied) {
    return jsonResponse({ error: "unknown_order" }, 404);
  }

  return jsonResponse({
    status: "paid",
    alreadyProcessed: false,
    requirementId: outcome.applied.requirementId,
  });
}
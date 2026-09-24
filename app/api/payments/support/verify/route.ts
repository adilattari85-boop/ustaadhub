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
  applySupportPaymentResult,
  createServiceClient,
  extractBearerToken,
  findSupportPaymentByOrderId,
  jsonResponse,
  resolveUserId,
} from "@/lib/payments/server";

// Server-side verification of a completed "Support UstaadHub" checkout.
//
// Security model (mirrors /api/payments/verify, minus the requirement
// ownership rule because donations may be anonymous):
//  - the checkout signature is verified with the gateway Key Secret
//    (HMAC-SHA256), so a forged "payment successful" flag can never mark
//    a donation as paid,
//  - the payment is then re-read from the gateway API and its order id,
//    amount and currency are cross-checked against the amount WE
//    recorded server-side,
//  - when the recorded row belongs to a signed-in supporter, the caller
//    must present that supporter's token (a browser-supplied user id is
//    ignored); anonymous rows only need the valid signature,
//  - the final state change is an idempotent service-role-only UPDATE
//    keyed by the UNIQUE razorpay_order_id and guarded by
//    payment_status, so a replayed callback is a no-op.
//
// public.payments is never touched: the learning-requirement flow stays
// completely separate.

export const runtime = "nodejs";

type VerifyRequestBody = {
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
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
      "[payments/support/verify] PAYMENT_GATEWAY_KEY_ID / PAYMENT_GATEWAY_KEY_SECRET are not configured.",
    );

    return jsonResponse({ error: "gateway_not_configured" }, 503);
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
      "[payments/support/verify] SUPABASE_SERVICE_ROLE_KEY is not configured; verified support payments cannot be stored.",
    );

    return jsonResponse({ error: "server_not_configured" }, 503);
  }

  const payment = await findSupportPaymentByOrderId(orderId);

  if (!payment) {
    return jsonResponse({ error: "unknown_order" }, 404);
  }

  // A row attached to a signed-in supporter may only be verified with
  // that supporter's token. Anonymous rows (user_id = null) only need
  // the valid checkout signature checked below.
  if (payment.user_id) {
    const accessToken = extractBearerToken(request);
    const userId = accessToken ? await resolveUserId(accessToken) : null;

    if (!userId || userId !== payment.user_id) {
      console.warn(
        "[payments/support/verify] rejected a support payment that belongs to another user.",
      );

      return jsonResponse({ error: "forbidden" }, 403);
    }
  }

  if (payment.payment_status === "paid") {
    // Idempotent: a refreshed/repeated verification returns the final state.
    return jsonResponse({ status: "paid", alreadyProcessed: true });
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
      "[payments/support/verify] checkout signature verification failed for a recorded order.",
    );

    // No state change: a forged/mismatched callback must not downgrade the
    // row (the legitimate payment may still complete through the webhook).
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
    console.warn(
      "[payments/support/verify] gateway payment does not belong to this order.",
    );

    return jsonResponse({ error: "order_mismatch" }, 400);
  }

  if (gatewayPayment.amount !== expectedMinorUnits) {
    console.warn(
      "[payments/support/verify] gateway amount does not match the recorded amount.",
    );

    return jsonResponse({ error: "amount_mismatch" }, 400);
  }

  if (
    gatewayPayment.currency.toUpperCase() !== payment.currency.toUpperCase()
  ) {
    console.warn(
      "[payments/support/verify] gateway currency does not match the recorded currency.",
    );

    return jsonResponse({ error: "currency_mismatch" }, 400);
  }

  if (gatewayPayment.status === "failed") {
    await applySupportPaymentResult({
      orderId,
      paymentId,
      status: "failed",
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
        "[payments/support/verify] capture did not complete; the signed webhook will retry.",
      );

      return jsonResponse({ error: "payment_not_completed" }, 402);
    }
  } else if (gatewayPayment.status !== "captured") {
    return jsonResponse({ error: "payment_not_completed" }, 402);
  }

  // 4. Final, idempotent state change through the service role.
  const outcome = await applySupportPaymentResult({
    orderId,
    paymentId: gatewayPayment.id,
    status: "paid",
    signature,
  });

  if (!outcome.ok) {
    console.error(
      "[payments/support/verify] verified support payment could not be stored.",
    );

    return jsonResponse({ error: outcome.reason }, 500);
  }

  return jsonResponse({
    status: "paid",
    alreadyProcessed: !outcome.applied,
  });
}

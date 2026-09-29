import {
  getPaymentGatewayConfig,
} from "@/lib/payments/config";
import {
  captureGatewayPayment,
  fetchGatewayPayment,
  verifyCheckoutSignature,
  type GatewayFailureReason,
} from "@/lib/payments/razorpay";
import {
  createServiceClient,
  extractBearerToken,
  jsonResponse,
  resolveUserId,
} from "@/lib/payments/server";
import {
  applyJobContactUnlockResult,
  findJobContactUnlockByOrderId,
  JOB_CONTACT_PURPOSE,
  toMinorUnitsFromRupees,
} from "@/lib/payments/jobContact";

// Server-side verification of a completed JOB CONTACT UNLOCK checkout.
//
// Security model (mirrors /api/payments/support/verify, minus the requirement
// ownership rule because an anonymous visitor may pay):
//  - the checkout signature is verified with the gateway Key Secret
//    (HMAC-SHA256) BEFORE any state change, so a forged "payment successful"
//    flag can never mark an unlock as paid,
//  - the payment is then re-read from the gateway API and its order id, amount
//    and currency are cross-checked against the amount/currency WE recorded
//    server-side in job_contact_unlocks - never against anything in the body,
//  - the request is matched to a real job-contact ledger row by the UNIQUE
//    razorpay_order_id. That row can only have been written by the order route,
//    so finding it is what establishes "purpose = job_contact_unlock"; an order
//    belonging to public.payments or public.support_payments is not in this
//    ledger at all and is rejected as an unknown order,
//  - the client-supplied user_id and payment_status are never read. The identity
//    is taken from the access token, and when the recorded row belongs to a
//    signed-in user that user must present their own token,
//  - the final transition is an idempotent service-role-only UPDATE guarded by
//    payment_status, so a replayed callback returns success without writing a
//    second unlock,
//  - a row is never marked paid before the signature check and the gateway
//    cross-check have both succeeded.
//
// public.payments and public.support_payments are never touched here.

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
      "[payments/job-contact/verify] PAYMENT_GATEWAY_KEY_ID / PAYMENT_GATEWAY_KEY_SECRET are not configured.",
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
      "[payments/job-contact/verify] SUPABASE_SERVICE_ROLE_KEY is not configured.",
    );

    return jsonResponse({ error: "server_not_configured" }, 503);
  }

  // The ledger row is the anchor: it proves this order is a job-contact unlock
  // (and only the order route can create such a row) and it carries the
  // amount/currency WE decided server-side.
  const unlock = await findJobContactUnlockByOrderId(orderId);

  if (!unlock) {
    return jsonResponse({ error: "unknown_order" }, 404);
  }

  // Ownership rule: a row created for a signed-in user may only be completed by
  // that same user presenting their own token. Guest rows (user_id = null) only
  // need the valid signature, exactly like a donation.
  if (unlock.user_id) {
    const accessToken = extractBearerToken(request);
    const callerId = accessToken ? await resolveUserId(accessToken) : null;

    if (callerId !== unlock.user_id) {
      return jsonResponse({ error: "not_yours" }, 403);
    }
  }

  // Idempotency: a repeated verification of an already paid unlock succeeds
  // without touching the ledger again.
  if (
    unlock.payment_status === "paid" &&
    unlock.razorpay_payment_id === paymentId
  ) {
    return jsonResponse({
      status: "paid",
      alreadyProcessed: true,
      purpose: JOB_CONTACT_PURPOSE,
      unlockId: unlock.id,
    });
  }

  // 1. Signature check - the only proof this browser callback is genuine.
  if (
    !verifyCheckoutSignature(config, {
      orderId,
      paymentId,
      signature,
    })
  ) {
    console.warn(
      "[payments/job-contact/verify] checkout signature verification failed for a recorded job-contact order.",
    );

    // No state change: the legitimate payment can still complete via webhook.
    return jsonResponse({ error: "signature_mismatch" }, 400);
  }

  // 2. Ask the gateway what actually happened to this payment.
  const paymentResult = await fetchGatewayPayment(config, paymentId);

  if (!paymentResult.ok) {
    return jsonResponse(
      { error: paymentResult.reason },
      gatewayReasonToStatus(paymentResult.reason),
    );
  }

  const gatewayPayment = paymentResult.data;
  // Compare in minor units against the LEDGER amount, never a client value.
  const expectedMinorUnits = toMinorUnitsFromRupees(unlock.amount);

  if (gatewayPayment.orderId !== orderId) {
    console.warn(
      "[payments/job-contact/verify] gateway payment does not belong to this order.",
    );

    return jsonResponse({ error: "order_mismatch" }, 400);
  }

  if (gatewayPayment.amount !== expectedMinorUnits) {
    console.warn(
      "[payments/job-contact/verify] gateway amount does not match the recorded unlock amount.",
    );

    return jsonResponse({ error: "amount_mismatch" }, 400);
  }

  if (gatewayPayment.currency.toUpperCase() !== unlock.currency.toUpperCase()) {
    console.warn(
      "[payments/job-contact/verify] gateway currency does not match the recorded unlock currency.",
    );

    return jsonResponse({ error: "currency_mismatch" }, 400);
  }

  if (gatewayPayment.status === "failed") {
    await applyJobContactUnlockResult({
      orderId,
      paymentId: gatewayPayment.id,
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
      currency: unlock.currency,
    });

    if (!captureResult.ok || captureResult.data.status !== "captured") {
      console.error(
        "[payments/job-contact/verify] capture did not complete; the signed webhook will retry.",
      );

      return jsonResponse({ error: "payment_not_completed" }, 402);
    }
  } else if (gatewayPayment.status !== "captured") {
    return jsonResponse({ error: "payment_not_completed" }, 402);
  }

  // 4. Final, idempotent state change through the service role.
  const outcome = await applyJobContactUnlockResult({
    orderId,
    paymentId: gatewayPayment.id,
    status: "paid",
  });

  if (!outcome.ok) {
    console.error(
      "[payments/job-contact/verify] verified job contact unlock could not be stored:",
      outcome.reason,
    );

    return jsonResponse({ error: outcome.reason }, 500);
  }

  return jsonResponse({
    status: "paid",
    // applied = false means the row was already paid (replay or a webhook that
    // got there first): still a success, and no second unlock was created.
    alreadyProcessed: !outcome.applied,
    purpose: JOB_CONTACT_PURPOSE,
    unlockId: unlock.id,
  });
}

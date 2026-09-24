import { getPaymentGatewayConfig, toMinorUnits } from "@/lib/payments/config";
import {
  captureGatewayPayment,
  verifyWebhookSignature,
} from "@/lib/payments/razorpay";
import {
  applyPaymentResult,
  applySupportPaymentResult,
  findPaymentByOrderId,
  findSupportPaymentByOrderId,
  forgetWebhookEvent,
  jsonResponse,
  recordWebhookEvent,
  type SupportPaymentLedgerRow,
} from "@/lib/payments/server";

// Signed gateway webhook (the source of truth when the student closes the tab
// before the browser callback runs).
//
// Security / idempotency model:
//  - the raw request body is verified against the webhook secret with
//    HMAC-SHA256 (timing-safe); an unsigned/forged call changes nothing,
//  - the gateway event id is recorded first, so a replayed delivery is
//    acknowledged and skipped instead of being processed twice,
//  - the reported amount/currency/order are cross-checked against OUR payment
//    ledger row, so even a signed payload can never activate a requirement
//    with the wrong amount,
//  - the state change goes through the service-role-only RPC, which is
//    idempotent and never downgrades an already paid payment,
//  - if processing fails after the event was claimed, the claim is released so
//    the gateway's next delivery attempt is processed instead of being
//    discarded as a duplicate,
//  - no key material, secret or full payment payload is ever logged.
//
// The route answers 2xx for events it does not act on (unknown order, unrelated
// event type, mismatched amount) so the gateway does not retry them.

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

type NormalizedEvent = {
  eventId: string;
  eventType: string;
  orderId: string;
  paymentId: string | null;
  amountMinorUnits: number | null;
  currency: string | null;
  gatewayStatus: string | null;
  failureReason: string | null;
};

const MAX_EVENT_ID_LENGTH = 200;

/**
 * Applies a signed gateway event to the "Support UstaadHub" ledger
 * (donations + sponsorships) when the order id is NOT in public.payments.
 *
 * Same rules as the requirement flow: the reported amount/currency are
 * cross-checked against OUR recorded row, only a captured payment may be
 * marked paid, and every transition is idempotent (guarded by
 * payment_status on the UNIQUE razorpay_order_id). Returns null when the
 * order is unknown to BOTH ledgers, so the caller can answer "ignored".
 */
async function applyEventToSupportLedger(
  config: NonNullable<ReturnType<typeof getPaymentGatewayConfig>>,
  event: NormalizedEvent,
): Promise<ReturnType<typeof jsonResponse> | null> {
  const supportPayment: SupportPaymentLedgerRow | null =
    await findSupportPaymentByOrderId(event.orderId);

  if (!supportPayment) {
    return null;
  }

  const expectedMinorUnits = toMinorUnits(supportPayment.amount);

  if (
    event.amountMinorUnits !== null &&
    event.amountMinorUnits !== expectedMinorUnits
  ) {
    console.warn(
      "[payments/webhook] support event amount does not match the recorded amount; no state change.",
    );

    return jsonResponse({ status: "amount_mismatch" });
  }

  if (
    event.currency !== null &&
    event.currency.toUpperCase() !== supportPayment.currency.toUpperCase()
  ) {
    console.warn(
      "[payments/webhook] support event currency does not match the recorded currency; no state change.",
    );

    return jsonResponse({ status: "currency_mismatch" });
  }

  const isSuccessEvent =
    event.eventType === "payment.captured" || event.eventType === "order.paid";
  const isAuthorizedEvent = event.eventType === "payment.authorized";
  const isFailedEvent = event.eventType === "payment.failed";

  if (isSuccessEvent) {
    if (!event.paymentId) {
      return jsonResponse({ status: "ignored" });
    }

    if (event.gatewayStatus && event.gatewayStatus !== "captured") {
      return jsonResponse({ status: "not_captured" });
    }

    const outcome = await applySupportPaymentResult({
      orderId: event.orderId,
      paymentId: event.paymentId,
      status: "paid",
    });

    if (!outcome.ok) {
      await forgetWebhookEvent(event.eventId);

      return jsonResponse({ error: outcome.reason }, 500);
    }

    return jsonResponse({ status: "paid" });
  }

  if (isAuthorizedEvent) {
    if (!event.paymentId) {
      return jsonResponse({ status: "ignored" });
    }

    // Manual-capture gateway accounts: try to capture server-side; the
    // capture event (or the browser verification route) is the fallback.
    const capture = await captureGatewayPayment(config, {
      paymentId: event.paymentId,
      amountMinorUnits: expectedMinorUnits,
      currency: supportPayment.currency,
    });

    if (!capture.ok || capture.data.status !== "captured") {
      console.error(
        "[payments/webhook] authorized support payment could not be captured; waiting for the capture event.",
      );

      return jsonResponse({ status: "not_captured" });
    }

    const outcome = await applySupportPaymentResult({
      orderId: event.orderId,
      paymentId: event.paymentId,
      status: "paid",
    });

    if (!outcome.ok) {
      await forgetWebhookEvent(event.eventId);

      return jsonResponse({ error: outcome.reason }, 500);
    }

    return jsonResponse({ status: "paid" });
  }

  if (isFailedEvent) {
    const outcome = await applySupportPaymentResult({
      orderId: event.orderId,
      paymentId: event.paymentId,
      status: "failed",
      failureReason: event.failureReason,
    });

    if (!outcome.ok) {
      await forgetWebhookEvent(event.eventId);

      return jsonResponse({ error: outcome.reason }, 500);
    }

    return jsonResponse({ status: "failed" });
  }

  return jsonResponse({ status: "ignored" });
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function readString(source: JsonRecord | null, key: string): string | null {
  const value = source?.[key];

  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function readNumber(source: JsonRecord | null, key: string): number | null {
  const value = source?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Pulls the payment entity out of the gateway's webhook envelope. */
function extractPaymentEntity(body: JsonRecord): JsonRecord | null {
  const payload = asRecord(body.payload);
  const payment = asRecord(payload?.payment);

  return asRecord(payment?.entity);
}

function normalizeEvent(
  request: Request,
  body: JsonRecord,
): NormalizedEvent | null {
  const eventType = readString(body, "event");

  if (!eventType) {
    return null;
  }

  const accountId = readString(body, "account_id") ?? "unknown";
  const entity = extractPaymentEntity(body);
  const paymentId = readString(entity, "id");
  const orderId = readString(entity, "order_id");
  const headerEventId =
    request.headers.get("x-razorpay-event-id")?.trim() ?? "";

  // Prefer the gateway's own event id header; fall back to a deterministic
  // composite so a replay of the same delivery is still detected.
  const eventId =
    headerEventId !== "" && headerEventId.length <= MAX_EVENT_ID_LENGTH
      ? headerEventId
      : `${eventType}:${accountId}:${orderId ?? "no-order"}:${
          paymentId ?? "no-payment"
        }`;

  return {
    eventId,
    eventType,
    orderId: orderId ?? "",
    paymentId,
    amountMinorUnits: readNumber(entity, "amount"),
    currency: readString(entity, "currency"),
    gatewayStatus: readString(entity, "status"),
    failureReason:
      readString(entity, "error_description") ??
      readString(entity, "error_code"),
  };
}

export async function POST(request: Request) {
  const config = getPaymentGatewayConfig();

  if (!config) {
    console.error(
      "[payments/webhook] PAYMENT_GATEWAY_KEY_ID / PAYMENT_GATEWAY_KEY_SECRET are not configured.",
    );

    return jsonResponse({ error: "gateway_not_configured" }, 503);
  }

  if (!config.webhookSecret) {
    console.error(
      "[payments/webhook] PAYMENT_GATEWAY_WEBHOOK_SECRET is not configured; signed webhooks cannot be verified.",
    );

    return jsonResponse({ error: "webhook_not_configured" }, 503);
  }

  const signature =
    request.headers.get("x-razorpay-signature")?.trim().toLowerCase() ?? "";

  if (signature === "") {
    return jsonResponse({ error: "missing_signature" }, 400);
  }

  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  // The signature is verified over the RAW body, exactly as documented.
  if (!verifyWebhookSignature(config, { rawBody, signature })) {
    console.warn(
      "[payments/webhook] rejected a call with an invalid signature.",
    );

    return jsonResponse({ error: "invalid_signature" }, 401);
  }

  let body: JsonRecord;

  try {
    body = asRecord(JSON.parse(rawBody)) ?? {};
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const event = normalizeEvent(request, body);

  if (!event) {
    return jsonResponse({ status: "ignored" });
  }

  // Idempotency guard: the first delivery claims the event id.
  const claim = await recordWebhookEvent({
    eventId: event.eventId,
    gateway: config.provider,
    eventType: event.eventType,
  });

  if (claim === "duplicate") {
    return jsonResponse({ status: "duplicate" });
  }

  if (claim === "error") {
    // Nothing was processed: let the gateway retry the same event.
    return jsonResponse({ error: "event_record_failed" }, 500);
  }

  try {
    if (event.orderId === "") {
      // Nothing we can act on (for example a payout event).
      return jsonResponse({ status: "ignored" });
    }

    // Cross-check the event against OUR ledger before any state change.
    const payment = await findPaymentByOrderId(event.orderId);

    if (!payment) {
      // Not a learning-requirement order: it may be a "Support UstaadHub"
      // donation/sponsorship, which lives in the separate support ledger.
      const supportResponse = await applyEventToSupportLedger(config, event);

      if (supportResponse) {
        return supportResponse;
      }

      console.warn(
        "[payments/webhook] event references an order that is not in the payment ledger.",
      );

      return jsonResponse({ status: "ignored" });
    }

    const expectedMinorUnits = toMinorUnits(payment.amount);

    if (
      event.amountMinorUnits !== null &&
      event.amountMinorUnits !== expectedMinorUnits
    ) {
      console.warn(
        "[payments/webhook] event amount does not match the recorded amount; no state change.",
      );

      // The event stays claimed: this delivery must never be applied.
      return jsonResponse({ status: "amount_mismatch" });
    }

    if (
      event.currency !== null &&
      event.currency.toUpperCase() !== payment.currency.toUpperCase()
    ) {
      console.warn(
        "[payments/webhook] event currency does not match the recorded currency; no state change.",
      );

      return jsonResponse({ status: "currency_mismatch" });
    }

    const isSuccessEvent =
      event.eventType === "payment.captured" ||
      event.eventType === "order.paid";
    const isAuthorizedEvent = event.eventType === "payment.authorized";
    const isFailedEvent = event.eventType === "payment.failed";

    if (isSuccessEvent) {
      // A success event without a payment id can never be applied.
      if (!event.paymentId) {
        return jsonResponse({ status: "ignored" });
      }

      // 'authorized' has not moved money yet: only a captured payment may
      // activate the requirement.
      if (event.gatewayStatus && event.gatewayStatus !== "captured") {
        return jsonResponse({ status: "not_captured" });
      }

      const outcome = await applyPaymentResult({
        orderId: event.orderId,
        paymentId: event.paymentId,
        status: "paid",
        signatureVerified: true,
      });

      if (!outcome.ok) {
        await forgetWebhookEvent(event.eventId);

        return jsonResponse({ error: outcome.reason }, 500);
      }

      return jsonResponse({ status: "paid" });
    }

    if (isAuthorizedEvent) {
      // Manual-capture gateway accounts: the payment is only authorized. Try to
      // capture it server-side and apply the result; the capture webhook (or the
      // browser verification route) is the fallback if this attempt fails.
      if (!event.paymentId) {
        return jsonResponse({ status: "ignored" });
      }

      const capture = await captureGatewayPayment(config, {
        paymentId: event.paymentId,
        amountMinorUnits: expectedMinorUnits,
        currency: payment.currency,
      });

      if (!capture.ok || capture.data.status !== "captured") {
        console.error(
          "[payments/webhook] authorized payment could not be captured; waiting for the capture event.",
        );

        return jsonResponse({ status: "not_captured" });
      }

      const outcome = await applyPaymentResult({
        orderId: event.orderId,
        paymentId: event.paymentId,
        status: "paid",
        signatureVerified: true,
      });

      if (!outcome.ok) {
        await forgetWebhookEvent(event.eventId);

        return jsonResponse({ error: outcome.reason }, 500);
      }

      return jsonResponse({ status: "paid" });
    }

    if (isFailedEvent) {
      const outcome = await applyPaymentResult({
        orderId: event.orderId,
        paymentId: event.paymentId,
        status: "failed",
        signatureVerified: false,
        failureReason: event.failureReason,
      });

      if (!outcome.ok) {
        await forgetWebhookEvent(event.eventId);

        return jsonResponse({ error: outcome.reason }, 500);
      }

      return jsonResponse({ status: "failed" });
    }

    return jsonResponse({ status: "ignored" });
  } catch (err) {
    console.error(
      "[payments/webhook] unexpected processing error:",
      err instanceof Error ? err.message : "unknown error",
    );

    // Release the claim so the gateway's retry is processed, not discarded.
    await forgetWebhookEvent(event.eventId);

    return jsonResponse({ error: "processing_failed" }, 500);
  }
}
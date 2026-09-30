import { getPaymentGatewayConfig, toMinorUnits } from "@/lib/payments/config";
import {
  applyJobContactUnlockResult,
  findJobContactUnlockByOrderId,
  isJobContactLedgerAvailable,
  toMinorUnitsFromRupees,
  type JobContactLedgerRow,
} from "@/lib/payments/jobContact";
import {
  captureGatewayPayment,
  fetchGatewayOrder,
  fetchGatewayPayment,
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
  /**
   * True when the event described an ORDER rather than a payment ("order.paid"),
   * so no payment id was present in the body and the amount/currency/status
   * below come from the order entity instead of a payment entity.
   */
  orderLevel: boolean;
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

/**
 * Applies a signed gateway event to the "Job Contact Access" ledger
 * (public.job_contact_unlocks) when the order id is in NEITHER public.payments
 * NOR the support ledger.
 *
 * Narrowly scoped by design:
 *  - it only ever reads/updates job_contact_unlocks, so public.payments and
 *    support_payments are untouched,
 *  - it is only reached for an order id that is unknown to BOTH existing
 *    ledgers, so no existing payment can ever be re-routed here,
 *  - the reported amount/currency are cross-checked against OUR recorded row,
 *  - only a captured payment may be marked paid,
 *  - every transition is idempotent (see applyJobContactUnlockResult).
 *
 * Returns null when the order is unknown to this ledger either, so the caller
 * can answer "ignored" exactly as before.
 */
async function applyEventToJobContactLedger(
  config: NonNullable<ReturnType<typeof getPaymentGatewayConfig>>,
  event: NormalizedEvent,
): Promise<ReturnType<typeof jsonResponse> | null> {
  const unlock: JobContactLedgerRow | null =
    await findJobContactUnlockByOrderId(event.orderId);

  if (!unlock) {
    // Only a healthy lookup can conclude "not my order". If the service-role
    // client could not be built the lookup never ran, so acknowledging here
    // would discard a real payment as an unrelated order - answer retryably
    // instead, after releasing the claim taken earlier in the handler.
    if (!isJobContactLedgerAvailable()) {
      await forgetWebhookEvent(event.eventId);

      console.error(
        "[payments/webhook] service-role client unavailable; the job contact lookup did not run. Releasing the claim for a retry.",
      );

      return jsonResponse({ error: "server_not_configured" }, 500);
    }

    return null;
  }

  // No purpose column is needed on the row: a row can only exist in this table
  // because public.admin_update_job_contact_payment_settings / the order route
  // created a job-contact unlock, and the table is the purpose boundary.

  const expectedMinorUnits = toMinorUnitsFromRupees(unlock.amount);

  if (
    event.amountMinorUnits !== null &&
    event.amountMinorUnits !== expectedMinorUnits
  ) {
    console.warn(
      "[payments/webhook] job contact event amount does not match the recorded amount; no state change.",
    );

    return jsonResponse({ status: "amount_mismatch" });
  }

  if (
    event.currency !== null &&
    event.currency.toUpperCase() !== unlock.currency.toUpperCase()
  ) {
    console.warn(
      "[payments/webhook] job contact event currency does not match the recorded currency; no state change.",
    );

    return jsonResponse({ status: "currency_mismatch" });
  }

  const isSuccessEvent =
    event.eventType === "payment.captured" ||
    event.eventType === "order.paid";
  const isAuthorizedEvent = event.eventType === "payment.authorized";
  const isFailedEvent = event.eventType === "payment.failed";

  if (isSuccessEvent) {
    if (!event.paymentId) {
      return jsonResponse({ status: "ignored" });
    }

    // 'authorized' has not moved money yet: only a captured payment unlocks.
    if (event.gatewayStatus && event.gatewayStatus !== "captured") {
      return jsonResponse({ status: "not_captured" });
    }

    const outcome = await applyJobContactUnlockResult({
      orderId: event.orderId,
      paymentId: event.paymentId,
      status: "paid",
    });

    if (!outcome.ok) {
      await forgetWebhookEvent(event.eventId);

      return jsonResponse({ error: outcome.reason }, 500);
    }

    // outcome.applied=false is an already-settled unlock, which is a success.
    return jsonResponse({ status: "paid", applied: outcome.applied });
  }

  if (isAuthorizedEvent) {
    if (!event.paymentId) {
      return jsonResponse({ status: "ignored" });
    }

    // Manual-capture gateway accounts: try to capture server-side. The capture
    // event (or the browser verification route) is the fallback.
    const capture = await captureGatewayPayment(config, {
      paymentId: event.paymentId,
      amountMinorUnits: expectedMinorUnits,
      currency: unlock.currency,
    });

    if (!capture.ok || capture.data.status !== "captured") {
      console.error(
        "[payments/webhook] authorized job contact payment could not be captured; waiting for the capture event.",
      );

      return jsonResponse({ status: "not_captured" });
    }

    const outcome = await applyJobContactUnlockResult({
      orderId: event.orderId,
      paymentId: event.paymentId,
      status: "paid",
    });

    if (!outcome.ok) {
      await forgetWebhookEvent(event.eventId);

      return jsonResponse({ error: outcome.reason }, 500);
    }

    return jsonResponse({ status: "paid", applied: outcome.applied });
  }

  if (isFailedEvent) {
    const outcome = await applyJobContactUnlockResult({
      orderId: event.orderId,
      paymentId: event.paymentId,
      status: "failed",
      failureReason: event.failureReason,
    });

    if (!outcome.ok) {
      await forgetWebhookEvent(event.eventId);

      return jsonResponse({ error: outcome.reason }, 500);
    }

    return jsonResponse({ status: "failed", applied: outcome.applied });
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

/**
 * Pulls the ORDER entity out of the gateway's webhook envelope.
 *
 * "order.paid" payloads contain payload.order.entity and nothing under
 * payload.payment, so reading only the payment entity loses the order id and
 * the event gets acknowledged and thrown away.
 */
function extractOrderEntity(body: JsonRecord): JsonRecord | null {
  const payload = asRecord(body.payload);
  const order = asRecord(payload?.order);

  return asRecord(order?.entity);
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

  // Payment-level events ("payment.captured", ...) carry payload.payment.entity.
  // Order-level events ("order.paid") carry payload.order.entity and NO payment
  // object at all, so the order id has to be read from the order entity.
  const paymentEntity = extractPaymentEntity(body);
  const paymentId = readString(paymentEntity, "id");
  const orderEntity = paymentEntity ? null : extractOrderEntity(body);
  const orderId =
    readString(paymentEntity, "order_id") ?? readString(orderEntity, "id") ?? "";
  const orderLevel = paymentEntity === null && orderEntity !== null;
  const entity = paymentEntity ?? orderEntity;
  const headerEventId =
    request.headers.get("x-razorpay-event-id")?.trim() ?? "";

  // Prefer the gateway's own event id header; fall back to a deterministic
  // composite so a replay of the same delivery is still detected.
  const eventId =
    headerEventId !== "" && headerEventId.length <= MAX_EVENT_ID_LENGTH
      ? headerEventId
      : `${eventType}:${accountId}:${orderId || "no-order"}:${
          paymentId || "no-payment"
        }`;

  return {
    eventId,
    eventType,
    orderId,
    paymentId,
    amountMinorUnits: readNumber(entity, "amount"),
    currency: readString(entity, "currency"),
    // For an order-level event an ORDER status ("paid") is not a PAYMENT status
    // ("captured"); it is resolved against the real payment instead, so it must
    // never satisfy the captured check below.
    gatewayStatus: orderLevel ? null : readString(entity, "status"),
    failureReason:
      readString(entity, "error_description") ??
      readString(entity, "error_code"),
    orderLevel,
  };
}

/**
 * Turns an order-level event into an equivalent payment-level event.
 *
 * "order.paid" arrives as payload.order.entity: there is no payment id, no
 * payment status and no reliable payment amount in the body. The payment is
 * therefore looked up on the gateway using the existing client (same config /
 * credential set), preferring a payment id the order itself already reports and
 * falling back to fetching the order.
 *
 * The returned event keeps the original event id (so idempotency is unchanged)
 * but carries the payment id and the authoritative amount/currency/status, which
 * lets the existing success path - and all three ledgers - run untouched.
 *
 * A failure is returned instead of an "ignored" response because the event has
 * already been claimed: acknowledging something we could not process would lose
 * the payment permanently.
 */
async function resolveOrderLevelPayment(
  config: NonNullable<ReturnType<typeof getPaymentGatewayConfig>>,
  event: NormalizedEvent,
): Promise<{ ok: true; event: NormalizedEvent } | { ok: false; reason: string }> {
  const order = await fetchGatewayOrder(config, event.orderId);

  if (!order.ok) {
    return { ok: false, reason: `order_lookup_${order.reason}` };
  }

  const paymentId = order.data.paymentIds[0] ?? null;

  if (!paymentId) {
    return { ok: false, reason: "payment_id_unavailable" };
  }

  const payment = await fetchGatewayPayment(config, paymentId);

  if (!payment.ok) {
    return { ok: false, reason: `payment_lookup_${payment.reason}` };
  }

  // The payment we just fetched must belong to the order we were told about.
  if (payment.data.orderId && payment.data.orderId !== event.orderId) {
    return { ok: false, reason: "payment_order_mismatch" };
  }

  return {
    ok: true,
    event: {
      ...event,
      paymentId: payment.data.id,
      amountMinorUnits: payment.data.amount,
      currency: payment.data.currency,
      gatewayStatus: payment.data.status,
      orderLevel: false,
    },
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

  let event = normalizeEvent(request, body);

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

    // An ORDER-level event ("order.paid") carries no payment id and no payment
    // status, so the real payment is resolved from the gateway BEFORE any ledger
    // is consulted. This keeps every existing amount/currency/captured check
    // intact - they now run against the payment the gateway actually reports,
    // instead of being skipped or fed an order status.
    if (event.orderLevel) {
      const resolution = await resolveOrderLevelPayment(config, event);

      if (!resolution.ok) {
        // We have already claimed this event id. Returning 200 here would
        // permanently discard a real payment, so release the claim and answer
        // with a retryable error: the gateway will redeliver.
        await forgetWebhookEvent(event.eventId);

        console.warn(
          "[payments/webhook] order-level event could not be resolved; releasing the claim for a retry:",
          resolution.reason,
        );

        return jsonResponse({ error: resolution.reason }, 500);
      }

      event = resolution.event;
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

      // ...or a "Job Contact Access" unlock, which lives in its own ledger.
      // Checked last so an existing requirement or support payment can never
      // be claimed by this branch.
      const jobContactResponse = await applyEventToJobContactLedger(
        config,
        event,
      );

      if (jobContactResponse) {
        return jobContactResponse;
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
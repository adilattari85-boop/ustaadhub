import { getPaymentGatewayConfig } from "@/lib/payments/config";
import {
  createGatewayOrder,
  type GatewayFailureReason,
} from "@/lib/payments/razorpay";
import {
  extractBearerToken,
  jsonResponse,
  readJobContactPaymentSettings,
  resolveUserId,
} from "@/lib/payments/server";
import {
  buildGuestCookie,
  createGuestUnlockToken,
  createJobContactUnlock,
  findPaidJobContactUnlock,
  JOB_CONTACT_PURPOSE,
  loadPublicJobForUnlock,
  resolveJobContactPrice,
} from "@/lib/payments/jobContact";

// Server-side order creation for a JOB CONTACT UNLOCK (revealing a job's phone
// number / email). It reuses the existing Razorpay gateway helpers - there is
// intentionally no second gateway implementation and no duplicated crypto.
//
// Security model (differs from /api/payments/order and /api/payments/support/order
// in exactly one way: the client does NOT choose the price):
//  - the request body carries ONLY the job identifier. `amount`, `currency`,
//    `user_id` and `payment_status` are never read from the request, a query
//    string or a header - they are decided by the server,
//  - the price is read from the 'job_contact_payment' settings row
//    (get_job_contact_payment_settings) and re-validated before the gateway call,
//  - the admin Job Contact Access switch is honoured independently of the
//    requirement payment switch and the Donation/Support switch; when it is off
//    this route reports "no payment required" and creates no order at all,
//  - the target job must be publicly visible (published or closed) - a draft
//    cannot be unlocked,
//  - a signed-in visitor who already paid for THIS job is told so instead of
//    being charged again (the partial UNIQUE index also makes a race safe),
//  - the gateway Key Secret stays on the server; only the public Key ID and the
//    exact server-computed amount are returned to the browser,
//  - the ledger row is written through the service role with the server amount
//    and status 'created' BEFORE Checkout opens, keyed by the UNIQUE
//    razorpay_order_id, so only this one record can ever be transitioned to paid.
//
// This route never reads or writes public.payments or public.support_payments.

export const runtime = "nodejs";

type OrderRequestBody = {
  slug?: unknown;
  jobId?: unknown;
};

const MAX_IDENTIFIER_LENGTH = 200;

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

export async function POST(request: Request) {
  let body: OrderRequestBody;

  try {
    body = (await request.json()) as OrderRequestBody;
  } catch {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  // Only the job identifier is accepted from the client. Any amount, currency,
  // user_id or payment_status in the body is ignored by construction.
  const slug = readIdentifier(body.slug);
  const jobId = readIdentifier(body.jobId);

  if (!slug && !jobId) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  // 1. The job must be publicly reachable right now (never a draft).
  const jobResult = await loadPublicJobForUnlock({ slug, jobId });

  if (!jobResult.ok) {
    return jsonResponse({ error: "job_not_available" }, 404);
  }

  const job = jobResult.job;

  // 2. The admin Job Contact Access switch, read from the server side only.
  //    Independent of the requirement payment and Donation/Support switches.
  const settings = await readJobContactPaymentSettings();

  if (settings === null) {
    return jsonResponse({ error: "server_not_configured" }, 503);
  }

  const price = resolveJobContactPrice(settings);

  if (!price.ok) {
    if (price.reason === "disabled") {
      // Contact details are free: the client must not open Checkout.
      return jsonResponse({ paymentRequired: false, reason: "disabled" }, 200);
    }

    return jsonResponse({ error: price.reason }, 503);
  }

  // 3. Optional identity, exactly like the support flow: a valid token attaches
  //    the unlock to that account, an anonymous visitor is stored with
  //    user_id = null. A client-supplied user id is never used.
  let userId: string | null = null;
  const accessToken = extractBearerToken(request);

  if (accessToken) {
    userId = await resolveUserId(accessToken);
  }

  // 4. Never charge the same signed-in visitor twice for the same job.
  if (userId) {
    const existing = await findPaidJobContactUnlock({ jobId: job.id, userId });

    if (existing) {
      return jsonResponse({
        paymentRequired: false,
        reason: "already_unlocked",
        unlockId: existing.id,
      });
    }
  }
  const config = getPaymentGatewayConfig();

  if (!config) {
    console.error(
      "[payments/job-contact/order] PAYMENT_GATEWAY_KEY_ID / PAYMENT_GATEWAY_KEY_SECRET are not configured.",
    );

    return jsonResponse({ error: "gateway_not_configured" }, 503);
  }

  // 5. The ledger id is generated first so it can be carried in the gateway
  //    order notes (Razorpay notes are fixed at creation time).
  const unlockId = crypto.randomUUID();
  const receipt = `jobc_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

  const orderResult = await createGatewayOrder(config, {
    amountMinorUnits: price.price.minorUnits,
    currency: price.price.currency,
    receipt,
    // Identifying notes only - never any contact detail (phone / email).
    notes: {
      purpose: JOB_CONTACT_PURPOSE,
      job_id: job.id,
      unlock_id: unlockId,
    },
  });

  if (!orderResult.ok) {
    return jsonResponse(
      { error: orderResult.reason },
      gatewayReasonToStatus(orderResult.reason),
    );
  }

  // 6. Ledger row, written with the service role as 'created'.
  //
  //    A guest (no verified session) also gets an unforgeable identity: the raw
  //    token goes into an HttpOnly cookie on the response and only its SHA-256
  //    hash is stored, so the server can recognise this same visitor on a later
  //    page load and nobody can replay a leaked ledger row as a credential.
  const guest = userId ? null : createGuestUnlockToken();
  const unlock = await createJobContactUnlock({
    id: unlockId,
    jobId: job.id,
    userId,
    razorpayOrderId: orderResult.data.id,
    amount: price.price.amount,
    currency: price.price.currency,
    guestTokenHash: guest ? guest.tokenHash : null,
  });

  if (!unlock.ok) {
    console.error(
      "[payments/job-contact/order] could not record the gateway order:",
      unlock.reason,
    );

    return jsonResponse({ error: "payment_record_failed" }, 500);
  }

  // The guest identity cookie is attached to THIS response, so the raw token is
  // only ever delivered over the same TLS response that created the order. The
  // browser never sends it anywhere except this origin.
  const response = jsonResponse(
    {
      paymentRequired: true,
      purpose: JOB_CONTACT_PURPOSE,
      jobId: job.id,
      unlockId: unlock.id,
      orderId: orderResult.data.id,
      // Both values below are echoed for the Checkout UI only; the server
      // re-reads and re-validates them during verification.
      amount: price.price.amount,
      currency: price.price.currency,
      amountMinorUnits: price.price.minorUnits,
      keyId: config.keyId,
    },
    200,
  );

  if (guest) {
    response.headers.append("Set-Cookie", buildGuestCookie(guest.rawToken));
  }

  return response;
}

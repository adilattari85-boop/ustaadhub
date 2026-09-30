// Server-only gateway client (Razorpay, called over its HTTPS REST API).
//
// No SDK dependency is added for this - @supabase/supabase-js stays the only
// runtime dependency of the project (same approach as lib/welcomeEmail.ts).
//
// Security notes:
//  - the Key Secret is only ever used in the HTTP Basic header / HMAC, and is
//    never logged or returned to a client,
//  - the checkout signature and the webhook signature are verified with
//    node:crypto (HMAC-SHA256 + timing-safe comparison),
//  - gateway error text is logged for operators but mapped to stable reason
//    codes before it reaches the browser.

import { createHmac, timingSafeEqual } from "node:crypto";

import type { PaymentGatewayConfig } from "./config";

const REQUEST_TIMEOUT_MS = 15_000;

export type GatewayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string | null;
};

/** An order re-read from the gateway, including the payments made against it. */
export type GatewayOrderDetail = {
  id: string;
  /** Payment ids the gateway has recorded against this order, if any. */
  paymentIds: string[];
  /** Order amount in the smallest currency unit (paise for INR). */
  amount: number;
  /** Amount actually paid, in the smallest currency unit. */
  amountPaid: number;
  currency: string;
  status: string;
};

export type GatewayPayment = {
  id: string;
  orderId: string | null;
  /** Amount in the smallest currency unit (paise for INR). */
  amount: number;
  currency: string;
  status: string;
  errorCode: string | null;
  errorDescription: string | null;
};

export type GatewayFailureReason =
  | "gateway_not_configured"
  | "gateway_auth_failed"
  | "gateway_request_failed"
  | "gateway_unreachable"
  | "gateway_invalid_response";

export type GatewayResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: GatewayFailureReason; gatewayStatus?: number };

type JsonRecord = Record<string, unknown>;

function readString(source: JsonRecord | null, key: string): string | null {
  const value = source?.[key];

  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function readNumber(source: JsonRecord | null, key: string): number | null {
  const value = source?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function authorizationHeader(config: PaymentGatewayConfig): string {
  const credentials = `${config.keyId}:${config.keySecret}`;

  return `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`;
}

async function gatewayRequest(
  config: PaymentGatewayConfig,
  path: string,
  init: { method: string; body?: JsonRecord },
): Promise<GatewayResult<JsonRecord>> {
  try {
    const response = await fetch(`${config.apiBase}${path}`, {
      method: init.method,
      headers: {
        "content-type": "application/json",
        authorization: authorizationHeader(config),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const rawText = await response.text();
    let parsed: JsonRecord | null = null;

    if (rawText) {
      try {
        const candidate = JSON.parse(rawText) as unknown;

        if (candidate && typeof candidate === "object") {
          parsed = candidate as JsonRecord;
        }
      } catch {
        parsed = null;
      }
    }

    if (!response.ok) {
      const errorObject =
        parsed && typeof parsed.error === "object"
          ? (parsed.error as JsonRecord)
          : null;
      const description =
        readString(errorObject, "description") ??
        readString(parsed, "message") ??
        "no description";

      // Operator-facing log only. Contains no key material.
      console.error(
        `[payments] gateway request failed (${response.status}): ${description}`,
      );

      return {
        ok: false,
        reason:
          response.status === 401
            ? "gateway_auth_failed"
            : "gateway_request_failed",
        gatewayStatus: response.status,
      };
    }

    return { ok: true, data: parsed ?? {} };
  } catch (err) {
    console.error(
      "[payments] gateway request error:",
      err instanceof Error ? err.message : "unknown error",
    );

    return { ok: false, reason: "gateway_unreachable" };
  }
}

/** Creates a gateway order for the server-validated amount. */
export async function createGatewayOrder(
  config: PaymentGatewayConfig,
  params: {
    amountMinorUnits: number;
    currency: string;
    receipt: string;
    notes?: JsonRecord;
  },
): Promise<GatewayResult<GatewayOrder>> {
  const result = await gatewayRequest(config, "/orders", {
    method: "POST",
    body: {
      amount: params.amountMinorUnits,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes ?? {},
    },
  });

  if (!result.ok) {
    return result;
  }

  const orderId = readString(result.data, "id");

  if (!orderId) {
    return { ok: false, reason: "gateway_invalid_response" };
  }

  return {
    ok: true,
    data: {
      id: orderId,
      amount: readNumber(result.data, "amount") ?? params.amountMinorUnits,
      currency: readString(result.data, "currency") ?? params.currency,
      status: readString(result.data, "status") ?? "created",
      receipt: readString(result.data, "receipt"),
    },
  };
}

/** Loads a payment from the gateway so its real state can be verified. */
export async function fetchGatewayPayment(
  config: PaymentGatewayConfig,
  paymentId: string,
): Promise<GatewayResult<GatewayPayment>> {
  const result = await gatewayRequest(
    config,
    `/payments/${encodeURIComponent(paymentId)}`,
    { method: "GET" },
  );

  if (!result.ok) {
    return result;
  }

  const id = readString(result.data, "id");

  if (!id) {
    return { ok: false, reason: "gateway_invalid_response" };
  }

  return {
    ok: true,
    data: {
      id,
      orderId: readString(result.data, "order_id"),
      amount: readNumber(result.data, "amount") ?? 0,
      currency: readString(result.data, "currency") ?? "",
      status: readString(result.data, "status") ?? "unknown",
      errorCode: readString(result.data, "error_code"),
      errorDescription: readString(result.data, "error_description"),
    },
  };
}

/**
 * Loads an order from the gateway, including the payments made against it.
 *
 * Needed for order-level events ("order.paid"): those payloads carry
 * payload.order.entity and no payment object at all, so the payment id has to
 * be resolved from the gateway instead of from the event body. Reuses the same
 * gatewayRequest/config plumbing as every other call, so no second credential
 * system is introduced.
 */
export async function fetchGatewayOrder(
  config: PaymentGatewayConfig,
  orderId: string,
): Promise<GatewayResult<GatewayOrderDetail>> {
  const result = await gatewayRequest(
    config,
    `/orders/${encodeURIComponent(orderId)}`,
    { method: "GET" },
  );

  if (!result.ok) {
    return result;
  }

  const id = readString(result.data, "id");

  if (!id) {
    return { ok: false, reason: "gateway_invalid_response" };
  }

  // Razorpay returns an array of payment OBJECTS here (GET /orders/:id); other
  // payloads only ever carry ids. Accept both so a single stray shape cannot
  // silently produce an empty list.
  const payments: string[] = [];

  if (Array.isArray(result.data.payments)) {
    for (const entry of result.data.payments as unknown[]) {
      const id =
        typeof entry === "string"
          ? entry
          : readString(
              entry && typeof entry === "object"
                ? (entry as JsonRecord)
                : null,
              "id",
            );

      if (id && id.trim() !== "") {
        payments.push(id.trim());
      }
    }
  }

  return {
    ok: true,
    data: {
      id,
      paymentIds: payments,
      amount: readNumber(result.data, "amount") ?? 0,
      amountPaid: readNumber(result.data, "amount_paid") ?? 0,
      currency: readString(result.data, "currency") ?? "",
      status: readString(result.data, "status") ?? "unknown",
    },
  };
}

/**
 * Captures an authorized payment (needed when the gateway account is NOT set
 * to auto-capture). Capturing an already captured payment is rejected by the
 * gateway, so callers only capture when the status is 'authorized'.
 */
export async function captureGatewayPayment(
  config: PaymentGatewayConfig,
  params: { paymentId: string; amountMinorUnits: number; currency: string },
): Promise<GatewayResult<GatewayPayment>> {
  const result = await gatewayRequest(
    config,
    `/payments/${encodeURIComponent(params.paymentId)}/capture`,
    {
      method: "POST",
      body: {
        amount: params.amountMinorUnits,
        currency: params.currency,
      },
    },
  );

  if (!result.ok) {
    return result;
  }

  return fetchGatewayPayment(config, params.paymentId);
}

/** Constant-time string comparison (avoids signature timing leaks). */
export function safeCompare(expected: string, provided: string): boolean {
  if (expected.length === 0 || provided.length === 0) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * Verifies the checkout signature returned by the browser:
 * HMAC_SHA256(order_id + "|" + payment_id, key_secret).
 * A client-side "payment successful" flag is never trusted - only this.
 */
export function verifyCheckoutSignature(
  config: PaymentGatewayConfig,
  params: { orderId: string; paymentId: string; signature: string },
): boolean {
  const expected = createHmac("sha256", config.keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  return safeCompare(expected, params.signature);
}

/**
 * Verifies a webhook call: HMAC_SHA256(raw request body, webhook secret)
 * compared with the signature header.
 */
export function verifyWebhookSignature(
  config: PaymentGatewayConfig,
  params: { rawBody: string; signature: string },
): boolean {
  if (!config.webhookSecret) {
    return false;
  }

  const expected = createHmac("sha256", config.webhookSecret)
    .update(params.rawBody, "utf8")
    .digest("hex");

  return safeCompare(expected, params.signature);
}
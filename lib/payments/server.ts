// Server-only Supabase helpers for the payment API routes.
//
// IMPORTANT: this module reads the service role key, so it must only be
// imported from server code (app/api/payments/*). It is never imported by a
// client component and no key material is logged or returned to a caller.
//
// The service role client is required for the two operations the browser must
// never be able to perform:
//   * writing the payment ledger (public.payments has no policies at all),
//   * calling public.apply_payment_result(...), which is granted to the
//     service role only and moves a requirement to 'paid'.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  normalizePaymentSettings,
  type PaymentSettings,
  type PaymentSettingsRow,
} from "./types";

export type AppliedPaymentResult = {
  paymentId: string;
  requirementId: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
};

export type ApplyPaymentOutcome =
  | { ok: true; applied: AppliedPaymentResult | null }
  | { ok: false; reason: string };

export type ApplyPaymentParams = {
  orderId: string;
  paymentId: string | null;
  status: "paid" | "failed" | "cancelled";
  signatureVerified: boolean;
  failureReason?: string | null;
};

/** Result of trying to persist a webhook event id for replay protection. */
export type WebhookEventRecordOutcome = "recorded" | "duplicate" | "error";

export function getSupabaseUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const trimmed = typeof value === "string" ? value.trim() : "";

  return trimmed === "" ? null : trimmed;
}

export function getSupabasePublishableKey(): string | null {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const trimmed = typeof value === "string" ? value.trim() : "";

  return trimmed === "" ? null : trimmed;
}

export function getSupabaseServiceRoleKey(): string | null {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const trimmed = typeof value === "string" ? value.trim() : "";

  return trimmed === "" ? null : trimmed;
}

/** Stable JSON response helper (never returns internal error text). */
export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

/** Reads the Supabase access token of the calling student. */
export function extractBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const prefix = "bearer ";

  if (header.toLowerCase().startsWith(prefix)) {
    return header.slice(prefix.length).trim();
  }

  return "";
}

/** Verifies a Supabase access token and returns the user id, or null. */
export async function resolveUserId(
  accessToken: string,
): Promise<string | null> {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey || !accessToken) {
    return null;
  }

  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data, error } = await client.auth.getUser(accessToken);

    if (error || !data.user) {
      return null;
    }

    return data.user.id;
  } catch (err) {
    console.error(
      "[payments] token verification failed:",
      err instanceof Error ? err.message : "unknown error",
    );

    return null;
  }
}

/**
 * Supabase client bound to the student's access token: Row Level Security
 * applies exactly as it does in the browser, so ownership checks are enforced
 * by the database and not by request payloads.
 */
export function createUserClient(
  accessToken: string,
): SupabaseClient | null {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey || !accessToken) {
    return null;
  }

  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * Privileged server client (service role key). Returns null when the key is
 * not configured, so the routes can fail gracefully instead of throwing.
 */
export function createServiceClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Reads the admin-controlled payment configuration (database is the source). */
export async function readPaymentSettings(): Promise<PaymentSettings | null> {
  const client = createServiceClient();

  if (!client) {
    return null;
  }

  try {
    const { data, error } = await client.rpc("get_payment_settings");
    const row = Array.isArray(data)
      ? (data[0] as PaymentSettingsRow | undefined)
      : (data as PaymentSettingsRow | null);

    if (error) {
      console.error(
        "[payments] could not read payment settings:",
        error.message,
      );

      return null;
    }

    return normalizePaymentSettings(row);
  } catch (err) {
    console.error(
      "[payments] payment settings read error:",
      err instanceof Error ? err.message : "unknown error",
    );

    return null;
  }
}

/** Marks a webhook event as processed. "duplicate" = already processed. */
export async function recordWebhookEvent(params: {
  eventId: string;
  gateway: string;
  eventType: string | null;
}): Promise<WebhookEventRecordOutcome> {
  const client = createServiceClient();

  if (!client) {
    return "error";
  }

  try {
    const { error } = await client
      .from("payment_webhook_events")
      .insert({
        id: params.eventId,
        gateway: params.gateway,
        event_type: params.eventType,
      });

    if (error) {
      // 23505 = unique violation = this event id was already processed.
      if (error.code === "23505") {
        return "duplicate";
      }

      console.error(
        "[payments] could not record webhook event:",
        error.message,
      );

      return "error";
    }

    return "recorded";
  } catch (err) {
    console.error(
      "[payments] webhook event record error:",
      err instanceof Error ? err.message : "unknown error",
    );

    return "error";
  }
}

/**
 * Applies a verified payment result through the service-role-only RPC, which
 * updates the payment ledger and the requirement inside one transaction.
 */
export async function applyPaymentResult(
  params: ApplyPaymentParams,
): Promise<ApplyPaymentOutcome> {
  const client = createServiceClient();

  if (!client) {
    return { ok: false, reason: "server_not_configured" };
  }

  try {
    const { data, error } = await client.rpc("apply_payment_result", {
      p_order_id: params.orderId,
      p_payment_id: params.paymentId,
      p_status: params.status,
      p_signature_verified: params.signatureVerified,
      p_failure_reason: params.failureReason ?? null,
    });

    if (error) {
      console.error(
        "[payments] apply_payment_result failed:",
        error.message,
      );

      return { ok: false, reason: "update_failed" };
    }

    const row = Array.isArray(data)
      ? (data[0] as Record<string, unknown> | undefined)
      : (data as Record<string, unknown> | null);

    if (!row) {
      // Unknown order id: nothing to update.
      return { ok: true, applied: null };
    }

    return {
      ok: true,
      applied: {
        paymentId: String(row.payment_id ?? ""),
        requirementId: String(row.requirement_id ?? ""),
        userId: String(row.user_id ?? ""),
        amount: Number(row.amount ?? 0),
        currency: String(row.currency ?? "INR"),
        status: String(row.payment_status ?? params.status),
      },
    };
  } catch (err) {
    console.error(
      "[payments] apply_payment_result error:",
      err instanceof Error ? err.message : "unknown error",
    );

    return { ok: false, reason: "update_failed" };
  }
}
/** One row of the payment ledger, as far as the server routes need it. */
export type PaymentLedgerRow = {
  id: string;
  requirement_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  gateway_payment_id: string | null;
};

/**
 * Reads our own payment record for a gateway order id.
 *
 * The webhook route uses this to cross-check an event payload against the
 * amount/currency that was recorded server-side: even a signature-verified
 * body is never trusted to decide what the student owed.
 */
export async function findPaymentByOrderId(
  orderId: string,
): Promise<PaymentLedgerRow | null> {
  const client = createServiceClient();

  if (!client) {
    return null;
  }

  try {
    const { data, error } = await client
      .from("payments")
      .select(
        "id, requirement_id, user_id, amount, currency, status, gateway_payment_id",
      )
      .eq("gateway_order_id", orderId)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error("[payments] payment lookup failed:", error.message);
      }

      return null;
    }

    const row = data as Record<string, unknown>;

    return {
      id: String(row.id ?? ""),
      requirement_id: String(row.requirement_id ?? ""),
      user_id: String(row.user_id ?? ""),
      amount: Number(row.amount ?? 0),
      currency: String(row.currency ?? "INR"),
      status: String(row.status ?? "pending"),
      gateway_payment_id:
        typeof row.gateway_payment_id === "string"
          ? row.gateway_payment_id
          : null,
    };
  } catch (err) {
    console.error(
      "[payments] payment lookup error:",
      err instanceof Error ? err.message : "unknown error",
    );

    return null;
  }
}

/**
 * Releases the idempotency claim of a webhook event whose processing failed, so
 * the gateway's next delivery attempt is processed instead of being discarded
 * as a duplicate.
 */
export async function forgetWebhookEvent(eventId: string): Promise<void> {
  const client = createServiceClient();

  if (!client) {
    return;
  }

  try {
    const { error } = await client
      .from("payment_webhook_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      console.error(
        "[payments] could not release webhook event claim:",
        error.message,
      );
    }
  } catch (err) {
    console.error(
      "[payments] webhook event release error:",
      err instanceof Error ? err.message : "unknown error",
    );
  }
}

/**
 * Service-role only: returns a requirement that is still waiting for a payment
 * back to the free flow ("payment no longer required"), for example when an
 * admin turns the gateway off while a student is mid-checkout. A requirement
 * that already has a captured payment is never released.
 */
export async function releaseUnpaidRequirement(params: {
  requirementId: string;
  userId: string;
}): Promise<boolean> {
  const client = createServiceClient();

  if (!client) {
    return false;
  }

  try {
    const { error } = await client.rpc("release_unpaid_requirement", {
      p_requirement_id: params.requirementId,
      p_user_id: params.userId,
    });

    if (error) {
      console.error(
        "[payments] could not release the unpaid requirement:",
        error.message,
      );

      return false;
    }

    return true;
  } catch (err) {
    console.error(
      "[payments] release unpaid requirement error:",
      err instanceof Error ? err.message : "unknown error",
    );

    return false;
  }
}

// ============================================================
// Support UstaadHub ledger (donations + sponsorships)
// ============================================================
// Separate from public.payments (which stays reserved for the
// learning-requirement flow). Rows are written and transitioned only
// through the service role, keyed by the UNIQUE razorpay_order_id, so
// verification and the signed webhook stay idempotent.
// ============================================================

/** One row of the support ledger, as far as the server routes need it. */
export type SupportPaymentLedgerRow = {
  id: string;
  user_id: string | null;
  amount: number;
  currency: string;
  payment_status: string;
  razorpay_payment_id: string | null;
};

/**
 * Reads our own support-payment record for a gateway order id, so the
 * webhook can cross-check an event against the amount/currency we
 * recorded server-side (a signature-verified body is never trusted to
 * decide what the supporter gave).
 */
export async function findSupportPaymentByOrderId(
  orderId: string,
): Promise<SupportPaymentLedgerRow | null> {
  const client = createServiceClient();

  if (!client) {
    return null;
  }

  try {
    const { data, error } = await client
      .from("support_payments")
      .select(
        "id, user_id, amount, currency, payment_status, razorpay_payment_id",
      )
      .eq("razorpay_order_id", orderId)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error(
          "[payments] support payment lookup failed:",
          error.message,
        );
      }

      return null;
    }

    const row = data as Record<string, unknown>;

    return {
      id: String(row.id ?? ""),
      user_id: typeof row.user_id === "string" ? row.user_id : null,
      amount: Number(row.amount ?? 0),
      currency: String(row.currency ?? "INR"),
      payment_status: String(row.payment_status ?? "pending"),
      razorpay_payment_id:
        typeof row.razorpay_payment_id === "string"
          ? row.razorpay_payment_id
          : null,
    };
  } catch (err) {
    console.error(
      "[payments] support payment lookup error:",
      err instanceof Error ? err.message : "unknown error",
    );

    return null;
  }
}

export type ApplySupportPaymentParams = {
  orderId: string;
  paymentId: string | null;
  status: "paid" | "failed";
  failureReason?: string | null;
  signature?: string | null;
};

export type ApplySupportPaymentOutcome =
  | { ok: true; applied: boolean }
  | { ok: false; reason: string };

/**
 * Applies a verified support-payment result through the service role.
 *
 * Idempotency / safety rules (mirrors public.apply_payment_result):
 *   * 'paid' only transitions rows that are not already 'paid'
 *     (a replayed success callback/webhook is a no-op),
 *   * 'failed' is only applied while the row is still 'pending',
 *     so an out-of-order event can never downgrade a paid donation,
 *   * a captured gateway payment id can never attach to a second row
 *     (partial UNIQUE index; a violation surfaces as an update error).
 *
 * Returns applied=false when nothing matched (already processed or
 * unknown order) - callers treat that as success, not as a failure.
 */
export async function applySupportPaymentResult(
  params: ApplySupportPaymentParams,
): Promise<ApplySupportPaymentOutcome> {
  const client = createServiceClient();

  if (!client) {
    return { ok: false, reason: "server_not_configured" };
  }

  try {
    if (params.status === "paid") {
      if (!params.paymentId || params.paymentId.trim() === "") {
        return { ok: false, reason: "payment_id_required" };
      }

      const { data, error } = await client
        .from("support_payments")
        .update({
          payment_status: "paid",
          razorpay_payment_id: params.paymentId,
          razorpay_signature: params.signature ?? null,
          failure_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("razorpay_order_id", params.orderId)
        .neq("payment_status", "paid")
        .select("id");

      if (error) {
        console.error(
          "[payments] support payment paid update failed:",
          error.message,
        );

        return { ok: false, reason: "update_failed" };
      }

      return { ok: true, applied: (data?.length ?? 0) > 0 };
    }

    const { data, error } = await client
      .from("support_payments")
      .update({
        payment_status: "failed",
        failure_reason: params.failureReason ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", params.orderId)
      .eq("payment_status", "pending")
      .select("id");

    if (error) {
      console.error(
        "[payments] support payment failed update failed:",
        error.message,
      );

      return { ok: false, reason: "update_failed" };
    }

    return { ok: true, applied: (data?.length ?? 0) > 0 };
  } catch (err) {
    console.error(
      "[payments] applySupportPaymentResult error:",
      err instanceof Error ? err.message : "unknown error",
    );

    return { ok: false, reason: "update_failed" };
  }
}

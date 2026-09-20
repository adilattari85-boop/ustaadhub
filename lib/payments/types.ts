// Shared payment types for UstaadHub.
//
// This module is import-safe for BOTH the browser and the server: it has no
// imports, no environment access and no secrets - only types and pure helpers.
// Server-only gateway code lives in lib/payments/config.ts,
// lib/payments/razorpay.ts and lib/payments/server.ts.

/** Mirrors the learning_requirements.payment_status check constraint. */
export type PaymentStatusCode =
  | "not_required"
  | "pending"
  | "paid"
  | "failed"
  | "cancelled";

/**
 * Resolved admin-controlled payment configuration
 * (public.get_payment_settings()).
 */
export type PaymentSettings = {
  enabled: boolean;
  amount: number;
  currency: string;
};

/**
 * Safe default: the payment gateway is OFF until an admin enables it, so any
 * read failure means "no payment required" rather than blocking a student.
 */
export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  enabled: false,
  amount: 0,
  currency: "INR",
};

/** Raw row shape returned by the public.get_payment_settings() RPC. */
export type PaymentSettingsRow = {
  payment_enabled?: boolean | null;
  payment_amount?: number | string | null;
  payment_currency?: string | null;
};

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

/** Normalizes a raw settings row into a safe PaymentSettings object. */
export function normalizePaymentSettings(
  row: PaymentSettingsRow | null | undefined,
): PaymentSettings {
  if (!row) {
    return DEFAULT_PAYMENT_SETTINGS;
  }

  const amount = toFiniteNumber(row.payment_amount);
  const currency =
    typeof row.payment_currency === "string" &&
    row.payment_currency.trim() !== ""
      ? row.payment_currency.trim().toUpperCase()
      : DEFAULT_PAYMENT_SETTINGS.currency;

  return {
    enabled: row.payment_enabled === true && amount > 0,
    amount: amount > 0 ? amount : 0,
    currency,
  };
}

/** True when a requirement row is waiting for a payment. */
export function isAwaitingPayment(status: unknown): boolean {
  return status === "pending";
}

/** Formats an amount for display (INR uses the rupee symbol). */
export function formatPaymentAmount(
  amount: number,
  currency: string,
): string {
  const value = toFiniteNumber(amount);
  const code =
    typeof currency === "string" && currency.trim() !== ""
      ? currency.trim().toUpperCase()
      : DEFAULT_PAYMENT_SETTINGS.currency;
  const symbol = code === "INR" ? "\u20B9" : `${code} `;
  const formatted =
    value % 1 === 0
      ? value.toLocaleString("en-IN")
      : value.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  return `${symbol}${formatted}`;
}
// Server-only payment configuration for UstaadHub.
//
// This module reads NON-public environment variables, so it must only be
// imported from server code (app/api/payments/*). Nothing here is exported
// through a NEXT_PUBLIC_* variable and no secret is ever logged or returned to
// a client.
//
// The gateway is optional by design: when the credentials are missing the
// feature reports itself as unconfigured and the server routes answer with a
// clean error instead of throwing, so the free requirement flow keeps working.

export const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

export type PaymentProvider = "razorpay";

export type PaymentGatewayConfig = {
  provider: PaymentProvider;
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
  apiBase: string;
};

export type PaymentGatewayStatus = {
  provider: PaymentProvider;
  keyId: string | null;
  /** Public key only: safe to hand to the browser for Checkout. */
  keyIdConfigured: boolean;
  keySecretConfigured: boolean;
  webhookSecretConfigured: boolean;
  apiBase: string;
};

function readEnv(name: string): string | null {
  const value = process.env[name];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

/**
 * Reads the gateway credentials from the server environment.
 * Returns null when the gateway is not configured yet (the default state for
 * a fresh deployment), so callers can degrade gracefully.
 */
export function getPaymentGatewayConfig(): PaymentGatewayConfig | null {
  const keyId = readEnv("PAYMENT_GATEWAY_KEY_ID");
  const keySecret = readEnv("PAYMENT_GATEWAY_KEY_SECRET");

  if (!keyId || !keySecret) {
    return null;
  }

  return {
    provider: "razorpay",
    keyId,
    keySecret,
    webhookSecret: readEnv("PAYMENT_GATEWAY_WEBHOOK_SECRET"),
    apiBase: readEnv("PAYMENT_GATEWAY_API_BASE") ?? RAZORPAY_API_BASE,
  };
}

/**
 * Non-secret status of the gateway configuration. Used by the admin settings
 * screen and the server routes; never returns the secret values themselves.
 */
export function getPaymentGatewayStatus(): PaymentGatewayStatus {
  const config = getPaymentGatewayConfig();

  return {
    provider: "razorpay",
    keyId: config?.keyId ?? null,
    keyIdConfigured: Boolean(config?.keyId),
    keySecretConfigured: Boolean(config?.keySecret),
    webhookSecretConfigured: Boolean(config?.webhookSecret),
    apiBase: config?.apiBase ?? RAZORPAY_API_BASE,
  };
}

/**
 * Parses an amount into the smallest currency unit used by the gateway
 * (paise for INR): 500.5 -> 50050.
 */
export function toMinorUnits(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.round(amount * 100);
}

/** Formats an amount the way the gateway expects it in an order request. */
export function toGatewayAmount(amount: number): number {
  return toMinorUnits(amount);
}
// Browser-side gateway Checkout loader/launcher.
//
// Only the gateway's PUBLIC Key ID reaches this module: the server returns it
// from POST /api/payments/order. The Key Secret never leaves the server.
//
// The checkout script is loaded on demand (no new npm dependency) and only the
// signed result produced by the gateway is forwarded to the server for
// verification - the browser never decides that a payment succeeded.

export type GatewayCheckoutResult = {
  orderId: string;
  paymentId: string;
  signature: string;
};

type GatewayCheckoutInstance = {
  open: () => void;
  on: (event: string, handler: (payload: unknown) => void) => void;
};

type GatewayCheckoutConstructor = new (
  options: Record<string, unknown>,
) => GatewayCheckoutInstance;

declare global {
  interface Window {
    Razorpay?: GatewayCheckoutConstructor;
  }
}

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise: Promise<boolean> | null = null;

function readString(source: unknown, key: string): string {
  if (!source || typeof source !== "object") {
    return "";
  }

  const value = (source as Record<string, unknown>)[key];

  return typeof value === "string" ? value : "";
}

/** Loads the gateway checkout script once per page load. */
export function loadGatewayCheckout(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SCRIPT_SRC}"]`,
    );

    if (existing) {
      existing.addEventListener("load", () =>
        resolve(Boolean(window.Razorpay)),
      );
      existing.addEventListener("error", () => resolve(false));

      return;
    }

    const script = document.createElement("script");

    script.src = CHECKOUT_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return scriptPromise;
}

export type OpenGatewayCheckoutOptions = {
  keyId: string;
  orderId: string;
  amountMinorUnits: number;
  currency: string;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  description?: string;
  onSuccess: (result: GatewayCheckoutResult) => void;
  onDismiss: () => void;
  onFailure: () => void;
};

/**
 * Opens the gateway checkout for a server-created order.
 * Returns false when the checkout script is unavailable.
 */
export function openGatewayCheckout(
  options: OpenGatewayCheckoutOptions,
): boolean {
  if (typeof window === "undefined" || !window.Razorpay) {
    return false;
  }

  const Checkout = window.Razorpay;
  const instance = new Checkout({
    key: options.keyId,
    order_id: options.orderId,
    amount: options.amountMinorUnits,
    currency: options.currency,
    name: "UstaadHub",
    description: options.description ?? "Learning requirement",
    prefill: {
      name: options.studentName ?? "",
      email: options.studentEmail ?? "",
      contact: options.studentPhone ?? "",
    },
    // Same blue as the existing UstaadHub call-to-action buttons.
    theme: { color: "#2563eb" },
    handler: (payload: unknown) => {
      const orderId = readString(payload, "razorpay_order_id") || options.orderId;
      const paymentId = readString(payload, "razorpay_payment_id");
      const signature = readString(payload, "razorpay_signature");

      if (!paymentId || !signature) {
        options.onFailure();

        return;
      }

      options.onSuccess({ orderId, paymentId, signature });
    },
    modal: { ondismiss: () => options.onDismiss() },
  });

  instance.on("payment.failed", () => options.onFailure());
  instance.open();

  return true;
}
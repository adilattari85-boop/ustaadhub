"use client";

import { useState } from "react";

import {
  loadGatewayCheckout,
  openGatewayCheckout,
} from "@/lib/payments/checkout";
import {
  formatPaymentAmount,
  type PaymentSettings,
} from "@/lib/payments/types";
import { supabase } from "@/lib/supabase";

// The only payment UI in the student flow: amount, "Pay Now", live status and a
// retry. It is rendered by app/requirement/page.tsx ONLY while the admin has
// the payment gateway switched ON and the requirement is waiting for payment.
//
// The component never decides that a payment succeeded: the gateway callback is
// forwarded to POST /api/payments/verify, which re-checks the signature and the
// payment against the gateway API server-side before the requirement is paid.
// The browser only ever receives the PUBLIC gateway key id from the server.

type StepStatus =
  | "ready"
  | "creating"
  | "open"
  | "verifying"
  | "failed"
  | "cancelled"
  | "error";

type OrderResponse = {
  orderId?: string;
  amount?: number;
  currency?: string;
  amountMinorUnits?: number;
  keyId?: string;
  error?: string;
};

const copy = {
  en: {
    title: "Payment required",
    desc: "Your requirement is saved. Complete the payment below to submit it and let our team start matching teachers for you.",
    amountLabel: "Payment amount",
    payNow: "Pay Now",
    creating: "Starting secure checkout...",
    verifying: "Payment received. Confirming it with the payment gateway...",
    confirmNote: "Do not close this page while the payment is being confirmed.",
    cancelledTitle: "Payment not completed",
    cancelledDesc:
      "Your payment was cancelled and your requirement has not been submitted yet. You can try again below.",
    failedTitle: "Payment failed",
    failedDesc:
      "The payment could not be completed and no amount was charged. Please try again.",
    errorTitle: "Something went wrong",
    retry: "Try payment again",
    checkoutUnavailable:
      "Secure checkout could not be loaded. Please check your connection and try again.",
    signInAgain:
      "Your session has expired. Please sign in again and reopen this page to complete the payment.",
    networkError:
      "We could not reach the payment server. Please check your connection and try again.",
    verificationError:
      "We could not confirm your payment yet. If any amount was deducted it will be verified automatically; you can also try again.",
    secure:
      "Payments are verified on our server. UstaadHub never stores your card details.",
  },
  ur: {
    title: "ادائیگی درکار ہے",
    desc: "آپ کی ضرورت محفوظ ہو گئی ہے۔ اسے جمع کروانے اور یم کے ذریعے استاد کی تلاش شروع کرنے کے لیے نیچے ادائیگی مکمل کریں۔",
    amountLabel: "قابل ادائیگی رقم",
    payNow: "ابھی ادائیگی کریں",
    creating: "محفوظ چیک آؤٹ شروع کیا جا رہا ہے...",
    verifying: "ادائیگی موصول ہوئی۔ پیمنٹ گیٹ وے سے تصدیق کی جا رہی ہے...",
    confirmNote: "تصدیق مکمل ہونے تک اس صفحے کو بند نہ کریں۔",
    cancelledTitle: "ادائیگی مکمل نہیں ہوئی",
    cancelledDesc:
      "آپ کی ادائیگی منسوخ ہو گئی اور آپ کی ضرورت ابھی جمع نہیں ہوئی۔ آپ نیچے دوبارہ کوشش کر سکتے ہیں۔",
    failedTitle: "ادائیگی ناکام",
    failedDesc:
      "ادائیگی مکمل نہیں ہو سکی اور کوئی رقم وصول نہیں کی گئی۔ براہ کرم دوبارہ کوشش کریں۔",
    errorTitle: "کچھ غلط ہو گیا",
    retry: "دوبارہ ادائیگی کی کوشش کریں",
    checkoutUnavailable:
      "محفوظ چیک آؤٹ لوڈ نہیں ہو سکا۔ براہ کرم اپنا انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔",
    signInAgain:
      "آپ کا سیشن ختم ہو گیا ہے۔ براہ کرم دوبارہ لاگ ان کریں اور ادائیگی مکمل کرنے کے لیے یہ صفحہ دوبارہ کھولیں۔",
    networkError:
      "پیمنٹ سرور سے رابطہ نہیں ہو سکا۔ براہ کرم اپنا انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔",
    verificationError:
      "ہم ابھی آپ کی ادائیگی کی تصدیق نہیں کر سکے۔ اگر رقم کٹی ہے تو خودکار تصدیق ہو جائے گی؛ آپ دوبارہ بھی کوشش کر سکتے ہیں۔",
    secure:
      "ادائیگی کی تصدیق ہمارے سرور پر ہوتی ہے۔ UstaadHub آپ کی کارڈ تفصیلات محفوظ نہیں کرتا۔",
  },
};
export default function RequirementPaymentStep({
  requirementId,
  settings,
  isUrdu,
  studentName,
  studentEmail,
  studentPhone,
  onPaid,
  onResolved,
}: {
  requirementId: string;
  settings: PaymentSettings;
  isUrdu: boolean;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  /** Called only after the SERVER confirmed the payment. */
  onPaid: () => void;
  /**
   * Called when the server reports that this requirement no longer needs a
   * payment (for example the admin switched the gateway off).
   */
  onResolved: () => void;
}) {
  const t = isUrdu ? copy.ur : copy.en;
  const [status, setStatus] = useState<StepStatus>("ready");
  const [message, setMessage] = useState("");

  const busy =
    status === "creating" || status === "open" || status === "verifying";

  async function handlePayNow() {
    if (busy) {
      return;
    }

    setMessage("");
    setStatus("creating");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token ?? "";

      if (!accessToken) {
        setStatus("error");
        setMessage(t.signInAgain);

        return;
      }

      const orderResponse = await fetch("/api/payments/order", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ requirementId }),
      });

      const orderBody = (await orderResponse
        .json()
        .catch(() => null)) as OrderResponse | null;

      if (!orderResponse.ok || !orderBody?.orderId) {
        // The server is the authority on whether a payment is still needed.
        if (
          orderBody?.error === "payment_not_required" ||
          orderBody?.error === "already_paid"
        ) {
          onResolved();

          return;
        }

        setStatus("error");
        setMessage(errorMessage(orderBody?.error, t));

        return;
      }

      const checkoutLoaded = await loadGatewayCheckout();

      if (!checkoutLoaded) {
        setStatus("error");
        setMessage(t.checkoutUnavailable);

        return;
      }

      const opened = openGatewayCheckout({
        keyId: orderBody.keyId ?? "",
        orderId: orderBody.orderId,
        amountMinorUnits: orderBody.amountMinorUnits ?? 0,
        currency: orderBody.currency ?? settings.currency,
        studentName,
        studentEmail,
        studentPhone,
        description: "UstaadHub learning requirement",
        onSuccess: (result) => {
          void verifyPayment(result, accessToken);
        },
        onDismiss: () => {
          setStatus("cancelled");
          setMessage(t.cancelledDesc);
        },
        onFailure: () => {
          setStatus("failed");
          setMessage(t.failedDesc);
        },
      });

      if (!opened) {
        setStatus("error");
        setMessage(t.checkoutUnavailable);

        return;
      }

      setStatus("open");
    } catch (err) {
      console.error("Payment start error:", err);
      setStatus("error");
      setMessage(t.networkError);
    }
  }

  async function verifyPayment(
    result: { orderId: string; paymentId: string; signature: string },
    accessToken: string,
  ) {
    setStatus("verifying");
    setMessage("");

    try {
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          razorpay_order_id: result.orderId,
          razorpay_payment_id: result.paymentId,
          razorpay_signature: result.signature,
        }),
      });

      const body = (await response
        .json()
        .catch(() => null)) as { status?: string; error?: string } | null;

      if (response.ok && body?.status === "paid") {
        onPaid();

        return;
      }

      if (response.status === 402 || body?.error === "payment_failed") {
        setStatus("failed");
        setMessage(t.failedDesc);

        return;
      }

      // Anything else (network hiccup, gateway not reachable, webhook still in
      // flight) stays retryable: the same open order is reused, so a retry can
      // never charge the student twice.
      setStatus("error");
      setMessage(t.verificationError);
    } catch (err) {
      console.error("Payment verification error:", err);
      setStatus("error");
      setMessage(t.verificationError);
    }
  }

  return (
    <section className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="font-semibold text-blue-600">
        {isUrdu ? "ادائیگی" : "PAYMENT"}
      </p>

      <h2 className="mt-2 text-2xl font-bold text-slate-800">{t.title}</h2>

      <p className="mt-2 leading-7 text-slate-600">{t.desc}</p>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-semibold text-blue-900">
          {t.amountLabel}
        </span>

        <span className="text-2xl font-bold text-blue-700">
          {formatPaymentAmount(settings.amount, settings.currency)}
        </span>
      </div>

      {status === "verifying" && (
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
          <p className="font-semibold">{t.verifying}</p>
          <p className="mt-1 text-sm">{t.confirmNote}</p>
        </div>
      )}

      {status === "creating" && (
        <p className="mt-5 text-sm font-semibold text-slate-600">
          {t.creating}
        </p>
      )}

      {(status === "cancelled" || status === "failed") && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <strong>
            {status === "cancelled" ? t.cancelledTitle : t.failedTitle}
          </strong>

          <p className="mt-1 text-sm">{message || t.failedDesc}</p>
        </div>
      )}

      {status === "error" && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <strong>{t.errorTitle}</strong>

          <p className="mt-1 text-sm">{message || t.networkError}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => void handlePayNow()}
        disabled={busy}
        className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy
          ? status === "verifying"
            ? t.verifying
            : t.creating
          : status === "ready"
            ? t.payNow
            : t.retry}
      </button>
      <p className="mt-4 text-center text-sm text-slate-500">{t.secure}</p>
    </section>
  );
}



/**
 * Maps a server error code to a student-friendly sentence. Internal codes are
 * never shown verbatim so gateway/server details stay private.
 */
function errorMessage(
  code: string | undefined,
  t: { networkError: string; verificationError: string },
): string {
  switch (code) {
    case "gateway_not_configured":
    case "server_not_configured":
      return t.verificationError;
    case "gateway_unreachable":
    case "gateway_request_failed":
    case "order_creation_failed":
      return t.verificationError;
    default:
      return t.networkError;
  }
}
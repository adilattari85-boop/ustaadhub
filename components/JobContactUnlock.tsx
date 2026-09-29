"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  loadGatewayCheckout,
  openGatewayCheckout,
} from "@/lib/payments/checkout";

type ContactDetails = {
  contactPhone: string | null;
  contactEmail: string | null;
};

type JobContactUnlockProps = {
  slug: string;
  /** Always the CURRENT server-side admin amount. Never hardcoded. */
  amount: number;
  currency: "INR";
  jobTitle: string;
  /**
   * True when the switch is OFF, in which case the server component already
   * rendered the contact details inline and this component renders nothing.
   */
  disabled: boolean;
};

type ViewState = "loading" | "locked" | "unlocked" | "error";

type ContactStatusResult = {
  view: ViewState;
  contact: ContactDetails | null;
  errorMessage: string;
};

/**
 * Asks the protected endpoint for this visitor's unlock state.
 *
 * Module level on purpose: it performs the request and returns a plain result
 * object, and never touches React state. That keeps the effect that consumes it
 * free of synchronous setState calls, and it also means a response that arrives
 * after unmount is simply discarded instead of updating a dead component.
 */
async function requestContactStatus(
  slug: string,
  signal: AbortSignal,
): Promise<ContactStatusResult> {
  const failure: ContactStatusResult = {
    view: "error",
    contact: null,
    errorMessage: "We could not check your unlock status. Please try again.",
  };

  try {
    const response = await fetch(
      `/api/jobs/${encodeURIComponent(slug)}/contact`,
      {
        headers: { accept: "application/json" },
        cache: "no-store",
        signal,
      },
    );

    if (!response.ok) {
      return failure;
    }

    const data = (await response.json()) as {
      contact?: ContactDetails | null;
      reason?: string;
    };

    if (data.contact) {
      return { view: "unlocked", contact: data.contact, errorMessage: "" };
    }

    // A locked visitor must not see an error just because they have not paid
    // yet - "locked" is the normal first-visit state.
    if (data.reason === "not_required") {
      return { view: "unlocked", contact: null, errorMessage: "" };
    }

    return { view: "locked", contact: null, errorMessage: "" };
  } catch {
    return failure;
  }
}

/**
 * Client half of the Job Contact Access feature.
 *
 * It never receives the contact details as props: they are fetched from the
 * protected endpoint only after the server confirms a paid unlock. That is what
 * keeps contact_phone / contact_email out of the RSC payload, the HTML source
 * and any client-side JSON for a visitor who has not paid.
 */
export default function JobContactUnlock({
  slug,
  amount,
  currency,
  jobTitle,
  disabled,
}: JobContactUnlockProps) {
  const router = useRouter();
  const [state, setState] = useState<ViewState>("loading");
  const [contact, setContact] = useState<ContactDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const applyResult = useCallback((result: ContactStatusResult) => {
    setState(result.view);
    setContact(result.contact);
    setErrorMessage(result.errorMessage);
  }, []);

  const fetchContact = useCallback(async () => {
    applyResult(await requestContactStatus(slug, new AbortController().signal));
  }, [applyResult, slug]);

  useEffect(() => {
    if (disabled) {
      return;
    }

    // Cancelled on unmount / slug change so a late response cannot set state on
    // a component that is gone or that now points at a different job.
    const controller = new AbortController();
    let cancelled = false;

    void requestContactStatus(slug, controller.signal).then((result) => {
      if (cancelled) {
        return;
      }

      applyResult(result);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [applyResult, disabled, slug]);

  async function handleUnlock() {
    if (busy) {
      return;
    }

    setBusy(true);
    setErrorMessage("");

    try {
      // 1. Ask the server to create the order. Only the job identifier is sent -
      //    never an amount, a currency, a user id or a payment status.
      const orderResponse = await fetch("/api/payments/job-contact/order", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ slug }),
      });

      const orderData = (await orderResponse.json()) as {
        status?: string;
        keyId?: string | null;
        orderId?: string | null;
        amountMinorUnits?: number | null;
        currency?: string | null;
        message?: string;
      };

      if (!orderResponse.ok) {
        setErrorMessage(
          orderData.message ??
            "We could not start the payment. Please try again in a moment.",
        );
        setBusy(false);

        return;
      }

      if (
        orderData.status === "already_unlocked" ||
        orderData.status === "not_required"
      ) {
        setBusy(false);
        await fetchContact();

        return;
      }

      if (
        !orderData.keyId ||
        !orderData.orderId ||
        typeof orderData.amountMinorUnits !== "number"
      ) {
        setErrorMessage("The payment could not be started. Please try again.");
        setBusy(false);

        return;
      }

      // 2. Open the gateway checkout. The amount shown here is the one the
      //    SERVER returned for this order, so it always matches what will be
      //    charged even if the admin changes the price mid-session.
      const scriptReady = await loadGatewayCheckout();

      if (!scriptReady) {
        setErrorMessage(
          "The payment window could not load. Please check your connection.",
        );
        setBusy(false);

        return;
      }

      const opened = openGatewayCheckout({
        keyId: orderData.keyId,
        orderId: orderData.orderId,
        amountMinorUnits: orderData.amountMinorUnits,
        currency: orderData.currency ?? currency,
        description: `Unlock contact details - ${jobTitle}`,
        onDismiss: () => setBusy(false),
        onFailure: () => {
          setErrorMessage("The payment did not complete. Please try again.");
          setBusy(false);
        },
        onSuccess: async (result) => {
          // 3. The gateway's client-side success is NOT proof of payment. Ask
          //    the server to verify the signature and record the unlock, and
          //    only then re-read the contact details.
          setErrorMessage("Verifying your payment...");

          try {
            const verifyResponse = await fetch(
              "/api/payments/job-contact/verify",
              {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  accept: "application/json",
                },
                body: JSON.stringify({
                  // The field names must be the snake_case ones this route
                  // reads (and the ones the support/requirement verify routes
                  // already use). Sending camelCase here was silently rejected
                  // with 400 invalid_request, which left the ledger row stuck
                  // on "created" even though Razorpay had captured the payment.
                  razorpay_order_id: result.orderId,
                  razorpay_payment_id: result.paymentId,
                  razorpay_signature: result.signature,
                  slug,
                }),
              },
            );

            const verifyData = (await verifyResponse.json()) as {
              message?: string;
            };

            if (!verifyResponse.ok) {
              setErrorMessage(
                verifyData.message ??
                  "We could not verify your payment. Contact details stay locked.",
              );
              setBusy(false);

              return;
            }

            setErrorMessage("");
            setBusy(false);
            await fetchContact();
            // Re-render the server component so the "How to apply" block picks
            // up the now-entitled visitor and offers Apply on WhatsApp with the
            // real phone number, exactly as it does when the switch is OFF.
            router.refresh();
          } catch {
            setErrorMessage("We could not verify your payment. Please try again.");
            setBusy(false);
          }
        },
      });

      if (!opened) {
        setErrorMessage("The payment window could not open. Please try again.");
        setBusy(false);
      }
    } catch {
      setErrorMessage("Something went wrong starting the payment. Please try again.");
      setBusy(false);
    }
  }

  if (disabled) {
    return null;
  }

  // There is deliberately NO early return for the "loading" state any more.
  //
  // Previously "loading" short-circuited to a placeholder with no call to
  // action, and the server component always ships that branch, so an unpaid
  // visitor was shown a locked contact block with no way to pay. The loading
  // state now falls through to the locked branch below, which renders the
  // unlock button immediately.
  //
  // That is safe: the server component only mounts this component when it has
  // already determined the visitor is NOT unlocked, so there is no risk of
  // flashing "protected" at someone who has paid.

  if (state === "unlocked" && contact) {
    const { contactPhone, contactEmail } = contact;
    const hasAnyContact = Boolean(contactPhone || contactEmail);

    return (
      <section className="mt-8 rounded-xl border border-green-200 bg-green-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">Contact Details</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
            <span aria-hidden="true">✓</span> Contact Unlocked
          </span>
        </div>

        {hasAnyContact ? (
          <div className="mt-3 flex flex-wrap gap-3">
            {contactPhone && (
              <a
                href={`tel:${contactPhone}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-green-400 hover:bg-green-50"
              >
                <span aria-hidden="true">📞</span>
                {contactPhone}
              </a>
            )}
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-green-400 hover:bg-green-50"
              >
                <span aria-hidden="true">✉️</span>
                {contactEmail}
              </a>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            No direct contact was provided for this opportunity. Please share this
            link with the Zimmedar.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
      <h2 className="text-base font-bold text-slate-900">Contact Details</h2>

      {state === "error" ? (
        <>
          <p className="mt-2 text-sm text-amber-800">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void fetchContact()}
            className="mt-3 rounded-xl border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            Try again
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm font-semibold text-amber-900">
            🔒 Contact details are protected.
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Unlock the contact details to contact the organization directly.
          </p>

          <button
            type="button"
            onClick={() => void handleUnlock()}
            disabled={busy}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Please wait..." : `Unlock Contact — ₹${amount}`}
          </button>

          <p className="mt-2 text-xs text-amber-700">
            One-time payment of {formatAmount(amount)} to view the phone number
            and email. The price is set by the site admin.
          </p>
        </>
      )}

      {errorMessage && state === "locked" && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
        >
          {errorMessage}
        </p>
      )}
    </section>
  );
}

function formatAmount(amount: number): string {
  return `₹${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

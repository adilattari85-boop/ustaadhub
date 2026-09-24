"use client";

import { useState } from "react";

import {
  loadGatewayCheckout,
  openGatewayCheckout,
} from "@/lib/payments/checkout";
import { supabase } from "@/lib/supabase";

// Landing-page "Support UstaadHub" section: one-time donations and student
// sponsorships paid through server-created Razorpay orders
// (POST /api/payments/support/order + POST /api/payments/support/verify).
// The browser never decides that a payment succeeded and never sees the
// gateway Key Secret - only the public Key ID returned by the server.

export type SupportSectionCopy = {
  eyebrow: string;
  title: string;
  desc: string;
  donateTitle: string;
  donateDesc: string;
  donateCta: string;
  sponsorTitle: string;
  sponsorDesc: string;
  sponsorCta: string;
  chooseAmount: string;
  customLabel: string;
  payNow: string;
  processing: string;
  verifying: string;
  successTitle: string;
  successDesc: string;
  failedDesc: string;
  errorDesc: string;
  disabled: string;
  secure: string;
};

type PaymentType = "donation" | "sponsorship";

type Step =
  | "idle"
  | "creating"
  | "open"
  | "verifying"
  | "success"
  | "failed"
  | "error";

type OrderResponse = {
  orderId?: string;
  currency?: string;
  amountMinorUnits?: number;
  keyId?: string;
  error?: string;
};

const PRESET_AMOUNTS: Record<PaymentType, number[]> = {
  donation: [100, 250, 500, 1000],
  sponsorship: [500, 1000, 2500],
};

const MIN_AMOUNT = 10;
const MAX_AMOUNT = 500000;

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

function formatRupee(amount: number): string {
  return `\u20B9${rupeeFormatter.format(amount)}`;
}

export default function SupportSection({ copy }: { copy: SupportSectionCopy }) {
  const [type, setType] = useState<PaymentType>("donation");
  const [panelOpen, setPanelOpen] = useState(false);
  const [preset, setPreset] = useState<number>(PRESET_AMOUNTS.donation[0]);
  const [custom, setCustom] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState("");

  const busy = step === "creating" || step === "open" || step === "verifying";

  function selectedAmount(): number {
    if (preset === 0) {
      return Math.round(Number(custom));
    }

    return preset;
  }

  function resetSelection(next: PaymentType) {
    setType(next);
    setPreset(PRESET_AMOUNTS[next][0]);
    setCustom("");
    setMessage("");
    setStep("idle");
    setPanelOpen(true);
  }

  function pickAmount(value: number) {
    setPreset(value);
    setMessage("");
    setStep("idle");
  }

  async function startPayment() {
    const amount = selectedAmount();

    if (
      !Number.isFinite(amount) ||
      amount < MIN_AMOUNT ||
      amount > MAX_AMOUNT
    ) {
      setStep("error");
      setMessage(copy.errorDesc);
      return;
    }

    setStep("creating");
    setMessage("");

    try {
      // Optional identity: a signed-in supporter is attached server-side;
      // anonymous donations stay allowed.
      let token = "";

      try {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token ?? "";
      } catch {
        token = "";
      }

      const response = await fetch("/api/payments/support/order", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ paymentType: type, amount }),
      });

      const body = (await response
        .json()
        .catch(() => null)) as OrderResponse | null;

      if (!response.ok || !body?.orderId || !body.keyId) {
        setStep("error");
        setMessage(
          body?.error === "gateway_disabled" ? copy.disabled : copy.errorDesc,
        );
        return;
      }

      const loaded = await loadGatewayCheckout();

      const opened =
        loaded &&
        openGatewayCheckout({
          keyId: body.keyId,
          orderId: body.orderId,
          amountMinorUnits: body.amountMinorUnits ?? 0,
          currency: body.currency ?? "INR",
          description:
            type === "donation"
              ? "UstaadHub donation"
              : "UstaadHub student sponsorship",
          onSuccess: (result) => {
            void verify(result, token);
          },
          onDismiss: () => {
            setStep("failed");
            setMessage(copy.failedDesc);
          },
          onFailure: () => {
            setStep("failed");
            setMessage(copy.failedDesc);
          },
        });

      if (!opened) {
        setStep("error");
        setMessage(copy.errorDesc);
        return;
      }

      setStep("open");
    } catch {
      setStep("error");
      setMessage(copy.errorDesc);
    }
  }

  async function verify(
    result: { orderId: string; paymentId: string; signature: string },
    token: string,
  ) {
    setStep("verifying");
    setMessage("");

    try {
      const response = await fetch("/api/payments/support/verify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
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
        setStep("success");
        setMessage(copy.successDesc);
        return;
      }

      if (response.status === 402 || body?.error === "payment_failed") {
        setStep("failed");
        setMessage(copy.failedDesc);
        return;
      }

      // Anything else (network hiccup, gateway not reachable, webhook still
      // in flight) stays retryable: the ledger row only transitions
      // server-side, so retrying can never charge the supporter twice.
      setStep("error");
      setMessage(copy.errorDesc);
    } catch {
      setStep("error");
      setMessage(copy.errorDesc);
    }
  }
  return (
    <section
      id="support"
      className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-14 sm:py-16 lg:py-20"
    >
      <div className="landing-container mx-auto max-w-4xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          {copy.eyebrow}
        </p>

        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
          {copy.title}
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-base">
          {copy.desc}
        </p>

        <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
          <div
            className={`rounded-3xl border bg-white p-6 shadow-sm transition ${
              type === "donation" && panelOpen
                ? "border-blue-400 ring-2 ring-blue-100"
                : "border-slate-200"
            }`}
          >
            <h3 className="text-lg font-bold text-slate-900">
              {copy.donateTitle}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {copy.donateDesc}
            </p>

            <button
              type="button"
              onClick={() => resetSelection("donation")}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {copy.donateCta}
            </button>
          </div>

          <div
            className={`rounded-3xl border bg-white p-6 shadow-sm transition ${
              type === "sponsorship" && panelOpen
                ? "border-blue-400 ring-2 ring-blue-100"
                : "border-slate-200"
            }`}
          >
            <h3 className="text-lg font-bold text-slate-900">
              {copy.sponsorTitle}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {copy.sponsorDesc}
            </p>

            <button
              type="button"
              onClick={() => resetSelection("sponsorship")}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {copy.sponsorCta}
            </button>
          </div>
        </div>
        {panelOpen && (
          <div className="mx-auto mt-6 max-w-xl rounded-3xl border border-blue-200 bg-white p-6 text-left shadow-md sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                {type === "donation" ? copy.donateTitle : copy.sponsorTitle}
              </p>

              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                &#10005;
              </button>
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-800">
              {copy.chooseAmount}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {PRESET_AMOUNTS[type].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => pickAmount(value)}
                  aria-pressed={preset === value}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    preset === value
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                  }`}
                >
                  {formatRupee(value)}
                </button>
              ))}

              <button
                type="button"
                onClick={() => pickAmount(0)}
                aria-pressed={preset === 0}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  preset === 0
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                }`}
              >
                {copy.customLabel}
              </button>
            </div>

            {preset === 0 && (
              <div className="mt-4">
                <label
                  htmlFor="support-custom-amount"
                  className="text-sm font-semibold text-slate-800"
                >
                  {copy.customLabel}
                </label>

                <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <span className="text-slate-500" aria-hidden="true">
                    {"\u20B9"}
                  </span>

                  <input
                    id="support-custom-amount"
                    type="number"
                    inputMode="numeric"
                    min={MIN_AMOUNT}
                    max={MAX_AMOUNT}
                    value={custom}
                    onChange={(event) => {
                      setCustom(event.target.value);
                      setMessage("");
                      setStep("idle");
                    }}
                    placeholder="500"
                    className="w-full border-0 bg-transparent py-3 text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => void startPayment()}
              disabled={busy}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-6 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? copy.processing : copy.payNow}
            </button>

            {step === "verifying" && (
              <div
                role="status"
                aria-live="polite"
                className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800"
              >
                {copy.verifying}
              </div>
            )}

            {step === "success" && (
              <div
                role="status"
                aria-live="polite"
                className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4"
              >
                <p className="font-semibold text-green-800">
                  {copy.successTitle}
                </p>

                <p className="mt-1 text-sm text-green-700">
                  {copy.successDesc}
                </p>
              </div>
            )}

            {(step === "failed" || step === "error") && message !== "" && (
              <div
                role="status"
                aria-live="polite"
                className={`mt-4 rounded-xl border p-4 text-sm ${
                  step === "failed"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {message}
              </div>
            )}

            <p className="mt-4 text-xs leading-5 text-slate-500">
              {copy.secure}
            </p>

          </div>
        )}

      </div>
    </section>
  );
}

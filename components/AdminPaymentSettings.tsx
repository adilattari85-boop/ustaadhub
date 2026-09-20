"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_PAYMENT_SETTINGS,
  type PaymentSettings,
  type PaymentSettingsRow,
} from "@/lib/payments/types";
import { supabase } from "@/lib/supabase";

// Admin-only payment gateway switch.
//
// The switch, the amount and the currency live in Supabase
// (public.platform_settings through public.admin_update_payment_settings), not
// in this component, and the RPC re-checks public.is_admin() inside the
// database - so this UI is convenience only and a student/public user cannot
// change the setting even with a forged request.
//
// The gateway credentials themselves are server-only environment variables.
// This card therefore also reports the non-secret server status and refuses to
// enable the gateway while those credentials are missing, so the switch can
// never be turned on before the gateway is actually usable.

type GatewayStatus = {
  provider?: string;
  keyId?: string | null;
  keyIdConfigured?: boolean;
  keySecretConfigured?: boolean;
  webhookSecretConfigured?: boolean;
};

export default function AdminPaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>(
    DEFAULT_PAYMENT_SETTINGS,
  );
  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState("0");
  const [currency, setCurrency] = useState("INR");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);

  const gatewayReady = Boolean(
    gateway?.keyIdConfigured && gateway?.keySecretConfigured,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      const { data, error } = await supabase.rpc("get_payment_settings");

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Could not load the payment settings.");
        setLoading(false);

        return;
      }

      const row = (Array.isArray(data) ? data[0] : data) as
        | PaymentSettingsRow
        | null;
      const resolved = {
        enabled: row?.payment_enabled === true,
        amount: Number(row?.payment_amount ?? 0),
        currency: String(row?.payment_currency ?? "INR").toUpperCase(),
      };

      setSettings(resolved);
      setEnabled(resolved.enabled);
      setAmount(String(resolved.amount));
      setCurrency(resolved.currency);
      setLoading(false);
    }

    async function loadGatewayStatus() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token ?? "";

        if (!accessToken) {
          return;
        }

        const response = await fetch("/api/admin/payment-settings", {
          headers: { authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          return;
        }

        const body = (await response.json()) as GatewayStatus;

        if (isMounted) {
          setGateway(body);
        }
      } catch {
        // Non-critical: the switch still works, only the warning is missing.
      }
    }

    void loadSettings();
    void loadGatewayStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSave() {
    if (saving) {
      return;
    }

    setStatusMessage("");
    setErrorMessage("");

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setErrorMessage("Enter a valid payment amount (0 or more).");

      return;
    }

    if (enabled && parsedAmount <= 0) {
      setErrorMessage("Set a payment amount greater than 0 before enabling.");

      return;
    }

    if (enabled && !gatewayReady) {
      setErrorMessage(
        "The payment gateway credentials are not configured on the server yet, so the gateway cannot be enabled.",
      );

      return;
    }

    setSaving(true);

    const { data, error } = await supabase.rpc(
      "admin_update_payment_settings",
      {
        p_enabled: enabled,
        p_amount: parsedAmount,
        p_currency: currency.trim().toUpperCase() || "INR",
      },
    );

    if (error) {
      setErrorMessage(
        "Could not save the payment setting. Admin access is required.",
      );
      setSaving(false);

      return;
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | PaymentSettingsRow
      | null;

    const resolved = {
      enabled: row?.payment_enabled === true,
      amount: Number(row?.payment_amount ?? parsedAmount),
      currency: String(row?.payment_currency ?? currency).toUpperCase(),
    };

    setSettings(resolved);
    setEnabled(resolved.enabled);
    setAmount(String(resolved.amount));
    setCurrency(resolved.currency);
    setSaving(false);
    setStatusMessage(
      resolved.enabled
        ? "Payment gateway is ON. Students now pay before a requirement is submitted."
        : "Payment gateway is OFF. Students submit requirements for free, exactly as before.",
    );
  }
return (
    <section className="mt-10 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-blue-600">PAYMENT SETTINGS</p>

          <h2 className="mt-1 text-xl font-bold">Payment Gateway</h2>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            When ON, a student must pay the configured amount before a learning
            requirement is submitted and matched with a teacher. When OFF, the
            existing free submission flow is unchanged and no payment UI is
            shown.
          </p>
        </div>

        <span
          className={`rounded-full px-4 py-1.5 text-sm font-bold ${
            settings.enabled
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {settings.enabled ? "ON" : "OFF"}
        </span>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading settings...</p>
      ) : (
        <>
          {!gatewayReady && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">
                Gateway credentials are not configured on the server yet.
              </p>

              <p className="mt-1">
                Set PAYMENT_GATEWAY_KEY_ID and PAYMENT_GATEWAY_KEY_SECRET (and
                PAYMENT_GATEWAY_WEBHOOK_SECRET for webhook verification) in the
                deployment environment and redeploy. Keep the switch OFF until
                then.
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="h-5 w-5"
              />

              <span className="font-semibold text-slate-700">
                Require payment before submission
              </span>
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
              <label
                htmlFor="payment-amount"
                className="font-semibold text-slate-700"
              >
                Amount
              </label>

              <input
                id="payment-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />

              <input
                aria-label="Currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                maxLength={3}
                className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {statusMessage && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {statusMessage}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save payment setting"}
            </button>

            <p className="text-sm text-slate-500">
              Server gateway:{" "}
              {gateway
                ? `${gateway.provider ?? "razorpay"} · key ${
                    gateway.keyIdConfigured ? "configured" : "missing"
                  } · secret ${
                    gateway.keySecretConfigured ? "configured" : "missing"
                  } · webhook ${
                    gateway.webhookSecretConfigured ? "configured" : "missing"
                  }`
                : "status unavailable"}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
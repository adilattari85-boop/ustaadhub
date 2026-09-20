// Client-safe payment settings access for UstaadHub.
//
// Only client components import this module. The public, non-secret payment
// configuration is read through the public.get_payment_settings() RPC, so the
// database stays the single source of truth for the gateway switch and the
// amount (the browser never decides them).
//
// Any read failure resolves to the safe default (payment disabled), so a
// settings problem can never break the existing free requirement flow.

import { supabase } from "@/lib/supabase";

import {
  DEFAULT_PAYMENT_SETTINGS,
  normalizePaymentSettings,
  type PaymentSettings,
  type PaymentSettingsRow,
} from "./types";

export async function fetchPaymentSettings(): Promise<PaymentSettings> {
  try {
    const { data, error } = await supabase.rpc("get_payment_settings");

    if (error) {
      console.warn("Payment settings unavailable:", error.message);

      return DEFAULT_PAYMENT_SETTINGS;
    }

    const rows = (data ?? []) as PaymentSettingsRow[];

    return normalizePaymentSettings(rows[0]);
  } catch (err) {
    console.warn("Payment settings request failed:", err);

    return DEFAULT_PAYMENT_SETTINGS;
  }
}
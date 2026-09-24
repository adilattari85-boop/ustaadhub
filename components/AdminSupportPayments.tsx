"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

// Admin-only read-only view of the support_payments ledger (donations +
// sponsorships). RLS on the table restricts SELECT to admins, so the normal
// client is enough - no service key and no new API route.

type SupportPayment = {
  id: string;
  payment_type: string;
  amount: number | string;
  currency: string;
  payment_status: string;
  razorpay_payment_id: string | null;
  created_at: string;
};

function statusBadgeClasses(status: string): string {
  if (status === "paid") {
    return "inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700";
  }

  if (status === "failed") {
    return "inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700";
  }

  return "inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700";
}

export default function AdminSupportPayments() {
  const [rows, setRows] = useState<SupportPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error: loadError } = await supabase
        .from("support_payments")
        .select(
          "id, payment_type, amount, currency, payment_status, razorpay_payment_id, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelled) {
        return;
      }

      if (loadError) {
        setError(loadError.message);
        setRows([]);
      } else {
        setRows((data || []) as SupportPayment[]);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
        SUPPORT PAYMENTS
      </p>

      <h2 className="mt-1 text-xl font-bold text-slate-900">
        Donations &amp; Sponsorships
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Latest support payments (up to 50).
      </p>

      {error !== "" && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading support payments...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No support payments yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Currency</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Razorpay Payment ID</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-semibold text-slate-800">
                    {row.payment_type === "sponsorship"
                      ? "Sponsorship"
                      : "Donation"}
                  </td>

                  <td className="px-3 py-2 text-slate-800">
                    {Number(row.amount).toLocaleString("en-IN")}
                  </td>

                  <td className="px-3 py-2 text-slate-600">{row.currency}</td>

                  <td className="px-3 py-2">
                    <span className={statusBadgeClasses(row.payment_status)}>
                      {row.payment_status}
                    </span>
                  </td>

                  <td className="px-3 py-2 font-mono text-xs text-slate-600">
                    {row.razorpay_payment_id ?? "\u2014"}
                  </td>

                  <td className="px-3 py-2 text-slate-600">
                    {new Date(row.created_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
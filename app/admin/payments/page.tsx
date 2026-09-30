"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminPaymentSettings from "@/components/AdminPaymentSettings";
import AdminSupportPayments from "@/components/AdminSupportPayments";

// Dedicated home for the payment-related admin controls. Both components are
// used exactly as they were on /admin - they keep their own loading, validation
// and Supabase writes, and nothing about the gateway, support payments or job
// contact access settings changes by moving them here.
export default function AdminPaymentsPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authenticating, setAuthenticating] = useState(true);

  // Same client-side admin guard used by app/admin/users, app/admin/jobs and
  // app/admin/requirements. Real authorization stays in the database.
  async function verifyAdmin() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/admin/login");
      return false;
    }

    const { data: isAdmin, error: adminError } =
      await supabase.rpc("is_admin");

    if (adminError || !isAdmin) {
      await supabase.auth.signOut();
      router.replace("/admin/login");
      return false;
    }

    return true;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  useEffect(() => {
    let active = true;

    async function authorize() {
      const ok = await verifyAdmin();

      if (!active) return;

      setIsAuthorized(ok);
      setAuthenticating(false);
    }

    void authorize();

    return () => {
      active = false;
    };
  }, []);

  if (authenticating) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-slate-900">
        <p className="text-lg font-semibold">Verifying admin access...</p>
      </main>
    );
  }

  // verifyAdmin() navigates to /admin/login for unauthorized visitors.
  if (!isAuthorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Link href="/" className="text-2xl font-bold text-blue-700">
              UstaadHub
            </Link>
            <p className="text-sm text-slate-500">Payments &amp; Settings</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Logout
            </button>

            <Link
              href="/"
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              View Website
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <p className="font-semibold text-blue-600">ADMIN PANEL</p>

          <h1 className="mt-1 text-3xl font-bold md:text-4xl">
            Payments &amp; Settings
          </h1>

          <p className="mt-2 text-slate-600">
            Control the requirement payment gateway, support payments for
            donations and sponsorships, and paid job contact access. Turning the
            gateway off keeps requirement submission free, exactly as before.
          </p>
        </div>

        <AdminPaymentSettings />

        <div className="mt-10">
          <AdminSupportPayments />
        </div>
      </section>
    </main>
  );
}
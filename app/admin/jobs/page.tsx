"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminJobsManager from "@/components/AdminJobsManager";

// Dedicated home for the Jobs & Opportunities admin tools. The manager itself
// is unchanged and still owns all of its own data loading, validation and
// Supabase writes - this page only provides the route, the page heading and
// the same client-side admin guard the other admin pages already use.
export default function AdminJobsPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authenticating, setAuthenticating] = useState(true);

  // Mirrors the auth-guard pattern used by app/admin/page.tsx and
  // app/admin/users/page.tsx. Authorization itself still lives in the
  // database (public.is_admin()); this only avoids rendering the page to
  // visitors who are not admins.
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
            <p className="text-sm text-slate-500">Jobs &amp; Opportunities</p>
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

          <p className="mt-2 text-slate-600">
            Create, edit, publish, close and pin job listings. Pinned jobs are
            shown first on the public Jobs page, and paid job contact access is
            managed separately under Payments.
          </p>
        </div>

        {/* AdminJobsManager renders its own "Jobs & Opportunities" heading, so
            this page deliberately does not repeat it as an <h1> here. */}
        <AdminJobsManager />
      </section>
    </main>
  );
}
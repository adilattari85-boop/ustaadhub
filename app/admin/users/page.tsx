"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authenticating, setAuthenticating] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Mirrors the auth-guard pattern used by app/admin/page.tsx.
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

  async function loadUsers() {
    setLoading(true);
    setError("");

    const { data, error: listError } =
      await supabase.rpc("admin_list_users");

    if (listError) {
      setError(listError.message);
      setUsers([]);
    } else {
      setUsers((data || []) as AdminUser[]);
    }

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  useEffect(() => {
    let active = true;

    async function authorizeAndLoad() {
      const ok = await verifyAdmin();
      if (!active) return;

      if (!ok) {
        setAuthenticating(false);
        return;
      }

      setIsAuthorized(true);
      setAuthenticating(false);
      await loadUsers();
    }

    void authorizeAndLoad();

    return () => {
      active = false;
    };
  }, []);

  // Existing client-side filter pattern (see app/admin/teachers client filter).
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;

    return users.filter((u) => {
      const email = (u.email || "").toLowerCase();
      const name = (u.display_name || "").toLowerCase();
      return email.includes(query) || name.includes(query);
    });
  }, [search, users]);

  function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function roleClass(role: string | null) {
    if (role === "teacher") return "bg-blue-100 text-blue-700";
    if (role === "student") return "bg-emerald-100 text-emerald-700";
    return "bg-slate-100 text-slate-700";
  }

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
            <p className="text-sm text-slate-500">All Users</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Back to Admin
            </Link>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-blue-600">ADMIN PANEL</p>
            <h1 className="mt-1 text-3xl font-bold md:text-4xl">
              All Users
            </h1>
            <p className="mt-2 text-slate-600">
              Registered accounts from Supabase Auth (students, teachers and
              others), including users without a teacher profile or learning
              requirement.
            </p>
          </div>

          <div className="w-full sm:max-w-md">
            <label htmlFor="user-search" className="sr-only">
              Search users by name or email
            </label>
            <input
              id="user-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
              aria-label="Search users by name or email"
            />
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">Could not load users</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* LOADING */}
        {!error && loading && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-12 w-full animate-pulse rounded-xl bg-slate-200"
              />
            ))}
          </div>
        )}

        {/* EMPTY */}
        {!loading &&
          !error &&
          filteredUsers.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <p className="text-2xl">👤</p>
              <h2 className="mt-4 text-xl font-bold">No users found</h2>
              <p className="mt-2 text-slate-500">
                {search
                  ? "No users match your search."
                  : "There are no registered accounts yet."}
              </p>
            </div>
          )}

        {/* TABLE */}
        {!loading &&
          !error &&
          filteredUsers.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 text-sm">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Name
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Email
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Role
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Signup
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Email verified
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Last sign-in
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <span className="block max-w-[220px] truncate font-medium text-slate-900">
                          {user.display_name || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-sm text-slate-700">
                        {user.email || "—"}
                      </td>

                      <td className="px-5 py-3">
                        {user.role ? (
                          <span
                            className={
                              "inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize " +
                              roleClass(user.role)
                            }
                          >
                            {user.role}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-sm text-slate-700">
                        {formatDate(user.created_at)}
                      </td>

                      <td className="px-5 py-3 text-sm text-slate-700">
                        {user.email_confirmed_at ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                            Unverified
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-sm text-slate-700">
                        {formatDate(user.last_sign_in_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>
    </main>
  );
}
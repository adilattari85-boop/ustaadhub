"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Resolve the recovery session from the link Supabase emailed the user.
  // With the default (implicit) flow the tokens arrive in the URL hash and
  // supabase-js picks them up automatically (detectSessionInUrl); for PKCE
  // projects a `code` query parameter is present and is exchanged explicitly.
  useEffect(() => {
    let cancelled = false;

    async function resolveSession() {
      try {
        const { data } = await supabase.auth.getSession();

        if (cancelled) return;

        if (data.session) {
          setReady(true);
          return;
        }

        const code = new URL(window.location.href).searchParams.get("code");

        if (!code) {
          setExpired(true);
          return;
        }

        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (cancelled) return;

        if (exchangeError) {
          setExpired(true);
          return;
        }

        const { data: after } = await supabase.auth.getSession();

        if (after.session) {
          setReady(true);
        } else {
          setExpired(true);
        }
      } catch {
        if (!cancelled) {
          setExpired(true);
        }
      }
    }

    resolveSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage(
      "Password updated successfully. Redirecting you to login..."
    );

    // Give the user a moment to read the confirmation, then head to login.
    window.setTimeout(() => {
      router.push("/login");
    }, 2500);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="text-3xl font-bold text-blue-600">
            UstaadHub
          </a>

          <a
            href="/login"
            className="font-medium text-slate-700 hover:text-blue-600"
          >
            Back to Login
          </a>
        </div>
      </header>

      <section className="px-6 py-14">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border bg-white p-8 shadow-sm">
{expired ? (
              <>
                <p className="font-semibold text-blue-600">
                  PASSWORD RESET
                </p>

                <h1 className="mt-2 text-3xl font-bold">
                  Link invalid or expired
                </h1>

                <p className="mt-3 text-slate-600">
                  This password reset link is invalid or has expired. Please
                  request a new one.
                </p>

                <div className="mt-8">
                  <a
                    href="/forgot-password"
                    className="block w-full rounded-xl bg-blue-600 px-6 py-3 text-center font-semibold text-white hover:bg-blue-700"
                  >
                    Request a New Link
                  </a>
                </div>
              </>
            ) : !ready ? (
              <div className="py-8 text-center text-slate-600">
                <p className="font-medium">
                  Checking your reset link...
                </p>
              </div>
            ) : (
              <>
                <p className="font-semibold text-blue-600">
                  PASSWORD RESET
                </p>

                <h1 className="mt-2 text-3xl font-bold">
                  Reset your password
                </h1>

                <p className="mt-3 text-slate-600">
                  Choose a new password for your UstaadHub account.
                </p>

                {error && (
                  <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="mt-6 rounded-xl bg-green-50 p-4 text-green-700">
                    {message}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">

                  <div>
                    <label className="mb-2 block font-medium">
                      New Password
                    </label>

                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-medium">
                      Confirm New Password
                    </label>

                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {loading ? "Updating password..." : "Update Password"}
                  </button>

                </form>
              </>
            )}

          </div>
        </div>
      </section>
    </main>
  );
}
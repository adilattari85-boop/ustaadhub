"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: "https://www.ustaadhub.in/reset-password",
      }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage(
      "If an account exists for that email, a password reset link has been sent. Please check your inbox (and spam folder) and follow the instructions."
    );
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

            <p className="font-semibold text-blue-600">
              PASSWORD RESET
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Forgot your password?
            </h1>

            <p className="mt-3 text-slate-600">
              Enter the email address linked to your UstaadHub account and we&apos;ll
              send you a link to reset your password.
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
                  Email Address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Sending link..." : "Send Reset Link"}
              </button>

              <p className="text-center text-sm text-slate-600">
                Remembered your password?{" "}
                <a
                  href="/login"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Back to Login
                </a>
              </p>

            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
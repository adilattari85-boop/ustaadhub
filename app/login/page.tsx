"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTeacherLogin = searchParams.get("role") === "teacher";
  const accountType = isTeacherLogin ? "teacher" : "student";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please enter your email and password.");
      setLoading(false);
      return;
    }

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (!signInData.session || !signInData.user) {
      setError("Login succeeded, but an authenticated session could not be established.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(
        userError?.message ||
          "Login succeeded, but the authenticated user could not be verified."
      );
      setLoading(false);
      return;
    }

    const role = user.user_metadata?.role;

    if (role === "teacher") {
      router.push("/teacher/dashboard");
      return;
    }

    if (role === "student") {
      router.push("/student/dashboard");
      return;
    }

    await supabase.auth.signOut();
    setError("This account does not have a recognized role. Please contact support.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="text-3xl font-bold text-blue-600">
            UstaadHub
          </a>

          <a
            href={isTeacherLogin ? "/register" : "/signup"}
            className="font-medium text-slate-700 hover:text-blue-600"
          >
            {isTeacherLogin ? "Create Teacher Profile" : "Create Account"}
          </a>
        </div>
      </header>

      <section className="px-6 py-14">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border bg-white p-8 shadow-sm">

            <p className="font-semibold text-blue-600">
              {accountType.toUpperCase()} LOGIN
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Welcome back
            </h1>

            <p className="mt-3 text-slate-600">
              Login to your UstaadHub {accountType} account and continue your
              learning journey.
            </p>

            {error && (
              <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
                {error}
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

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-medium">
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-sm font-medium text-blue-600 hover:underline"
                    onClick={() =>
                      alert("Password reset will be added later.")
                    }
                  >
                    Forgot password?
                  </button>
                </div>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              <p className="text-center text-sm text-slate-600">
                Don't have an account?{" "}
                <a
                  href={isTeacherLogin ? "/register" : "/signup"}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  {isTeacherLogin ? "Create Teacher Profile" : "Sign Up"}
                </a>
              </p>

            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

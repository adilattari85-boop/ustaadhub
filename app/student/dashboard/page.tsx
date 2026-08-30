"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StudentDashboard() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setEmail(user.email || "");
    }

    getUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="text-3xl font-bold text-blue-600">
            UstaadHub
          </a>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border bg-white p-8 shadow-sm">
            <p className="font-semibold text-blue-600">
              STUDENT DASHBOARD
            </p>

            <h1 className="mt-2 text-4xl font-bold">
              Welcome to UstaadHub 🎓
            </h1>

            <p className="mt-4 text-lg text-slate-600">
              You are logged in as:
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {email}
            </p>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <div className="rounded-xl border p-6">
                <h2 className="text-xl font-bold">My Teachers</h2>
                <p className="mt-2 text-slate-600">
                  Find and connect with teachers.
                </p>
              </div>

              <div className="rounded-xl border p-6">
                <h2 className="text-xl font-bold">My Classes</h2>
                <p className="mt-2 text-slate-600">
                  View your enrolled classes.
                </p>
              </div>

              <div className="rounded-xl border p-6">
                <h2 className="text-xl font-bold">My Profile</h2>
                <p className="mt-2 text-slate-600">
                  Manage your student profile.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
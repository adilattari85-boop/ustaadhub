"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTeacher() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user || user.user_metadata?.role !== "teacher") {
        router.replace("/login?role=teacher");
        return;
      }

      setTeacherName(user.user_metadata?.name || "");
      setEmail(user.email || "");
      setLoading(false);
    }

    loadTeacher();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login?role=teacher");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <section className="px-6 py-14">
          <div className="mx-auto max-w-6xl">Loading your dashboard...</div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-3xl font-bold text-blue-600">
            UstaadHub
          </Link>

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
            <p className="font-semibold text-blue-600">TEACHER DASHBOARD</p>

            <h1 className="mt-2 text-4xl font-bold">
              Welcome{teacherName ? `, ${teacherName}` : ""}
            </h1>

            {email && (
              <p className="mt-4 text-lg text-slate-600">
                Signed in as{" "}
                <span className="font-semibold text-slate-900">{email}</span>
              </p>
            )}

            <p className="mt-8 text-slate-600">
              Your teacher dashboard is ready. Profile and class-management
              tools will appear here.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

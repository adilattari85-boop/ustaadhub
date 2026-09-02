"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TeacherProfile = {
  id: string;
  full_name: string | null;
  bio: string | null;
  subjects: string[] | null;
  experience: string | null;
  languages: string[] | null;
  teaching_mode: string | null;
  fee_weekly: number | null;
  fee_monthly: number | null;
  profile_photo_url: string | null;
  is_verified: boolean;
};

const teacherColumns =
  "id, full_name, bio, subjects, experience, languages, teaching_mode, fee_weekly, fee_monthly, profile_photo_url, is_verified";

function getInitials(name: string | null) {
  const initials = (name || "Teacher")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return initials || "T";
}

function formatFee(value: number | null, period: "week" | "month") {
  if (value === null || value === undefined) {
    return null;
  }

  return `₹${value.toLocaleString("en-IN")}/${period}`;
}

export default function TeacherProfilePage() {
  const params = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    let active = true;

    async function loadTeacher() {
      setLoading(true);

      const { data, error } = await supabase
        .from("teacher_profiles")
        .select(teacherColumns)
        .eq("id", params.id)
        .eq("is_verified", true)
        .single();

      if (!active) return;

      if (error || !data) {
        setTeacher(null);
      } else {
        setTeacher(data as unknown as TeacherProfile);
      }

      setLoading(false);
    }

    void loadTeacher();

    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
        <p className="text-lg font-semibold">Loading teacher profile...</p>
      </main>
    );
  }

  if (!teacher) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
        <section className="w-full max-w-lg rounded-3xl border bg-white p-10 text-center shadow-sm">
          <h1 className="text-3xl font-bold">Teacher not found</h1>
          <p className="mt-3 text-slate-600">
            This teacher profile does not exist or is not currently verified.
          </p>
          <Link
            href="/teachers"
            className="mt-7 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Browse Teachers
          </Link>
        </section>
      </main>
    );
  }

  const subjects = teacher.subjects || [];
  const languages = teacher.languages || [];
  const weeklyFee = formatFee(teacher.fee_weekly, "week");
  const monthlyFee = formatFee(teacher.fee_monthly, "month");

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-3xl font-bold text-blue-600">
            UstaadHub
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/teachers"
              className="hidden font-medium text-slate-700 sm:block"
            >
              Find Teachers
            </Link>

            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-6 text-sm text-slate-500">
          <Link href="/teachers" className="hover:text-blue-600">
            Find Teachers
          </Link>
          <span className="mx-2">/</span>
          Teacher Profile
        </div>

        <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-10 md:px-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              {teacher.profile_photo_url ? (
                <img
                  src={teacher.profile_photo_url}
                  alt={teacher.full_name || "Teacher"}
                  className="h-32 w-32 shrink-0 rounded-full border-4 border-white object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-4 border-white bg-blue-100 text-4xl font-bold text-blue-700 shadow-lg">
                  {getInitials(teacher.full_name)}
                </div>
              )}

              <div className="text-white">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold md:text-4xl">
                    {teacher.full_name || "Teacher"}
                  </h1>

                  <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium">
                    ✓ Verified Teacher
                  </span>
                </div>

                <p className="mt-3 text-lg text-blue-100">
                  {subjects.join(" & ") || "Teacher profile"}
                </p>

                {teacher.experience && (
                  <p className="mt-4 text-sm text-blue-100">
                    {teacher.experience} of experience
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-10 p-6 md:grid-cols-3 md:p-10">
            <div className="md:col-span-2">
              <h2 className="text-2xl font-bold">About the Teacher</h2>

              <p className="mt-4 whitespace-pre-line leading-8 text-slate-600">
                {teacher.bio || "No biography has been provided."}
              </p>

              <h2 className="mt-10 text-2xl font-bold">Subjects I Teach</h2>

              <div className="mt-5 flex flex-wrap gap-3">
                {subjects.length ? (
                  subjects.map((subject) => (
                    <span
                      key={subject}
                      className="rounded-full bg-blue-50 px-4 py-2 font-medium text-blue-700"
                    >
                      {subject}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">
                    No subjects specified.
                  </span>
                )}
              </div>

              <h2 className="mt-10 text-2xl font-bold">Languages</h2>

              <div className="mt-5 flex flex-wrap gap-3">
                {languages.length ? (
                  languages.map((language) => (
                    <span
                      key={language}
                      className="rounded-lg border px-4 py-2 text-sm font-medium"
                    >
                      {language}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">
                    No languages specified.
                  </span>
                )}
              </div>
            </div>

            <aside>
              <div className="sticky top-24 rounded-2xl border bg-white p-6 shadow-lg">
                <p className="text-sm text-slate-500">Fees</p>

                <div className="mt-2 space-y-2 text-2xl font-bold">
                  {weeklyFee && <p>{weeklyFee}</p>}
                  {monthlyFee && <p>{monthlyFee}</p>}
                  {!weeklyFee && !monthlyFee && (
                    <p className="text-lg">Not specified</p>
                  )}
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Teaching mode</span>
                    <span className="text-right font-semibold">
                      {teacher.teaching_mode || "Not specified"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Experience</span>
                    <span className="text-right font-semibold">
                      {teacher.experience || "Not specified"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Languages</span>
                    <span className="text-right font-semibold">
                      {languages.length || "Not specified"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled
                  className="mt-7 w-full cursor-not-allowed rounded-xl bg-blue-600 py-4 font-bold text-white opacity-60"
                >
                  Booking unavailable
                </button>

                <button
                  type="button"
                  disabled
                  className="mt-3 w-full cursor-not-allowed rounded-xl border border-blue-600 py-4 font-bold text-blue-600 opacity-60"
                >
                  Messaging unavailable
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-slate-500">
          © 2026 UstaadHub. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
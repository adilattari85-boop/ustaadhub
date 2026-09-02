"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  if (value === null || value === undefined) return null;

  return `₹${value.toLocaleString("en-IN")}/${period}`;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All subjects");
  const [teachingMode, setTeachingMode] = useState("All modes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTeachers() {
      setLoading(true);
      setError("");

      const { data, error: queryError } = await supabase
        .from("teacher_profiles")
        .select(teacherColumns)
        .eq("is_verified", true);

      if (queryError) {
        setError("Could not load teachers. Please try again later.");
        setTeachers([]);
        setLoading(false);
        return;
      }

      setTeachers((data || []) as unknown as TeacherProfile[]);
      setLoading(false);
    }

    void loadTeachers();
  }, []);

  const subjects = useMemo(
    () =>
      Array.from(
        new Set(
          teachers.flatMap((teacher) => teacher.subjects || [])
        )
      ).sort(),
    [teachers]
  );

  const modes = useMemo(
    () =>
      Array.from(
        new Set(
          teachers
            .map((teacher) => teacher.teaching_mode)
            .filter((mode): mode is string => Boolean(mode))
        )
      ).sort(),
    [teachers]
  );

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return teachers.filter((teacher) => {
      const teacherSubjects = teacher.subjects || [];
      const searchableText = [
        teacher.full_name || "",
        teacher.bio || "",
        ...teacherSubjects,
        ...(teacher.languages || []),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesSubject =
        subject === "All subjects" ||
        teacherSubjects.includes(subject);

      const matchesMode =
        teachingMode === "All modes" ||
        teacher.teaching_mode === teachingMode;

      return matchesSearch && matchesSubject && matchesMode;
    });
  }, [search, subject, teachingMode, teachers]);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-3xl font-bold tracking-tight text-blue-600"
          >
            UstaadHub
          </Link>

          <nav className="hidden gap-10 md:flex">
            <Link
              href="/teachers"
              className="font-medium text-blue-600"
            >
              Find Teachers
            </Link>
            <Link
              href="/#subjects"
              className="font-medium text-slate-700 hover:text-blue-600"
            >
              Subjects
            </Link>
            <Link
              href="/#how"
              className="font-medium text-slate-700 hover:text-blue-600"
            >
              How It Works
            </Link>
          </nav>

          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="hidden font-medium text-slate-800 sm:block"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Join as Teacher
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-b from-blue-50 to-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="max-w-3xl">
            <p className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-2 font-medium text-blue-700">
              Find your perfect teacher
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              Find the Right{" "}
              <span className="text-blue-600">Teacher</span>
            </h1>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Learn from verified teachers for Quran, Islamic Studies,
              Arabic, languages and more.
            </p>
          </div>

          <div className="mt-10 grid max-w-5xl gap-3 rounded-2xl bg-white p-3 shadow-lg md:grid-cols-[1fr_auto_auto]">
            <input
              type="search"
              placeholder="Search by teacher, subject or language..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded-xl border border-slate-200 px-5 py-4 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-blue-500"
            >
              <option>All subjects</option>
              {subjects.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={teachingMode}
              onChange={(event) => setTeachingMode(event.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-blue-500"
            >
              <option>All modes</option>
              {modes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Available Teachers
          </h2>

          {!loading && !error && (
            <p className="mt-1 text-slate-500">
              {filteredTeachers.length} teacher
              {filteredTeachers.length === 1 ? "" : "s"} found
            </p>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-900">
              Loading teachers...
            </p>
            <p className="mt-2 text-slate-500">
              Finding verified teachers for you.
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
            <h3 className="text-xl font-semibold text-red-900">
              Unable to load teachers
            </h3>
            <p className="mt-2 text-red-700">{error}</p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">
              {teachers.length === 0
                ? "No verified teachers available"
                : "No teachers found"}
            </h3>
            <p className="mt-2 text-slate-500">
              {teachers.length === 0
                ? "Please check back soon as more teachers join UstaadHub."
                : "Try another name, subject, language or teaching mode."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTeachers.map((teacher) => {
              const weeklyFee = formatFee(teacher.fee_weekly, "week");
              const monthlyFee = formatFee(teacher.fee_monthly, "month");

              return (
                <article
                  key={teacher.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-4">
                      {teacher.profile_photo_url ? (
                        <img
                          src={teacher.profile_photo_url}
                          alt={teacher.full_name || "Teacher"}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                          {getInitials(teacher.full_name)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-bold text-slate-900">
                          {teacher.full_name || "Ustaad"}
                        </h3>

                        <span className="mt-1 inline-flex rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                          ✓ Verified
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {(teacher.subjects || []).map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 space-y-3 border-t pt-5 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Experience</span>
                        <span className="text-right font-semibold text-slate-800">
                          {teacher.experience || "Not specified"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Languages</span>
                        <span className="text-right font-semibold text-slate-800">
                          {(teacher.languages || []).join(", ") ||
                            "Not specified"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Teaching mode</span>
                        <span className="text-right font-semibold text-slate-800">
                          {teacher.teaching_mode || "Not specified"}
                        </span>
                      </div>

                      {(weeklyFee || monthlyFee) && (
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Fees</span>
                          <span className="text-right font-semibold text-slate-800">
                            {[weeklyFee, monthlyFee]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/teachers/${teacher.id}`}
                      className="mt-6 block w-full rounded-xl border border-blue-600 py-3 text-center font-semibold text-blue-600 transition hover:bg-blue-600 hover:text-white"
                    >
                      View Profile
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type TeacherProfile = {
  id: string;
  full_name: string | null;
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
  "id, full_name, subjects, experience, languages, teaching_mode, fee_weekly, fee_monthly, profile_photo_url, is_verified";

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

const categories = [
  ["📖", "Quran & Tajweed"],
  ["🌙", "Hifz-ul-Quran"],
  ["🕌", "Islamic Studies"],
  ["🕋", "Dua & Salah"],
  ["📚", "Arabic"],
  ["🇬🇧", "English"],
  ["🇮🇳", "Hindi"],
  ["📝", "Urdu"],
];

const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 10000;

export default function Home() {
  const [featuredTeachers, setFeaturedTeachers] = useState<TeacherProfile[]>(
    [],
  );
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
const [showCourseList, setShowCourseList] = useState(false);

const courses = [
  "Madni Qaida / Nazra Course",
   "Darse Nizami/aalim course",
  "Qaida Teacher Course",
  "Teacher Nazra Course",
  "Hifz-e-Quran",
  "Tajweed-o-Quran",
  "Husn-e-Quran Course",
  "Tafseer-e-Noor",
  "Hifz 40 Hadith",
  "Hadith Course",
  "Tafseer-e-Quran",
  "Farz Uloom",
  "Arabic",
  "English",
  "Hindi",
  "Urdu",
];

const filteredCourses = courses.filter((course) =>
  course.toLowerCase().includes(courseSearch.toLowerCase())
);

function selectCourse(course: string) {
  window.location.href = `/requirement?course=${encodeURIComponent(course)}`;
}

  useEffect(() => {
    let isMounted = true;

    async function loadFeaturedTeachers() {
      setTeachersLoading(true);
      setTeachersError("");

      let lastError: unknown = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (!isMounted) {
          return;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT,
        );

        try {
          const { data, error } = await supabase
            .from("teacher_profiles")
            .select(teacherColumns)
            .eq("is_verified", true)
            .limit(3)
            .abortSignal(controller.signal);

          window.clearTimeout(timeoutId);

          if (error) {
            throw error;
          }

          if (!isMounted) {
            return;
          }

          setFeaturedTeachers((data || []) as unknown as TeacherProfile[]);
          setTeachersError("");
          setTeachersLoading(false);
          return;
        } catch (error) {
          window.clearTimeout(timeoutId);
          lastError = error;

          if (attempt < MAX_RETRIES) {
            await new Promise((resolve) =>
              window.setTimeout(resolve, 500 * attempt),
            );
          }
        }
      }

      if (!isMounted) {
        return;
      }

      console.error("Unable to load featured teachers:", lastError);
      setFeaturedTeachers([]);
      setTeachersError(
        "Unable to load featured teachers. Please refresh the page and try again.",
      );
      setTeachersLoading(false);
    }

    void loadFeaturedTeachers();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="#" className="text-2xl font-bold text-blue-700">
            UstaadHub
          </a>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#teachers" className="text-gray-700 hover:text-blue-700">
              Find Teachers
            </a>
            <a href="#subjects" className="text-gray-700 hover:text-blue-700">
              Subjects
            </a>
            <a href="#how" className="text-gray-700 hover:text-blue-700">
              How It Works
            </a>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/login"
              className="rounded-lg px-4 py-2 font-medium hover:bg-gray-100"
            >
              Login
            </a>

            <a
              href="/register"
              className="rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800"
            >
              Join as Teacher
            </a>
          </div>
        </div>
      </nav>
 <section className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-2 md:items-center md:py-28">
      {/* HERO */}
  <div>

            <div className="mb-6 inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              ✨ Learn from trusted teachers
            </div>

            <h1 className="text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Find the right
              <span className="text-blue-700"> Ustaad </span>
              for you.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600">
              Learn Quran, Islamic Studies, Arabic, languages and more from
              experienced teachers through personalised one-to-one online
              classes.
            </p>

            {/* COURSE SEARCH */}
            <div className="mt-8 max-w-4xl">
              <div className="rounded-2xl bg-white p-3 shadow-xl ring-1 ring-gray-200 sm:p-4">

                <div className="flex flex-col gap-3 sm:flex-row">

                  {/* SEARCH INPUT + COURSE DROPDOWN */}
                  <div className="relative min-w-0 flex-1">

                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400">
                        🔍
                      </span>

                      <input
                        type="text"
                        value={courseSearch}
                        onChange={(e) => {
                          setCourseSearch(e.target.value);
                          setShowCourseList(true);
                        }}
                        onFocus={() => setShowCourseList(true)}
                        placeholder="Search a course or subject..."
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-4 pl-12 pr-4 text-base outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:text-lg"
                      />
                    </div>

                    {/* COURSE SUGGESTIONS */}
                    {showCourseList && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">

                        <div className="border-b bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600">
                          {courseSearch.trim()
                            ? "Matching courses"
                            : "Popular courses"}
                        </div>

                        <div className="max-h-64 overflow-y-auto p-2">

                          {filteredCourses.length > 0 ? (
                            filteredCourses.map((course) => (
                              <button
                                key={course}
                                type="button"
                                onClick={() => {
                                  selectCourse(course);
                                  setShowCourseList(false);
                                }}
                                className="flex w-full items-center rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-800 transition hover:bg-blue-50 hover:text-blue-700 sm:text-base"
                              >
                                <span className="mr-3 text-lg">
                                  📚
                                </span>

                                <span className="min-w-0 flex-1 truncate">
                                  {course}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-6 text-center text-sm text-gray-500">
                              No matching course found.
                            </div>
                          )}

                        </div>
                      </div>
                    )}

                  </div>

                  {/* SEARCH BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      if (filteredCourses.length > 0) {
                        selectCourse(filteredCourses[0]);
                        setShowCourseList(false);
                      }
                    }}
                    disabled={filteredCourses.length === 0}
                    className="w-full rounded-xl bg-blue-700 px-7 py-4 text-base font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:text-lg"
                  >
                    Search Courses
                  </button>

                </div>

                {/* POPULAR COURSES */}
                <div className="mt-3 flex flex-wrap items-center gap-2 px-1 text-sm">

                  <span className="font-semibold text-gray-500">
                    Popular:
                  </span>

                  {[
                    "Quran & Tajweed",
                    "Hifz-ul-Quran",
                    "Arabic",
                    "English",
                  ].map((course) => (
                    <button
                      key={course}
                      type="button"
                      onClick={() => {
                        selectCourse(course);
                        setShowCourseList(false);
                      }}
                      className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {course}
                    </button>
                  ))}

                </div>

              </div>
            </div>

            {/* REQUIREMENT BUTTON */}
            <div className="mt-5">
              <a
                href="/requirement"
                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-blue-800 sm:text-lg"
              >
                📝 Post Your Learning Requirement
              </a>

              <p className="mt-3 text-sm text-gray-500">
                Tell us what you want to learn — we&apos;ll help you find the
                right teacher.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              <span>✓ One-to-one classes</span>
              <span>✓ Flexible timings</span>
              <span>✓ Experienced teachers</span>
            </div>

          </div>
          {/* HERO CARD */}
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-3xl bg-white p-5 shadow-2xl">
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center text-white">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white text-4xl font-bold text-blue-700 shadow-lg">
                  U
                </div>

                <h2 className="mt-6 text-2xl font-bold">
                  Your learning journey starts here
                </h2>

                <p className="mt-3 text-blue-100">
                  Connect with the right teacher for your goals.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3">
                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <div className="text-xl font-bold text-blue-700">1:1</div>
                  <div className="mt-1 text-xs text-gray-500">Classes</div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <div className="text-xl font-bold text-blue-700">100+</div>
                  <div className="mt-1 text-xs text-gray-500">Teachers</div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <div className="text-xl font-bold text-blue-700">24/7</div>
                  <div className="mt-1 text-xs text-gray-500">Learning</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="subjects" className="py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="text-center">
            <p className="font-semibold text-blue-700">EXPLORE SUBJECTS</p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              What do you want to learn?
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              Choose a subject and discover teachers who can help you learn at
              your own pace.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.map(([icon, title]) => (
              <div
                key={title}
                className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
              >
                <div className="text-4xl">{icon}</div>

                <h3 className="mt-4 font-bold">{title}</h3>

                <p className="mt-2 text-sm text-gray-500">
                  Find a teacher →
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED TEACHERS */}
      <section id="teachers" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-semibold text-blue-700">
                FEATURED TEACHERS
              </p>

              <h2 className="mt-2 text-3xl font-bold md:text-4xl">
                Learn from experienced teachers
              </h2>

              <p className="mt-3 text-gray-600">
                Discover verified teachers based on their expertise and fees.
              </p>
            </div>

            <Link
              href="/teachers"
              className="w-fit rounded-lg font-semibold text-blue-700 hover:text-blue-900"
            >
              View all teachers →
            </Link>
          </div>

          {teachersLoading ? (
            <div className="mt-10 rounded-2xl bg-white p-12 text-center shadow-sm">
              Loading verified teachers...
            </div>
          ) : teachersError ? (
            <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-12 text-center text-red-700">
              {teachersError}
            </div>
          ) : featuredTeachers.length === 0 ? (
            <div className="mt-10 rounded-2xl bg-white p-12 text-center shadow-sm">
              No verified teachers available yet.
            </div>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {featuredTeachers.map((teacher) => {
                const weeklyFee = formatFee(teacher.fee_weekly, "week");
                const monthlyFee = formatFee(teacher.fee_monthly, "month");

                return (
                  <div
                    key={teacher.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="flex items-center gap-4 p-6">
                      {teacher.profile_photo_url ? (
                        <img
                          src={teacher.profile_photo_url}
                          alt={teacher.full_name || "Teacher"}
                          className="h-20 w-20 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                          {getInitials(teacher.full_name)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold">
                          {teacher.full_name || "Ustaad"}
                        </h3>

                        <p className="mt-1 text-sm text-blue-700">
                          {(teacher.subjects || []).slice(0, 2).join(" & ") ||
                            "Subjects not specified"}
                        </p>

                        <span className="mt-2 inline-block rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                          ✓ Verified
                        </span>
                      </div>
                    </div>

                    <div className="border-t px-6 py-5">
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-gray-500">Experience</span>
                        <span className="text-right font-semibold">
                          {teacher.experience || "Not specified"}
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between gap-4 text-sm">
                        <span className="text-gray-500">Teaching mode</span>
                        <span className="text-right font-semibold">
                          {teacher.teaching_mode || "Not specified"}
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between gap-4 text-sm">
                        <span className="text-gray-500">Languages</span>
                        <span className="text-right font-semibold">
                          {(teacher.languages || []).join(", ") ||
                            "Not specified"}
                        </span>
                      </div>

                      {(weeklyFee || monthlyFee) && (
                        <div className="mt-3 flex justify-between gap-4 text-sm">
                          <span className="text-gray-500">Fees</span>
                          <span className="text-right font-semibold">
                            {[weeklyFee, monthlyFee]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                      )}

                      <div className="mt-5 flex items-center justify-end">
                        <Link
                          href={`/teachers/${teacher.id}`}
                          className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800"
                        >
                          View Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center">
            <p className="font-semibold text-blue-700">SIMPLE PROCESS</p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              How UstaadHub works
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              [
                "01",
                "Choose what to learn",
                "Select Quran, Arabic, languages, Islamic Studies or another subject.",
              ],
              [
                "02",
                "Find your teacher",
                "Explore teacher profiles, experience, ratings and fees.",
              ],
              [
                "03",
                "Start learning",
                "Choose a suitable time and begin your personalised classes.",
              ],
            ].map(([number, title, description]) => (
              <div key={number} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-700 text-xl font-bold text-white">
                  {number}
                </div>

                <h3 className="mt-5 text-xl font-bold">{title}</h3>

                <p className="mt-3 leading-7 text-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-6 pb-16">
  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-6 py-16 text-center shadow-xl md:px-12 md:py-20">
    {/* Decorative background */}
    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
    <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />

    <div className="relative mx-auto max-w-3xl">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
        Start Learning Today
      </p>

      <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
        Find the Right Teacher for You
      </h2>

      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-blue-50 md:text-xl">
        Book a demo class and experience the right learning approach
        before you decide.
      </p>

      <a
        href="/requirement"
        className="mt-9 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-1 hover:bg-green-700 hover:shadow-xl"
      >
        🎓 Book a Demo Class
      </a>

      <p className="mt-4 text-sm text-blue-100">
        Tell us what you want to learn — we’ll help you find the right teacher.
      </p>
    </div>
  </div>
</section>

      {/* FOOTER */}
      <footer className="mt-10 border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
          <div>© 2026 UstaadHub. All rights reserved.</div>

          <div className="flex gap-6">
            <span className="cursor-pointer hover:text-blue-700">About</span>
            <span className="cursor-pointer hover:text-blue-700">
              Contact
            </span>
            <span className="cursor-pointer hover:text-blue-700">
              Privacy
            </span>
            <span className="cursor-pointer hover:text-blue-700">Terms</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
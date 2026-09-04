"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type TeacherProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  qualification: string | null;
  city_location: string | null;
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

type TeacherFilter = "All" | "Pending Verification" | "Verified";

const teacherColumns =
  "id, full_name, email, phone, gender, qualification, city_location, bio, subjects, experience, languages, teaching_mode, fee_weekly, fee_monthly, profile_photo_url, is_verified";

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
    return "Not specified";
  }

  return `₹${value.toLocaleString("en-IN")}/${period}`;
}

export default function AdminTeachersPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authenticating, setAuthenticating] = useState(true);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [filter, setFilter] = useState<TeacherFilter>("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  async function loadTeachers() {
    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("teacher_profiles")
      .select(teacherColumns)
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("TEACHER LOAD ERROR:", queryError);

      setError(
        `Could not load teacher profiles: ${queryError.message}`
      );
      setTeachers([]);
      setLoading(false);
      return;
    }

    setTeachers((data || []) as unknown as TeacherProfile[]);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function authorizeAndLoad() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (active) {
          setAuthenticating(false);
        }
        return;
      }

      const { data: admin, error: adminError } =
        await supabase.rpc("is_admin");

      if (adminError || !admin) {
        if (active) {
          setError("Unauthorized");
          setAuthenticating(false);
        }
        return;
      }

      if (active) {
        setIsAuthorized(true);
        setAuthenticating(false);
      }

      await loadTeachers();
    }

    void authorizeAndLoad();

    return () => {
      active = false;
    };
  }, []);

  async function updateTeacherVerification(teacher: TeacherProfile) {
    const nextVerifiedState = !teacher.is_verified;

    setActionId(teacher.id);
    setError("");
    setSuccess("");

    const { data, error: updateError } = await supabase.rpc(
      "admin_set_teacher_verification",
      {
        p_teacher_id: teacher.id,
        p_is_verified: nextVerifiedState,
      }
    );

    if (updateError) {
      setError(updateError.message);
      setActionId(null);
      return;
    }

    if (data !== true) {
      setError("Teacher verification could not be updated.");
      setActionId(null);
      return;
    }

    setTeachers((current) =>
      current.map((item) =>
        item.id === teacher.id
          ? {
              ...item,
              is_verified: nextVerifiedState,
            }
          : item
      )
    );

    setSuccess(
      nextVerifiedState
        ? "Teacher verified successfully."
        : "Teacher marked as unverified."
    );

    setActionId(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  }

  const filteredTeachers = useMemo(() => {
    if (filter === "Pending Verification") {
      return teachers.filter((teacher) => !teacher.is_verified);
    }

    if (filter === "Verified") {
      return teachers.filter((teacher) => teacher.is_verified);
    }

    return teachers;
  }, [filter, teachers]);

  if (authenticating) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-slate-900">
        <p className="text-lg font-semibold">
          Verifying admin access...
        </p>
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-slate-900">
        <section className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold">
            Unauthorized
          </h1>

          <p className="mt-3 text-slate-600">
            You must be an authorized administrator to view teacher profiles.
          </p>

          <Link
            href="/admin/login"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Admin Login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">

      {/* HEADER */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">

          <div>
            <Link
              href="/"
              className="text-2xl font-bold text-blue-700"
            >
              UstaadHub
            </Link>

            <p className="text-sm text-slate-500">
              Teacher Verification
            </p>
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
              onClick={handleLogout}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Logout
            </button>

          </div>
        </div>
      </header>

      {/* MAIN */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">

        <div className="mb-8">
          <p className="font-semibold text-blue-600">
            ADMIN PANEL
          </p>

          <h1 className="mt-1 text-3xl font-bold md:text-4xl">
            Teacher Verification
          </h1>

          <p className="mt-2 text-slate-600">
            Review complete teacher information before approving verification.
          </p>
        </div>

        {/* SUCCESS */}
        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* FILTERS */}
        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              "All",
              "Pending Verification",
              "Verified",
            ] as TeacherFilter[]
          ).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                filter === item
                  ? "bg-blue-600 text-white"
                  : "border bg-white hover:bg-slate-50"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* TEACHERS */}
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">

          {loading ? (
            <div className="p-12 text-center">
              <p className="text-lg font-semibold">
                Loading teacher profiles...
              </p>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="p-12 text-center">

              <div className="text-4xl">
                👨‍🏫
              </div>

              <h2 className="mt-4 text-xl font-bold">
                No teacher profiles found
              </h2>

              <p className="mt-2 text-slate-500">
                No profiles match the selected filter.
              </p>

            </div>
          ) : (
            <div className="divide-y">

              {filteredTeachers.map((teacher) => (

                <article
                  key={teacher.id}
                  className="p-5 sm:p-6"
                >

                  {/* TOP PROFILE */}
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                    <div className="flex min-w-0 gap-4">

                      {/* PHOTO */}
                      {teacher.profile_photo_url ? (
                        <img
                          src={teacher.profile_photo_url}
                          alt={teacher.full_name || "Teacher"}
                          className="h-20 w-20 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                          {getInitials(teacher.full_name)}
                        </div>
                      )}

                      <div className="min-w-0">

                        <h2 className="text-xl font-bold">
                          {teacher.full_name || "Unnamed teacher"}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Teacher ID: {teacher.id}
                        </p>

                      </div>
                    </div>

                    {/* STATUS + ACTION */}
                    <div className="flex flex-wrap items-center gap-3">

                      <span
                        className={`rounded-full px-4 py-2 text-xs font-bold ${
                          teacher.is_verified
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {teacher.is_verified
                          ? "✓ Verified"
                          : "Pending verification"}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          void updateTeacherVerification(teacher)
                        }
                        disabled={actionId === teacher.id}
                        className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                          teacher.is_verified
                            ? "bg-orange-600 hover:bg-orange-700"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {actionId === teacher.id
                          ? "Saving..."
                          : teacher.is_verified
                          ? "Unverify"
                          : "Verify Teacher"}
                      </button>

                    </div>
                  </div>

                  {/* COMPLETE DETAILS */}
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">

                    <div className="mb-4">
                      <h3 className="text-lg font-bold">
                        Teacher Details
                      </h3>

                      <p className="text-sm text-slate-500">
                        Review these details before verification.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                      {/* FULL NAME */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Full Name
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {teacher.full_name || "Not specified"}
                        </p>
                      </div>

                      {/* EMAIL */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Email
                        </p>
                        <p className="mt-1 break-all font-semibold text-slate-900">
                          {teacher.email || "Not specified"}
                        </p>
                      </div>

                      {/* PHONE */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Phone
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {teacher.phone || "Not specified"}
                        </p>
                      </div>

                      {/* GENDER */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Gender
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {teacher.gender || "Not specified"}
                        </p>
                      </div>

                      {/* QUALIFICATION */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Qualification
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {teacher.qualification || "Not specified"}
                        </p>
                      </div>

                      {/* CITY */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          City / Location
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {teacher.city_location || "Not specified"}
                        </p>
                      </div>

                      {/* EXPERIENCE */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Experience
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {teacher.experience || "Not specified"}
                        </p>
                      </div>

                      {/* TEACHING MODE */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Teaching Mode
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {teacher.teaching_mode || "Not specified"}
                        </p>
                      </div>

                      {/* LANGUAGES */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Languages
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {(teacher.languages || []).join(", ") ||
                            "Not specified"}
                        </p>
                      </div>

                      {/* WEEKLY FEE */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Weekly Fee
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {formatFee(
                            teacher.fee_weekly,
                            "week"
                          )}
                        </p>
                      </div>

                      {/* MONTHLY FEE */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Monthly Fee
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {formatFee(
                            teacher.fee_monthly,
                            "month"
                          )}
                        </p>
                      </div>

                    </div>

                    {/* SUBJECTS */}
                    <div className="mt-5 border-t border-slate-200 pt-5">

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Subjects / Courses
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">

                        {(teacher.subjects || []).length > 0 ? (
                          teacher.subjects!.map((subject) => (
                            <span
                              key={subject}
                              className="rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700"
                            >
                              {subject}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">
                            Not specified
                          </span>
                        )}

                      </div>
                    </div>

                    {/* BIO */}
                    <div className="mt-5 border-t border-slate-200 pt-5">

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        About / Biography
                      </p>

                      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">
                        {teacher.bio ||
                          "No biography provided."}
                      </p>

                    </div>

                  </div>

                </article>

              ))}

            </div>
          )}

        </div>

      </section>
    </main>
  );
}
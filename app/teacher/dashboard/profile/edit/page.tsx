"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Same option lists as the teacher registration form (app/register/page.tsx).
const subjectOptions = [
  "Quran & Tajweed",
  "Hifz-ul-Quran",
  "Islamic Studies",
  "Arabic",
  "English",
  "Hindi",
  "Urdu",
  "Maths",
  "Science",
  "Computer",
];

const languageOptions = ["Hindi", "Urdu", "English", "Arabic"];

const experienceOptions = [
  "Less than 1 year",
  "1–3 years",
  "3–5 years",
  "5–10 years",
  "10+ years",
];

const teachingModeOptions = ["Online", "Offline", "Both"];

type EditableProfile = {
  full_name: string | null;
  bio: string | null;
  subjects: string[] | null;
  languages: string[] | null;
  experience: string | null;
  teaching_mode: string | null;
  fee_monthly: number | null;
};

export default function EditTeacherProfilePage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [teachingMode, setTeachingMode] = useState("Online");
  const [feeMonthly, setFeeMonthly] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user || user.user_metadata?.role !== "teacher") {
        router.replace("/login?role=teacher");
        return;
      }

      try {
        // Same identity pattern as the dashboard: teacher_profiles.user_id = auth.uid()
        const { data, error } = await supabase
          .from("teacher_profiles")
          .select(
            "full_name, bio, subjects, languages, experience, teaching_mode, fee_monthly"
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          if (active) {
            setLoadError(
              "No teacher profile is linked to this account. Please contact support."
            );
          }
          return;
        }

        const row = data as EditableProfile;

        if (active) {
          setFullName(row.full_name || "");
          setBio(row.bio || "");
          setSubjects(row.subjects || []);
          setLanguages(row.languages || []);
          setExperience(row.experience || "");
          setTeachingMode(row.teaching_mode || "Online");
          setFeeMonthly(
            row.fee_monthly === null || row.fee_monthly === undefined
              ? ""
              : String(row.fee_monthly)
          );
        }
      } catch (error) {
        console.error("Profile load error:", error);
        if (active) {
          setLoadError(
            "Unable to load your profile right now. Please try again later."
          );
        }
      } finally {
        if (active) {
          setAuthChecked(true);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  function toggleItem(
    item: string,
    list: string[],
    setter: (value: string[]) => void
  ) {
    if (list.includes(item)) {
      setter(list.filter((entry) => entry !== item));
    } else {
      setter([...list, item]);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaveError("");

    if (!fullName.trim()) {
      setSaveError("Please enter your full name.");
      return;
    }

    if (subjects.length === 0) {
      setSaveError("Please select at least one subject.");
      return;
    }

    if (languages.length === 0) {
      setSaveError("Please select at least one language.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.rpc("update_teacher_profile", {
        p_full_name: fullName.trim(),
        p_bio: bio.trim() || null,
        p_subjects: subjects,
        p_languages: languages,
        p_experience: experience || null,
        p_teaching_mode: teachingMode || null,
        p_fee_monthly: feeMonthly ? Number(feeMonthly) : null,
      });

      if (error) {
        throw error;
      }

      router.push("/teacher/dashboard");
    } catch (error) {
      console.error("Profile save error:", error);
      setSaveError(
        error instanceof Error && error.message
          ? error.message
          : "Unable to save your profile. Please try again."
      );
      setSaving(false);
    }
  }
  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <section className="px-6 py-14">
          <div className="mx-auto max-w-3xl">Loading your profile...</div>
        </section>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <section className="px-6 py-14">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {loadError}
            </div>

            <Link
              href="/teacher/dashboard"
              className="mt-6 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
          <Link
            href="/teacher/dashboard"
            className="text-2xl font-bold text-blue-600 sm:text-3xl"
          >
            UstaadHub
          </Link>

          <Link
            href="/teacher/dashboard"
            className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 sm:px-4 sm:py-2 sm:text-base"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="font-semibold text-blue-600">TEACHER DASHBOARD</p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Edit Profile</h1>

          <p className="mt-3 text-slate-600">
            Update your public teacher profile. Changes appear on your public
            page after saving.
          </p>

          {saveError && (
            <div
              aria-live="polite"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {saveError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            {/* PROFILE DETAILS */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                1. Profile Details
              </h2>

              <div className="mt-6">
                <label
                  htmlFor="full_name"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Full Name *
                </label>

                <input
                  id="full_name"
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  type="text"
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="mt-6">
                <label
                  htmlFor="bio"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Introduction
                </label>

                <textarea
                  id="bio"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={7}
                  placeholder="Tell students about your teaching experience, teaching style and what makes your classes special..."
                  className="w-full resize-none rounded-xl border px-4 py-3 leading-7 outline-none focus:border-blue-500"
                />
              </div>
            </div>


            {/* SUBJECTS & LANGUAGES */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                2. Subjects &amp; Languages
              </h2>

              <div className="mt-6">
                <span className="block text-sm font-semibold text-slate-900">
                  Subjects you teach *
                </span>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {subjectOptions.map((subject) => (
                    <label
                      key={subject}
                      className={`cursor-pointer rounded-xl border p-3 text-sm text-slate-900 ${
                        subjects.includes(subject)
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={subjects.includes(subject)}
                        onChange={() =>
                          toggleItem(subject, subjects, setSubjects)
                        }
                      />

                      {subject}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-7">
                <span className="block text-sm font-semibold text-slate-900">
                  Languages you can teach in *
                </span>

                <div className="mt-3 flex flex-wrap gap-3">
                  {languageOptions.map((language) => (
                    <label
                      key={language}
                      className={`cursor-pointer rounded-xl border px-4 py-3 text-sm text-slate-900 ${
                        languages.includes(language)
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={languages.includes(language)}
                        onChange={() =>
                          toggleItem(language, languages, setLanguages)
                        }
                      />

                      {language}
                    </label>
                  ))}
                </div>
              </div>
            </div>


            {/* CLASSES & FEES */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                3. Classes &amp; Fees
              </h2>

              <div className="mt-6">
                <span className="block text-sm font-semibold text-slate-900">
                  Teaching Mode
                </span>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {teachingModeOptions.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setTeachingMode(item)}
                      className={`rounded-xl border p-4 font-medium text-slate-900 ${
                        teachingMode === item
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "hover:border-blue-300"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="experience"
                    className="mb-2 block text-sm font-semibold text-slate-900"
                  >
                    Teaching Experience
                  </label>

                  <select
                    id="experience"
                    value={experience}
                    onChange={(event) => setExperience(event.target.value)}
                    className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">Select experience</option>

                    {experienceOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="fee_monthly"
                    className="mb-2 block text-sm font-semibold text-slate-900"
                  >
                    Monthly Fee (₹)
                  </label>

                  <input
                    id="fee_monthly"
                    value={feeMonthly}
                    onChange={(event) => setFeeMonthly(event.target.value)}
                    type="number"
                    min="0"
                    placeholder="e.g. 3000"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <Link
                href="/teacher/dashboard"
                aria-label="Cancel profile edit"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}


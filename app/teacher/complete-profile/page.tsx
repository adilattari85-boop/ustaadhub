"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchTeacherProfileId } from "@/lib/teacherProfile";
import {
  EXPERIENCE_LABELS,
  GENDER_OPTIONS,
  TEACHER_LANGUAGES,
  TEACHER_SUBJECTS,
  parseFeeInput,
  validateTeacherProfileFields,
} from "@/lib/teacherForm";

// Recovery flow for orphaned teacher accounts.
//
// A teacher account is "orphaned" when the Auth metadata says role="teacher" but
// no row exists in public.teacher_profiles (for example when the original signup
// could not confirm the email, or the profile RPC failed). Such a user is sent
// here instead of the dashboard so they can finish onboarding WITHOUT creating a
// second Auth account: no signUp(), no password fields, no new email.
//
// The profile is only ever created through the existing create_teacher_profile
// RPC — never with a direct insert from the browser.
//
// Gender and qualification are READ-ONLY here. The RPC derives both from
// auth.users.raw_user_meta_data (the values captured during teacher
// registration) and has no parameters for them, so letting the teacher edit
// them would silently discard the edit. Accounts whose metadata is missing or
// invalid are blocked before the form is shown, because no submission from this
// page could ever save those fields.

type ScreenState = "checking" | "form" | "blocked" | "already-complete" | "done";

// Shared header matching the register/login page branding.
function PageHeader() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-3xl font-bold text-blue-600">
          UstaadHub
        </Link>

        <Link
          href="/login?role=teacher"
          className="rounded-lg border px-4 py-2 font-medium transition hover:bg-slate-50"
        >
          Teacher Login
        </Link>
      </div>
    </header>
  );
}

export default function CompleteTeacherProfile() {
  const router = useRouter();

  const [screen, setScreen] = useState<ScreenState>("checking");
  const [blockReason, setBlockReason] = useState("");
  const [accountEmail, setAccountEmail] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [mode, setMode] = useState("Online");
  const [feeWeekly, setFeeWeekly] = useState("");
  const [feeMonthly, setFeeMonthly] = useState("");
  const [bio, setBio] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submittingRef = useRef(false);
  const redirectTimerRef = useRef<number | null>(null);

  // Kept in a ref so the account-loading effect has no extra dependencies and
  // can report whether the fields still hold the prefilled registration values.
  const prefillRef = useRef({
    name: "",
    phone: "",
    gender: "",
    qualification: "",
  });

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      // Missing session: send the user to the teacher login. No account is
      // created and nothing is deleted.
      if (userError || !user) {
        if (active) {
          setBlockReason(
            userError?.message ||
              "Your session is not available. Please sign in with your teacher account and try again."
          );
          setScreen("blocked");
        }

        router.replace("/login?role=teacher");
        return;
      }

      // Only teacher accounts may complete a teacher profile.
      if (user.user_metadata?.role !== "teacher") {
        if (active) {
          setBlockReason(
            "This account is not a teacher account. Please sign in with your teacher account to complete a teacher profile."
          );
          setScreen("blocked");
        }

        router.replace("/login?role=teacher");
        return;
      }

      // Prefill whatever the original registration already stored in Auth
      // metadata, so the teacher only fills in what is genuinely missing.
      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const metadataName =
        typeof metadata.name === "string" ? metadata.name : "";
      const metadataPhone =
        typeof metadata.phone === "string" ? metadata.phone : "";
      const metadataGender =
        typeof metadata.gender === "string" &&
        GENDER_OPTIONS.includes(metadata.gender)
          ? metadata.gender
          : "";
      const metadataQualification =
        typeof metadata.qualification === "string"
          ? metadata.qualification
          : "";

      // City / Location was never part of the teacher registration metadata, so
      // there is normally nothing to prefill here. It is read only if a value is
      // ever present — an empty string is used otherwise, never an invented one.
      const metadataCity =
        typeof metadata.city === "string" ? metadata.city : "";

      // gender/qualification are read-only on this page and are read by the RPC
      // from Auth metadata, so missing or invalid registration data would produce
      // a form that can never be saved. Detect that before rendering the form.
      // (metadataGender is already "" unless it matches GENDER_OPTIONS.)
      const qualificationValid = metadataQualification.trim().length >= 2;

      if (active) {
        prefillRef.current = {
          name: metadataName,
          phone: metadataPhone,
          gender: metadataGender,
          qualification: metadataQualification,
        };

        setAccountEmail(user.email ?? "");
      }

      // teacher_profiles.user_id is UNIQUE, so a successful lookup tells us
      // exactly whether this account already has a profile.
      const { profileId, error: lookupError } = await fetchTeacherProfileId(
        user.id
      );

      if (lookupError) {
        if (active) {
          setBlockReason(
            "We could not check whether your teacher profile exists: " +
              lookupError +
              " Please retry, or contact support if this keeps happening."
          );
          setScreen("blocked");
        }

        return;
      }

      // Profile already exists: there is nothing to complete.
      if (profileId) {
        if (active) {
          setScreen("already-complete");
        }

        router.replace("/teacher/dashboard");
        return;
      }

      // Registration data is missing/invalid: the read-only fields below could
      // never be filled in or corrected here, so block instead of showing a form
      // that can never save. create_teacher_profile is NOT called.
      if (!metadataGender || !qualificationValid) {
        if (active) {
          setBlockReason(
            "Your original teacher registration is missing required information. Please contact support to complete your profile."
          );
          setScreen("blocked");
        }

        return;
      }

      if (active) {
        setName(metadataName);
        setPhone(metadataPhone);
        setGender(metadataGender);
        setCity(metadataCity);
        setQualification(metadataQualification);
        setScreen("form");
      }
    }

    void loadAccount();

    return () => {
      active = false;
    };
  }, [router]);

  // Clear a pending redirect if the teacher leaves the page first.
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  function toggleItem(
    item: string,
    list: string[],
    setter: (value: string[]) => void
  ) {
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  }

  // Called only once the profile exists. It blocks further submissions and
  // redirects to the dashboard.
  function finishAndRedirect(
    nextScreen: "done" | "already-complete",
    delayMs: number
  ) {
    submittingRef.current = true;
    setLoading(false);
    setScreen(nextScreen);

    if (redirectTimerRef.current !== null) {
      window.clearTimeout(redirectTimerRef.current);
    }

    redirectTimerRef.current = window.setTimeout(() => {
      router.replace("/teacher/dashboard");
    }, delayMs);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Prevent duplicate submissions while a request is in flight.
    if (submittingRef.current) {
      return;
    }

    setError("");

    // -------------------------
    // 1. VALIDATION
    // Runs before any network request. This flow has no password fields, so
    // only the profile rules are applied — the same rules (not weaker) as the
    // teacher registration form.
    // -------------------------

    const validationError = validateTeacherProfileFields({
      name,
      phone,
      city,
      gender,
      qualification,
      experience,
      subjects: selectedSubjects,
      languages: selectedLanguages,
      feeWeekly,
      feeMonthly,
      bio,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    let completed = false;

    try {
      // -------------------------
      // 2. RE-CHECK THE SESSION
      // The RPC relies on auth.uid(), so the session must still be valid.
      // -------------------------

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setError(
          "Your session is no longer available. Please sign in again and retry — your account already exists, so you do not need to register again."
        );
        return;
      }

      if (session.user.user_metadata?.role !== "teacher") {
        setError(
          "This account is not a teacher account, so a teacher profile cannot be created."
        );
        return;
      }

      // -------------------------
      // 3. RE-CHECK FOR AN EXISTING PROFILE
      // Guards against a refresh or a double submit creating a second row.
      // -------------------------

      const { profileId, error: lookupError } = await fetchTeacherProfileId(
        session.user.id
      );

      if (lookupError) {
        setError(
          "We could not confirm whether your teacher profile exists, so nothing was saved: " +
            lookupError +
            " Please try again."
        );
        return;
      }

      if (profileId) {
        finishAndRedirect("already-complete", 800);
        completed = true;
        return;
      }

      // -------------------------
      // 4. CREATE THE PROFILE VIA THE EXISTING RPC
      // No signUp(), no direct insert — the Auth account is reused as-is.
      // -------------------------

      const { error: createError } = await supabase.rpc(
        "create_teacher_profile",
        {
          p_full_name: name.trim(),
          p_phone: phone.trim(),
          p_city_location: city.trim(),
          p_bio: bio.trim(),
          p_subjects: selectedSubjects,
          p_experience: experience.trim(),
          p_languages: selectedLanguages,
          p_teaching_mode: mode,
          p_fee_weekly: parseFeeInput(feeWeekly).fee,
          p_fee_monthly: parseFeeInput(feeMonthly).fee,
          p_profile_photo_url: null,
        }
      );

      if (createError) {
        console.error("TEACHER PROFILE COMPLETION RPC ERROR:", createError);

        // 23505 = unique_violation on teacher_profiles.user_id: the row already
        // exists (concurrent submit), which means the profile is complete.
        if (createError.code === "23505") {
          finishAndRedirect("already-complete", 800);
          completed = true;
          return;
        }

        setError(
          "Your teacher profile could not be saved: " +
            createError.message +
            " You can retry on this page without registering again — your account is already created."
        );
        return;
      }

      completed = true;
      finishAndRedirect("done", 1500);
    } catch (err) {
      console.error("TEACHER PROFILE COMPLETION ERROR:", err);

      setError(
        "Something went wrong while saving your teacher profile. You can retry on this page without registering again."
      );
    } finally {
      // Allow another attempt once the in-flight request settles, unless the
      // profile now exists (then we are already redirecting).
      if (!completed) {
        submittingRef.current = false;
        setLoading(false);
      }
    }
  }

  if (screen === "checking") {
    return (
      <main className="min-h-screen bg-slate-50">
        <PageHeader />
        <section className="px-6 py-14">
          <div className="mx-auto max-w-4xl rounded-3xl border bg-white p-8 text-center shadow-sm">
            <p className="text-slate-600">Checking your teacher account...</p>
          </div>
        </section>
      </main>
    );
  }

  if (screen === "blocked") {
    return (
      <main className="min-h-screen bg-slate-50">
        <PageHeader />
        <section className="px-6 py-14">
          <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              We could not load your teacher account
            </h1>

            <div
              role="alert"
              className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700"
            >
              {blockReason}
            </div>

            <p className="mt-4 leading-7 text-slate-600">
              Retrying does not require a new registration. If you were able to
              sign in before, your account already exists.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login?role=teacher"
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Sign in as Teacher
              </Link>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl border px-5 py-3 font-semibold transition hover:bg-slate-50"
              >
                Retry
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (screen === "already-complete") {
    return (
      <main className="min-h-screen bg-slate-50">
        <PageHeader />

        <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6">
          <div className="w-full max-w-xl rounded-3xl border bg-white p-10 text-center shadow-lg">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl text-green-700">
              ✓
            </div>

            <h1 className="mt-6 text-3xl font-bold text-slate-900">
              Your teacher profile is already complete
            </h1>

            <p className="mt-4 leading-7 text-slate-600">
              Taking you to your dashboard...
            </p>

            <Link
              href="/teacher/dashboard"
              className="mt-8 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (screen === "done") {
    return (
      <main className="min-h-screen bg-slate-50">
        <PageHeader />

        <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6">
          <div className="w-full max-w-xl rounded-3xl border bg-white p-10 text-center shadow-lg">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl text-green-700">
              ✓
            </div>

            <h1 className="mt-6 text-3xl font-bold text-slate-900">
              Teacher Profile Created!
            </h1>

            <p className="mt-4 leading-7 text-slate-600">
              Your profile has been saved to your existing teacher account. Your
              email and password were not changed.
            </p>

            <p className="mt-3 leading-7 text-slate-600">
              Your profile will remain unverified until it is reviewed by the
              UstaadHub admin.
            </p>

            <Link
              href="/teacher/dashboard"
              className="mt-8 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }
  // Screen is "form" here — TypeScript has narrowed out the early returns.

  return (
    <main className="min-h-screen bg-slate-50">
      <PageHeader />

      {/* INTRO */}

      <section className="bg-gradient-to-b from-blue-50 to-slate-50 px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <p className="font-semibold text-blue-600">FINISH YOUR PROFILE</p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Complete your teacher profile
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Your teacher account already exists, but your profile is incomplete.
            Fill in the details below to finish — you do not need to register
            again, and you do not need a new password.
          </p>

          {accountEmail && (
            <p className="mt-4 text-sm font-medium text-slate-600">
              Signed in as {accountEmail}
            </p>
          )}
        </div>
      </section>

      {/* FORM */}

      <section className="px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* PERSONAL INFORMATION */}

            <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-bold text-gray-900">
                1. Personal Information
              </h2>

              <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Your sign-in email stays linked to this profile automatically —
                there is no need to enter it again.
              </p>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="complete-name"
                    className="mb-2 block text-sm font-semibold text-gray-900"
                  >
                    Full Name *
                  </label>

                  <input
                    id="complete-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    type="text"
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="complete-phone"
                    className="mb-2 block text-sm font-semibold text-gray-900"
                  >
                    Mobile Number *
                  </label>

                  <input
                    id="complete-phone"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="complete-gender"
                    className="mb-2 block text-sm font-semibold text-gray-900"
                  >
                    Gender *
                  </label>

                  <input
                    id="complete-gender"
                    value={gender}
                    readOnly
                    aria-readonly="true"
                    aria-describedby="complete-gender-note"
                    type="text"
                    className="w-full cursor-not-allowed rounded-xl border bg-slate-100 px-4 py-3 text-slate-700"
                  />

                  <p
                    id="complete-gender-note"
                    className="mt-2 text-xs text-slate-500"
                  >
                    From your original teacher registration and cannot be changed
                    here.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="complete-city"
                    className="mb-2 block text-sm font-semibold text-gray-900"
                  >
                    City / Location *
                  </label>

                  <input
                    id="complete-city"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    type="text"
                    placeholder="Enter your city"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* TEACHING INFORMATION */}

            <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-bold text-gray-900">
                2. Teaching Information
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="complete-qualification"
                    className="mb-2 block text-sm font-semibold text-gray-900"
                  >
                    Qualification *
                  </label>

                  <input
                    id="complete-qualification"
                    value={qualification}
                    readOnly
                    aria-readonly="true"
                    aria-describedby="complete-qualification-note"
                    type="text"
                    className="w-full cursor-not-allowed rounded-xl border bg-slate-100 px-4 py-3 text-slate-700"
                  />

                  <p
                    id="complete-qualification-note"
                    className="mt-2 text-xs text-slate-500"
                  >
                    From your original teacher registration and cannot be changed
                    here.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="complete-experience"
                    className="mb-2 block text-sm font-semibold text-gray-900"
                  >
                    Teaching Experience *
                  </label>

                  <select
                    id="complete-experience"
                    required
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full rounded-xl border bg-white px-4 py-3"
                  >
                    <option value="">Select experience</option>

                    {EXPERIENCE_LABELS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SUBJECTS */}

              <div className="mt-7">
                <span className="block text-sm font-semibold text-gray-900">
                  Subjects you teach *
                </span>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {TEACHER_SUBJECTS.map((subject) => (
                    <label
                      key={subject}
                      className={`cursor-pointer rounded-xl border p-3 text-sm text-gray-900 ${
                        selectedSubjects.includes(subject)
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={selectedSubjects.includes(subject)}
                        onChange={() =>
                          toggleItem(
                            subject,
                            selectedSubjects,
                            setSelectedSubjects
                          )
                        }
                      />
                      {subject}
                    </label>
                  ))}
                </div>
              </div>

              {/* LANGUAGES */}

              <div className="mt-7">
                <span className="block text-sm font-semibold text-gray-900">
                  Languages you can teach in *
                </span>

                <div className="mt-3 flex flex-wrap gap-3">
                  {TEACHER_LANGUAGES.map((language) => (
                    <label
                      key={language}
                      className={`cursor-pointer rounded-xl border px-4 py-3 text-sm text-gray-900 ${
                        selectedLanguages.includes(language)
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={selectedLanguages.includes(language)}
                        onChange={() =>
                          toggleItem(
                            language,
                            selectedLanguages,
                            setSelectedLanguages
                          )
                        }
                      />
                      {language}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* CLASSES & FEES */}

            <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-bold text-gray-900">
                3. Classes & Fees
              </h2>

              <div className="mt-6">
                <span className="block text-sm font-semibold text-gray-900">
                  Teaching Mode
                </span>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {["Online", "Offline", "Both"].map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setMode(item)}
                      className={`rounded-xl border p-4 font-medium text-gray-900 ${
                        mode === item
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
                    htmlFor="complete-fee-weekly"
                    className="mb-2 block text-sm font-semibold text-gray-900"
                  >
                    Weekly Fee (₹)
                  </label>

                  <input
                    id="complete-fee-weekly"
                    value={feeWeekly}
                    onChange={(e) => setFeeWeekly(e.target.value)}
                    type="number"
                    min="0"
                    placeholder="e.g. 800"
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="complete-fee-monthly"
                    className="mb-2 block text-sm font-semibold text-gray-900"
                  >
                    Monthly Fee (₹)
                  </label>

                  <input
                    id="complete-fee-monthly"
                    value={feeMonthly}
                    onChange={(e) => setFeeMonthly(e.target.value)}
                    type="number"
                    min="0"
                    placeholder="e.g. 3000"
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Enter weekly, monthly, or both. At least one is required.
              </p>
            </div>

            {/* ABOUT */}

            <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-bold text-gray-900">
                4. About You
              </h2>

              <div className="mt-6">
                <label
                  htmlFor="complete-bio"
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Introduction *
                </label>

                <textarea
                  id="complete-bio"
                  required
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write 3-4 lines about your teaching experience and expertise..."
                  rows={5}
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>
            </div>

            {/* ERROR + SUBMIT */}

            {error && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-lg font-semibold text-white transition ${
                loading
                  ? "cursor-not-allowed bg-blue-400"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading && (
                <span
                  aria-hidden="true"
                  className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                />
              )}
              {loading ? "Saving your profile..." : "Save My Teacher Profile"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

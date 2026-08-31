"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
const subjects = [
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

const languages = ["Hindi", "Urdu", "English", "Arabic"];

export default function RegisterTeacher() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [mode, setMode] = useState("Online");
  const [feeWeekly, setFeeWeekly] = useState("");
  const [feeMonthly, setFeeMonthly] = useState("");
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  setError("");

  // Basic validation
  if (!name.trim()) {
    setError("Please enter your full name.");
    return;
  }

  if (!email.trim()) {
    setError("Please enter your email address.");
    return;
  }

  if (!phone.trim()) {
    setError("Please enter your phone number.");
    return;
  }

  if (!gender) {
    setError("Please select your gender.");
    return;
  }

  if (!qualification.trim()) {
    setError("Please enter your qualification.");
    return;
  }

  if (!experience) {
    setError("Please select your teaching experience.");
    return;
  }

  if (selectedSubjects.length === 0) {
    setError("Please select at least one subject.");
    return;
  }

  if (selectedLanguages.length === 0) {
    setError("Please select at least one language.");
    return;
  }

  if (!feeWeekly && !feeMonthly) {
    setError("Please enter either weekly fee or monthly fee.");
    return;
  }

  if (!bio.trim()) {
    setError("Please write a short introduction about yourself.");
    return;
  }

  if (password.length < 8) {
    setError("Password must be at least 8 characters.");
    return;
  }

  if (password !== confirmPassword) {
    setError("Passwords do not match.");
    return;
  }

  setLoading(true);

  try {
    // 1. Create Supabase Auth account
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim(),
            role: "teacher",
            gender,
            qualification: qualification.trim(),
          },
        },
      });

    if (authError) {
      console.error("AUTH ERROR:", authError);
      setError(authError.message);
      setLoading(false);
      return;
    }

    const user = authData.user;

    if (!user) {
      setError("Teacher account could not be created.");
      setLoading(false);
      return;
    }

    // 2. Save complete teacher profile
    const { error: profileError } = await supabase
      .from("teacher_profiles")
      .insert({
        id: user.id,
        user_id: user.id,

        full_name: name.trim(),
        phone: phone.trim(),

        bio: bio.trim(),
        subjects: selectedSubjects,
        experience: experience,
        languages: selectedLanguages,

        teaching_mode: mode,

        fee_weekly: feeWeekly
          ? Number(feeWeekly)
          : null,

        fee_monthly: feeMonthly
          ? Number(feeMonthly)
          : null,

        profile_photo_url: null,

        is_verified: false,
      });

    if (profileError) {
      console.error("PROFILE ERROR:", profileError);

      setError(
        "Teacher account was created, but the profile could not be saved. " +
          profileError.message
      );

      setLoading(false);
      return;
    }

    // 3. Success
    setLoading(false);
    setSubmitted(true);

  } catch (err) {
    console.error("REGISTRATION ERROR:", err);

    setError(
      "Something went wrong while creating your teacher account. Please try again."
    );

    setLoading(false);
  }
}    event.preventDefault();

    setError("");

    if (selectedSubjects.length === 0) {
      setError("Please select at least one subject.");
      return;
    }

    if (selectedLanguages.length === 0) {
      setError("Please select at least one language.");
      return;
    }

    if (!feeWeekly && !feeMonthly) {
      setError("Please enter either weekly fee or monthly fee.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    // 1. Create Supabase Auth account
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            role: "teacher",
          },
        },
      });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    const user = authData.user;

    if (!user) {
      setLoading(false);
      setError("Account could not be created.");
      return;
    }

    // 2. Save teacher profile
    const { error: profileError } = await supabase
      .from("teacher_profiles")
      .insert({
        id: user.id,
        full_name: name,
        phone: phone,
        bio: bio,
        subjects: selectedSubjects,
        languages: selectedLanguages,
        teaching_mode: mode,
        fee_weekly: feeWeekly ? Number(feeWeekly) : null,
        fee_monthly: feeMonthly ? Number(feeMonthly) : null,
        is_verified: false,
      });

    if (profileError) {
      setLoading(false);

      // Account was created but profile failed.
      setError(
        "Account created, but teacher profile could not be saved: " +
          profileError.message
      );

      return;
    }

    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
            <a
              href="/"
              className="text-3xl font-bold text-blue-600"
            >
              UstaadHub
            </a>

            <a
              href="/login"
              className="font-semibold text-blue-600"
            >
              Login
            </a>
          </div>
        </header>

        <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6">
          <div className="w-full max-w-xl rounded-3xl border bg-white p-10 text-center shadow-lg">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl text-green-700">
              ✓
            </div>

            <h1 className="mt-6 text-3xl font-bold text-slate-900">
              Teacher Profile Created!
            </h1>

            <p className="mt-4 leading-7 text-slate-600">
              Your teacher account and profile have been successfully
              saved. Your profile will remain unverified until reviewed
              by the UstaadHub admin.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href="/login"
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Login as Teacher
              </a>

              <a
                href="/teachers"
                className="rounded-xl border px-6 py-3 font-semibold hover:bg-slate-50"
              >
                Find Teachers
              </a>
            </div>

          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <a
            href="/"
            className="text-3xl font-bold text-blue-600"
          >
            UstaadHub
          </a>

          <a
            href="/teachers"
            className="font-medium text-slate-700 hover:text-blue-600"
          >
            Find Teachers
          </a>

        </div>
      </header>

      {/* INTRO */}
      <section className="bg-gradient-to-b from-blue-50 to-slate-50 px-6 py-14">
        <div className="mx-auto max-w-4xl">

          <p className="font-semibold text-blue-600">
            JOIN USTAADHUB
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Create your teacher profile
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Share your knowledge, connect with students and grow your
            teaching journey with UstaadHub.
          </p>

        </div>
      </section>

      {/* FORM */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-4xl">

          <form
            onSubmit={handleSubmit}
            className="space-y-8"
          >

            {/* PERSONAL */}
            <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">

              <h2 className="text-2xl font-bold">
                1. Personal Information
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Full Name *
                  </label>

                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    type="text"
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Email Address *
                  </label>

                  <input
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Mobile Number *
                  </label>

                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Gender
                  </label>

                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl border bg-white px-4 py-3"
                  >
                    <option value="">Select gender</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>

              </div>

            </div>

            {/* TEACHING */}
            <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">

              <h2 className="text-2xl font-bold">
                2. Teaching Information
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Qualification *
                  </label>

                  <input
                    required
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    type="text"
                    placeholder="e.g. Aalim, B.A., M.A."
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Teaching Experience *
                  </label>

                  <select
                    required
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full rounded-xl border bg-white px-4 py-3"
                  >
                    <option value="">Select experience</option>
                    <option>Less than 1 year</option>
                    <option>1–3 years</option>
                    <option>3–5 years</option>
                    <option>5–10 years</option>
                    <option>10+ years</option>
                  </select>
                </div>

              </div>

              <div className="mt-7">

                <label className="block text-sm font-semibold">
                  Subjects you teach *
                </label>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">

                  {subjects.map((subject) => (
                    <label
                      key={subject}
                      className={`cursor-pointer rounded-xl border p-3 text-sm ${
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

              <div className="mt-7">

                <label className="block text-sm font-semibold">
                  Languages you can teach in *
                </label>

                <div className="mt-3 flex flex-wrap gap-3">

                  {languages.map((language) => (
                    <label
                      key={language}
                      className={`cursor-pointer rounded-xl border px-4 py-3 text-sm ${
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

            {/* FEES */}
            <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">

              <h2 className="text-2xl font-bold">
                3. Classes & Fees
              </h2>

              <div className="mt-6">

                <label className="block text-sm font-semibold">
                  Teaching Mode
                </label>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">

                  {["Online", "Offline", "Both"].map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setMode(item)}
                      className={`rounded-xl border p-4 font-medium ${
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
                  <label className="mb-2 block text-sm font-semibold">
                    Weekly Fee (₹)
                  </label>

                  <input
                    value={feeWeekly}
                    onChange={(e) => setFeeWeekly(e.target.value)}
                    type="number"
                    min="0"
                    placeholder="e.g. 800"
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Monthly Fee (₹)
                  </label>

                  <input
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

              <h2 className="text-2xl font-bold">
                4. About You
              </h2>

              <div className="mt-6">

                <label className="mb-2 block text-sm font-semibold">
                  Introduction *
                </label>

                <textarea
                  required
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={7}
                  placeholder="Tell students about your teaching experience, teaching style and what makes your classes special..."
                  className="w-full resize-none rounded-xl border px-4 py-3 leading-7"
                />

              </div>

            </div>

            {/* ACCOUNT */}
            <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">

              <h2 className="text-2xl font-bold">
                5. Create Your Account
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Password *
                  </label>

                  <input
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Confirm Password *
                  </label>

                  <input
                    required
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    type="password"
                    minLength={8}
                    placeholder="Repeat your password"
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

              </div>

            </div>

            {/* SUBMIT */}
            <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">

              {error && (
                <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <label className="mt-4 flex gap-3 text-sm text-slate-600">
                <input
                  required
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                />

                <span>
                  I confirm that the information provided is accurate
                  and I agree to the UstaadHub terms and privacy policy.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-7 w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Creating Teacher Account..."
                  : "Create Teacher Profile"}
              </button>

              <p className="mt-4 text-center text-xs text-slate-500">
                Your profile may be reviewed before becoming publicly visible.
              </p>

            </div>

          </form>

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
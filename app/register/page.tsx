"use client";

import { FormEvent, useState } from "react";

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
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [mode, setMode] = useState("Online");
  const [submitted, setSubmitted] = useState(false);

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedSubjects.length === 0) {
      alert("Please select at least one subject.");
      return;
    }

    if (selectedLanguages.length === 0) {
      alert("Please select at least one language.");
      return;
    }

    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="text-3xl font-bold text-blue-600">
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

      {/* Page heading */}
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

      {/* Form */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-4xl">

          {submitted ? (
            <div className="rounded-3xl border bg-white p-10 text-center shadow-sm">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
                ✓
              </div>

              <h2 className="mt-6 text-3xl font-bold">
                Profile submitted!
              </h2>

              <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-600">
                Your teacher profile has been submitted successfully.
                In the real system, it will be sent to the UstaadHub
                admin team for verification.
              </p>

              <div className="mt-8 flex justify-center gap-3">
                <a
                  href="/"
                  className="rounded-xl border px-6 py-3 font-semibold hover:bg-slate-50"
                >
                  Go Home
                </a>

                <a
                  href="/teachers"
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  Find Teachers
                </a>
              </div>

            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-8"
            >

              {/* Personal Information */}
              <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">

                <h2 className="text-2xl font-bold">
                  1. Personal Information
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Tell students a little about yourself.
                </p>

                <div className="mt-6 grid gap-5 md:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Full Name *
                    </label>

                    <input
                      required
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
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Gender
                    </label>

                    <select className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500">
                      <option value="">Select gender</option>
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>

                </div>

              </div>

              {/* Teaching Information */}
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
                      type="text"
                      placeholder="e.g. Aalim, B.A., M.A."
                      className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Teaching Experience *
                    </label>

                    <select
                      required
                      className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500"
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

                {/* Subjects */}
                <div className="mt-7">
                  <label className="block text-sm font-semibold">
                    Subjects you teach *
                  </label>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {subjects.map((subject) => (
                      <label
                        key={subject}
                        className={`cursor-pointer rounded-xl border p-3 text-sm transition ${
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

                {/* Languages */}
                <div className="mt-7">
                  <label className="block text-sm font-semibold">
                    Languages you can teach in *
                  </label>

                  <div className="mt-3 flex flex-wrap gap-3">
                    {languages.map((language) => (
                      <label
                        key={language}
                        className={`cursor-pointer rounded-xl border px-4 py-3 text-sm transition ${
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

              {/* Teaching Mode & Fee */}
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
                      Hourly Fee (₹) *
                    </label>

                    <input
                      required
                      type="number"
                      min="0"
                      placeholder="e.g. 300"
                      className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      City
                    </label>

                    <input
                      type="text"
                      placeholder="e.g. Bareilly"
                      className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                </div>

              </div>

              {/* About */}
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
                    rows={7}
                    placeholder="Tell students about your teaching experience, teaching style and what makes your classes special..."
                    className="w-full resize-none rounded-xl border px-4 py-3 leading-7 outline-none focus:border-blue-500"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    A good introduction helps students understand whether
                    you are the right teacher for them.
                  </p>

                </div>

              </div>

              {/* Account */}
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
                      type="password"
                      minLength={8}
                      placeholder="Minimum 8 characters"
                      className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Confirm Password *
                    </label>

                    <input
                      required
                      type="password"
                      minLength={8}
                      placeholder="Repeat your password"
                      className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                </div>

              </div>

              {/* Submit */}
              <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">

                <label className="flex gap-3 text-sm text-slate-600">
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
                  className="mt-7 w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white transition hover:bg-blue-700"
                >
                  Create Teacher Profile
                </button>

                <p className="mt-4 text-center text-xs text-slate-500">
                  Your profile may be reviewed before becoming publicly visible.
                </p>

              </div>

            </form>
          )}

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-slate-500">
          © 2026 UstaadHub. All rights reserved.
        </div>
      </footer>

    </main>
  );
}
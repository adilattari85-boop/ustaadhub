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
  "Other",
];

const languages = ["Hindi", "Urdu", "English", "Arabic"];

export default function RequirementPage() {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [teacherGender, setTeacherGender] = useState("Any");
  const [classMode, setClassMode] = useState("Online");
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
      alert("Please select at least one preferred language.");
      return;
    }

    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* HEADER */}
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

      {/* INTRO */}
      <section className="bg-gradient-to-b from-blue-50 to-slate-50 px-6 py-14">
        <div className="mx-auto max-w-4xl">

          <p className="font-semibold text-blue-600">
            FIND YOUR USTAAD
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            Tell us what you want to learn
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Share your learning requirement and we&apos;ll help you find
            a suitable teacher according to your subject, timing,
            language and budget.
          </p>

        </div>
      </section>

      {/* FORM */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-4xl">

          {submitted ? (

            /* SUCCESS */
            <div className="rounded-3xl border bg-white p-10 text-center shadow-sm">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl text-green-700">
                ✓
              </div>

              <h2 className="mt-6 text-3xl font-bold">
                Requirement Submitted!
              </h2>

              <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-600">
                Thank you. We have received your learning requirement.
                Our team can review it and help you find a suitable
                teacher.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">

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
                  Browse Teachers
                </a>

              </div>

            </div>

          ) : (

            <form onSubmit={handleSubmit} className="space-y-8">

              {/*    INFORMATION */}
              <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">

                <h2 className="text-2xl font-bold">
                  1. Student / Parent Information
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Tell us who is looking for a teacher.
                </p>

                <div className="mt-6 grid gap-5 md:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Parent / Student Name *
                    </label>

                    <input
                      required
                      type="text"
                      placeholder="Enter your name"
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
                      Student&apos;s Age *
                    </label>

                    <input
                      required
                      type="number"
                      min="3"
                      max="100"
                      placeholder="e.g. 10"
                      className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Student&apos;s Gender
                    </label>

                    <select className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500">
                      <option>Prefer not to say</option>
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>

                </div>

              </div>

              {/* SUBJECT */}
              <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">

                <h2 className="text-2xl font-bold">
                  2. What do you want to learn?
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Select one or more subjects.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">

                  {subjects.map((subject) => (

                    <label
                      key={subject}
                      className={`cursor-pointer rounded-xl border p-4 text-sm font-medium transition ${
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

              {/* LEVEL */}
              <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">

                <h2 className="text-2xl font-bold">
                  3. Learning Details
                </h2>

                <div className="mt-6">

                  <label className="mb-2 block text-sm font-semibold">
                    Current Level *
                  </label>

                  <select
                    required
                    className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">Select your level</option>
                    <option>Beginner</option>
                    <option>Basic</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>

                </div>

                {/* MODE */}
                <div className="mt-7">

                  <label className="block text-sm font-semibold">
                    Preferred Class Mode
                  </label>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">

                    {["Online", "Offline", "Both"].map((item) => (

                      <button
                        type="button"
                        key={item}
                        onClick={() => setClassMode(item)}
                        className={`rounded-xl border p-4 font-medium transition ${
                          classMode === item
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "hover:border-blue-300"
                        }`}
                      >
                        {item}
                      </button>

                    ))}

                  </div>

                </div>

                {/* TEACHER GENDER */}
                <div className="mt-7">

                  <label className="block text-sm font-semibold">
                    Preferred Teacher
                  </label>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">

                    {["Any", "Male Teacher", "Female Teacher"].map(
                      (item) => (

                        <button
                          type="button"
                          key={item}
                          onClick={() => setTeacherGender(item)}
                          className={`rounded-xl border p-4 font-medium transition ${
                            teacherGender === item
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "hover:border-blue-300"
                          }`}
                        >
                          {item}
                        </button>

                      )
                    )}

                  </div>

                </div>

                {/* LANGUAGES */}
                <div className="mt-7">

                  <label className="block text-sm font-semibold">
                    Preferred Teaching Language *
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

              {/* TIMING */}
              <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">

                <h2 className="text-2xl font-bold">
                  4. Preferred Schedule
                </h2>

                <div className="mt-6 grid gap-5 md:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Classes per Week
                    </label>

                    <select className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500">
                      <option>1 class</option>
                      <option>2 classes</option>
                      <option>3 classes</option>
                      <option>4 classes</option>
                      <option>5 classes</option>
                      <option>6+ classes</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Preferred Time
                    </label>

                    <select className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500">
                      <option>Morning</option>
                      <option>Afternoon</option>
                      <option>Evening</option>
                      <option>Night</option>
                      <option>Flexible</option>
                    </select>
                  </div>

                </div>

                <div className="mt-5">

                  <label className="mb-2 block text-sm font-semibold">
                    Preferred Days
                  </label>

                  <input
                    type="text"
                    placeholder="e.g. Monday, Wednesday, Friday"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                  />

                </div>

              </div>

              {/* BUDGET */}
              <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">

                <h2 className="text-2xl font-bold">
                  5. Budget
                </h2>

                <div className="mt-6 grid gap-5 md:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Monthly Budget (₹)
                    </label>

                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 2000"
                      className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      City / Location
                    </label>

                    <input
                      type="text"
                      placeholder="e.g. Bareilly"
                      className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                </div>

              </div>

              {/* ADDITIONAL REQUIREMENT */}
              <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">

                <h2 className="text-2xl font-bold">
                  6. Tell us more
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Anything else that can help us understand your requirement?
                </p>

                <textarea
                  rows={6}
                  placeholder="For example: My son is 10 years old and is a beginner in Quran reading. We prefer a patient male teacher who can teach in Urdu..."
                  className="mt-6 w-full resize-none rounded-xl border px-4 py-3 leading-7 outline-none focus:border-blue-500"
                />

              </div>

              {/* SUBMIT */}
              <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">

                <div className="rounded-2xl bg-blue-50 p-5">

                  <h3 className="font-bold text-blue-900">
                    What happens next?
                  </h3>

                  <ul className="mt-3 space-y-2 text-sm text-blue-800">
                    <li>✓ We review your learning requirement.</li>
                    <li>✓ We look for suitable teachers.</li>
                    <li>✓ We can help you choose the right match.</li>
                  </ul>

                </div>

                <button
                  type="submit"
                  className="mt-7 w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white transition hover:bg-blue-700"
                >
                  Submit Learning Requirement
                </button>

                <p className="mt-4 text-center text-xs text-slate-500">
                  By submitting, you agree that UstaadHub may contact you
                  regarding your learning requirement.
                </p>

              </div>

            </form>

          )}

        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-slate-500">
          © 2026 UstaadHub. All rights reserved.
        </div>
      </footer>

    </main>
  );
}
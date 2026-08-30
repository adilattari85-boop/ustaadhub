"use client";

import { FormEvent, useState } from "react";
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
  "Other",
];

const languages = ["Hindi", "Urdu", "English", "Arabic"];

export default function RequirementPage() {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const [teacherGender, setTeacherGender] = useState("Any");
  const [classMode, setClassMode] = useState("Online");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [studentGender, setStudentGender] = useState(
    "Prefer not to say"
  );

  const [level, setLevel] = useState("");
  const [classesPerWeek, setClassesPerWeek] = useState("1 class");
  const [preferredTime, setPreferredTime] = useState("Morning");
  const [preferredDays, setPreferredDays] = useState("");

  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [city, setCity] = useState("");
  const [additionalRequirement, setAdditionalRequirement] =
    useState("");

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleSubject(subject: string) {
    setSelectedSubjects((current) =>
      current.includes(subject)
        ? current.filter((item) => item !== subject)
        : [...current, subject]
    );
  }

  function toggleLanguage(language: string) {
    setSelectedLanguages((current) =>
      current.includes(language)
        ? current.filter((item) => item !== language)
        : [...current, language]
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (selectedSubjects.length === 0) {
      setError("Please select at least one subject.");
      return;
    }

    if (selectedLanguages.length === 0) {
      setError("Please select at least one preferred language.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter student/parent name.");
      return;
    }

    if (!phone.trim()) {
      setError("Please enter mobile number.");
      return;
    }

    if (!level) {
      setError("Please select your current learning level.");
      return;
    }

    setLoading(true);

    try {
      // ---------------------------------------
      // 1. GET CURRENT LOGGED-IN USER
      // ---------------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      console.log("CURRENT USER:", user);
      console.log("USER ERROR:", userError);

      if (userError) {
        setError(
          "Could not verify login: " + userError.message
        );
        return;
      }

      if (!user) {
        setError(
          "Please login before submitting a learning requirement."
        );
        return;
      }

      // ---------------------------------------
      // 2. PREPARE DATABASE DATA
      // ---------------------------------------

      const requirementData = {
        user_id: user.id,

        parent_student_name: name.trim(),
        mobile_number: phone.trim(),

        student_age: age ? Number(age) : null,
        student_gender: studentGender,

        subjects: selectedSubjects,
        current_level: level,

        class_mode: classMode,
        teacher_gender: teacherGender,
        preferred_languages: selectedLanguages,

        classes_per_week: classesPerWeek,
        preferred_time: preferredTime,
        preferred_days: preferredDays.trim(),

        monthly_budget: monthlyBudget
          ? Number(monthlyBudget)
          : null,

        city_location: city.trim(),

        additional_requirement:
          additionalRequirement.trim(),
      };

      console.log(
        "REQUIREMENT DATA:",
        requirementData
      );

      // ---------------------------------------
      // 3. INSERT INTO SUPABASE
      // ---------------------------------------

      const {
        data: insertedRequirement,
        error: insertError,
      } = await supabase
        .from("learning_requirements")
        .insert(requirementData)
        .select()
        .single();

      console.log(
        "INSERTED REQUIREMENT:",
        insertedRequirement
      );

      console.log(
        "INSERT ERROR:",
        insertError
      );

      // ---------------------------------------
      // 4. CHECK INSERT ERROR
      // ---------------------------------------

      if (insertError) {
        setError(
          "Database error: " + insertError.message
        );
        return;
      }

      // ---------------------------------------
      // 5. MAKE SURE ROW WAS CREATED
      // ---------------------------------------

      if (!insertedRequirement) {
        setError(
          "Requirement was not saved. No database row was returned."
        );
        return;
      }

      // ---------------------------------------
      // 6. SUCCESS
      // ---------------------------------------

      console.log(
        "SUCCESS - DATABASE ROW CREATED:",
        insertedRequirement
      );

      setSubmitted(true);
    } catch (err) {
      console.error("REQUIREMENT SUBMIT ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // SUCCESS SCREEN
  // ==========================================

  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-300 bg-white p-10 text-center shadow-sm">

          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-5xl text-green-600">
            ✓
          </div>

          <h1 className="mt-8 text-4xl font-bold">
            Requirement Submitted!
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Thank you. We have received your learning
            requirement. Our team can review it and help
            you find a suitable teacher.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">

            <a
              href="/"
              className="rounded-xl border border-slate-400 px-8 py-4 font-semibold text-slate-800 hover:bg-slate-50"
            >
              Go Home
            </a>

            <a
              href="/teachers"
              className="rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white hover:bg-blue-700"
            >
              Browse Teachers
            </a>

          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // REQUIREMENT FORM
  // ==========================================

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">

        <div className="mb-8">
          <a
            href="/"
            className="font-semibold text-blue-600"
          >
            ← Back to Home
          </a>

          <h1 className="mt-6 text-4xl font-bold">
            Find the Right Teacher
          </h1>

          <p className="mt-2 text-slate-600">
            Tell us what you want to learn and your preferred
            teacher.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-8"
        >

          {/* BASIC INFORMATION */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              Student Information
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block font-semibold">
                  Student / Parent Name *
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Enter name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Mobile Number *
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  placeholder="Enter mobile number"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Student Age
                </label>

                <input
                  type="number"
                  value={age}
                  onChange={(e) =>
                    setAge(e.target.value)
                  }
                  placeholder="Age"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Student Gender
                </label>

                <select
                  value={studentGender}
                  onChange={(e) =>
                    setStudentGender(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option>Prefer not to say</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  City
                </label>

                <input
                  type="text"
                  value={city}
                  onChange={(e) =>
                    setCity(e.target.value)
                  }
                  placeholder="Your city"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

            </div>
          </section>

          {/* SUBJECTS */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              What do you want to learn?
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">

              {subjects.map((subject) => (
                <button
                  type="button"
                  key={subject}
                  onClick={() =>
                    toggleSubject(subject)
                  }
                  className={`rounded-xl border px-4 py-3 text-left font-medium ${
                    selectedSubjects.includes(subject)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {selectedSubjects.includes(subject)
                    ? "✓ "
                    : ""}
                  {subject}
                </button>
              ))}

            </div>
          </section>

          {/* LEVEL */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              Learning Level
            </h2>

            <select
              value={level}
              onChange={(e) =>
                setLevel(e.target.value)
              }
              className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">
                Select current level
              </option>
              <option>Beginner</option>
              <option>Basic</option>
              <option>Intermediate</option>
              <option>Advanced</option>
              <option>Not sure</option>
            </select>
          </section>

          {/* TEACHER PREFERENCE */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              Teacher Preference
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block font-semibold">
                  Teacher Gender
                </label>

                <select
                  value={teacherGender}
                  onChange={(e) =>
                    setTeacherGender(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option>Any</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Class Mode
                </label>

                <select
                  value={classMode}
                  onChange={(e) =>
                    setClassMode(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option>Online</option>
                  <option>Offline</option>
                  <option>Both</option>
                </select>
              </div>

            </div>
          </section>

          {/* LANGUAGES */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              Preferred Teaching Language
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">

              {languages.map((language) => (
                <button
                  type="button"
                  key={language}
                  onClick={() =>
                    toggleLanguage(language)
                  }
                  className={`rounded-xl border px-4 py-3 font-medium ${
                    selectedLanguages.includes(language)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {selectedLanguages.includes(language)
                    ? "✓ "
                    : ""}
                  {language}
                </button>
              ))}

            </div>
          </section>

          {/* SCHEDULE */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              Class Schedule
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block font-semibold">
                  Classes Per Week
                </label>

                <select
                  value={classesPerWeek}
                  onChange={(e) =>
                    setClassesPerWeek(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option>1 class</option>
                  <option>2 classes</option>
                  <option>3 classes</option>
                  <option>4 classes</option>
                  <option>5 classes</option>
                  <option>6 classes</option>
                  <option>7 classes</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Preferred Time
                </label>

                <select
                  value={preferredTime}
                  onChange={(e) =>
                    setPreferredTime(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option>Morning</option>
                  <option>Afternoon</option>
                  <option>Evening</option>
                  <option>Night</option>
                  <option>Flexible</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block font-semibold">
                  Preferred Days
                </label>

                <input
                  type="text"
                  value={preferredDays}
                  onChange={(e) =>
                    setPreferredDays(e.target.value)
                  }
                  placeholder="Example: Monday, Wednesday, Friday"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

            </div>
          </section>

          {/* BUDGET */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              Budget
            </h2>

            <div className="mt-5">

              <label className="mb-2 block font-semibold">
                Monthly Budget
              </label>

              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) =>
                  setMonthlyBudget(e.target.value)
                }
                placeholder="Example: 2000"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />

              <p className="mt-2 text-sm text-slate-500">
                Leave blank if you are flexible.
              </p>

            </div>
          </section>

          {/* ADDITIONAL REQUIREMENT */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              Additional Requirement
            </h2>

            <textarea
              value={additionalRequirement}
              onChange={(e) =>
                setAdditionalRequirement(
                  e.target.value
                )
              }
              rows={5}
              placeholder="Tell us anything else we should know..."
              className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </section>

          {/* ERROR */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* SUBMIT */}

          <section className="rounded-2xl bg-blue-50 p-6">

            <h2 className="text-2xl font-bold text-blue-900">
              What happens next?
            </h2>

            <div className="mt-4 space-y-3 text-blue-800">
              <p>✓ We review your learning requirement.</p>
              <p>✓ We look for suitable teachers.</p>
              <p>✓ We can help you choose the right match.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Saving Requirement..."
                : "Submit Learning Requirement"}
            </button>

            <p className="mt-4 text-center text-sm text-slate-600">
              By submitting, you agree that UstaadHub may
              contact you regarding your learning requirement.
            </p>

          </section>

        </form>
      </div>
    </main>
  );
}
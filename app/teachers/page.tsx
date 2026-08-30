"use client";

import { useState } from "react";

const teachers = [
  {
    name: "Muhammad Adil",
    subjects: ["Quran", "Tajweed", "Hifz"],
    experience: "10+ years",
    languages: "Hindi, Urdu, English",
    rating: "5.0",
    students: "120+",
    image: "MA",
  },
  {
    name: "Ustaad Ahmed",
    subjects: ["Arabic", "Islamic Studies", "Hadith"],
    experience: "8+ years",
    languages: "Urdu, English, Arabic",
    rating: "4.9",
    students: "90+",
    image: "UA",
  },
  {
    name: "Sister Ayesha",
    subjects: ["Quran", "Nazra", "Tajweed"],
    experience: "7+ years",
    languages: "Hindi, Urdu, English",
    rating: "5.0",
    students: "100+",
    image: "SA",
  },
  {
    name: "Ustaad Salman",
    subjects: ["Arabic", "Quran", "Duas"],
    experience: "6+ years",
    languages: "Urdu, English",
    rating: "4.8",
    students: "75+",
    image: "US",
  },
];

export default function TeachersPage() {
  const [search, setSearch] = useState("");

  const filteredTeachers = teachers.filter((teacher) => {
    const text = `
      ${teacher.name}
      ${teacher.subjects.join(" ")}
      ${teacher.languages}
    `.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a
            href="/"
            className="text-3xl font-bold tracking-tight text-blue-600"
          >
            UstaadHub
          </a>

          <nav className="hidden gap-10 md:flex">
            <a href="/teachers" className="font-medium text-blue-600">
              Find Teachers
            </a>
            <a href="#" className="font-medium text-slate-700 hover:text-blue-600">
              Subjects
            </a>
            <a href="#" className="font-medium text-slate-700 hover:text-blue-600">
              How It Works
            </a>
          </nav>

          <div className="flex items-center gap-5">
            <a
              href="#"
              className="hidden font-medium text-slate-800 sm:block"
            >
              Login
            </a>

            <a
              href="#"
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Join as Teacher
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="max-w-3xl">
            <p className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-2 font-medium text-blue-700">
              Find your perfect teacher
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              Learn from the right{" "}
              <span className="text-blue-600">Ustaad</span>
            </h1>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Browse experienced teachers for Quran, Islamic Studies, Arabic,
              languages and more.
            </p>
          </div>

          {/* Search */}
          <div className="mt-10 max-w-4xl">
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-lg sm:flex-row">
              <input
                type="text"
                placeholder="Search by teacher, subject or language..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-5 py-4 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <button className="rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white hover:bg-blue-700">
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Teachers */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Available Teachers
            </h2>

            <p className="mt-1 text-slate-500">
              {filteredTeachers.length} teachers found
            </p>
          </div>
        </div>

        {filteredTeachers.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">
              No teachers found
            </h3>
            <p className="mt-2 text-slate-500">
              Try searching for another subject or language.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher.name}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="p-6">
                  {/* Teacher profile */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                      {teacher.image}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {teacher.name}
                      </h3>

                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-yellow-500">★</span>
                        <span className="font-semibold">
                          {teacher.rating}
                        </span>
                        <span className="text-sm text-slate-500">
                          ({teacher.students} students)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subjects */}
                  <div className="mt-6 flex flex-wrap gap-2">
                    {teacher.subjects.map((subject) => (
                      <span
                        key={subject}
                        className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>

                  {/* Details */}
                  <div className="mt-6 space-y-3 border-t pt-5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Experience</span>
                      <span className="font-semibold text-slate-800">
                        {teacher.experience}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Languages</span>
                      <span className="text-right font-semibold text-slate-800">
                        {teacher.languages}
                      </span>
                    </div>
                  </div>

                  {/* Button */}
                  <button className="mt-6 w-full rounded-xl border border-blue-600 py-3 font-semibold text-blue-600 transition hover:bg-blue-600 hover:text-white">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
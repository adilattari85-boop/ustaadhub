"use client";

import { useState } from "react";

const requirements = [
  {
    id: 1,
    student: "Ahmed Raza",
    age: 10,
    subject: "Quran & Tajweed",
    level: "Beginner",
    mode: "Online",
    teacher: "Male Teacher",
    language: "Urdu",
    timing: "Evening",
    budget: "₹2,000/month",
    status: "New",
  },
  {
    id: 2,
    student: "Sara Khan",
    age: 14,
    subject: "Arabic",
    level: "Intermediate",
    mode: "Online",
    teacher: "Female Teacher",
    language: "English",
    timing: "Evening",
    budget: "₹3,000/month",
    status: "New",
  },
  {
    id: 3,
    student: "Mohammad Hamza",
    age: 8,
    subject: "Hifz-ul-Quran",
    level: "Beginner",
    mode: "Online",
    teacher: "Any",
    language: "Hindi",
    timing: "Morning",
    budget: "₹2,500/month",
    status: "Contacted",
  },
];

export default function AdminPage() {
  const [selectedRequirement, setSelectedRequirement] =
    useState<(typeof requirements)[0] | null>(null);

  const [filter, setFilter] = useState("All");

  const filteredRequirements =
    filter === "All"
      ? requirements
      : requirements.filter((item) => item.status === filter);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">

      {/* HEADER */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <a
              href="/"
              className="text-2xl font-bold text-blue-700"
            >
              UstaadHub
            </a>

            <p className="text-sm text-slate-500">
              Admin Dashboard
            </p>
          </div>

          <a
            href="/"
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            View Website
          </a>

        </div>
      </header>

      {/* DASHBOARD */}
      <section className="mx-auto max-w-7xl px-6 py-10">

        <div className="mb-8">
          <p className="font-semibold text-blue-600">
            ADMIN PANEL
          </p>

          <h1 className="mt-1 text-3xl font-bold md:text-4xl">
            Learning Requirements
          </h1>

          <p className="mt-2 text-slate-600">
            Manage student and parent teacher requests.
          </p>
        </div>

        {/* STATS */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Requirements
            </p>

            <p className="mt-2 text-3xl font-bold">
              {requirements.length}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              New
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {requirements.filter((x) => x.status === "New").length}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Contacted
            </p>

            <p className="mt-2 text-3xl font-bold text-orange-600">
              {requirements.filter((x) => x.status === "Contacted").length}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Matched
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              0
            </p>
          </div>

        </div>

        {/* FILTER */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">

          <h2 className="text-xl font-bold">
            Student Requirements
          </h2>

          <div className="flex gap-2">

            {["All", "New", "Contacted"].map((item) => (

              <button
                key={item}
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

        </div>

        {/* REQUIREMENTS */}
        <div className="mt-5 overflow-hidden rounded-2xl border bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[900px] text-left">

              <thead className="border-b bg-slate-50 text-sm">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Subject</th>
                  <th className="px-5 py-4">Level</th>
                  <th className="px-5 py-4">Mode</th>
                  <th className="px-5 py-4">Timing</th>
                  <th className="px-5 py-4">Budget</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y">

                {filteredRequirements.map((item) => (

                  <tr
                    key={item.id}
                    className="hover:bg-slate-50"
                  >

                    <td className="px-5 py-5">

                      <p className="font-semibold">
                        {item.student}
                      </p>

                      <p className="text-sm text-slate-500">
                        Age {item.age}
                      </p>

                    </td>

                    <td className="px-5 py-5">
                      {item.subject}
                    </td>

                    <td className="px-5 py-5">
                      {item.level}
                    </td>

                    <td className="px-5 py-5">
                      {item.mode}
                    </td>

                    <td className="px-5 py-5">
                      {item.timing}
                    </td>

                    <td className="px-5 py-5">
                      {item.budget}
                    </td>

                    <td className="px-5 py-5">

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          item.status === "New"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {item.status}
                      </span>

                    </td>

                    <td className="px-5 py-5">

                      <button
                        onClick={() =>
                          setSelectedRequirement(item)
                        }
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        View
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      </section>

      {/* DETAIL MODAL */}
      {selectedRequirement && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-sm font-semibold text-blue-600">
                  REQUIREMENT #{selectedRequirement.id}
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  {selectedRequirement.student}
                </h2>
              </div>

              <button
                onClick={() => setSelectedRequirement(null)}
                className="rounded-full bg-slate-100 px-3 py-2 font-bold hover:bg-slate-200"
              >
                ✕
              </button>

            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Subject</p>
                <p className="mt-1 font-semibold">
                  {selectedRequirement.subject}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Level</p>
                <p className="mt-1 font-semibold">
                  {selectedRequirement.level}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Class Mode</p>
                <p className="mt-1 font-semibold">
                  {selectedRequirement.mode}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Teacher Preference</p>
                <p className="mt-1 font-semibold">
                  {selectedRequirement.teacher}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Language</p>
                <p className="mt-1 font-semibold">
                  {selectedRequirement.language}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Timing</p>
                <p className="mt-1 font-semibold">
                  {selectedRequirement.timing}
                </p>
              </div>

            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">

              <button
                onClick={() => setSelectedRequirement(null)}
                className="flex-1 rounded-xl border py-3 font-semibold hover:bg-slate-50"
              >
                Close
              </button>

              <button
                onClick={() => {
                  alert("Teacher matching will be added next.");
                }}
                className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Match Teachers
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}
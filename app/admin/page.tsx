"use client";

console.log("NEW ADMIN PAGE LOADED");

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Requirement = {
  id: string;
  user_id: string;
  parent_student_name: string | null;
  mobile_number: string | null;
  student_age: number | null;
  student_gender: string | null;
  subjects: string[] | null;
  current_level: string | null;
  class_mode: string | null;
  teacher_gender: string | null;
  preferred_languages: string[] | null;
  classes_per_week: string | null;
  preferred_time: string | null;
  preferred_days: string | null;
  monthly_budget: number | null;
  city_location: string | null;
  additional_requirement: string | null;
  created_at: string;
};

const statuses = ["All", "New", "Contacted", "Matched"];

export default function AdminPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedRequirement, setSelectedRequirement] =
    useState<Requirement | null>(null);

  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRequirements() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("learning_requirements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("ADMIN REQUIREMENTS ERROR:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    setRequirements(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadRequirements();
  }, []);

  const filteredRequirements =
    filter === "All"
      ? requirements
      : requirements.filter((item) => {
          const status =
            (item as Requirement & { status?: string }).status || "New";

          return status === filter;
        });

  const getStatus = (item: Requirement) => {
    const status =
      (item as Requirement & { status?: string }).status || "New";

    return status;
  };

  const newCount = requirements.filter(
    (item) => getStatus(item) === "New"
  ).length;

  const contactedCount = requirements.filter(
    (item) => getStatus(item) === "Contacted"
  ).length;

  const matchedCount = requirements.filter(
    (item) => getStatus(item) === "Matched"
  ).length;

  function formatBudget(budget: number | null) {
    if (budget === null || budget === undefined) {
      return "Not specified";
    }

    return `₹${budget.toLocaleString("en-IN")}/month`;
  }

  function formatDate(date: string) {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

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

          <div className="flex items-center gap-3">
            <button
              onClick={loadRequirements}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Refresh
            </button>

            <a
              href="/"
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              View Website
            </a>
          </div>
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

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">
              Could not load requirements
            </p>

            <p className="mt-1">{error}</p>

            <button
              onClick={loadRequirements}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

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
              {newCount}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Contacted
            </p>

            <p className="mt-2 text-3xl font-bold text-orange-600">
              {contactedCount}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Matched
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {matchedCount}
            </p>
          </div>
        </div>

        {/* FILTER */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              Student Requirements
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredRequirements.length} requirement
              {filteredRequirements.length !== 1 ? "s" : ""} shown
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {statuses.map((item) => (
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
          {loading ? (
            <div className="p-12 text-center">
              <div className="text-lg font-semibold">
                Loading requirements...
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Fetching data from Supabase.
              </p>
            </div>
          ) : filteredRequirements.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl">📋</div>

              <h3 className="mt-4 text-xl font-bold">
                No requirements found
              </h3>

              <p className="mt-2 text-slate-500">
                There are no learning requirements for this filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
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
                  {filteredRequirements.map((item) => {
                    const status = getStatus(item);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-5">
                          <p className="font-semibold">
                            {item.parent_student_name ||
                              "Not provided"}
                          </p>

                          <p className="text-sm text-slate-500">
                            {item.student_age
                              ? `Age ${item.student_age}`
                              : "Age not provided"}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <div className="max-w-[220px]">
                            {item.subjects?.length
                              ? item.subjects.join(", ")
                              : "Not specified"}
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          {item.current_level || "-"}
                        </td>

                        <td className="px-5 py-5">
                          {item.class_mode || "-"}
                        </td>

                        <td className="px-5 py-5">
                          <p>
                            {item.preferred_time || "-"}
                          </p>

                          {item.preferred_days && (
                            <p className="text-xs text-slate-500">
                              {item.preferred_days}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-5">
                          {formatBudget(item.monthly_budget)}
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              status === "New"
                                ? "bg-blue-100 text-blue-700"
                                : status === "Contacted"
                                ? "bg-orange-100 text-orange-700"
                                : status === "Matched"
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {status}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* DETAIL MODAL */}
      {selectedRequirement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  LEARNING REQUIREMENT
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  {selectedRequirement.parent_student_name ||
                    "Student"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Submitted{" "}
                  {formatDate(selectedRequirement.created_at)}
                </p>
              </div>

              <button
                onClick={() => setSelectedRequirement(null)}
                className="rounded-full bg-slate-100 px-3 py-2 font-bold hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* BASIC DETAILS */}
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Student Name
                </p>

                <p className="mt-1 font-semibold">
                  {selectedRequirement.parent_student_name ||
                    "Not provided"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Phone
                </p>

                <p className="mt-1 font-semibold">
                  {selectedRequirement.mobile_number ||
                    "Not provided"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Age
                </p>

                <p className="mt-1 font-semibold">
                  {selectedRequirement.student_age || "-"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Student Gender
                </p>

                <p className="mt-1 font-semibold">
                  {selectedRequirement.student_gender || "-"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Subjects
                </p>

                <p className="mt-1 font-semibold">
                  {selectedRequirement.subjects?.join(", ") ||
                    "Not specified"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Current Level
                </p>

                <p className="mt-1 font-semibold">
                  {selectedRequirement.current_level || "-"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Class Mode
                </p>

                <p className="mt-1 font-semibold">
                  {selectedRequirement.class_mode || "-"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Teacher Preference
                </p>

                <p className="mt-1 font-semibold">
                  {selectedRequirement.teacher_gender ||
                    "Any"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Preferred Languages
                </p>

                <p className="mt-1 font-semibold">
                  {selectedRequirement.preferred_languages?.join(
                    ", "
                  ) || "Not specified"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Classes Per Week
                </p>

                <p className="mt-1 font-semibold">
                  {selectedRequirement.classes_per_week ||
                    "-"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Preferred Time
                </p>

                <p className="mt-1 font-semibold">
                  {selectedRequirement.preferred_time || "-"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Preferred Days
                </p>

                <p className="mt-1 font-semibold">
                  {selectedRequirement.preferred_days || "-"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Monthly Budget
                </p>

                <p className="mt-1 font-semibold">
                  {formatBudget(
                    selectedRequirement.monthly_budget
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  City / Location
                </p>

                <p className="mt-1 font-semibold">
                  {selectedRequirement.city_location ||
                    "Not provided"}
                </p>
              </div>
            </div>

            {/* ADDITIONAL REQUIREMENT */}
            <div className="mt-5 rounded-xl bg-slate-50 p-5">
              <p className="text-xs text-slate-500">
                Additional Requirement
              </p>

              <p className="mt-2 leading-7 text-slate-700">
                {selectedRequirement.additional_requirement ||
                  "No additional requirement provided."}
              </p>
            </div>

            {/* ACTIONS */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() =>
                  setSelectedRequirement(null)
                }
                className="flex-1 rounded-xl border py-3 font-semibold hover:bg-slate-50"
              >
                Close
              </button>

              <button
                onClick={() => {
                  alert(
                    "Teacher matching will be added in the next step."
                  );
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
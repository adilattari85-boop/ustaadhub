"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  createGroupClass,
  fetchTeacherGroupClasses,
  softDeleteGroupClass,
  type GroupClass,
} from "@/lib/groupClasses";

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

const teachingModes = ["Online", "Offline", "Hybrid"] as const;

function toggleItem<T>(item: T, list: T[], setter: (value: T[]) => void) {
  if (list.includes(item)) {
    setter(list.filter((x) => x !== item));
  } else {
    setter([...list, item]);
  }
}

// Extracts readable Supabase/PostgREST error details (code/message/hint/details).
function describeError(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const errObj = err as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    const parts: string[] = [];
    if (typeof errObj.code === "string" && errObj.code) {
      parts.push(`code ${errObj.code}`);
    }
    if (typeof errObj.message === "string" && errObj.message) {
      parts.push(errObj.message);
    }
    if (typeof errObj.hint === "string" && errObj.hint) {
      parts.push(`hint: ${errObj.hint}`);
    }
    if (typeof errObj.details === "string" && errObj.details) {
      parts.push(`details: ${errObj.details}`);
    }
    if (parts.length > 0) {
      return parts.join(" — ");
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Something went wrong.";
}

function formatFee(fee: number | null): string {
  return fee === null || fee === undefined ? "—" : `₹${fee}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}
export default function TeacherGroupClassesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  const [profileId, setProfileId] = useState<string | null>(null);
  const [groupClasses, setGroupClasses] = useState<GroupClass[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user || user.user_metadata?.role !== "teacher") {
          router.replace("/login?role=teacher");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("teacher_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!profile) {
          if (isMounted) setError("Teacher profile not found.");
          return;
        }

        setProfileId(profile.id);
        await loadClasses(profile.id);
      } catch (err) {
        if (isMounted) setError(describeError(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void init();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function loadClasses(teacherId: string) {
    const { data, error: classError } = await fetchTeacherGroupClasses(
      teacherId
    );
    if (classError) throw classError;
    setGroupClasses((data ?? []) as GroupClass[]);
  }

  async function handleDeactivate(id: string) {
    if (
      !confirm(
        "Deactivate this group class? Students will no longer be able to join it."
      )
    ) {
      return;
    }

    setDeactivatingId(id);
    setActionError("");

    try {
      const { error } = await softDeleteGroupClass(id);
      if (error) throw error;
      setNotice("Group class deactivated.");
      setError("");
      if (profileId) {
        await loadClasses(profileId);
      }
    } catch (err) {
      setActionError(describeError(err));
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
<main className="mx-auto min-h-screen max-w-7xl bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Teacher Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Group Classes
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create and manage group classes for multiple students at once.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setActionError("");
            setNotice("");
            setShowCreate(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]"
        >
          + Create Group Class
        </button>
      </section>

      {error && (
        <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      )}

      {actionError && (
        <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {actionError}
        </div>
      )}
{/* List */}
      <section className="mt-8">
        {loading ? (
          <div className="py-10 text-center text-slate-500">
            Loading group classes...
          </div>
        ) : groupClasses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-lg font-semibold text-slate-700">
              No group classes yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Create your first group class to start teaching multiple students
              together.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
              <table className="w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Subjects
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Mode
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Fee
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Capacity
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {groupClasses.map((groupClass) => (
                    <tr key={groupClass.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {groupClass.title}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {groupClass.subjects?.length
                          ? groupClass.subjects.join(", ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {groupClass.teaching_mode}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatFee(groupClass.fee_monthly)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {groupClass.current_enrollment} / {" "}
                        {groupClass.max_students}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={groupClass.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(groupClass.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/teacher/dashboard/group-classes/${groupClass.id}`}
                          className="mr-3 inline-flex rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                        >
                          Manage
                        </Link>
                        <button
                          type="button"
                          disabled={deactivatingId === groupClass.id}
                          onClick={() => void handleDeactivate(groupClass.id)}
                          className="rounded-lg border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deactivatingId === groupClass.id
                            ? "Deactivating..."
                            : "Deactivate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
{/* Mobile cards */}
            <div className="space-y-4 md:hidden">
              {groupClasses.map((groupClass) => (
                <div
                  key={groupClass.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="break-words font-semibold text-slate-900">
                      {groupClass.title}
                    </p>
                    <StatusBadge status={groupClass.status} />
                  </div>

                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="shrink-0 font-semibold text-slate-500">
                        Subjects
                      </dt>
                      <dd className="text-right text-slate-600">
                        {groupClass.subjects?.length
                          ? groupClass.subjects.join(", ")
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="shrink-0 font-semibold text-slate-500">
                        Mode
                      </dt>
                      <dd className="text-slate-600">
                        {groupClass.teaching_mode}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="shrink-0 font-semibold text-slate-500">
                        Fee
                      </dt>
                      <dd className="text-slate-600">
                        {formatFee(groupClass.fee_monthly)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="shrink-0 font-semibold text-slate-500">
                        Capacity
                      </dt>
                      <dd className="text-slate-600">
                        {groupClass.current_enrollment} / {groupClass.max_students}{" "}
                        students
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="shrink-0 font-semibold text-slate-500">
                        Created
                      </dt>
                      <dd className="text-slate-600">
                        {formatDate(groupClass.created_at)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-col gap-2">
                    <Link
                      href={`/teacher/dashboard/group-classes/${groupClass.id}`}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Manage
                    </Link>
                    <button
                      type="button"
                      disabled={deactivatingId === groupClass.id}
                      onClick={() => void handleDeactivate(groupClass.id)}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-orange-300 px-4 py-2.5 text-sm font-semibold text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deactivatingId === groupClass.id
                        ? "Deactivating..."
                        : "Deactivate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {showCreate && (
        <CreateGroupClassModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            setNotice("Group class created.");
            setError("");
            if (profileId) {
              await loadClasses(profileId);
            }
          }}
        />
      )}
    </main>
  );
}
function StatusBadge({ status }: { status: GroupClass["status"] }) {
  const active = status === "active";
  const classes = active
    ? "bg-emerald-100 text-emerald-700"
    : status === "cancelled"
      ? "bg-rose-100 text-rose-700"
      : "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${classes}`}
    >
      {status}
    </span>
  );
}

function CreateGroupClassModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [teachingMode, setTeachingMode] = useState<string>("Online");
  const [maxStudents, setMaxStudents] = useState("20");
  const [feeMonthly, setFeeMonthly] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSuccess("");

    if (!title.trim()) {
      setFormError("Class title is required.");
      return;
    }
    if (subjects.length === 0) {
      setFormError("Select at least one subject.");
      return;
    }
    const max = Number(maxStudents);
    if (!Number.isInteger(max) || max <= 0) {
      setFormError("Maximum students must be a positive number.");
      return;
    }
    const fee = feeMonthly.trim() === "" ? null : Number(feeMonthly);
    if (fee !== null && (Number.isNaN(fee) || fee < 0)) {
      setFormError("Monthly fee cannot be negative.");
      return;
    }

    setCreating(true);
    try {
      const { error } = await createGroupClass({
        p_title: title.trim(),
        p_description: description.trim() || null,
        p_subjects: subjects,
        p_teaching_mode: teachingMode as "Online" | "Offline" | "Hybrid",
        p_max_students: max,
        p_fee_monthly: fee,
      });
      if (error) throw error;
      setSuccess("Group class created.");
      setTitle("");
      setDescription("");
      setSubjects([]);
      setTeachingMode("Online");
      setMaxStudents("20");
      setFeeMonthly("");
      setFormError("");
      await onCreated();
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setCreating(false);
    }
  }
return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Create Group Class</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Quran & Tajweed — Beginners"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description of the class"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </label>

          <div>
            <span className="text-sm font-medium text-slate-700">Subjects</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {subjectOptions.map((subject) => {
                const selected = subjects.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleItem(subject, subjects, setSubjects)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      selected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          </div>
<label className="block">
            <span className="text-sm font-medium text-slate-700">
              Teaching Mode
            </span>
            <select
              value={teachingMode}
              onChange={(e) => setTeachingMode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {teachingModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Maximum Students
              </span>
              <input
                type="number"
                min={1}
                value={maxStudents}
                onChange={(e) => setMaxStudents(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Monthly Fee (₹)
              </span>
              <input
                type="number"
                min={0}
                value={feeMonthly}
                onChange={(e) => setFeeMonthly(e.target.value)}
                placeholder="Optional"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </label>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Group Class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Match = {
  id: string;
  requirement_id: string;
  teacher_id: string;
  status: "connected" | "accepted" | "rejected" | "completed" | "cancelled";
};

type StudentRequirement = {
  id: string;
  parent_student_name: string | null;
  subjects: string[] | null;
  current_level: string | null;
  class_mode: string | null;
  preferred_time: string | null;
  preferred_days: string | null;
  status: string | null;
};

type StudentRow = StudentRequirement & {
  matchStatus: Match["status"];
};

export default function MyStudentsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
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
          setError("Teacher profile not found.");
          return;
        }

        const { data: matches, error: matchError } = await supabase
          .from("requirement_teacher_matches")
          .select("requirement_id, status")
          .eq("teacher_id", profile.id)
          .in("status", ["accepted", "connected"]);

        if (matchError) {
          throw matchError;
        }

        const activeMatches = (matches ?? []) as Pick<
          Match,
          "requirement_id" | "status"
        >[];

        if (activeMatches.length === 0) {
          setStudents([]);
          return;
        }

        const requirementIds = activeMatches.map(
          (match) => match.requirement_id,
        );

        const { data: requirements, error: requirementError } = await supabase
          .from("learning_requirements")
          .select(
            "id, parent_student_name, subjects, current_level, class_mode, preferred_time, preferred_days, status",
          )
          .in("id", requirementIds);

        if (requirementError) {
          throw requirementError;
        }

        const requirementMap = new Map(
          ((requirements ?? []) as StudentRequirement[]).map((req) => [
            req.id,
            req,
          ]),
        );

        const rows: StudentRow[] = [];
        activeMatches.forEach((match) => {
          const requirement = requirementMap.get(match.requirement_id);
          if (!requirement) {
            return;
          }
          rows.push({ ...requirement, matchStatus: match.status });
        });

        if (isMounted) {
          setStudents(rows);
        }
      } catch (err) {
        console.error("My Students load error:", err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your students.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadStudents();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const acceptedCount = students.filter((s) => s.matchStatus === "accepted")
    .length;
  const pendingCount = students.filter((s) => s.matchStatus === "connected")
    .length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-4 sm:px-6 sm:py-5">
          <Link href="/teacher/dashboard" className="whitespace-nowrap text-2xl font-bold text-blue-600 sm:text-3xl">
            UstaadHub
          </Link>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/login?role=teacher");
            }}
            className="whitespace-nowrap rounded-lg border bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 sm:px-4 sm:py-2 sm:text-base"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <p className="font-semibold text-blue-600">TEACHER DASHBOARD</p>
            <h1 className="mt-1 text-3xl font-bold md:text-4xl">My Students</h1>
            <p className="mt-2 text-slate-600">
              Students connected to you through accepted or pending requirements.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-md">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Accepted</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">
                {acceptedCount}
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Awaiting Response</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">
                {pendingCount}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            {loading ? (
              <div className="p-12 text-center">
                <div className="text-lg font-semibold">Loading students...</div>
                <p className="mt-2 text-sm text-slate-500">
                  Fetching your connected students.
                </p>
              </div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl">👨‍🎓</div>
                <h3 className="mt-4 text-xl font-bold">No students yet</h3>
                <p className="mt-2 mx-auto max-w-md text-slate-500">
                  When a student requirement is matched to you and you accept
                  it, the student will appear here.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left">
                    <thead className="border-b bg-slate-50 text-sm">
                      <tr>
                        <th className="px-5 py-4">Student</th>
                        <th className="px-5 py-4">Subjects</th>
                        <th className="px-5 py-4">Level</th>
                        <th className="px-5 py-4">Mode</th>
                        <th className="px-5 py-4">Timing</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Connect</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="px-5 py-5">
                            <p className="font-semibold break-words">
                              {student.parent_student_name || "Not provided"}
                            </p>
                          </td>

                          <td className="px-5 py-5">
                            <div className="max-w-[200px] break-words">
                              {student.subjects?.length
                                ? student.subjects.join(", ")
                                : "Not specified"}
                            </div>
                          </td>

                          <td className="px-5 py-5">
                            {student.current_level || "-"}
                          </td>

                          <td className="px-5 py-5">
                            {student.class_mode || "-"}
                          </td>

                          <td className="px-5 py-5">
                            <p>{student.preferred_time || "-"}</p>
                            {student.preferred_days && (
                              <p className="text-xs text-slate-500 break-words">
                                {student.preferred_days}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-5">
                            {student.matchStatus === "accepted" ? (
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                Accepted
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                                Waiting for teacher response
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-5">
                            <ClassConnectButton requirementId={student.id} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y">
                  {students.map((student) => (
                    <div key={student.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold break-words">
                            {student.parent_student_name || "Not provided"}
                          </p>
                          <span
                            className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-bold ${
                              student.matchStatus === "accepted"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {student.matchStatus === "accepted"
                              ? "Accepted"
                              : "Waiting for teacher response"}
                          </span>
                        </div>
                      </div>

                      <dl className="mt-3 space-y-2">
                        <Detail
                          label="Subjects"
                          value={
                            student.subjects?.length
                              ? student.subjects.join(", ")
                              : "Not specified"
                          }
                        />
                        <Detail
                          label="Level"
                          value={student.current_level || "-"}
                        />
                        <Detail
                          label="Mode"
                          value={student.class_mode || "-"}
                        />
                        <Detail
                          label="Timing"
                          value={student.preferred_time || "-"}
                          extra={student.preferred_days}
                        />
                      </dl>

                      <div className="mt-4">
                        <ClassConnectButton requirementId={student.id} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Detail({
  label,
  value,
  extra,
}: {
  label: string;
  value: string;
  extra?: string | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-sm font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-slate-900 break-words">
        <p>{value}</p>
        {extra && <p className="text-xs text-slate-500 break-words">{extra}</p>}
      </dd>
    </div>
  );
}

function ClassConnectButton({ requirementId }: { requirementId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] sm:w-auto"
      >
        📞 Class Connect
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">Class Connect</h3>
            <p className="mt-2 text-sm text-slate-600">
              Connect with this student to schedule and start their classes.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Student contact details are shared privately once the connection
              is confirmed.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <Link
                href={`/teacher/dashboard/requirements/${requirementId}`}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                View Requirement
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
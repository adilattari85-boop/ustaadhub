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
  matchId: string;
  teacherId: string;
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
          .select("id, requirement_id, status")
          .eq("teacher_id", profile.id)
          .in("status", ["accepted", "connected"]);

        if (matchError) {
          throw matchError;
        }

        const activeMatches = (matches ?? []) as Pick<
          Match,
          "id" | "requirement_id" | "status"
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
          rows.push({ ...requirement, matchStatus: match.status, matchId: match.id, teacherId: profile.id });
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
                            <ClassConnectButton requirementId={student.id} matchId={student.matchId} teacherId={student.teacherId} isAccepted={student.matchStatus === "accepted"} />
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
                        <ClassConnectButton requirementId={student.id} matchId={student.matchId} teacherId={student.teacherId} isAccepted={student.matchStatus === "accepted"} />
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

function ClassConnectButton({ requirementId, matchId, teacherId, isAccepted }: { requirementId: string; matchId: string; teacherId: string; isAccepted: boolean }) {
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
        <ClassSessionModal open={open} onClose={() => setOpen(false)} requirementId={requirementId} matchId={matchId} teacherId={teacherId} isAccepted={isAccepted} />
      )}
    </>
  );
}

type ClassSession = {
  id: string;
  title: string;
  join_link: string;
  scheduled_at: string | null;
  created_at: string;
};

function ClassSessionModal({ open, onClose, requirementId, matchId, teacherId, isAccepted }: {
  open: boolean;
  onClose: () => void;
  requirementId: string;
  matchId: string;
  teacherId: string;
  isAccepted: boolean;
}) {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [title, setTitle] = useState("");
  const [joinLink, setJoinLink] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && isAccepted) {
      fetchSessions();
    }
  }, [open, isAccepted]);

  async function fetchSessions() {
    setLoading(true);
    setError("");
    try {
      const { data, error: fetchError } = await supabase
        .from("class_sessions")
        .select("id, title, join_link, scheduled_at, created_at")
        .eq("match_id", matchId)
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;
      setSessions((data ?? []) as ClassSession[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load class sessions.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle("");
    setJoinLink("");
    setScheduledAt("");
    setEditingId(null);
  }

  function startEdit(session: ClassSession) {
    setEditingId(session.id);
    setTitle(session.title);
    setJoinLink(session.join_link);
    setScheduledAt(session.scheduled_at ? session.scheduled_at.slice(0, 16) : "");
  }

  function isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!title.trim()) { setError("Class title is required."); return; }
    if (!isValidUrl(joinLink)) { setError("Please enter a valid http/https meeting URL."); return; }
    setLoading(true);
    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from("class_sessions")
          .update({ title: title.trim(), join_link: joinLink.trim(), scheduled_at: scheduledAt || null })
          .eq("id", editingId);
        if (updateError) throw updateError;
        setSuccess("Class session updated.");
      } else {
        const { error: insertError } = await supabase
          .from("class_sessions")
          .insert({ match_id: matchId, requirement_id: requirementId, teacher_id: teacherId, title: title.trim(), join_link: joinLink.trim(), scheduled_at: scheduledAt || null });
        if (insertError) throw insertError;
        setSuccess("Class session created.");
      }
      resetForm();
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save class session.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(sessionId: string) {
    if (!confirm("Delete this class session?")) return;
    setLoading(true);
    setError("");
    try {
      const { error: deleteError } = await supabase.from("class_sessions").delete().eq("id", sessionId);
      if (deleteError) throw deleteError;
      setSuccess("Class session deleted.");
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setLoading(false);
    }
  }

  function formatScheduled(dateStr: string | null): string {
    if (!dateStr) return "Not scheduled";
    return new Date(dateStr).toLocaleString();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Class Sessions</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        {!isAccepted && (
          <p className="mt-3 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">You must accept this requirement before creating class sessions.</p>
        )}
        {isAccepted && (
          <>
            <form onSubmit={handleSave} className="mt-4 space-y-3 border-t pt-4">
              <p className="text-sm font-semibold text-slate-700">{editingId ? "Edit Class" : "Create Class Link"}</p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Class Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Quran Recitation - Week 1" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Meeting URL</label>
                <input type="url" value={joinLink} onChange={(e) => setJoinLink(e.target.value)} placeholder="https://meet.google.com/... or https://zoom.us/j/..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Scheduled Date/Time (optional)</label>
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-emerald-600">{success}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{loading ? "Saving..." : editingId ? "Update" : "Create"}</button>
                {editingId && <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel Edit</button>}
              </div>
            </form>
            <div className="mt-4 border-t pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">Existing Classes ({sessions.length})</p>
              {loading && sessions.length === 0 && <p className="text-sm text-slate-500">Loading...</p>}
              {!loading && sessions.length === 0 && <p className="text-sm text-slate-500">No class sessions yet. Create one above.</p>}
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div key={session.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate">{session.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatScheduled(session.scheduled_at)}</p>
                      </div>
                      <a href={session.join_link} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Open Class</a>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => startEdit(session)} className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button type="button" onClick={() => handleDelete(session.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  );
}

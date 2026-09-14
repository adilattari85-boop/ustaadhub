"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  addGroupMembers,
  cancelGroupSession,
  createGroupSession,
  fetchGroupClass,
  fetchGroupClassSessions,
  fetchTeacherAcceptedStudents,
  listGroupClassMembers,
  removeGroupMember,
  type AcceptedStudent,
  type GroupClass,
  type GroupClassMember,
  type GroupClassSession,
  type GroupClassSessionStatus,
} from "@/lib/groupClasses";

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

function shortStudentId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function MemberStatusBadge({ status }: { status: GroupClassMember["status"] }) {
  const classes =
    status === "joined"
      ? "bg-emerald-100 text-emerald-700"
      : status === "left"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${classes}`}
    >
      {status}
    </span>
  );
}

function SessionStatusBadge({ status }: { status: GroupClassSessionStatus }) {
  const classes =
    status === "scheduled"
      ? "bg-sky-100 text-sky-700"
      : status === "completed"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-rose-100 text-rose-700";
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${classes}`}
    >
      {status}
    </span>
  );
}

export default function GroupClassDetailPage() {
  const params = useParams<{ id: string }>();
  const groupClassId = params.id;
  const router = useRouter();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [groupClass, setGroupClass] = useState<GroupClass | null>(null);
  const [members, setMembers] = useState<GroupClassMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [sessions, setSessions] = useState<GroupClassSession[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(
    null
  );
  const [cancelError, setCancelError] = useState("");

  const joinedIds = useMemo(
    () =>
      members
        .filter((m) => m.status === "joined")
        .map((m) => m.student_user_id),
    [members]
  );
  const remaining = Math.max(
    0,
    (groupClass?.max_students ?? 0) - (groupClass?.current_enrollment ?? 0)
  );

  async function loadData() {
    setLoading(true);
    try {
      const { data, error: classError } = await fetchGroupClass(groupClassId);
      if (classError) throw classError;
      if (!data) {
        setLoadError("Group class not found or is no longer active.");
        return;
      }
      setGroupClass(data as GroupClass);

      const { data: memberRows, error: membersError } =
        await listGroupClassMembers(groupClassId);
      if (membersError) throw membersError;
      setMembers((memberRows ?? []) as GroupClassMember[]);

      const { data: sessionRows, error: sessionsError } =
        await fetchGroupClassSessions(groupClassId);
      if (sessionsError) throw sessionsError;
      setSessions((sessionRows ?? []) as GroupClassSession[]);
    } catch (err) {
      setLoadError(describeError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function init() {
      setLoading(true);
      setLoadError("");

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
          if (isMounted) setLoadError("Teacher profile not found.");
          return;
        }

        if (isMounted) setProfileId(profile.id);
        await loadData();
      } catch (err) {
        if (isMounted) setLoadError(describeError(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void init();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, groupClassId]);

  async function handleRemove(studentName: string | null, studentUserId: string) {
    if (
      !confirm(
        `Remove ${studentName || `student ${shortStudentId(studentUserId)}`} from this group class?`
      )
    ) {
      return;
    }

    setRemoveId(studentUserId);
    setRemoveError("");

    try {
      const { error } = await removeGroupMember(groupClassId, studentUserId);
      if (error) throw error;
      setNotice("Student removed from the group class.");
      setLoadError("");
      await loadData();
    } catch (err) {
      setRemoveError(describeError(err));
    } finally {
      setRemoveId(null);
    }
  }

  const upcomingSessions = sessions
    .filter((session) => session.status === "scheduled")
    .sort(
      (a, b) =>
        (a.scheduled_at ? Date.parse(a.scheduled_at) : Infinity) -
        (b.scheduled_at ? Date.parse(b.scheduled_at) : Infinity)
    );
  const pastSessions = sessions
    .filter((session) => session.status !== "scheduled")
    .sort(
      (a, b) =>
        (b.scheduled_at ? Date.parse(b.scheduled_at) : 0) -
        (a.scheduled_at ? Date.parse(a.scheduled_at) : 0)
    );

  async function handleCancelSession(sessionId: string) {
    if (!confirm("Cancel this session? This cannot be undone.")) {
      return;
    }

    setCancellingSessionId(sessionId);
    setCancelError("");

    try {
      const { error } = await cancelGroupSession(sessionId);
      if (error) throw error;
      setNotice("Session cancelled.");
      setCancelError("");
      await loadData();
    } catch (err) {
      setCancelError(describeError(err));
    } finally {
      setCancellingSessionId(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/teacher/dashboard/group-classes"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Back to Group Classes
        </Link>
      </div>

      <section className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Teacher Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            {loading ? "Group Class" : groupClass?.title || "Group Class"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage members for this group class.
          </p>
        </div>

        <button
          type="button"
          disabled={remaining < 1}
          onClick={() => {
            setNotice("");
            setRemoveError("");
            setShowAdd(true);
          }}
          title={
            remaining < 1
              ? "This group class is full."
              : "Add accepted students from My Students"
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add Students from My Students
        </button>
      </section>

      {loadError && (
        <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      {notice && (
        <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      )}

      {removeError && (
        <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {removeError}
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Subjects
            </dt>
            <dd className="mt-1 text-sm text-slate-700">
              {groupClass?.subjects?.length
                ? groupClass.subjects.join(", ")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Teaching Mode
            </dt>
            <dd className="mt-1 text-sm text-slate-700">
              {groupClass?.teaching_mode ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Monthly Fee
            </dt>
            <dd className="mt-1 text-sm text-slate-700">
              {formatFee(groupClass?.fee_monthly ?? null)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Capacity
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">
              {groupClass ? `${groupClass.max_students} students` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Enrollment
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">
              {groupClass
                ? `${groupClass.current_enrollment} / ${groupClass.max_students} joined`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">
              Remaining Seats
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">
              {groupClass ? remaining : "—"}
            </dd>
          </div>
        </dl>
      </section>
      {/* Members */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">Members</h2>
        <p className="mt-1 text-sm text-slate-600">
          {groupClass
            ? `${joinedIds.length} joined of ${groupClass.max_students} seats`
            : ""}
        </p>

        {loading ? (
          <div className="mt-4 py-10 text-center text-slate-500">
            Loading members...
          </div>
        ) : members.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-lg font-semibold text-slate-700">
              No members yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Use “Add Students from My Students” to add accepted students.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Joined At
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Left At
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {shortStudentId(member.student_user_id)}
                    </td>
                    <td className="px-4 py-3">
                      <MemberStatusBadge status={member.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {member.joined_at
                        ? new Date(member.joined_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {member.left_at
                        ? new Date(member.left_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {member.status === "joined" && (
                        <button
                          type="button"
                          disabled={removeId === member.student_user_id}
                          onClick={() =>
                            void handleRemove(null, member.student_user_id)
                          }
                          className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {removeId === member.student_user_id
                            ? "Removing..."
                            : "Remove"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sessions */}
      <section className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sessions</h2>
            <p className="mt-1 text-sm text-slate-600">
              {sessions.length === 1
                ? "1 session for this class"
                : `${sessions.length} sessions for this class`}
            </p>
          </div>
          <button
            type="button"
            disabled={loading || cancellingSessionId !== null}
            onClick={() => {
              setCancelError("");
              setShowSchedule(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Schedule Session
          </button>
        </div>

        {cancelError && (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {cancelError}
          </div>
        )}

        {loading ? (
          <div className="mt-4 py-10 text-center text-slate-500">
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-lg font-semibold text-slate-700">
              No sessions yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Use “Schedule Session” to plan the first class meeting.
            </p>
          </div>
        ) : (
          <>
            {/* Upcoming */}
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-700">Upcoming</p>
              <div className="mt-2 space-y-3">
                {upcomingSessions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                    No upcoming sessions scheduled.
                  </div>
                ) : (
                  upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {session.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {session.scheduled_at
                              ? new Date(session.scheduled_at).toLocaleString()
                              : "Not scheduled"}{" "}
                            · {session.duration_minutes} min
                          </p>
                          {session.notes && (
                            <p className="mt-1 text-sm text-slate-600">
                              Notes: {session.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <SessionStatusBadge status={session.status} />
                          {session.join_link && (
                            <a
                              href={session.join_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Join
                            </a>
                          )}
                          <button
                            type="button"
                            disabled={cancellingSessionId === session.id}
                            onClick={() =>
                              void handleCancelSession(session.id)
                            }
                            className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {cancellingSessionId === session.id
                              ? "Cancelling..."
                              : "Cancel"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Past */}
            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-700">Past</p>
              <div className="mt-2 space-y-3">
                {pastSessions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                    No past sessions.
                  </div>
                ) : (
                  pastSessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm opacity-90"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {session.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {session.scheduled_at
                              ? new Date(session.scheduled_at).toLocaleString()
                              : "Not scheduled"}{" "}
                            · {session.duration_minutes} min
                          </p>
                          {session.notes && (
                            <p className="mt-1 text-sm text-slate-600">
                              Notes: {session.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <SessionStatusBadge status={session.status} />
                          {session.join_link && (
                            <a
                              href={session.join_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Join
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </section>
      {showAdd && (
        <AddStudentsModal
          remaining={remaining}
          joinedIds={joinedIds}
          profileId={profileId}
          groupClassId={groupClassId}
          onClose={() => setShowAdd(false)}
          onAdded={async (addedCount) => {
            setShowAdd(false);
            setNotice(
              addedCount === 1
                ? "1 student added to the group class."
                : `${addedCount} students added to the group class.`
            );
            setRemoveError("");
            await loadData();
          }}
        />
      )}
      {showSchedule && (
        <ScheduleSessionModal
          groupClassId={groupClassId}
          onClose={() => setShowSchedule(false)}
          onScheduled={async () => {
            setShowSchedule(false);
            setNotice("Session scheduled.");
            setCancelError("");
            await loadData();
          }}
        />
      )}
    </main>
  );
}

function AddStudentsModal({
  remaining,
  joinedIds,
  profileId,
  groupClassId,
  onClose,
  onAdded,
}: {
  remaining: number;
  joinedIds: string[];
  profileId: string | null;
  groupClassId: string;
  onClose: () => void;
  onAdded: (addedCount: number) => Promise<void>;
}) {
  const [students, setStudents] = useState<AcceptedStudent[] | null>(null);
  const [studentsError, setStudentsError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      setStudents(null);
      setStudentsError("");
      setSelected([]);
      setConfirming(false);

      if (!profileId) {
        setStudentsError("Teacher profile not found.");
        setStudents([]);
        return;
      }

      const { data, error } = await fetchTeacherAcceptedStudents(profileId);

      if (isMounted) {
        if (error) {
          setStudentsError(describeError(error));
          setStudents([]);
        } else {
          setStudents(data ?? []);
        }
      }
    }

    void loadStudents();

    return () => {
      isMounted = false;
    };
  }, [profileId]);

  function toggleStudent(studentUserId: string) {
    if (joinedIds.includes(studentUserId)) {
      return;
    }
    if (selected.includes(studentUserId)) {
      setSelected((current) => current.filter((id) => id !== studentUserId));
    } else if (selected.length < remaining) {
      setSelected((current) => [...current, studentUserId]);
    }
  }

  async function handleAdd() {
    setAddError("");

    if (selected.length === 0) {
      setAddError("Select at least one student.");
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await addGroupMembers(groupClassId, selected);
      if (error) throw error;
      setSelected([]);
      await onAdded(data ?? 0);
    } catch (err) {
      setAddError(describeError(err));
    } finally {
      setAdding(false);
    }
  }

  const selectable = (students ?? []).filter(
    (student) => !joinedIds.includes(student.user_id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        {confirming ? (
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Confirm Addition</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-2xl leading-none text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Add{" "}
              {selected.length === 1
                ? "1 student"
                : `${selected.length} students`}{" "}
              to this group class?
            </p>
<ul className="mt-3 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              {selected.map((studentUserId) => {
                const student = (students ?? []).find(
                  (s) => s.user_id === studentUserId
                );
                return (
                  <li key={studentUserId} className="font-medium text-slate-700">
                    {student?.parent_student_name ||
                      `Student ${shortStudentId(studentUserId)}`}
                  </li>
                );
              })}
            </ul>

            {addError && (
              <p className="mt-3 text-sm text-red-600">{addError}</p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={adding}
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={adding}
                onClick={() => void handleAdd()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add Students"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                Add Students from My Students
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-2xl leading-none text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Remaining capacity:{" "}
              <span className="font-semibold text-slate-900">{remaining}</span>{" "}
              {remaining === 1 ? "seat" : "seats"}
            </p>

            {studentsError && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
                {studentsError}
              </div>
            )}

            <div className="mt-4 max-h-[45vh] space-y-2 overflow-y-auto border-t pt-4">
              {students === null ? (
                <p className="py-6 text-center text-slate-500">
                  Loading accepted students...
                </p>
              ) : selectable.length === 0 ? (
                <p className="py-6 text-center text-slate-500">
                  No accepted students available to add.
                </p>
              ) : (
                selectable.map((student) => {
                  const checked = selected.includes(student.user_id);
                  const capacityReached =
                    !checked && selected.length >= remaining;
                  return (
                    <label
                      key={student.requirement_id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                        checked
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:bg-slate-50"
                      } ${capacityReached ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={capacityReached}
                        onChange={() => toggleStudent(student.user_id)}
                        className="mt-1 h-4 w-4 shrink-0"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-900">
                          {student.parent_student_name || "Not provided"}
                        </span>
                        <span className="block text-slate-600">
                          Subjects:{" "}
                          {student.subjects?.length
                            ? student.subjects.join(", ")
                            : "—"}
                        </span>
                        <span className="block text-slate-600">
                          Level: {student.current_level || "—"} · Mode:{" "}
                          {student.class_mode || "—"}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {addError && (
              <p className="mt-3 text-sm text-red-600">{addError}</p>
            )}

            <div className="mt-5 flex items-center justify-between gap-2">
              <p className="text-sm text-slate-600">
                Selected:{" "}
                {selected.length === 1
                  ? "1 student"
                  : `${selected.length} students`}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selected.length === 0}
                  onClick={() => setConfirming(true)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Review Selection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleSessionModal({
  groupClassId,
  onClose,
  onScheduled,
}: {
  groupClassId: string;
  onClose: () => void;
  onScheduled: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [joinLink, setJoinLink] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Session title is required.");
      return;
    }
    if (!scheduledAt) {
      setError("Scheduled date/time is required.");
      return;
    }
    const duration = Number(durationMinutes);
    if (!durationMinutes || Number.isNaN(duration) || duration <= 0) {
      setError("Duration must be a positive number (minutes).");
      return;
    }
    if (joinLink.trim() && !isValidUrl(joinLink.trim())) {
      setError("Join link must be a valid http/https URL.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: rpcError } = await createGroupSession({
        p_group_class_id: groupClassId,
        p_title: title.trim(),
        p_join_link: joinLink.trim(),
        p_scheduled_at: scheduledAt || null,
        p_duration_minutes: duration,
        p_notes: notes.trim() || null,
      });
      if (rpcError) throw rpcError;
      if (!data) {
        throw new Error("No session was created.");
      }
      setTitle("");
      setScheduledAt("");
      setDurationMinutes("");
      setJoinLink("");
      setNotes("");
      await onScheduled();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Schedule Session</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Session Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Algebra Basics"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Scheduled Date/Time <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Duration (minutes) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="e.g. 60"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Join Link{" "}
              <span className="text-xs font-normal text-slate-500">
                (optional, http/https)
              </span>
            </label>
            <input
              type="url"
              value={joinLink}
              onChange={(e) => setJoinLink(e.target.value)}
              placeholder="https://meet.example.com/..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Notes{" "}
              <span className="text-xs font-normal text-slate-500">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Agenda, materials, instructions..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Scheduling..." : "Schedule Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
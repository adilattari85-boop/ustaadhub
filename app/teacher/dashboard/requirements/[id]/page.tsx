"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MatchedTeacherSection from "@/components/MatchedTeacherSection";

type Requirement = {
  id: string;
  parent_student_name: string | null;
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
  additional_requirement: string | null;
  status: string | null;
  created_at: string;
};

type Match = {
  id: string;
  requirement_id: string;
  teacher_id: string;
  status: string;
};

export default function TeacherRequirementPage() {
  const router = useRouter();
  const params = useParams();

  const requirementId = params.id as string;

  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [match, setMatch] = useState<Match | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRequirement() {
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

        const { data: matchData, error: matchError } = await supabase
          .from("requirement_teacher_matches")
          .select("id, requirement_id, teacher_id, status")
          .eq("requirement_id", requirementId)
          .eq("teacher_id", user.id)
          .maybeSingle();

        if (matchError) {
          throw matchError;
        }

        if (!matchData) {
          setError(
            "You are not connected with this student requirement.",
          );
          return;
        }

        setMatch(matchData as Match);

        const { data: requirementData, error: requirementError } =
          await supabase
            .from("learning_requirements")
            .select(
              `
                id,
                parent_student_name,
                student_age,
                student_gender,
                subjects,
                current_level,
                class_mode,
                teacher_gender,
                preferred_languages,
                classes_per_week,
                preferred_time,
                preferred_days,
                additional_requirement,
                status,
                created_at
              `,
            )
            .eq("id", requirementId)
            .maybeSingle();

        if (requirementError) {
          throw requirementError;
        }

        if (!requirementData) {
          setError("Student requirement not found.");
          return;
        }

        setRequirement(requirementData as Requirement);

        // Mark any notification for this requirement as read for the
        // currently logged-in teacher (mirrors the admin detail route).
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", user.id)
          .eq("related_requirement_id", requirementId);
      } catch (err) {
        console.error("Requirement load error:", err);
        setError("Unable to load this student requirement.");
      } finally {
        setLoading(false);
      }
    }

    void loadRequirement();
  }, [requirementId, router]);

  async function handleMatchAction(response: "accepted" | "rejected") {
    if (!match) {
      return;
    }

    const message =
      response === "accepted"
        ? "Are you sure you want to accept this student requirement?"
        : "Are you sure you want to reject this student requirement?";

    if (!window.confirm(message)) {
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login?role=teacher");
        return;
      }

      const { error: rpcError } = await supabase.rpc(
        "teacher_respond_to_requirement",
        {
          p_requirement_id: match.requirement_id,
          p_response: response,
        },
      );

      if (rpcError) {
        throw rpcError;
      }

      alert(
        response === "accepted"
          ? "Requirement accepted successfully."
          : "Requirement rejected.",
      );

      router.push("/teacher/dashboard");
    } catch (err) {
      console.error("Requirement response error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update this requirement. Please try again.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-14 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <p>Loading student requirement...</p>
        </div>
      </main>
    );
  }

  if (error || !requirement || !match) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-14 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => router.push("/teacher/dashboard")}
            className="mb-6 rounded-xl border bg-white px-4 py-2 font-semibold hover:bg-slate-50"
          >
            ← Back to Dashboard
          </button>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error || "Requirement could not be loaded."}
          </div>
        </div>
      </main>
    );
  }

  const isAccepted = match.status === "accepted";
  const isRejected = match.status === "rejected";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() => router.push("/teacher/dashboard")}
            className="text-2xl font-bold text-blue-600"
          >
            UstaadHub
          </button>

          <button
            type="button"
            onClick={() => router.push("/teacher/dashboard")}
            className="rounded-xl border bg-white px-4 py-2 font-semibold hover:bg-slate-50"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <section className="px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <p className="font-semibold text-blue-600">
              STUDENT REQUIREMENT
            </p>

            <h1 className="mt-2 text-3xl font-bold">
  Student Requirement
</h1>

            <p className="mt-2 text-slate-500">
              Review the requirement and choose whether you want to
              accept or reject it.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Student Information */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                Student Information
              </h2>

              <div className="mt-5 space-y-4">

                <InfoRow
                  label="Age"
                  value={
                    requirement.student_age !== null
                      ? String(requirement.student_age)
                      : null
                  }
                />

                <InfoRow
                  label="Gender"
                  value={requirement.student_gender}
                />

               

              
              </div>
            </div>

            {/* Academic Requirement */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                Academic Requirement
              </h2>

              <div className="mt-5 space-y-4">
                <InfoRow
                  label="Subjects"
                  value={
                    requirement.subjects?.length
                      ? requirement.subjects.join(", ")
                      : null
                  }
                />

                <InfoRow
                  label="Current Level"
                  value={requirement.current_level}
                />

                <InfoRow
                  label="Class Mode"
                  value={requirement.class_mode}
                />

                <InfoRow
                  label="Preferred Teacher Gender"
                  value={requirement.teacher_gender}
                />

                <InfoRow
                  label="Languages"
                  value={
                    requirement.preferred_languages?.length
                      ? requirement.preferred_languages.join(", ")
                      : null
                  }
                />
              </div>
            </div>

            {/* Schedule & Budget */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                Schedule & Budget
              </h2>

              <div className="mt-5 space-y-4">
                <InfoRow
                  label="Classes per Week"
                  value={requirement.classes_per_week}
                />

                <InfoRow
                  label="Preferred Days"
                  value={requirement.preferred_days}
                />

                <InfoRow
                  label="Preferred Time"
                  value={requirement.preferred_time}
                />
              </div>
            </div>

            {/* Additional Requirement */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                Additional Requirement
              </h2>

              <p className="mt-5 whitespace-pre-wrap text-slate-600">
                {requirement.additional_requirement ||
                  "No additional requirement provided."}
              </p>
            </div>
          </div>

          <MatchedTeacherSection requirementId={requirement.id} />

          {/* Decision Area */}
          <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  YOUR RESPONSE
                </p>

                <p className="mt-1 text-lg font-bold">
                  {isAccepted
                    ? "You accepted this requirement."
                    : isRejected
                      ? "You rejected this requirement."
                      : "Response required"}
                </p>
              </div>

              {!isAccepted && !isRejected && (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleMatchAction("rejected")}
                    className="rounded-xl border border-red-300 bg-white px-5 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {actionLoading ? "Please wait..." : "Reject"}
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleMatchAction("accepted")}
                    className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Please wait..." : "Accept Student"}
                  </button>
                </div>
              )}

              {isAccepted && (
                <button
                  type="button"
                  onClick={() => router.push("/teacher/dashboard")}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  Go to Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-base text-slate-900">
        {value || "Not provided"}
      </p>
    </div>
  );
}
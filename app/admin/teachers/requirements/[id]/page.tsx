"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Requirement = {
  id: string;
  parent_student_name: string | null;
  status: string | null;
  [key: string]: unknown;
};

export default function TeacherRequirementPage() {
  const params = useParams();
  const router = useRouter();

  const requirementId = params.id as string;

  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRequirement() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login?role=teacher");
          return;
        }

        // Explicit non-sensitive columns only: never expose the student's
        // mobile number or other private contact details here.
        const { data, error: requirementError } = await supabase
          .from("learning_requirements")
          .select(
            "id, parent_student_name, student_age, student_gender, subjects, current_level, class_mode, teacher_gender, preferred_languages, classes_per_week, preferred_time, preferred_days, additional_requirement, status, created_at"
          )
          .eq("id", requirementId)
          .maybeSingle();

        if (requirementError) {
          throw requirementError;
        }

        if (!data) {
          setError("Requirement not found or you do not have access to it.");
          return;
        }

        setRequirement(data as Requirement);

        // Notification ko read mark karo
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", user.id)
          .eq("related_requirement_id", requirementId);

      } catch (err) {
        console.error("Requirement load error:", err);
        setError("Unable to load this requirement.");
      } finally {
        setLoading(false);
      }
    }

    if (requirementId) {
      void loadRequirement();
    }
  }, [requirementId, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl">
          Loading requirement...
        </div>
      </main>
    );
  }

  if (error || !requirement) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-red-600">
              Requirement unavailable
            </h1>

            <p className="mt-3 text-slate-600">
              {error || "Requirement not found."}
            </p>

            <button
              type="button"
              onClick={() => router.push("/teacher/dashboard")}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <h1 className="text-2xl font-bold text-blue-600">
            UstaadHub
          </h1>

          <button
            type="button"
            onClick={() => router.push("/teacher/dashboard")}
            className="rounded-xl border px-4 py-2 font-semibold hover:bg-slate-50"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <section className="px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border bg-white p-8 shadow-sm">

            <p className="font-semibold text-blue-600">
              STUDENT REQUIREMENT
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              New Student Requirement
            </h2>

            <div className="mt-8 grid gap-5 md:grid-cols-2">

              <div className="rounded-xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  Student / Parent Name
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {requirement.parent_student_name || "Not provided"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  Requirement Status
                </p>

                <p className="mt-1 text-lg font-semibold capitalize">
                  {requirement.status || "Pending"}
                </p>
              </div>

            </div>

            <div className="mt-8">
              <h3 className="text-xl font-bold">
                Requirement Details
              </h3>

              <div className="mt-4 overflow-x-auto rounded-xl border">
                <pre className="whitespace-pre-wrap p-5 text-sm text-slate-700">
                  {JSON.stringify(requirement, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/teacher/dashboard")}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
              >
                Back to Dashboard
              </button>

              <button
                type="button"
                className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
              >
                Accept Requirement
              </button>

              <button
                type="button"
                className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
              >
                Reject Requirement
              </button>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}
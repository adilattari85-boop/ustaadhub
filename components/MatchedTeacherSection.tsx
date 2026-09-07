"use client";

import { useEffect, useState } from "react";
import {
  fetchActiveMatchedTeacher,
  type MatchedTeacherInfo,
} from "@/lib/requirementMatch";

// Shows the active teacher match for a requirement.
// - match.status === "accepted"  -> "Matched Teacher" + "Match status: Accepted"
// - match.status === "connected" -> "Connected Teacher" + "Waiting for teacher response"
// - rejected / no match          -> renders nothing (never shows a declined teacher)
// Renders nothing on load failure so existing pages keep working unchanged.
export default function MatchedTeacherSection({
  requirementId,
}: {
  requirementId: string;
}) {
  const [match, setMatch] = useState<MatchedTeacherInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setLoading(true);
    setMatch(null);

    fetchActiveMatchedTeacher(requirementId)
      .then((result) => {
        if (isMounted) {
          setMatch(result);
        }
      })
      .catch((error) => {
        console.error("Matched teacher load error:", error);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [requirementId]);

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm text-slate-500">Checking teacher match...</p>
      </div>
    );
  }

  if (!match) {
    return null;
  }

  const isAccepted = match.matchStatus === "accepted";

  return (
    <div
      className={`mt-6 rounded-2xl border p-5 ${
        isAccepted
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {isAccepted ? "Matched Teacher" : "Connected Teacher"}
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {match.fullName || "Teacher"}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            {match.qualification || "Qualification not specified"}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            {match.subjects?.length
              ? match.subjects.join(", ")
              : "Subjects not specified"}
          </p>
        </div>

        <span
          className={`self-start rounded-full px-3 py-1 text-xs font-bold ${
            isAccepted
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {isAccepted ? "Match status: Accepted" : "Waiting for teacher response"}
        </span>
      </div>
    </div>
  );
}

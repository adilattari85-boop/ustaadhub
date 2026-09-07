import { supabase } from "@/lib/supabase";

export type MatchedTeacherInfo = {
  matchId: string;
  // Active match status only: "connected" (awaiting response) or "accepted".
  // Rejected / completed / cancelled matches are never returned.
  matchStatus: string;
  teacherId: string;
  fullName: string | null;
  qualification: string | null;
  subjects: string[] | null;
};

// Resolves the active teacher match for a requirement using the existing
// requirement_teacher_matches relationship (no duplicated matching logic).
// - "accepted" matches win over "connected" ones.
// - Rejected / completed / cancelled matches are excluded, so a teacher who
//   declined is never displayed as the matched teacher.
// - Teacher details come from teacher_profiles via the match's teacher_id.
export async function fetchActiveMatchedTeacher(
  requirementId: string,
): Promise<MatchedTeacherInfo | null> {
  const { data: matches, error: matchError } = await supabase
    .from("requirement_teacher_matches")
    .select("id, teacher_id, status")
    .eq("requirement_id", requirementId)
    .in("status", ["connected", "accepted"]);

  if (matchError) {
    throw matchError;
  }

  if (!matches || matches.length === 0) {
    return null;
  }

  const sorted = [...(matches as Array<{ id: string; teacher_id: string; status: string }>)].sort(
    (a, b) => {
      if (a.status === b.status) {
        return 0;
      }
      return a.status === "accepted" ? -1 : 1;
    },
  );

  const match = sorted[0];

  const { data: teacher, error: teacherError } = await supabase
    .from("teacher_profiles")
    .select("id, full_name, qualification, subjects")
    .eq("id", match.teacher_id)
    .maybeSingle();

  if (teacherError) {
    throw teacherError;
  }

  return {
    matchId: match.id,
    matchStatus: match.status,
    teacherId: match.teacher_id,
    fullName: teacher?.full_name ?? null,
    qualification: teacher?.qualification ?? null,
    subjects: teacher?.subjects ?? null,
  };
}

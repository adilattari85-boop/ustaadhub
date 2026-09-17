import { supabase } from "@/lib/supabase";

export const TEACHER_COMPLETE_PROFILE_PATH = "/teacher/complete-profile";

export type TeacherProfileLookup = {
  profileId: string | null;
  error: string;
};

export function isTeacherCompleteProfilePath(path: string | null): boolean {
  if (!path) {
    return false;
  }

  return path === TEACHER_COMPLETE_PROFILE_PATH || path.startsWith(`${TEACHER_COMPLETE_PROFILE_PATH}/`);
}

// Reads the authenticated teacher's own teacher_profiles row.
//
// teacher_profiles.user_id is UNIQUE, so at most one row can match. `maybeSingle`
// returns { data: null, error: null } when the row is missing, which is the
// signal used to detect an incomplete (orphaned) teacher account.
//
// Callers must only treat a successful lookup with profileId === null as proof
// that the profile does not exist; a lookup error is not proof of absence.
export async function fetchTeacherProfileId(
  userId: string
): Promise<TeacherProfileLookup> {
  const { data, error } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { profileId: null, error: error.message };
  }

  const row = data as { id: string } | null;

  return { profileId: row?.id ?? null, error: "" };
}
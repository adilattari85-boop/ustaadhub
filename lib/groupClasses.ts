import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Group Classes — data access (Phase 10G-1: teacher create / list / deactivate)
// Wrappers call the exact migration RPCs and the teacher-scoped SELECT policy.
// ---------------------------------------------------------------------------

// ---------- Types ----------

export type GroupClassStatus = "active" | "cancelled" | "completed";

export type TeachingMode = "Online" | "Offline" | "Hybrid";

// Row shape returned by fetchTeacherGroupClasses.
export type GroupClass = {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  subjects: string[];
  teaching_mode: TeachingMode;
  max_students: number;
  current_enrollment: number;
  fee_monthly: number | null;
  status: GroupClassStatus;
  created_at: string;
};

// Exact parameter names of create_group_class(...).
export type CreateGroupClassInput = {
  p_title: string;
  p_description?: string | null;
  p_subjects: string[];
  p_teaching_mode: TeachingMode;
  p_max_students: number;
  p_fee_monthly?: number | null;
};

// ---------- RPC wrappers (exact migration signatures) ----------

// create_group_class(...) returns uuid
export function createGroupClass(input: CreateGroupClassInput) {
  return supabase.rpc("create_group_class", input);
}

// soft_delete_group_class(p_group_class_id) returns boolean
export function softDeleteGroupClass(p_group_class_id: string) {
  return supabase.rpc("soft_delete_group_class", { p_group_class_id });
}

// Teacher-owned rows only (scoped by the teacher RLS policy +
// explicit teacher_id filter); soft-deleted classes are hidden.
export function fetchTeacherGroupClasses(teacherId: string) {
  return supabase
    .from("group_classes")
    .select(
      "id, teacher_id, title, description, subjects, teaching_mode, max_students, current_enrollment, fee_monthly, status, created_at"
    )
    .eq("teacher_id", teacherId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}
// ---------------------------------------------------------------------------
// P2: student/member management (Phase 10G-2)
// ---------------------------------------------------------------------------

export type GroupClassMemberStatus = "joined" | "left" | "removed";

export type GroupClassMember = {
  id: string;
  group_class_id: string;
  student_user_id: string;
  status: GroupClassMemberStatus;
  joined_at: string;
  left_at: string | null;
  created_at: string;
  updated_at: string;
};

// An accepted student from My Students (requirement_teacher_matches +
// learning_requirements). user_id maps to group_class_members.student_user_id.
export type AcceptedStudent = {
  requirement_id: string;
  user_id: string;
  parent_student_name: string | null;
  subjects: string[] | null;
  current_level: string | null;
  class_mode: string | null;
};

// Loads the teacher's own active (non-deleted) group class row.
export function fetchGroupClass(groupClassId: string) {
  return supabase
    .from("group_classes")
    .select(
      "id, teacher_id, title, description, subjects, teaching_mode, max_students, current_enrollment, fee_monthly, status, created_at"
    )
    .eq("id", groupClassId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
}

// All membership rows for a class (teacher RLS policy scopes read access).
export function listGroupClassMembers(groupClassId: string) {
  return supabase
    .from("group_class_members")
    .select(
      "id, group_class_id, student_user_id, status, joined_at, left_at, created_at, updated_at"
    )
    .eq("group_class_id", groupClassId)
    .order("joined_at", { ascending: false });
}

// Accepted requirements for this teacher, deduplicated by student user id.
export async function fetchTeacherAcceptedStudents(teacherId: string) {
  const { data: matches, error: matchError } = await supabase
    .from("requirement_teacher_matches")
    .select("requirement_id")
    .eq("teacher_id", teacherId)
    .eq("status", "accepted");

  if (matchError) {
    return { data: null, error: matchError };
  }

  const requirementIds = (matches ?? []).map((m) => m.requirement_id);

  if (requirementIds.length === 0) {
    return { data: [] as AcceptedStudent[], error: null };
  }

  const { data, error } = await supabase
    .from("learning_requirements")
    .select("id, user_id, parent_student_name, subjects, current_level, class_mode")
    .in("id", requirementIds);

  if (error) {
    return { data: null, error };
  }

  const seen = new Set<string>();
  const deduped: AcceptedStudent[] = [];
  for (const row of (data ?? []) as Array<{
    id: string;
    user_id: string | null;
    parent_student_name: string | null;
    subjects: string[] | null;
    current_level: string | null;
    class_mode: string | null;
  }>) {
    if (!row.user_id || seen.has(row.user_id)) {
      continue;
    }
    seen.add(row.user_id);
    deduped.push({
      requirement_id: row.id,
      user_id: row.user_id,
      parent_student_name: row.parent_student_name,
      subjects: row.subjects,
      current_level: row.current_level,
      class_mode: row.class_mode,
    });
  }

  return { data: deduped, error: null };
}

// add_group_members(p_group_class_id uuid, p_student_user_ids uuid[])
// returns integer (number newly added).
export function addGroupMembers(
  p_group_class_id: string,
  p_student_user_ids: string[]
) {
  return supabase.rpc("add_group_members", {
    p_group_class_id,
    p_student_user_ids,
  });
}

// remove_group_member(p_group_class_id uuid, p_student_user_id uuid)
// returns boolean.
export function removeGroupMember(
  p_group_class_id: string,
  p_student_user_id: string
) {
  return supabase.rpc("remove_group_member", {
    p_group_class_id,
    p_student_user_id,
  });
}

// ---------------------------------------------------------------------------
// P-A: sessions / hosting (Phase 10G-4)
// ---------------------------------------------------------------------------

export type GroupClassSessionStatus = "scheduled" | "cancelled" | "completed";

export type GroupClassSession = {
  id: string;
  group_class_id: string;
  teacher_id: string;
  title: string;
  join_link: string;
  scheduled_at: string | null;
  duration_minutes: number;
  notes: string | null;
  status: GroupClassSessionStatus;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

// Exact parameter names of create_group_session(...).
export type CreateGroupSessionInput = {
  p_group_class_id: string;
  p_title: string;
  p_join_link: string;
  p_scheduled_at: string | null;
  p_duration_minutes: number;
  p_notes: string | null;
};

// Sessions of one class (teacher RLS policy scopes read access);
// soft-deleted rows are hidden. Postgres ASC orders NULL scheduled_at last.
export function fetchGroupClassSessions(groupClassId: string) {
  return supabase
    .from("group_class_sessions")
    .select(
      "id, group_class_id, teacher_id, title, join_link, scheduled_at, duration_minutes, notes, status, deleted_at, created_at, updated_at"
    )
    .eq("group_class_id", groupClassId)
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: true });
}

// create_group_session(...) returns the created session id (uuid).
export function createGroupSession(input: CreateGroupSessionInput) {
  return supabase.rpc("create_group_session", input);
}

// cancel_group_session(p_session_id) returns boolean.
export function cancelGroupSession(p_session_id: string) {
  return supabase.rpc("cancel_group_session", { p_session_id });
}
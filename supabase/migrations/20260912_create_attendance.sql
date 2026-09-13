-- Attendance: teacher-marked attendance per accepted teacher-student match
-- and per calendar date, optionally linked to a class session.
--
-- Approved product decisions (2026-09-12):
--   * One record per (match_id, attendance_date) — enforced by
--     attendance_match_date_unique so a day can never be double-marked.
--   * class_session_id is NULLABLE and references class_sessions(id)
--     ON DELETE SET NULL: deleting a session (a normal Class Connect action)
--     must never erase attendance history. The denormalized
--     match_id / requirement_id / teacher_id columns keep RLS and summaries
--     working after deletion — the same denormalization class_sessions uses.
--   * status ∈ ('present', 'absent', 'late') only.
--   * notes are TEACHER-INTERNAL. Students must never read them. RLS filters
--     rows, not columns, and teachers and students share the `authenticated`
--     role, so notes are hidden with COLUMN-level grants: table SELECT
--     excludes notes; INSERT/UPDATE include notes so teachers can write them.
--     Teachers read notes back through the SECURITY DEFINER function
--     list_teacher_attendance(uuid), guarded by the existing
--     class_session_teacher_belongs_to_user helper (students own no
--     teacher_profiles row, so the function returns nothing for them).
--   * Teachers mark/update ONLY their own accepted matches; students are
--     read-only; there is intentionally NO delete policy for anyone.
--
-- RLS recursion safety: every policy predicate is a SECURITY DEFINER helper
-- call, so no policy contains an inline cross-table subquery at all:
--   * class_session_teacher_belongs_to_user,
--     class_session_requirement_belongs_to_user,
--     class_session_match_is_accepted, is_admin (existing, from
--     20260911_create_class_sessions.sql)
--   * attendance_match_is_valid (new, this migration) — encapsulates the
--     requirement_teacher_matches consistency check (id + teacher_id +
--     requirement_id + status = 'accepted') so policy-scope ambiguity and
--     RLS interaction with the matches table are impossible, and the helper
--     never references attendance. The dependency graph stays acyclic and
--     cannot recreate the 42P17 cycle fixed in
--     20260911_fix_student_match_rls_recursion.sql.
--
-- This migration is purely additive: no existing table, policy, helper, or
-- trigger is created, altered, or dropped.

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid null references public.class_sessions(id) on delete set null,
  match_id uuid not null references public.requirement_teacher_matches(id) on delete cascade,
  requirement_id uuid not null references public.learning_requirements(id) on delete cascade,
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  attendance_date date not null,
  status text not null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Duplicate guard: one attendance record per student-match per calendar date.
  constraint attendance_match_date_unique unique (match_id, attendance_date),

  -- Approved statuses only (matches the learning_requirements_status_check
  -- naming convention).
  constraint attendance_status_check check (status in ('present', 'absent', 'late'))
);

-- match_id lookups are served by attendance_match_date_unique's leading column,
-- so a separate match_id index would be redundant.
create index if not exists idx_attendance_class_session_id on public.attendance(class_session_id);
create index if not exists idx_attendance_requirement_id on public.attendance(requirement_id);

create or replace function public.set_attendance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists attendance_set_updated_at on public.attendance;
create trigger attendance_set_updated_at
  before update on public.attendance
  for each row
  execute function public.set_attendance_updated_at();

alter table public.attendance enable row level security;

-- Clean slate first (mirrors class_sessions), then grant exactly what the
-- clients need. SELECT deliberately EXCLUDES notes (teacher-internal);
-- INSERT/UPDATE include notes so teachers can write them. id, created_at and
-- updated_at are server-managed and are not client-writable.
revoke all on table public.attendance from anon, authenticated;

grant select (id, class_session_id, match_id, requirement_id, teacher_id, attendance_date, status, created_at, updated_at),
  insert (class_session_id, match_id, requirement_id, teacher_id, attendance_date, status, notes),
  update (class_session_id, attendance_date, status, notes)
on table public.attendance
to authenticated;

-- Teachers read attendance (including internal notes) through this SECURITY
-- DEFINER function because column-level grants intentionally hide notes from
-- direct table SELECT for every `authenticated` user. Ownership is resolved
-- server-side via the existing helper, so only rows of the caller's own
-- teacher profile are returned; students calling it get an empty result.
create or replace function public.list_teacher_attendance(p_match_id uuid)
returns table (
  id uuid,
  class_session_id uuid,
  match_id uuid,
  requirement_id uuid,
  teacher_id uuid,
  attendance_date date,
  status text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.class_session_id,
    a.match_id,
    a.requirement_id,
    a.teacher_id,
    a.attendance_date,
    a.status,
    a.notes,
    a.created_at,
    a.updated_at
  from public.attendance a
  where a.match_id = p_match_id
    and public.class_session_teacher_belongs_to_user(a.teacher_id)
  order by a.attendance_date desc, a.created_at desc;
$$;

revoke all on function public.list_teacher_attendance(uuid) from public;
revoke all on function public.list_teacher_attendance(uuid) from anon;
grant execute on function public.list_teacher_attendance(uuid) to authenticated;

-- Consistency helper for INSERT/UPDATE policies: verifies that the match row
-- is exactly the accepted match linking the given match, teacher profile and
-- requirement. SECURITY DEFINER (mirrors class_session_match_is_accepted) so
-- policies call it instead of embedding inline subqueries against
-- requirement_teacher_matches; it never references attendance.
create or replace function public.attendance_match_is_valid(
  p_match_id uuid,
  p_teacher_id uuid,
  p_requirement_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.requirement_teacher_matches
    where id = p_match_id
      and teacher_id = p_teacher_id
      and requirement_id = p_requirement_id
      and status = 'accepted'
  );
$$;

revoke all on function public.attendance_match_is_valid(uuid, uuid, uuid) from public;
revoke all on function public.attendance_match_is_valid(uuid, uuid, uuid) from anon;
grant execute on function public.attendance_match_is_valid(uuid, uuid, uuid) to authenticated;

-- ============================================================
-- RLS policies (drop-if-exists then create, class_sessions style)
-- ============================================================

-- Teacher SELECT has no 'accepted' requirement on purpose: attendance history
-- must stay visible after a match is later rejected/completed/cancelled.
-- Insert/Update DO require accepted (product decision 7).
drop policy if exists "Teachers can view attendance for their students" on public.attendance;
create policy "Teachers can view attendance for their students"
  on public.attendance
  for select
  to authenticated
  using (
    public.class_session_teacher_belongs_to_user(teacher_id)
  );

drop policy if exists "Students can view attendance for their requirements" on public.attendance;
create policy "Students can view attendance for their requirements"
  on public.attendance
  for select
  to authenticated
  using (
    public.class_session_requirement_belongs_to_user(requirement_id)
  );

drop policy if exists "Admins can view all attendance" on public.attendance;
create policy "Admins can view all attendance"
  on public.attendance
  for select
  to authenticated
  using (public.is_admin());

-- Triple-consistency check (mirrors the class_sessions insert policy):
-- the caller must own the teacher_id, the match must be accepted, and the
-- match must actually link that teacher and requirement. Prevents a teacher
-- from forging rows against another teacher's match. The consistency check
-- lives in the SECURITY DEFINER helper attendance_match_is_valid() so the
-- policy itself contains no inline cross-table subquery; the bare column
-- names passed as arguments are the attendance row's values.
drop policy if exists "Teachers can insert attendance for accepted matches" on public.attendance;
create policy "Teachers can insert attendance for accepted matches"
  on public.attendance
  for insert
  to authenticated
  with check (
    public.class_session_teacher_belongs_to_user(teacher_id)
    and public.class_session_match_is_accepted(match_id)
    and public.attendance_match_is_valid(
      match_id,
      teacher_id,
      requirement_id
    )
  );

drop policy if exists "Teachers can update attendance for accepted matches" on public.attendance;
create policy "Teachers can update attendance for accepted matches"
  on public.attendance
  for update
  to authenticated
  using (
    public.class_session_teacher_belongs_to_user(teacher_id)
    and public.class_session_match_is_accepted(match_id)
    and public.attendance_match_is_valid(
      match_id,
      teacher_id,
      requirement_id
    )
  )
  with check (
    public.class_session_teacher_belongs_to_user(teacher_id)
    and public.class_session_match_is_accepted(match_id)
    and public.attendance_match_is_valid(
      match_id,
      teacher_id,
      requirement_id
    )
  );

-- Intentionally NO delete policy for teachers, students, or anyone else:
-- attendance history is never removed through the API. Deleting the parent
-- match cascades rows exactly like class_sessions. Students have no
-- insert/update policy at all, so they are strictly read-only.

-- Done. The table starts empty; no backfill is required.

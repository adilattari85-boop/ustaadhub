-- ============================================================
-- save_teacher_attendance: secure RPC for marking attendance.
-- ============================================================
--
-- Why an RPC: attendance.notes is teacher-internal. Column-level grants in
-- 20260912_create_attendance.sql deliberately hide notes from table SELECT
-- for every authenticated user, so a client cannot read its own previous
-- row to decide insert-vs-update. This SECURITY DEFINER function performs
-- the INSERT ... ON CONFLICT ... DO UPDATE atomically and re-validates
-- ownership and accepted-match state server-side, without granting any
-- broad table permission on public.attendance.
--
-- Validation (in order):
--   1. Caller owns p_teacher_id (teacher_profiles.user_id = auth.uid()).
--   2. p_match_id + p_teacher_id + p_requirement_id refer to the same match
--      (attendance_match_is_valid from 20260912_create_attendance.sql).
--   3. Match status is exactly accepted.
--   4. p_status is one of present, absent, late.
--
-- Notes are normalized (whitespace-only becomes NULL). class_session_id is
-- always written NULL in this phase. The caller can never supply or modify
-- id, created_at or updated_at: they are server-managed (defaults and the
-- attendance_set_updated_at trigger).

create or replace function public.save_teacher_attendance(
  p_match_id uuid,
  p_requirement_id uuid,
  p_teacher_id uuid,
  p_attendance_date date,
  p_status text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attendance_id uuid;
begin
  if not public.class_session_teacher_belongs_to_user(p_teacher_id) then
    raise exception 'Attendance can only be recorded by the owning teacher.'
      using errcode = '42501';
  end if;

  if not public.attendance_match_is_valid(p_match_id, p_teacher_id, p_requirement_id) then
    raise exception 'Attendance can only be recorded for accepted matches.'
      using errcode = '42501';
  end if;

  if p_status not in ('present', 'absent', 'late') then
    raise exception 'Invalid attendance status.'
      using errcode = '22023';
  end if;

  insert into public.attendance (
    class_session_id,
    match_id,
    requirement_id,
    teacher_id,
    attendance_date,
    status,
    notes
  )
  values (
    null,
    p_match_id,
    p_requirement_id,
    p_teacher_id,
    p_attendance_date,
    p_status,
    nullif(btrim(p_notes), '')
  )
  on conflict (match_id, attendance_date) do update
    set class_session_id = excluded.class_session_id,
        status = excluded.status,
        notes = excluded.notes
  returning id into v_attendance_id;

  return v_attendance_id;
end;
$$;

revoke all on function public.save_teacher_attendance(uuid, uuid, uuid, date, text, text) from public;
revoke all on function public.save_teacher_attendance(uuid, uuid, uuid, date, text, text) from anon;
grant execute on function public.save_teacher_attendance(uuid, uuid, uuid, date, text, text) to authenticated;

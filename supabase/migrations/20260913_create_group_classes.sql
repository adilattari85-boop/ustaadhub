-- ============================================================
-- Phase 10B: Group Classes (additive, self-contained)
-- Migration: 20260913_create_group_classes.sql
-- ============================================================
-- Scope: group classes, memberships, sessions, attendance history.
-- Does NOT modify existing one-to-one Class Connect tables, RPCs,
-- RLS policies, helpers, triggers, or UI.
--
-- Dependency order:
--   1. group_classes -> 2. group_class_members
--   3. group_class_sessions -> 4. group_class_attendance
--   5. indexes -> 6. updated_at triggers -> 7. helpers
--   8. RLS -> 9. grants -> 10. nine RPCs
--
-- Existing dependencies (reused, NOT created/altered here):
--   public.teacher_profiles(id), public.teacher_profiles(user_id),
--   public.teacher_profiles(deleted_at),
--   public.is_admin(), auth.uid(), gen_random_uuid()
--
-- Design notes:
--   * All FKs use ON DELETE RESTRICT so history (classes, memberships,
--     sessions, attendance) is never silently hard-deleted.
--   * group_class_attendance.group_class_session_id is NOT NULL with
--     ON DELETE RESTRICT (no SET NULL contradiction).
--   * Sessions/classes close via status/deleted_at only; attendance kept.
--   * student_user_id columns intentionally have NO FK to auth.users:
--     the auth schema is not managed by public migrations, and this
--     matches the existing learning_requirements.user_id convention.
--     Membership validity is enforced by RPC checks, not by FK.
--   * attendance_date records the session's scheduled date (UTC) when
--     scheduled_at is set, otherwise the current UTC date.
-- ============================================================

create table public.group_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(id) on delete restrict,
  title text not null,
  description text null,
  subjects text[] not null default '{}',
  teaching_mode text not null default 'Online',
  max_students integer not null default 20,
  current_enrollment integer not null default 0,
  fee_monthly numeric null,
  status text not null default 'active',
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_classes_status_check check (status in ('active', 'cancelled', 'completed')),
  constraint group_classes_teaching_mode_check check (teaching_mode in ('Online', 'Offline', 'Hybrid')),
  constraint group_classes_max_students_check check (max_students > 0),
  constraint group_classes_enrollment_check check (current_enrollment >= 0 and current_enrollment <= max_students),
  constraint group_classes_title_check check (length(btrim(title)) > 0)
);

create table public.group_class_members (
  id uuid primary key default gen_random_uuid(),
  group_class_id uuid not null references public.group_classes(id) on delete restrict,
  student_user_id uuid not null,
  status text not null default 'joined',
  joined_at timestamptz not null default now(),
  left_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_class_members_status_check check (status in ('joined', 'left', 'removed')),
  constraint group_class_members_unique unique (group_class_id, student_user_id)
);

create table public.group_class_sessions (
  id uuid primary key default gen_random_uuid(),
  group_class_id uuid not null references public.group_classes(id) on delete restrict,
  teacher_id uuid not null references public.teacher_profiles(id) on delete restrict,
  title text not null default 'Group Class',
  join_link text not null default '',
  scheduled_at timestamptz null,
  duration_minutes integer not null default 60,
  notes text null,
  status text not null default 'scheduled',
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_class_sessions_status_check check (status in ('scheduled', 'cancelled', 'completed')),
  constraint group_class_sessions_title_check check (length(btrim(title)) > 0),
  constraint group_class_sessions_duration_check check (duration_minutes > 0)
);

create table public.group_class_attendance (
  id uuid primary key default gen_random_uuid(),
  group_class_id uuid not null references public.group_classes(id) on delete restrict,
  group_class_session_id uuid not null references public.group_class_sessions(id) on delete restrict,
  student_user_id uuid not null,
  attendance_date date not null,
  status text not null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_class_attendance_status_check check (status in ('present', 'absent', 'late')),
  constraint group_class_attendance_session_student_unique unique (group_class_session_id, student_user_id)
);

create index if not exists idx_group_classes_teacher_id on public.group_classes(teacher_id);
create index if not exists idx_group_classes_status on public.group_classes(status);
create index if not exists idx_group_classes_deleted_at on public.group_classes(deleted_at);
create index if not exists idx_group_class_members_class_id on public.group_class_members(group_class_id);
create index if not exists idx_group_class_members_student on public.group_class_members(student_user_id);
create index if not exists idx_group_class_sessions_class_id on public.group_class_sessions(group_class_id);
create index if not exists idx_group_class_sessions_teacher_id on public.group_class_sessions(teacher_id);
create index if not exists idx_group_class_sessions_deleted_at on public.group_class_sessions(deleted_at);
create index if not exists idx_group_class_attendance_class_id on public.group_class_attendance(group_class_id);
create index if not exists idx_group_class_attendance_session_id on public.group_class_attendance(group_class_session_id);
create index if not exists idx_group_class_attendance_student on public.group_class_attendance(student_user_id);

create or replace function public.set_group_classes_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists group_classes_set_updated_at on public.group_classes;
create trigger group_classes_set_updated_at before update on public.group_classes
  for each row execute function public.set_group_classes_updated_at();

create or replace function public.set_group_class_members_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists group_class_members_set_updated_at on public.group_class_members;
create trigger group_class_members_set_updated_at before update on public.group_class_members
  for each row execute function public.set_group_class_members_updated_at();

create or replace function public.set_group_class_sessions_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists group_class_sessions_set_updated_at on public.group_class_sessions;
create trigger group_class_sessions_set_updated_at before update on public.group_class_sessions
  for each row execute function public.set_group_class_sessions_updated_at();

create or replace function public.set_group_class_attendance_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists group_class_attendance_set_updated_at on public.group_class_attendance;
create trigger group_class_attendance_set_updated_at before update on public.group_class_attendance
  for each row execute function public.set_group_class_attendance_updated_at();

-- Attendance class/session consistency (defense-in-depth; new objects only).
-- Rejects any row whose group_class_id does not match the parent class of
-- its session. save_group_attendance already derives group_class_id from the
-- session; this trigger makes the invariant database-enforced without a
-- composite FK. Runs SECURITY DEFINER as the migration owner (bypasses RLS).
create or replace function public.group_class_attendance_class_matches()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_parent uuid;
begin
  select group_class_id into v_parent
    from public.group_class_sessions where id = new.group_class_session_id;
  if v_parent is null or v_parent <> new.group_class_id then
    raise exception 'Attendance group_class_id does not match its session.' using errcode='22023';
  end if;
  return new;
end; $$;
drop trigger if exists group_class_attendance_class_matches on public.group_class_attendance;
create trigger group_class_attendance_class_matches
  before insert or update on public.group_class_attendance
  for each row execute function public.group_class_attendance_class_matches();

-- Helpers: teacher-active validation via teacher_profiles.deleted_at IS NULL
-- (deleted_at verified in 20260913_add_soft_delete). is_admin() reused, NOT redefined.
create or replace function public.group_class_teacher_belongs_to_user(p_teacher_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teacher_profiles
    where id = p_teacher_id and user_id = auth.uid() and deleted_at is null
  );
$$;
revoke all on function public.group_class_teacher_belongs_to_user(uuid) from public;
revoke all on function public.group_class_teacher_belongs_to_user(uuid) from anon;
grant execute on function public.group_class_teacher_belongs_to_user(uuid) to authenticated;

create or replace function public.group_session_teacher_belongs_to_user(p_session_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_class_sessions s
    join public.teacher_profiles tp on tp.id = s.teacher_id
    where s.id = p_session_id and tp.user_id = auth.uid() and tp.deleted_at is null
  );
$$;
revoke all on function public.group_session_teacher_belongs_to_user(uuid) from public;
revoke all on function public.group_session_teacher_belongs_to_user(uuid) from anon;
grant execute on function public.group_session_teacher_belongs_to_user(uuid) to authenticated;

create or replace function public.group_member_class_teacher_belongs_to_user(p_group_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_classes gc
    join public.teacher_profiles tp on tp.id = gc.teacher_id
    where gc.id = p_group_class_id and tp.user_id = auth.uid() and tp.deleted_at is null
  );
$$;
revoke all on function public.group_member_class_teacher_belongs_to_user(uuid) from public;
revoke all on function public.group_member_class_teacher_belongs_to_user(uuid) from anon;
grant execute on function public.group_member_class_teacher_belongs_to_user(uuid) to authenticated;

-- Student membership helper: same joined-membership ownership check, RLS-safe.
create or replace function public.group_student_has_joined_membership(p_group_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_class_members
    where group_class_id = p_group_class_id and student_user_id = auth.uid() and status = 'joined'
  );
$$;
revoke all on function public.group_student_has_joined_membership(uuid) from public;
revoke all on function public.group_student_has_joined_membership(uuid) from anon;
grant execute on function public.group_student_has_joined_membership(uuid) to authenticated;

-- RLS: helper calls or same-row auth.uid() checks only. No inline cross-table EXISTS.
alter table public.group_classes enable row level security;
alter table public.group_class_members enable row level security;
alter table public.group_class_sessions enable row level security;
alter table public.group_class_attendance enable row level security;

drop policy if exists "Teachers can view their own group classes" on public.group_classes;
create policy "Teachers can view their own group classes" on public.group_classes
  for select to authenticated using (public.group_class_teacher_belongs_to_user(teacher_id));
drop policy if exists "Admins can view all group classes" on public.group_classes;
create policy "Admins can view all group classes" on public.group_classes
  for select to authenticated using (public.is_admin());
drop policy if exists "Authenticated users can browse active group classes" on public.group_classes;
create policy "Authenticated users can browse active group classes" on public.group_classes
  for select to authenticated using (status = 'active' and deleted_at is null);

drop policy if exists "Teachers can view members of their group classes" on public.group_class_members;
create policy "Teachers can view members of their group classes" on public.group_class_members
  for select to authenticated using (public.group_member_class_teacher_belongs_to_user(group_class_id));
drop policy if exists "Students can view their own group memberships" on public.group_class_members;
create policy "Students can view their own group memberships" on public.group_class_members
  for select to authenticated using (student_user_id = auth.uid());
drop policy if exists "Admins can view all group members" on public.group_class_members;
create policy "Admins can view all group members" on public.group_class_members
  for select to authenticated using (public.is_admin());

drop policy if exists "Teachers can view their own group sessions" on public.group_class_sessions;
create policy "Teachers can view their own group sessions" on public.group_class_sessions
  for select to authenticated using (public.group_class_teacher_belongs_to_user(teacher_id));
drop policy if exists "Admins can view all group sessions" on public.group_class_sessions;
create policy "Admins can view all group sessions" on public.group_class_sessions
  for select to authenticated using (public.is_admin());
drop policy if exists "Students can view sessions of joined group classes" on public.group_class_sessions;
create policy "Students can view sessions of joined group classes" on public.group_class_sessions
  for select to authenticated using (public.group_student_has_joined_membership(group_class_id));

drop policy if exists "Teachers can view group attendance for their sessions" on public.group_class_attendance;
create policy "Teachers can view group attendance for their sessions" on public.group_class_attendance
  for select to authenticated using (public.group_session_teacher_belongs_to_user(group_class_session_id));
drop policy if exists "Admins can view all group attendance" on public.group_class_attendance;
create policy "Admins can view all group attendance" on public.group_class_attendance
  for select to authenticated using (public.is_admin());
drop policy if exists "Students can view their own group attendance" on public.group_class_attendance;
create policy "Students can view their own group attendance" on public.group_class_attendance
  for select to authenticated using (student_user_id = auth.uid());
-- No INSERT/UPDATE/DELETE policies: all writes via RPCs. Students never read notes via table SELECT.

-- Grants: SELECT-only; notes excluded from group_class_attendance SELECT.
revoke all on table public.group_classes from public, anon, authenticated;
grant select on table public.group_classes to authenticated;
revoke all on table public.group_class_members from public, anon, authenticated;
grant select on table public.group_class_members to authenticated;
revoke all on table public.group_class_sessions from public, anon, authenticated;
grant select on table public.group_class_sessions to authenticated;
revoke all on table public.group_class_attendance from public, anon, authenticated;
grant select (id, group_class_id, group_class_session_id, student_user_id, attendance_date, status, created_at, updated_at)
  on table public.group_class_attendance to authenticated;

-- RPC 1: create_group_class (teacher must be active: deleted_at IS NULL)
create or replace function public.create_group_class(
  p_title text, p_description text default null, p_subjects text[] default '{}',
  p_teaching_mode text default 'Online', p_max_students integer default 20, p_fee_monthly numeric default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_teacher_id uuid; v_class_id uuid;
begin
  select id into v_teacher_id from public.teacher_profiles
    where user_id = auth.uid() and deleted_at is null order by created_at asc limit 1;
  if v_teacher_id is null then raise exception 'Only active teachers can create group classes.' using errcode='42501'; end if;
  if p_title is null or length(btrim(p_title))=0 then raise exception 'Class title is required.' using errcode='22023'; end if;
  if p_teaching_mode not in ('Online','Offline','Hybrid') then raise exception 'Invalid teaching mode.' using errcode='22023'; end if;
  if p_max_students is null or p_max_students <= 0 then raise exception 'Max students must be positive.' using errcode='22023'; end if;
  if p_fee_monthly is not null and p_fee_monthly < 0 then raise exception 'Monthly fee cannot be negative.' using errcode='22023'; end if;
  insert into public.group_classes (teacher_id, title, description, subjects, teaching_mode, max_students, current_enrollment, fee_monthly, status)
  values (v_teacher_id, btrim(p_title), nullif(btrim(coalesce(p_description,'')),''), coalesce(p_subjects,'{}'), p_teaching_mode, p_max_students, 0, p_fee_monthly, 'active')
  returning id into v_class_id;
  return v_class_id;
end; $$;
revoke all on function public.create_group_class(text, text, text[], text, integer, numeric) from public;
revoke all on function public.create_group_class(text, text, text[], text, integer, numeric) from anon;
grant execute on function public.create_group_class(text, text, text[], text, integer, numeric) to authenticated;

-- RPC 2: join_group_class (removed members rejected; race-safe via FOR UPDATE)
create or replace function public.join_group_class(p_group_class_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid; v_status text; v_deleted timestamptz; v_max integer; v_enrolled integer;
  v_member_id uuid; v_existing text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Unauthorized' using errcode='42501'; end if;
  select status, deleted_at, max_students, current_enrollment
    into v_status, v_deleted, v_max, v_enrolled
    from public.group_classes where id = p_group_class_id for update;
  if not found then raise exception 'Group class not found.' using errcode='P0002'; end if;
  if v_deleted is not null or v_status <> 'active' then raise exception 'Group class is not available for joining.' using errcode='42501'; end if;
  select id, status into v_member_id, v_existing from public.group_class_members
    where group_class_id = p_group_class_id and student_user_id = v_user_id for update;
  if found then
    if v_existing = 'joined' then return v_member_id; end if;
    if v_existing = 'removed' then raise exception 'You were removed from this group class and cannot rejoin.' using errcode='42501'; end if;
    if v_enrolled >= v_max then raise exception 'Group class is full.' using errcode='22023'; end if;
    update public.group_class_members set status='joined', left_at=null where id = v_member_id;
    update public.group_classes set current_enrollment = current_enrollment + 1 where id = p_group_class_id;
    return v_member_id;
  end if;
  if v_enrolled >= v_max then raise exception 'Group class is full.' using errcode='22023'; end if;
  insert into public.group_class_members (group_class_id, student_user_id, status)
  values (p_group_class_id, v_user_id, 'joined') returning id into v_member_id;
  update public.group_classes set current_enrollment = current_enrollment + 1 where id = p_group_class_id;
  return v_member_id;
end; $$;
revoke all on function public.join_group_class(uuid) from public;
revoke all on function public.join_group_class(uuid) from anon;
grant execute on function public.join_group_class(uuid) to authenticated;

-- RPC 3: leave_group_class
create or replace function public.leave_group_class(p_group_class_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_user_id uuid; v_member_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Unauthorized' using errcode='42501'; end if;
  perform 1 from public.group_classes where id = p_group_class_id for update;
  if not found then raise exception 'Group class not found.' using errcode='P0002'; end if;
  update public.group_class_members set status='left', left_at=now()
    where group_class_id=p_group_class_id and student_user_id=v_user_id and status='joined'
    returning id into v_member_id;
  if not found then raise exception 'Membership not found.' using errcode='P0002'; end if;
  update public.group_classes set current_enrollment = greatest(current_enrollment - 1, 0) where id = p_group_class_id;
  return true;
end; $$;
revoke all on function public.leave_group_class(uuid) from public;
revoke all on function public.leave_group_class(uuid) from anon;
grant execute on function public.leave_group_class(uuid) to authenticated;

-- RPC 4: remove_group_member
create or replace function public.remove_group_member(p_group_class_id uuid, p_student_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_teacher_id uuid; v_member_id uuid;
begin
  select teacher_id into v_teacher_id from public.group_classes where id = p_group_class_id for update;
  if not found then raise exception 'Group class not found.' using errcode='P0002'; end if;
  if not public.group_class_teacher_belongs_to_user(v_teacher_id) then
    raise exception 'Only the owning teacher can remove members.' using errcode='42501'; end if;
  update public.group_class_members set status='removed', left_at=now()
    where group_class_id=p_group_class_id and student_user_id=p_student_user_id and status='joined'
    returning id into v_member_id;
  if not found then raise exception 'Membership not found.' using errcode='P0002'; end if;
  update public.group_classes set current_enrollment = greatest(current_enrollment - 1, 0) where id = p_group_class_id;
  return true;
end; $$;
revoke all on function public.remove_group_member(uuid, uuid) from public;
revoke all on function public.remove_group_member(uuid, uuid) from anon;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

-- RPC 5: create_group_session (owning teacher only; class must be active and not deleted)
create or replace function public.create_group_session(
  p_group_class_id uuid, p_title text default 'Group Class', p_join_link text default '',
  p_scheduled_at timestamptz default null, p_duration_minutes integer default 60, p_notes text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_teacher_id uuid; v_status text; v_deleted timestamptz; v_session_id uuid;
begin
  select teacher_id, status, deleted_at into v_teacher_id, v_status, v_deleted
    from public.group_classes where id = p_group_class_id;
  if not found then raise exception 'Group class not found.' using errcode='P0002'; end if;
  if v_deleted is not null then raise exception 'Group class is deleted.' using errcode='42501'; end if;
  if v_status <> 'active' then raise exception 'Sessions can only be created for active group classes.' using errcode='42501'; end if;
  if not public.group_class_teacher_belongs_to_user(v_teacher_id) then
    raise exception 'Only the owning teacher can create sessions.' using errcode='42501'; end if;
  if p_title is null or length(btrim(p_title))=0 then raise exception 'Session title is required.' using errcode='22023'; end if;
  if p_duration_minutes is null or p_duration_minutes <= 0 then raise exception 'Invalid session duration.' using errcode='22023'; end if;
  insert into public.group_class_sessions (group_class_id, teacher_id, title, join_link, scheduled_at, duration_minutes, notes, status)
  values (p_group_class_id, v_teacher_id, btrim(p_title), coalesce(p_join_link,''), p_scheduled_at, p_duration_minutes, nullif(btrim(coalesce(p_notes,'')),''), 'scheduled')
  returning id into v_session_id;
  return v_session_id;
end; $$;
revoke all on function public.create_group_session(uuid, text, text, timestamptz, integer, text) from public;
revoke all on function public.create_group_session(uuid, text, text, timestamptz, integer, text) from anon;
grant execute on function public.create_group_session(uuid, text, text, timestamptz, integer, text) to authenticated;

-- RPC 6: cancel_group_session (status-only; preserves attendance history)
create or replace function public.cancel_group_session(p_session_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.group_session_teacher_belongs_to_user(p_session_id) then
    raise exception 'Only the owning teacher can cancel sessions.' using errcode='42501'; end if;
  update public.group_class_sessions set status='cancelled'
    where id = p_session_id and status = 'scheduled';
  if not found then raise exception 'Session not found or already closed.' using errcode='P0002'; end if;
  return true;
end; $$;
revoke all on function public.cancel_group_session(uuid) from public;
revoke all on function public.cancel_group_session(uuid) from anon;
grant execute on function public.cancel_group_session(uuid) to authenticated;

-- RPC 7: save_group_attendance (group_class_id derived ONLY from the session)
create or replace function public.save_group_attendance(
  p_session_id uuid, p_student_user_id uuid, p_status text, p_notes text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_class_id uuid; v_teacher_id uuid; v_session_status text; v_scheduled_at timestamptz;
  v_parent_status text; v_parent_deleted timestamptz; v_attendance_id uuid;
begin
  select group_class_id, teacher_id, status, scheduled_at into v_class_id, v_teacher_id, v_session_status, v_scheduled_at
    from public.group_class_sessions where id = p_session_id;
  if not found then raise exception 'Group session not found.' using errcode='P0002'; end if;
  if v_session_status <> 'scheduled' then raise exception 'Attendance can only be recorded for scheduled sessions.' using errcode='42501'; end if;
  select status, deleted_at into v_parent_status, v_parent_deleted
    from public.group_classes where id = v_class_id;
  if not found then raise exception 'Group class not found.' using errcode='P0002'; end if;
  if v_parent_deleted is not null or v_parent_status <> 'active' then
    raise exception 'Attendance can only be recorded for active group classes.' using errcode='42501'; end if;
  if not public.group_class_teacher_belongs_to_user(v_teacher_id) then
    raise exception 'Attendance can only be recorded by the owning teacher.' using errcode='42501'; end if;
  if p_status not in ('present','absent','late') then raise exception 'Invalid attendance status.' using errcode='22023'; end if;
  if not exists (select 1 from public.group_class_members where group_class_id=v_class_id and student_user_id=p_student_user_id and status='joined') then
    raise exception 'Student is not an active member of this group class.' using errcode='42501'; end if;
  insert into public.group_class_attendance (group_class_id, group_class_session_id, student_user_id, attendance_date, status, notes)
  values (v_class_id, p_session_id, p_student_user_id, coalesce((v_scheduled_at at time zone 'utc')::date, (now() at time zone 'utc')::date), p_status, nullif(btrim(coalesce(p_notes,'')), ''))
  on conflict (group_class_session_id, student_user_id) do update set status=excluded.status, notes=excluded.notes
  returning id into v_attendance_id;
  return v_attendance_id;
end; $$;
revoke all on function public.save_group_attendance(uuid, uuid, text, text) from public;
revoke all on function public.save_group_attendance(uuid, uuid, text, text) from anon;
grant execute on function public.save_group_attendance(uuid, uuid, text, text) to authenticated;

-- RPC 8: list_teacher_group_attendance
create or replace function public.list_teacher_group_attendance(p_session_id uuid)
returns table (id uuid, group_class_id uuid, group_class_session_id uuid, student_user_id uuid, attendance_date date, status text, notes text, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.group_class_id, a.group_class_session_id, a.student_user_id, a.attendance_date, a.status, a.notes, a.created_at, a.updated_at
  from public.group_class_attendance a
  where a.group_class_session_id = p_session_id and public.group_session_teacher_belongs_to_user(p_session_id)
  order by a.attendance_date desc, a.created_at desc;
$$;
revoke all on function public.list_teacher_group_attendance(uuid) from public;
revoke all on function public.list_teacher_group_attendance(uuid) from anon;
grant execute on function public.list_teacher_group_attendance(uuid) to authenticated;

-- RPC 9: soft_delete_group_class (idempotent; never hard-deletes children)
create or replace function public.soft_delete_group_class(p_group_class_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_teacher_id uuid; v_deleted timestamptz;
begin
  select teacher_id, deleted_at into v_teacher_id, v_deleted from public.group_classes where id = p_group_class_id;
  if not found then raise exception 'Group class not found.' using errcode='P0002'; end if;
  if not public.group_class_teacher_belongs_to_user(v_teacher_id) and not public.is_admin() then
    raise exception 'Only the owning teacher or an admin can delete group classes.' using errcode='42501'; end if;
  if v_deleted is not null then return false; end if;
  update public.group_classes set deleted_at=now(), status='cancelled'
    where id = p_group_class_id and deleted_at is null;
  update public.group_class_sessions set status='cancelled'
    where group_class_id = p_group_class_id and status = 'scheduled';
  return true;
end; $$;
revoke all on function public.soft_delete_group_class(uuid) from public;
revoke all on function public.soft_delete_group_class(uuid) from anon;
grant execute on function public.soft_delete_group_class(uuid) to authenticated;

-- End of Phase 10B migration. Purely additive: no existing object altered.


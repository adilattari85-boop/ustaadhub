-- ============================================================
-- Phase 10G-2: add_group_members
-- Teacher batch-adds an accepted student's learning requirement
-- owner (learning_requirements.user_id) into a group class.
--
-- Dependency: 20260913_create_group_classes.sql
--   (group_classes, group_class_members,
--    public.group_class_teacher_belongs_to_user).
--
-- Reads only (does NOT alter) requirement_teacher_matches and
-- learning_requirements. Does not touch one-to-one Class Connect
-- tables, policies, or RPCs.
-- ============================================================

create or replace function public.add_group_members(
  p_group_class_id uuid,
  p_student_user_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_teacher_id uuid;
  v_status text;
  v_deleted timestamptz;
  v_max integer;
  v_ids uuid[];
  v_joined_count integer;
  v_new_count integer;
begin
  -- 1. Caller must be an authenticated user.
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  -- 2. Lock the class row: serializes concurrent join/add capacity checks.
  select teacher_id, status, deleted_at, max_students
    into v_teacher_id, v_status, v_deleted, v_max
    from public.group_classes
   where id = p_group_class_id
   for update;

  if not found then
    raise exception 'Group class not found.' using errcode = 'P0002';
  end if;

  -- 3. Class must be active and not softly deleted.
  if v_deleted is not null or v_status <> 'active' then
    raise exception 'Group class is not available for adding students.'
      using errcode = '42501';
  end if;

  -- 4. Only the owning (active) teacher may add members.
  if not public.group_class_teacher_belongs_to_user(v_teacher_id) then
    raise exception 'Only the owning teacher can add members.'
      using errcode = '42501';
  end if;

  -- 5. Reject NULL student IDs, then de-duplicate the array.
  if exists (
    select 1 from unnest(p_student_user_ids) as u(sid)
    where u.sid is null
  ) then
    raise exception 'Student IDs cannot be null.' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct u.sid), '{}'::uuid[])
    into v_ids
    from unnest(p_student_user_ids) as u(sid);

  if v_ids is null or cardinality(v_ids) = 0 then
    raise exception 'At least one student is required.'
      using errcode = '22023';
  end if;

  -- 6. Every student must own an accepted requirement matched to this exact
  --    teacher via requirement_teacher_matches.status = 'accepted'.
  if exists (
    select 1
      from unnest(v_ids) as u(sid)
     where not exists (
       select 1
         from public.learning_requirements lr
         join public.requirement_teacher_matches m
           on m.requirement_id = lr.id
        where lr.user_id = u.sid
          and m.teacher_id = v_teacher_id
          and m.status = 'accepted'
     )
  ) then
    raise exception
      'One or more students are not accepted students of this teacher.'
      using errcode = '42501';
  end if;

  -- 7. Atomic capacity: joined members + soon-to-be-joined <= max_students.
  select count(*)
    into v_joined_count
    from public.group_class_members
   where group_class_id = p_group_class_id
     and status = 'joined';

  select count(*)
    into v_new_count
    from unnest(v_ids) as u(sid)
   where not exists (
     select 1
       from public.group_class_members gm
      where gm.group_class_id = p_group_class_id
        and gm.student_user_id = u.sid
        and gm.status = 'joined'
   );

  if v_joined_count + v_new_count > v_max then
    raise exception 'Group class is full.' using errcode = '22023';
  end if;

  -- 8. Upsert memberships: insert new rows and rejoin existing 'left' /
  --    'removed' rows. Already-joined rows are skipped (WHERE clause on the
  --    conflict update), so they never cause duplicate membership or a
  --    spurious enrollment increment. UNIQUE(group_class_id, student_user_id)
  --    prevents duplicates; the unique constraint is the collision key.
  insert into public.group_class_members (group_class_id, student_user_id, status)
  select p_group_class_id, u.sid, 'joined'
    from unnest(v_ids) as u(sid)
  on conflict (group_class_id, student_user_id) do update
    set status = 'joined', left_at = null
  where group_class_members.status <> 'joined';

  -- 9. Maintain current_enrollment atomically under the class row lock.
  update public.group_classes
     set current_enrollment = current_enrollment + v_new_count
   where id = p_group_class_id;

  -- 10. Number of students newly added (or re-joined) in this call.
  return v_new_count;
end;
$$;

-- ============================================================
-- Permissions (house style: PUBLIC + anon denied, authenticated only)
-- ============================================================
revoke all on function public.add_group_members(uuid, uuid[]) from public;
revoke all on function public.add_group_members(uuid, uuid[]) from anon;
grant execute on function public.add_group_members(uuid, uuid[]) to authenticated;
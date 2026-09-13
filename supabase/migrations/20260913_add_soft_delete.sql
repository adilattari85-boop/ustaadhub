-- ============================================================
-- Soft-delete: reversible deactivation for learning requirements
-- and teacher profiles.
-- ============================================================
--
-- Why soft-delete: deleting a requirement or teacher would CASCADE
-- to class_sessions and attendance (FKs use ON DELETE CASCADE),
-- destroying attendance/class history. Soft-delete preserves all
-- related records while hiding the entity from active lists.
--
-- Admins deactivate/restore via SECURITY DEFINER RPCs. The frontend
-- must filter WHERE deleted_at IS NULL for active lists.

alter table public.learning_requirements
  add column if not exists deleted_at timestamptz null;

alter table public.teacher_profiles
  add column if not exists deleted_at timestamptz null;

create index if not exists idx_learning_requirements_deleted_at
  on public.learning_requirements (deleted_at);

create index if not exists idx_teacher_profiles_deleted_at
  on public.teacher_profiles (deleted_at);

-- ============================================================
-- Requirement deactivation / restoration
-- ============================================================

create or replace function public.admin_deactivate_requirement(p_requirement_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can deactivate requirements.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.learning_requirements where id = p_requirement_id) then
    raise exception 'Learning requirement not found.'
      using errcode = 'P0002';
  end if;

  update public.learning_requirements
  set deleted_at = now()
  where id = p_requirement_id and deleted_at is null;

  return true;
end;
$$;

revoke all on function public.admin_deactivate_requirement(uuid) from public;
revoke all on function public.admin_deactivate_requirement(uuid) from anon;
grant execute on function public.admin_deactivate_requirement(uuid) to authenticated;

create or replace function public.admin_restore_requirement(p_requirement_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can restore requirements.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.learning_requirements where id = p_requirement_id) then
    raise exception 'Learning requirement not found.'
      using errcode = 'P0002';
  end if;

  update public.learning_requirements
  set deleted_at = null
  where id = p_requirement_id and deleted_at is not null;

  return true;
end;
$$;

revoke all on function public.admin_restore_requirement(uuid) from public;
revoke all on function public.admin_restore_requirement(uuid) from anon;
grant execute on function public.admin_restore_requirement(uuid) to authenticated;

-- ============================================================
-- Teacher profile deactivation / restoration
-- ============================================================

create or replace function public.admin_deactivate_teacher(p_teacher_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can deactivate teacher profiles.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.teacher_profiles where id = p_teacher_id) then
    raise exception 'Teacher profile not found.'
      using errcode = 'P0002';
  end if;

  update public.teacher_profiles
  set deleted_at = now()
  where id = p_teacher_id and deleted_at is null;

  return true;
end;
$$;

revoke all on function public.admin_deactivate_teacher(uuid) from public;
revoke all on function public.admin_deactivate_teacher(uuid) from anon;
grant execute on function public.admin_deactivate_teacher(uuid) to authenticated;

create or replace function public.admin_restore_teacher(p_teacher_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can restore teacher profiles.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.teacher_profiles where id = p_teacher_id) then
    raise exception 'Teacher profile not found.'
      using errcode = 'P0002';
  end if;

  update public.teacher_profiles
  set deleted_at = null
  where id = p_teacher_id and deleted_at is not null;

  return true;
end;
$$;

revoke all on function public.admin_restore_teacher(uuid) from public;
revoke all on function public.admin_restore_teacher(uuid) from anon;
grant execute on function public.admin_restore_teacher(uuid) to authenticated;

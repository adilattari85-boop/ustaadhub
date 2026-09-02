alter table public.teacher_profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'teacher_profiles'
      and policyname = 'Admins can view teacher profiles'
  ) then
    create policy "Admins can view teacher profiles"
      on public.teacher_profiles
      for select
      to authenticated
      using (public.is_admin());
  end if;
end
$$;

create or replace function public.admin_set_teacher_verification(
  p_teacher_id uuid,
  p_is_verified boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  update public.teacher_profiles
  set is_verified = p_is_verified
  where id = p_teacher_id;

  return found;
end;
$$;

revoke all on function public.admin_set_teacher_verification(uuid, boolean)
  from public;

revoke all on function public.admin_set_teacher_verification(uuid, boolean)
  from anon;

revoke all on function public.admin_set_teacher_verification(uuid, boolean)
  from authenticated;

grant execute on function public.admin_set_teacher_verification(uuid, boolean)
  to authenticated;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

revoke all on table public.admin_users from anon, authenticated;

insert into public.admin_users (user_id)
values ('80703f15-c333-429c-af80-b8c0843d2241')
on conflict (user_id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Authenticated users can view requirements"
  on public.learning_requirements;

drop policy if exists "Admin can view all requirements"
  on public.learning_requirements;

drop policy if exists "Admins can view all requirements"
  on public.learning_requirements;

drop policy if exists "Students can view own requirements"
  on public.learning_requirements;

drop policy if exists "Students can insert own requirements"
  on public.learning_requirements;

drop policy if exists "Admins can update requirements"
  on public.learning_requirements;

create policy "Students can view own requirements"
on public.learning_requirements
for select
to authenticated
using (
  user_id = auth.uid()
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'student'
);

create policy "Students can insert own requirements"
on public.learning_requirements
for insert
to authenticated
with check (
  user_id = auth.uid()
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'student'
);

create policy "Admins can view all requirements"
on public.learning_requirements
for select
to authenticated
using (public.is_admin());

create policy "Admins can update requirements"
on public.learning_requirements
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

do $$
begin
  if not exists (
    select 1
    from public.learning_requirements
    where status not in ('pending', 'contacted', 'matched', 'closed')
  ) then
    if not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.learning_requirements'::regclass
        and conname = 'learning_requirements_status_check'
    ) then
      alter table public.learning_requirements
        add constraint learning_requirements_status_check
        check (status in ('pending', 'contacted', 'matched', 'closed'));
    end if;
  else
    raise exception
      'Existing learning_requirements rows contain an invalid status; no rows were modified';
  end if;
end
$$;

create or replace function public.set_learning_requirement_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.learning_requirements'::regclass
      and tgname = 'learning_requirements_set_updated_at'
      and not tgisinternal
  ) then
    create trigger learning_requirements_set_updated_at
    before update on public.learning_requirements
    for each row
    execute function public.set_learning_requirement_updated_at();
  end if;
end
$$;

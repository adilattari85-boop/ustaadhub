-- Class Sessions: stores teacher-created meeting links for accepted teacher-student matches.
-- Only accepted matches can have class sessions.
-- Teachers can CRUD their own sessions; students can only read sessions tied to their own requirements.

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.requirement_teacher_matches(id) on delete cascade,
  requirement_id uuid not null references public.learning_requirements(id) on delete cascade,
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  title text not null default 'Online Class',
  join_link text not null,
  scheduled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_class_sessions_match_id on public.class_sessions(match_id);
create index if not exists idx_class_sessions_requirement_id on public.class_sessions(requirement_id);
create or replace function public.set_class_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists class_sessions_set_updated_at on public.class_sessions;
create trigger class_sessions_set_updated_at
  before update on public.class_sessions
  for each row
  execute function public.set_class_sessions_updated_at();

alter table public.class_sessions enable row level security;

revoke all on table public.class_sessions from anon, authenticated;

grant select, insert, update, delete
on table public.class_sessions
to authenticated;

create or replace function public.class_session_match_is_accepted(p_match_id uuid)
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
      and status = 'accepted'
  );
$$;

revoke all on function public.class_session_match_is_accepted(uuid) from public;
revoke all on function public.class_session_match_is_accepted(uuid) from anon;
grant execute on function public.class_session_match_is_accepted(uuid) to authenticated;

create or replace function public.class_session_teacher_belongs_to_user(p_teacher_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teacher_profiles
    where id = p_teacher_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.class_session_teacher_belongs_to_user(uuid) from public;
revoke all on function public.class_session_teacher_belongs_to_user(uuid) from anon;
grant execute on function public.class_session_teacher_belongs_to_user(uuid) to authenticated;

create or replace function public.class_session_requirement_belongs_to_user(p_requirement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.learning_requirements
    where id = p_requirement_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.class_session_requirement_belongs_to_user(uuid) from public;
revoke all on function public.class_session_requirement_belongs_to_user(uuid) from anon;
grant execute on function public.class_session_requirement_belongs_to_user(uuid) to authenticated;

drop policy if exists "Teachers can view their own class sessions" on public.class_sessions;
create policy "Teachers can view their own class sessions"
  on public.class_sessions
  for select
  to authenticated
  using (
    class_session_teacher_belongs_to_user(teacher_id)
    and exists (
      select 1
      from public.requirement_teacher_matches
      where id = match_id
        and teacher_id = class_sessions.teacher_id
        and requirement_id = class_sessions.requirement_id
        and status = 'accepted'
    )
  );

drop policy if exists "Teachers can create class sessions for accepted matches" on public.class_sessions;
create policy "Teachers can create class sessions for accepted matches"
  on public.class_sessions
  for insert
  to authenticated
  with check (
    class_session_teacher_belongs_to_user(teacher_id)
    and class_session_match_is_accepted(match_id)
    and exists (
      select 1
      from public.requirement_teacher_matches
      where id = match_id
        and teacher_id = class_sessions.teacher_id
        and requirement_id = class_sessions.requirement_id
        and status = 'accepted'
    )
  );

drop policy if exists "Teachers can update their own class sessions" on public.class_sessions;
create policy "Teachers can update their own class sessions"
  on public.class_sessions
  for update
  to authenticated
  using (
    class_session_teacher_belongs_to_user(teacher_id)
    and class_session_match_is_accepted(match_id)
    and exists (
      select 1
      from public.requirement_teacher_matches
      where id = match_id
        and teacher_id = class_sessions.teacher_id
        and requirement_id = class_sessions.requirement_id
        and status = 'accepted'
    )
  )
  with check (
    class_session_teacher_belongs_to_user(teacher_id)
    and class_session_match_is_accepted(match_id)
    and exists (
      select 1
      from public.requirement_teacher_matches
      where id = match_id
        and teacher_id = class_sessions.teacher_id
        and requirement_id = class_sessions.requirement_id
        and status = 'accepted'
    )
  );

drop policy if exists "Teachers can delete their own class sessions" on public.class_sessions;
create policy "Teachers can delete their own class sessions"
  on public.class_sessions
  for delete
  to authenticated
  using (
    class_session_teacher_belongs_to_user(teacher_id)
    and exists (
      select 1
      from public.requirement_teacher_matches
      where id = match_id
        and teacher_id = class_sessions.teacher_id
        and requirement_id = class_sessions.requirement_id
        and status = 'accepted'
    )
  );

drop policy if exists "Students can view class sessions for their requirements" on public.class_sessions;
create policy "Students can view class sessions for their requirements"
  on public.class_sessions
  for select
  to authenticated
  using (
    class_session_requirement_belongs_to_user(requirement_id)
    and exists (
      select 1
      from public.requirement_teacher_matches
      where id = match_id
        and requirement_id = class_sessions.requirement_id
        and status = 'accepted'
    )
  );

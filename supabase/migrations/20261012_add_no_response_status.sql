-- Widens learning_requirements_status_check to also allow 'no_response'.
-- Preserves existing rows and NULL behaviour; only the allowed set changes.
-- Guarded: fails clearly if any existing non-null status is outside the
-- known set, so we never silently accept drifted data.
-- Safe to rerun: drops (if exists) and re-adds the same-named constraint.

do $$
begin
  if exists (
    select 1
    from public.learning_requirements
    where status is not null
      and status not in ('pending', 'contacted', 'matched', 'closed', 'no_response')
  ) then
    raise exception 'Unexpected learning_requirements.status values present; aborting status-check widening.';
  end if;
end $$;

alter table public.learning_requirements
  drop constraint if exists learning_requirements_status_check;

alter table public.learning_requirements
  add constraint learning_requirements_status_check
  check (status in ('pending', 'contacted', 'matched', 'closed', 'no_response'));

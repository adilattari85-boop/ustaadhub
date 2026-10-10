-- Phase 2A: preferred class duration & multiple preferred start-time slots.
--
-- Adds two NULLABLE columns so every existing row and every existing write
-- path (including older deployed frontends) keeps working unchanged:
--   class_duration_minutes : NULL (legacy / not answered) or 30 / 60.
--   preferred_start_times  : NULL (legacy / none chosen) or "HH:MM" 24h IST
--                            strings in 30-minute intervals. Start times are
--                            optional by product decision; NULL means none.
--
-- No RLS, trigger, grant, or existing-column changes.

alter table public.learning_requirements
  add column if not exists class_duration_minutes smallint,
  add column if not exists preferred_start_times text[];

-- Named CHECK constraint, created only when absent so this migration is safe
-- to rerun. NULL always passes; only non-NULL values are restricted.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'learning_requirements_class_duration_check'
      and conrelid = 'public.learning_requirements'::regclass
  ) then
    alter table public.learning_requirements
      add constraint learning_requirements_class_duration_check
      check (
        class_duration_minutes is null
        or class_duration_minutes in (30, 60)
      );
  end if;
end $$;

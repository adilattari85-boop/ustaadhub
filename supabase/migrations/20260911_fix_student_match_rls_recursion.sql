-- Fixes the RLS infinite recursion:
--   learning_requirements
--     -> "Teachers can view connected learning requirements"
--     -> requirement_teacher_matches
--     -> "Students can view matches for their requirements"
--     -> learning_requirements  => 42P17 infinite recursion
--
-- The student match policy's inline EXISTS subquery on learning_requirements
-- re-entered learning_requirements RLS (the teacher-connected policy queries
-- requirement_teacher_matches), closing the cycle. This migration replaces
-- that inline subquery with the existing SECURITY DEFINER helper
-- public.class_session_requirement_belongs_to_user(uuid), which performs the
-- identical ownership check (learning_requirements.id = requirement_id AND
-- user_id = auth.uid()) but bypasses RLS, breaking the cycle.
--
-- Only this one policy is dropped and recreated. No other policy, table,
-- or helper is modified. The helper's permissions are unchanged
-- (execute granted to authenticated; revoked from public/anon).

-- Drop only the problematic policy.
drop policy if exists "Students can view matches for their requirements"
  on public.requirement_teacher_matches;

-- Recreate the same policy (same name, same table, same role) using the
-- SECURITY DEFINER helper instead of the inline learning_requirements EXISTS.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'requirement_teacher_matches'
      and policyname = 'Students can view matches for their requirements'
  ) then
    create policy "Students can view matches for their requirements"
      on public.requirement_teacher_matches
      for select
      to authenticated
      using (
        public.class_session_requirement_belongs_to_user(requirement_id)
      );
  end if;
end
$$;
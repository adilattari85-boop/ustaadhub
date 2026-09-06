-- Teacher match flow: adds ONLY the missing admin INSERT policies.
--
-- Remote policies that ALREADY exist (verified 2026-09-05, intentionally
-- left untouched — do not drop or modify):
--   * requirement_teacher_matches:
--       - Teachers can view their own requirement matches (SELECT)
--       - Teachers can update their own requirement matches (UPDATE)
--   * notifications:
--       - Users can view their own notifications (SELECT)
--       - Users can mark their own notifications as read (UPDATE)
--   * learning_requirements:
--       - Teachers can view connected learning requirements (SELECT)
--
-- RLS is already enabled on these tables (verified via anon INSERT probe
-- returning 42501), so only policies are added here.
--
-- Each policy creation is guarded against duplicates using the same
-- pg_policies check pattern as 20260902_admin_teacher_verification.sql.

-- ============================================================
-- public.requirement_teacher_matches
-- ============================================================

-- Admin can create a match from "Connect Teacher".
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'requirement_teacher_matches'
      and policyname = 'Admins can insert requirement teacher matches'
  ) then
    create policy "Admins can insert requirement teacher matches"
      on public.requirement_teacher_matches
      for insert
      to authenticated
      with check (public.is_admin());
  end if;
end
$$;

-- ============================================================
-- public.notifications
-- ============================================================

-- Admin can create a teacher_match notification when connecting a teacher.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'Admins can insert notifications'
  ) then
    create policy "Admins can insert notifications"
      on public.notifications
      for insert
      to authenticated
      with check (public.is_admin());
  end if;
end
$$;

-- NOTE: No policy is added for teachers to view learning_requirements.
-- The existing "Teachers can view connected learning requirements" policy
-- already provides read access to connected requirements. If, during
-- end-to-end testing, the teacher requirement detail page cannot load the
-- requirement, re-add a scoped SELECT policy as a follow-up.
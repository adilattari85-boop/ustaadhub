-- Admin can view the teacher matches so the requirement detail modal can
-- display the connected/matched teacher (name, qualification, subjects, status).
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'requirement_teacher_matches'
      and policyname = 'Admins can view requirement teacher matches'
  ) then
    create policy "Admins can view requirement teacher matches"
      on public.requirement_teacher_matches
      for select
      to authenticated
      using (public.is_admin());
  end if;
end
$$;

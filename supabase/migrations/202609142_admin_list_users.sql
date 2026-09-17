-- ============================================================
-- Admin: list every registered Supabase Auth user.
-- ============================================================
-- Context
-- -------
-- The existing Admin Panel never reads auth.users directly. It only
-- surfaces people through the application tables:
--   * /admin/teachers    -> SELECT FROM teacher_profiles
--   * /admin              -> SELECT FROM learning_requirements
-- So an account that exists in Supabase Auth > Users but has neither a
-- teacher_profiles row nor a learning_requirements row is invisible to
-- admins — exactly the "registered users missing from the Admin Panel"
-- report this migration addresses.
--
-- auth.users cannot be queried through the client SDK (RLS), so this
-- migration adds an admin-gated, SECURITY DEFINER RPC. It follows the
-- exact conventions of the existing 20260902/20260913 functions:
-- is_admin() guard, security definer, `set search_path = public`,
-- auth.uid()-based identity, and the standard grant/revoke block.
--
-- SECURITY
-- --------
--   * Only callers for whom public.is_admin() is true may run it
--    (otherwise RAISE EXCEPTION '42501' unauthorized).
--   * Only safe, non-sensitive columns are returned: id, email,
--    display_name, role, created_at, last_sign_in_at, email_confirmed_at.
--    Passwords (encrypted_password), tokens (confirmation_token,
--    recovery_token, email_change_token), aud, app_metadata and
--    raw_app_metadata are deliberately NOT exposed.
-- ============================================================

create or replace function public.admin_list_users()
returns table (
  id                 uuid,
  email              text,
  display_name       text,
  role               text,
  created_at         timestamptz,
  last_sign_in_at    timestamptz,
  email_confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can list auth users.'
      using errcode = '42501';
  end if;

  return query
  select
    au.id,
    au.email,
    coalesce(au.raw_user_meta_data ->> 'full_name', au.raw_user_meta_data ->> 'name') as display_name,
    au.raw_user_meta_data ->> 'role' as role,
    au.created_at,
    au.last_sign_in_at,
    au.email_confirmed_at
  from auth.users au
  order by au.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_list_users() from anon;
grant execute on function public.admin_list_users() to authenticated;
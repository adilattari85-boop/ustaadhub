-- ============================================================
-- Fix teacher profile data: populate email, gender, qualification
-- from auth.users during profile creation.
-- ============================================================
--
-- Problem: the create_teacher_profile RPC was not populating
-- email, gender, or qualification in teacher_profiles. These
-- values were collected during registration but only stored in
-- auth.users (email in auth.users.email, gender/qualification in
-- auth.users.raw_user_meta_data). The admin page displays
-- teacher_profiles columns, which remained NULL.
--
-- Fix: the RPC now reads these values from the authenticated
-- user's auth.users row and writes them into teacher_profiles.
-- The function signature is unchanged (no new parameters).
--
-- Backfill for existing teachers: see the clearly marked section
-- at the bottom of this file (NOT part of the migration).

create or replace function public.create_teacher_profile(
  p_full_name text,
  p_phone text,
  p_bio text,
  p_subjects text[],
  p_experience text,
  p_languages text[],
  p_teaching_mode text,
  p_fee_weekly numeric,
  p_fee_monthly numeric,
  p_profile_photo_url text DEFAULT NULL,
  p_city_location text DEFAULT NULL
)
returns public.teacher_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_auth_email text;
  v_auth_gender text;
  v_auth_qualification text;
  v_result public.teacher_profiles;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select
    au.email,
    au.raw_user_meta_data ->> 'gender',
    au.raw_user_meta_data ->> 'qualification'
  into
    v_auth_email,
    v_auth_gender,
    v_auth_qualification
  from auth.users au
  where au.id = v_user_id;

  insert into public.teacher_profiles (
    user_id,
    full_name,
    email,
    phone,
    gender,
    qualification,
    city_location,
    bio,
    subjects,
    experience,
    languages,
    teaching_mode,
    fee_weekly,
    fee_monthly,
    profile_photo_url,
    is_verified
  )
  values (
    v_user_id,
    p_full_name,
    v_auth_email,
    p_phone,
    v_auth_gender,
    v_auth_qualification,
    p_city_location,
    p_bio,
    p_subjects,
    p_experience,
    p_languages,
    p_teaching_mode,
    p_fee_weekly,
    p_fee_monthly,
    p_profile_photo_url,
    false
  )
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.create_teacher_profile(text, text, text, text[], text, text[], text, numeric, numeric, text, text) from public;
revoke all on function public.create_teacher_profile(text, text, text, text[], text, text[], text, numeric, numeric, text, text) from anon;
grant execute on function public.create_teacher_profile(text, text, text, text[], text, text[], text, numeric, numeric, text, text) to authenticated;

-- ============================================================
-- BACKFILL FOR EXISTING TEACHERS (NOT PART OF MIGRATION)
-- ============================================================
-- Run this separately in Supabase SQL Editor after applying the
-- migration above. This is intentionally NOT included in the
-- migration because it mutates existing data.
--
-- UPDATE public.teacher_profiles tp
-- SET
--   email = au.email,
--   gender = au.raw_user_meta_data ->> 'gender',
--   qualification = au.raw_user_meta_data ->> 'qualification'
-- FROM auth.users au
-- WHERE tp.user_id = au.id
--   AND tp.email IS NULL;


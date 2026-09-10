-- Migration: teacher self-service profile update RPC
-- Purpose: allow a linked teacher to update ONLY their own public profile
-- fields through a whitelisted SECURITY DEFINER function.
--
-- Editable fields (whitelist):
--   full_name, bio, subjects, languages, experience, teaching_mode, fee_monthly
--
-- NOT editable (by design):
--   id, user_id, is_verified, email, phone, gender, qualification,
--   city_location, created_at
--
-- Identity is resolved server-side via auth.uid() = teacher_profiles.user_id.
-- No teacher/user ID is accepted from the client.
--
-- is_verified remains writable only by admin_set_teacher_verification().

create or replace function public.update_teacher_profile(
  p_full_name text,
  p_bio text,
  p_subjects text[],
  p_languages text[],
  p_experience text,
  p_teaching_mode text,
  p_fee_monthly numeric
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_profile_id uuid;
begin
  -- Resolve exactly ONE teacher profile for the caller (auth.uid() = user_id).
  -- The id is pinned into a local variable so the UPDATE below can never touch
  -- another teacher's row, even if duplicate user_id records ever existed.
  select id
    into v_teacher_profile_id
    from public.teacher_profiles
   where user_id = auth.uid()
   order by created_at asc
   limit 1;

  if v_teacher_profile_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Basic server-side validation of required fields.
  if p_full_name is null or length(btrim(p_full_name)) = 0 then
    raise exception 'Full name is required';
  end if;

  if p_subjects is null or array_length(p_subjects, 1) is null then
    raise exception 'At least one subject is required';
  end if;

  if p_languages is null or array_length(p_languages, 1) is null then
    raise exception 'At least one language is required';
  end if;

  if p_fee_monthly is not null and p_fee_monthly < 0 then
    raise exception 'Monthly fee cannot be negative';
  end if;

  -- Whitelisted update only. Targets the single resolved profile row by id.
  update public.teacher_profiles
  set
    full_name     = btrim(p_full_name),
    bio           = p_bio,
    subjects      = p_subjects,
    languages     = p_languages,
    experience    = p_experience,
    teaching_mode = p_teaching_mode,
    fee_monthly   = p_fee_monthly
  where id = v_teacher_profile_id;

  return found;
end;
$$;

revoke all on function public.update_teacher_profile(text, text, text[], text[], text, text, numeric)
  from public;

revoke all on function public.update_teacher_profile(text, text, text[], text[], text, text, numeric)
  from anon;

revoke all on function public.update_teacher_profile(text, text, text[], text[], text, text, numeric)
  from authenticated;

grant execute on function public.update_teacher_profile(text, text, text[], text[], text, text, numeric)
  to authenticated;

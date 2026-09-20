-- ============================================================
-- Keep a not-yet-paid requirement out of the teacher matching flow
-- ============================================================
-- While the payment gateway is ON, a student's requirement is created with
-- payment_status = 'pending' (20260922) and only becomes 'paid' after the
-- server-side gateway verification. Until then the requirement is NOT
-- submitted, so it must not enter the teacher matching / notification flow.
--
-- This migration only ADDS one guard function and one trigger on
-- public.requirement_teacher_matches. No existing table, policy, RPC or trigger
-- is modified: the guard runs after the existing authorization checks of
-- public.admin_connect_teacher_to_requirement(uuid, uuid) and only rejects the
-- write while the requirement is still awaiting payment.
--
-- When the payment gateway is OFF every requirement is 'not_required', so this
-- guard is a no-op and the existing matching behaviour is unchanged.
-- ============================================================

create or replace function public.block_unpaid_requirement_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_status text;
begin
  select lr.payment_status
    into v_payment_status
  from public.learning_requirements lr
  where lr.id = new.requirement_id;

  if v_payment_status = 'pending' then
    raise exception 'This learning requirement is awaiting payment and cannot be matched with a teacher yet.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

comment on function public.block_unpaid_requirement_match() is
  'Blocks a teacher match (and therefore its notifications) while the requirement is still awaiting payment (payment_status = pending).';

revoke all on function public.block_unpaid_requirement_match() from public;
revoke all on function public.block_unpaid_requirement_match() from anon;
revoke all on function public.block_unpaid_requirement_match() from authenticated;

drop trigger if exists requirement_teacher_matches_block_unpaid
  on public.requirement_teacher_matches;

create trigger requirement_teacher_matches_block_unpaid
before insert or update on public.requirement_teacher_matches
for each row
execute function public.block_unpaid_requirement_match();

-- ============================================================
-- End of unpaid requirement matching guard migration
-- ============================================================
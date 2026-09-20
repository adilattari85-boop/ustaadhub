-- ============================================================
-- Requirement payment state + duplicate submission protection
-- ============================================================
-- Adds the summary payment state to public.learning_requirements so the
-- student UI, the admin dashboard and the (optional) gating of a requirement
-- do not need access to the payment ledger table:
--
--   payment_status: 'not_required' | 'pending' | 'paid' | 'failed' | 'cancelled'
--   payment_amount / payment_currency: snapshot of what the student owes
--   idempotency_key: client-generated token that makes a repeated submit of
--                    the SAME form session return the existing row instead of
--                    creating a duplicate requirement
--
-- Enforcement model (students can never mark themselves as paid):
--   * BEFORE INSERT trigger: when the gateway is ON, every public/student
--     insert is forced to payment_status='pending' with the amount/currency
--     read from public.get_payment_settings() INSIDE the database. A
--     client-supplied value is always overwritten, so a forged
--     payment_status='paid' or a forged amount cannot be persisted.
--   * Only the trusted server path (service role from the payment API routes)
--     or an admin (public.is_admin()) may write another state - both are
--     already the only writers that can reach 'paid' (the existing
--     learning_requirements RLS update policies do not allow students to
--     update their own rows at all).
--   * When the gateway is OFF the trigger stores 'not_required', so the
--     existing free submission behaviour is byte-for-byte unchanged.
--
-- This migration only ADDS a column set, one index, one trigger function and
-- one trigger. No existing column, policy, RPC or trigger is modified.
-- ============================================================

alter table public.learning_requirements
  add column if not exists payment_status text not null default 'not_required',
  add column if not exists payment_amount numeric(12,2) null,
  add column if not exists payment_currency text null,
  add column if not exists idempotency_key text null;

comment on column public.learning_requirements.payment_status is
  'Payment state of the requirement: not_required (gateway off), pending, paid, failed, cancelled. Only the server-side payment flow or an admin can set paid.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'learning_requirements_payment_status_check'
      and conrelid = 'public.learning_requirements'::regclass
  ) then
    alter table public.learning_requirements
      add constraint learning_requirements_payment_status_check
      check (payment_status in ('not_required', 'pending', 'paid', 'failed', 'cancelled'));
  end if;
end
$$;

-- Duplicate submission protection: the same (user, idempotency key) pair can
-- only ever exist once, so a double click / retried submit reuses the row that
-- the first attempt created.
create unique index if not exists learning_requirements_idempotency_key_idx
  on public.learning_requirements (user_id, idempotency_key)
  where idempotency_key is not null;

-- ============================================================
-- BEFORE INSERT guard: the database decides the payment state
-- ============================================================
-- Runs with invoker rights on purpose (no SECURITY DEFINER): it only calls
-- functions that anon/authenticated may already execute, and it never needs
-- to bypass RLS.
-- ============================================================

create or replace function public.enforce_learning_requirement_payment_state()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_enabled boolean;
  v_amount numeric;
  v_currency text;
begin
  -- Trusted server-side writers (the payment API routes use the service role
  -- key) and admins keep full control over the payment state.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if auth.uid() is not null then
    if public.is_admin() then
      return new;
    end if;
  end if;

  select s.payment_enabled, s.payment_amount, s.payment_currency
    into v_enabled, v_amount, v_currency
  from public.get_payment_settings() s;

  if coalesce(v_enabled, false) and coalesce(v_amount, 0) > 0 then
    -- The requirement is created as an unpaid requirement. It can only reach
    -- 'paid' through the server-side gateway verification route or a
    -- signature-verified webhook.
    new.payment_status := 'pending';
    new.payment_amount := v_amount;
    new.payment_currency := coalesce(nullif(v_currency, ''), 'INR');
  else
    -- Payment gateway OFF (the default): the existing free flow is preserved.
    new.payment_status := 'not_required';
    new.payment_amount := null;
    new.payment_currency := null;
  end if;

  new.idempotency_key :=
    nullif(btrim(coalesce(new.idempotency_key, '')), '');

  return new;
end;
$$;

comment on function public.enforce_learning_requirement_payment_state() is
  'Forces the initial payment state of a new learning requirement from public.get_payment_settings(), so a client can never insert a requirement that is already marked as paid or with a forged amount.';

drop trigger if exists learning_requirements_enforce_payment_state
  on public.learning_requirements;

create trigger learning_requirements_enforce_payment_state
  before insert on public.learning_requirements
  for each row
  execute function public.enforce_learning_requirement_payment_state();

-- ============================================================
-- Service-role only: release a requirement that no longer needs payment
-- ============================================================
-- Used when the admin turns the payment gateway OFF while a student still has
-- an unpaid requirement (created while the gateway was ON, so its
-- payment_status is 'pending'). The requirement returns to the free flow
-- instead of being stuck waiting for a payment that can no longer be made.
--
-- Safety rules:
--   * a requirement that already has a captured ('paid') payment is NEVER
--     released, so a paid requirement can not silently become free,
--   * only the owning student's own requirement is touched,
--   * any open gateway order of the requirement is closed as 'cancelled', so
--     the released requirement can never be paid twice.
--
-- EXECUTE is granted to the service role only (the payment API routes); a
-- student can not call this through the browser.
-- ============================================================

create or replace function public.release_unpaid_requirement(
  p_requirement_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if p_requirement_id is null or p_user_id is null then
    return false;
  end if;

  if exists (
    select 1
    from public.payments p
    where p.requirement_id = p_requirement_id
      and p.status = 'paid'
  ) then
    return false;
  end if;

  update public.learning_requirements lr
     set payment_status = 'not_required',
         payment_amount = null,
         payment_currency = null
   where lr.id = p_requirement_id
     and lr.user_id = p_user_id
     and lr.payment_status in ('pending', 'failed', 'cancelled');

  get diagnostics v_updated = row_count;

  update public.payments p
     set status = 'cancelled',
         failure_reason = 'released_payment_not_required',
         updated_at = now()
   where p.requirement_id = p_requirement_id
     and p.status = 'pending';

  return v_updated > 0;
end;
$$;

comment on function public.release_unpaid_requirement(uuid, uuid) is
  'Service-role only: returns an unpaid requirement to the free flow (payment_status = not_required) when the gateway is switched off, and cancels any open order. Never releases a paid requirement.';

revoke all on function public.release_unpaid_requirement(uuid, uuid) from public;
revoke all on function public.release_unpaid_requirement(uuid, uuid) from anon;
revoke all on function public.release_unpaid_requirement(uuid, uuid) from authenticated;
grant execute on function public.release_unpaid_requirement(uuid, uuid) to service_role;

-- ============================================================
-- End of requirement payment state migration
-- ============================================================
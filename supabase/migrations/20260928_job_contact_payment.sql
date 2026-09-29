-- ============================================================
-- Job Contact Access payment - PHASE 1 (database + admin setting)
-- ============================================================
-- An INDEPENDENT payment switch for unlocking a job's contact details.
--
-- Before this migration UstaadHub had two switches:
--   key = 'payment'         -> requirement payments (learning requirements)
--   key = 'support_payment' -> donation / support payments
--
-- This migration adds a THIRD, completely separate switch:
--   key = 'job_contact_payment'
--        { "enabled": false, "amount": 10, "currency": "INR" }
--
-- DESIGN RULES (deliberate):
--   * The 'payment' and 'support_payment' rows and ALL existing payment RPCs
--     (public.get_payment_settings, public.admin_update_payment_settings,
--     public.get_support_payment_settings,
--     public.admin_update_support_payment_settings) are NOT modified, so
--     requirement payments and donations behave exactly as they do today.
--   * This migration only ADDS objects plus one new settings row.
--   * The ledger is a NEW table (public.job_contact_unlocks). It is entirely
--     separate from public.payments and public.support_payments: no shared
--     rows, no shared trigger, no shared status vocabulary owner.
--
-- DEFAULT: OFF. Job contact details stay free until an admin explicitly turns
-- the gate on, and the unlock amount defaults to INR 10.
--
-- PHASE 1 SCOPE: schema + admin setting only. No Razorpay route, no public
-- gating and no /jobs/[slug] change is part of this migration.
-- ============================================================


-- ============================================================
-- New settings row (idempotent - never overwrites an admin's value)
-- ============================================================

insert into public.platform_settings (key, value)
values (
  'job_contact_payment',
  jsonb_build_object('enabled', false, 'amount', 10, 'currency', 'INR')
)
on conflict (key) do nothing;


-- ============================================================
-- Public (non-secret) read access to the job contact configuration
-- ============================================================
-- Returns exactly one row so callers never handle "no settings row".
-- Mirrors public.get_payment_settings(): same language, SECURITY DEFINER,
-- pinned search_path and grants. Only the flag, the amount and the currency
-- are exposed; no secret is ever stored in or returned from this row.
-- ============================================================

create or replace function public.get_job_contact_payment_settings()
returns table (
  job_contact_enabled boolean,
  job_contact_amount numeric,
  job_contact_currency text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when jsonb_typeof(ps.value -> 'enabled') = 'boolean'
        then (ps.value ->> 'enabled')::boolean
      else false
    end as job_contact_enabled,
    case
      when jsonb_typeof(ps.value -> 'amount') = 'number'
        then (ps.value ->> 'amount')::numeric
      else 10
    end as job_contact_amount,
    case
      when jsonb_typeof(ps.value -> 'currency') = 'string'
        then upper(ps.value ->> 'currency')
      else 'INR'
    end as job_contact_currency
  from (select 1) as anchor
  left join public.platform_settings ps
    on ps.key = 'job_contact_payment';
$$;

comment on function public.get_job_contact_payment_settings() is
  'Returns the admin-controlled Job Contact Access configuration (enabled/amount/currency). Independent of the requirement and donation payment switches. Safe for anon + authenticated reads; contains no secrets.';

revoke all on function public.get_job_contact_payment_settings() from public;
grant execute on function public.get_job_contact_payment_settings() to anon;
grant execute on function public.get_job_contact_payment_settings() to authenticated;
-- The server-side payment routes use the service role key; keep EXECUTE so the
-- job contact settings can also be read without a user token.
grant execute on function public.get_job_contact_payment_settings() to service_role;

-- ============================================================
-- Dedicated unlock ledger
-- ============================================================
-- One row per unlock attempt for a single job. Completely separate from
-- public.payments (requirement payments) and public.support_payments
-- (donations): this table has its own status vocabulary, its own indexes
-- and its own access rules, and is never joined to the other two.
-- ============================================================

create table if not exists public.job_contact_unlocks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  -- Nullable: a visitor who is not signed in may still unlock a job. The row
  -- is then tied to nothing and simply expires with the job.
  user_id uuid references auth.users (id) on delete set null,
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  amount numeric not null check (amount > 0),
  currency text not null default 'INR',
  payment_status text not null default 'created'
    check (payment_status in ('created', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

comment on table public.job_contact_unlocks is
  'Job Contact Access unlock ledger. Independent of public.payments (requirement payments) and public.support_payments (donations).';

comment on column public.job_contact_unlocks.payment_status is
  'created = order created but not paid, paid = contact unlocked, failed = payment failed or was abandoned.';

-- An authenticated visitor must not be able to buy the same job twice: at
-- most one SUCCESSFUL unlock per (job, user). Partial, so several abandoned
-- 'created' orders for the same job are still allowed.
create unique index if not exists job_contact_unlocks_paid_job_user_idx
  on public.job_contact_unlocks (job_id, user_id)
  where payment_status = 'paid' and user_id is not null;

-- Lookup path for "has this visitor already unlocked this job?".
create index if not exists job_contact_unlocks_job_idx
  on public.job_contact_unlocks (job_id);

create index if not exists job_contact_unlocks_user_idx
  on public.job_contact_unlocks (user_id)
  where user_id is not null;

create index if not exists job_contact_unlocks_status_idx
  on public.job_contact_unlocks (payment_status, created_at desc);

-- Keep updated_at honest, mirroring the repo's other ledgers.
create or replace function public.job_contact_unlocks_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists job_contact_unlocks_set_updated_at
  on public.job_contact_unlocks;

create trigger job_contact_unlocks_set_updated_at
  before update on public.job_contact_unlocks
  for each row execute function public.job_contact_unlocks_set_updated_at();

-- No direct client access at all: the browser never selects from or writes to
-- this table. Phase 2 will read and write it exclusively through the service
-- role, the same way public.payments is handled today.
alter table public.job_contact_unlocks enable row level security;

revoke all on public.job_contact_unlocks from anon, authenticated;
revoke all on public.job_contact_unlocks from public;

-- ============================================================
-- Admin-only write access to the job contact configuration
-- ============================================================
-- Authorization is enforced INSIDE the function body (public.is_admin()), so an
-- unauthorized authenticated caller cannot flip the switch. EXECUTE is revoked
-- from anon and public; authenticated is kept because the Admin UI calls it
-- through the authenticated Supabase client.
--
-- This function touches ONLY the 'job_contact_payment' row. It never reads or
-- writes the 'payment' or 'support_payment' rows, which is what keeps the
-- three switches independent.
--
-- The currency is deliberately NOT a parameter: it is pinned to INR so a
-- caller cannot repurpose this switch for another currency. The amount is
-- validated here (not only in the UI) because it is the price charged.
-- ============================================================

create or replace function public.admin_update_job_contact_payment_settings(
  p_enabled boolean,
  p_amount numeric
)
returns table (
  job_contact_enabled boolean,
  job_contact_amount numeric,
  job_contact_currency text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.'
      using errcode = '42501';
  end if;

  if p_enabled is null then
    raise exception 'The job contact access flag is required.'
      using errcode = '22023';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'The unlock amount must be greater than zero.'
      using errcode = '22023';
  end if;

  -- Guard against a fat-fingered amount (and against float noise such as
  -- 10.0000000001 arriving over JSON).
  if round(p_amount, 2) <> p_amount or p_amount > 100000 then
    raise exception 'The unlock amount must be a plain amount of at most 100000.'
      using errcode = '22023';
  end if;

  insert into public.platform_settings (key, value, updated_at, updated_by)
  values (
    'job_contact_payment',
    jsonb_build_object(
      'enabled', p_enabled,
      'amount', round(p_amount, 2),
      'currency', 'INR'
    ),
    now(),
    auth.uid()
  )
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now(),
        updated_by = excluded.updated_by;

  return query
    select s.job_contact_enabled, s.job_contact_amount, s.job_contact_currency
    from public.get_job_contact_payment_settings() s;
end;
$$;

comment on function public.admin_update_job_contact_payment_settings(boolean, numeric) is
  'Admin-only: updates the Job Contact Access switch and unlock amount (currency stays INR). Enforces public.is_admin() inside the function body. Never modifies the requirement payment or support payment rows.';

revoke all on function public.admin_update_job_contact_payment_settings(boolean, numeric) from public;
revoke all on function public.admin_update_job_contact_payment_settings(boolean, numeric) from anon;
grant execute on function public.admin_update_job_contact_payment_settings(boolean, numeric) to authenticated;

-- ============================================================
-- End of Job Contact Access payment - PHASE 1
-- ============================================================

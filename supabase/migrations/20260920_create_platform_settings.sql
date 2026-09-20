-- ============================================================
-- Platform settings + admin-controlled payment gateway switch
-- ============================================================
-- Adds one key/value configuration table for admin-controlled platform
-- settings, and the payment gateway switch built on top of it:
--
--   key   = 'payment'
--   value = { "enabled": false, "amount": 0, "currency": "INR" }
--
-- Access model (same shape as public.admin_users):
--   * RLS is enabled and NO policies are created, so anon/authenticated can
--     never read or write the table directly (all privileges are revoked).
--   * Non-secret read access (enabled / amount / currency only) is exposed
--     through public.get_payment_settings().
--   * Writes go through public.admin_update_payment_settings(), which
--     enforces public.is_admin() INSIDE the function body before mutating
--     anything, and is revoked from anon/public. Only authenticated admins
--     can change the setting; students/public users cannot.
--
-- Default state: the payment gateway is OFF, so the existing free
-- requirement submission flow is completely unchanged until an admin
-- explicitly enables it after the server-side gateway credentials exist.
--
-- This migration only ADDS objects. No existing table, policy, RPC or
-- trigger is modified.
-- ============================================================

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users (id) on delete set null
);

comment on table public.platform_settings is
  'Admin-controlled platform configuration. Reachable only through the SECURITY DEFINER functions in this migration (or the service role key).';

alter table public.platform_settings enable row level security;

-- No policies on purpose: the table is not directly reachable from the
-- browser. Public read/write goes through the functions below.
revoke all on table public.platform_settings from anon, authenticated;

-- Default configuration: payment gateway OFF and no amount configured.
insert into public.platform_settings (key, value)
values (
  'payment',
  jsonb_build_object('enabled', false, 'amount', 0, 'currency', 'INR')
)
on conflict (key) do nothing;

-- ============================================================
-- Public (non-secret) read access to the payment configuration
-- ============================================================
-- Returns exactly one row so callers never have to handle "no settings row".
-- Only the gateway flag, the amount and the currency are exposed; nothing
-- secret is stored here and no secret is ever returned.
-- ============================================================

create or replace function public.get_payment_settings()
returns table (
  payment_enabled boolean,
  payment_amount numeric,
  payment_currency text
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
    end as payment_enabled,
    case
      when jsonb_typeof(ps.value -> 'amount') = 'number'
        then (ps.value ->> 'amount')::numeric
      else 0
    end as payment_amount,
    coalesce(
      nullif(upper(btrim(coalesce(ps.value ->> 'currency', ''))), ''),
      'INR'
    ) as payment_currency
  from (select 1) as anchor
  left join public.platform_settings ps
    on ps.key = 'payment';
$$;

comment on function public.get_payment_settings() is
  'Returns the admin-controlled payment configuration (enabled/amount/currency). Safe for anon + authenticated reads; contains no secrets.';

revoke all on function public.get_payment_settings() from public;
grant execute on function public.get_payment_settings() to anon;
grant execute on function public.get_payment_settings() to authenticated;
-- The server-side payment routes use the service role key; keep EXECUTE so the
-- settings can also be read without a user token.
grant execute on function public.get_payment_settings() to service_role;

-- ============================================================
-- Admin-only write access to the payment configuration
-- ============================================================
-- Authorization is enforced inside the function body (public.is_admin()), so
-- an unauthorized authenticated caller cannot flip the switch or change the
-- amount. EXECUTE is revoked from anon and public; authenticated is kept
-- because the Admin UI calls it through the authenticated Supabase client.
-- ============================================================

create or replace function public.admin_update_payment_settings(
  p_enabled boolean,
  p_amount numeric,
  p_currency text
)
returns table (
  payment_enabled boolean,
  payment_amount numeric,
  payment_currency text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_currency text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.'
      using errcode = '42501';
  end if;

  if p_enabled is null then
    raise exception 'The payment gateway flag is required.'
      using errcode = '22023';
  end if;

  if p_amount is null or p_amount < 0 then
    raise exception 'The payment amount must be 0 or more.'
      using errcode = '22023';
  end if;

  if p_amount > 1000000 then
    raise exception 'The payment amount is too large.'
      using errcode = '22023';
  end if;

  v_currency := upper(btrim(coalesce(p_currency, 'INR')));

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'The currency must be a 3-letter ISO code (for example INR).'
      using errcode = '22023';
  end if;

  -- A requirement can only become 'paid' through the server-side payment
  -- verification flow, so enabling the gateway with a zero amount would only
  -- produce unpayable requirements. Require a real amount.
  if p_enabled and p_amount <= 0 then
    raise exception 'Set a payment amount greater than 0 before enabling the payment gateway.'
      using errcode = '22023';
  end if;

  insert into public.platform_settings (key, value, updated_at, updated_by)
  values (
    'payment',
    jsonb_build_object(
      'enabled', p_enabled,
      'amount', p_amount,
      'currency', v_currency
    ),
    now(),
    auth.uid()
  )
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now(),
        updated_by = excluded.updated_by;

  return query
    select s.payment_enabled, s.payment_amount, s.payment_currency
    from public.get_payment_settings() s;
end;
$$;

comment on function public.admin_update_payment_settings(boolean, numeric, text) is
  'Admin-only: updates the payment gateway switch, amount and currency. Enforces public.is_admin() inside the function body.';

revoke all on function public.admin_update_payment_settings(boolean, numeric, text) from public;
revoke all on function public.admin_update_payment_settings(boolean, numeric, text) from anon;
grant execute on function public.admin_update_payment_settings(boolean, numeric, text) to authenticated;

-- ============================================================
-- End of platform settings migration
-- ============================================================
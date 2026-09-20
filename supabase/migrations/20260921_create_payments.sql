-- ============================================================
-- Payment ledger for the optional student requirement payment
-- ============================================================
-- Adds the durable record of every gateway order/payment attempt plus a
-- webhook event log for replay protection, and the single transactional
-- function that moves a payment (and its requirement) to a final state.
--
-- Access model:
--   * public.payments: RLS enabled, NO policies, all privileges revoked from
--     anon/authenticated. Students can never read or write a payment row and
--     can therefore never mark their own payment as paid. Rows are written
--     only by the server-side routes (service role key) after the gateway
--     order was created, and only transitioned by public.apply_payment_result.
--   * public.payment_webhook_events: same model; primary key = gateway event
--     id, which makes webhook processing idempotent (a replayed event is
--     detected by the unique primary key).
--   * public.apply_payment_result(...): EXECUTE granted to service_role ONLY,
--     revoked from public/anon/authenticated.
--
-- This migration only ADDS objects. No existing table, policy, RPC or
-- trigger is modified.
-- ============================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null
    references public.learning_requirements (id) on delete cascade,
  user_id uuid not null
    references auth.users (id) on delete cascade,
  gateway text not null default 'razorpay',
  gateway_order_id text not null,
  gateway_payment_id text null,
  amount numeric(12,2) not null,
  currency text not null default 'INR',
  status text not null default 'pending',
  signature_verified boolean not null default false,
  failure_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_status_check
    check (status in ('pending', 'paid', 'failed', 'cancelled')),
  constraint payments_amount_check check (amount >= 0),
  constraint payments_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint payments_gateway_order_id_check
    check (btrim(gateway_order_id) <> '')
);

comment on table public.payments is
  'Payment ledger: one row per gateway order attempt, written and transitioned by server-side verification only (service role).';

-- One row per gateway order, one row per captured gateway payment.
create unique index if not exists payments_gateway_order_id_key
  on public.payments (gateway_order_id);

create unique index if not exists payments_gateway_payment_id_key
  on public.payments (gateway_payment_id)
  where gateway_payment_id is not null;

-- Duplicate order protection: at most ONE open (pending) order per
-- requirement. A repeated/duplicated "Pay Now" therefore reuses the open
-- order instead of creating a second payable order.
create unique index if not exists payments_open_order_per_requirement_key
  on public.payments (requirement_id)
  where status = 'pending';

create index if not exists payments_requirement_id_idx
  on public.payments (requirement_id);

create index if not exists payments_user_id_idx
  on public.payments (user_id);

alter table public.payments enable row level security;

-- No policies on purpose: only the service role (server-side routes) may
-- touch this table. The student-facing UI reads the summary state from
-- learning_requirements.payment_status instead.
revoke all on table public.payments from anon, authenticated;

create table if not exists public.payment_webhook_events (
  id text primary key,
  gateway text not null default 'razorpay',
  event_type text null,
  received_at timestamptz not null default now()
);

comment on table public.payment_webhook_events is
  'Gateway webhook event ids already processed. The primary key provides the idempotency guard against webhook replays.';

alter table public.payment_webhook_events enable row level security;

revoke all on table public.payment_webhook_events from anon, authenticated;

-- ============================================================
-- Server-side (service role only) payment state transition
-- ============================================================
-- Called from the server-side verification route and from the signed webhook
-- route. Both the payment row and its requirement are updated inside ONE
-- transaction, so a payment can never be marked paid while the requirement
-- stays unpaid (and the reverse).
--
-- Idempotency / safety rules:
--   * the row is locked (FOR UPDATE) before it is inspected,
--   * an unknown order id is ignored (no error, no write),
--   * 'paid' is only applied when the payment is not already 'paid', so a
--     replayed success callback/webhook is a no-op,
--   * 'failed' / 'cancelled' are only applied while the payment is still
--     'pending', so an out-of-order event can never downgrade a paid payment,
--   * a given gateway payment id can never be attached to a second order.
-- ============================================================

create or replace function public.apply_payment_result(
  p_order_id text,
  p_payment_id text default null,
  p_status text default 'paid',
  p_signature_verified boolean default false,
  p_failure_reason text default null
)
returns table (
  payment_id uuid,
  requirement_id uuid,
  user_id uuid,
  amount numeric,
  currency text,
  payment_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_reason text;
begin
  if p_order_id is null or btrim(p_order_id) = '' then
    raise exception 'Gateway order id is required.'
      using errcode = '22023';
  end if;

  if p_status is null or p_status not in ('paid', 'failed', 'cancelled') then
    raise exception 'Unsupported payment status.'
      using errcode = '22023';
  end if;

  select p.*
    into v_payment
  from public.payments p
  where p.gateway_order_id = p_order_id
  for update;

  if not found then
    -- Unknown order: nothing to update. The caller treats this as "ignored".
    return;
  end if;

  if p_status = 'paid' then
    if p_payment_id is null or btrim(p_payment_id) = '' then
      raise exception 'Gateway payment id is required to mark a payment as paid.'
        using errcode = '22023';
    end if;

    if v_payment.gateway_payment_id is not null
       and v_payment.gateway_payment_id <> p_payment_id then
      raise exception 'This order is already linked to another gateway payment.'
        using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.payments p
      where p.gateway_payment_id = p_payment_id
        and p.gateway_order_id <> p_order_id
    ) then
      raise exception 'This gateway payment is already linked to another order.'
        using errcode = '22023';
    end if;

    if v_payment.status <> 'paid' then
      update public.payments
         set status = 'paid',
             gateway_payment_id = p_payment_id,
             signature_verified = coalesce(p_signature_verified, false),
             failure_reason = null,
             updated_at = now()
       where id = v_payment.id;

      update public.learning_requirements
         set payment_status = 'paid'
       where id = v_payment.requirement_id
         and payment_status <> 'paid';
    end if;
  elsif v_payment.status = 'pending' then
    v_reason := nullif(btrim(left(coalesce(p_failure_reason, ''), 300)), '');

    update public.payments
       set status = p_status,
           failure_reason = v_reason,
           updated_at = now()
     where id = v_payment.id;

    update public.learning_requirements
       set payment_status = p_status
     where id = v_payment.requirement_id
       and payment_status = 'pending';
  end if;

  return query
    select p.id, p.requirement_id, p.user_id, p.amount, p.currency, p.status
    from public.payments p
    where p.id = v_payment.id;
end;
$$;

comment on function public.apply_payment_result(text, text, text, boolean, text) is
  'Service-role only: atomically applies a verified payment result to public.payments and learning_requirements.payment_status. Idempotent against duplicate callbacks and webhook replays.';

revoke all on function public.apply_payment_result(text, text, text, boolean, text) from public;
revoke all on function public.apply_payment_result(text, text, text, boolean, text) from anon;
revoke all on function public.apply_payment_result(text, text, text, boolean, text) from authenticated;
grant execute on function public.apply_payment_result(text, text, text, boolean, text) to service_role;

-- ============================================================
-- End of payment ledger migration
-- ============================================================
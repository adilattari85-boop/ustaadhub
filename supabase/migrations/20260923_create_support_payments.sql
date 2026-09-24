-- Support payments (donations + sponsorships)
-- ============================================================
-- Separate ledger for "Support UstaadHub" payments (donation |
-- sponsorship), independent from public.payments which stays
-- reserved for the learning-requirement flow.
--
-- Access model:
--   * RLS enabled; NO insert/update/delete policy at all - rows
--     are written and transitioned only by the server-side
--     support routes (service role key), so a browser can never
--     mark its own donation as paid.
--   * One SELECT policy for admins (public.is_admin()) so the
--     admin Support Payments view can read the ledger with the
--     normal client; anon and non-admin users see nothing.
--   * public.razorpay_order_id is UNIQUE: an order can never
--     create two rows, and every state transition is an UPDATE
--     keyed by that order id and guarded by payment_status,
--     which makes verification and webhook handling idempotent.
--
-- This migration only ADDS objects. No existing table, policy,
-- RPC or trigger is modified.
-- ============================================================

create table if not exists public.support_payments (
  id uuid primary key default gen_random_uuid(),
  payment_type text not null,
  user_id uuid null references auth.users (id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'INR',
  razorpay_order_id text not null,
  razorpay_payment_id text null,
  razorpay_signature text null,
  payment_status text not null default 'pending',
  failure_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_payments_type_check
    check (payment_type in ('donation', 'sponsorship')),
  constraint support_payments_status_check
    check (payment_status in ('pending', 'paid', 'failed')),
  constraint support_payments_amount_check check (amount >= 1),
  constraint support_payments_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint support_payments_order_id_check
    check (btrim(razorpay_order_id) <> '')
);

comment on table public.support_payments is
  'Support UstaadHub ledger: one row per gateway order for a donation or sponsorship, written and transitioned by server-side verification only (service role).';

-- One row per gateway order; verify/webhook updates key off this.
create unique index if not exists support_payments_razorpay_order_id_key
  on public.support_payments (razorpay_order_id);

-- A captured gateway payment id can never attach to a second row.
create unique index if not exists support_payments_razorpay_payment_id_key
  on public.support_payments (razorpay_payment_id)
  where razorpay_payment_id is not null;

create index if not exists support_payments_created_at_idx
  on public.support_payments (created_at desc);

create index if not exists support_payments_payment_type_idx
  on public.support_payments (payment_type);

alter table public.support_payments enable row level security;

-- Client DML stays revoked: only the service role writes. SELECT is
-- kept for authenticated callers and filtered by the admin policy.
revoke insert, update, delete, truncate
  on table public.support_payments from anon, authenticated;

drop policy if exists "Admins can view support payments"
  on public.support_payments;

create policy "Admins can view support payments"
on public.support_payments
for select
to authenticated
using (public.is_admin());

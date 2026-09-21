-- ============================================================
-- Fix ambiguous column reference in public.apply_payment_result
-- ============================================================
-- This is a minimal, behavior-preserving fix.
-- Only the two learning_requirements.payment_status references in the
-- WHERE clauses of public.apply_payment_result are now explicitly qualified.
--
-- No webhook route, payment flow, security model, search_path, or grants
-- are changed.
-- ============================================================

create or replace function public.apply_payment_result(
  p_order_id text,
  p_payment_id text,
  p_status text,
  p_signature_verified boolean,
  p_failure_reason text
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
         and public.learning_requirements.payment_status <> 'paid';
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
       and public.learning_requirements.payment_status = 'pending';
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

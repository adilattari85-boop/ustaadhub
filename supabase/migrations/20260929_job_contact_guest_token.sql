-- ============================================================
-- UstaadHub - Job Contact Access payment
-- Phase 3: guest unlock token
-- ============================================================
-- Phase 2 stored guest unlocks with user_id = NULL, so a guest could pay but
-- the server had no way to recognise them on a later page load. Without this
-- column a guest would either have to be trusted from browser storage (unsafe)
-- or be locked out of contact details they already paid for.
--
-- The raw token is generated on the server with crypto.randomBytes(32) and is
-- stored ONLY inside an HttpOnly cookie. The database never sees the raw value -
-- it keeps a SHA-256 hash, so a leaked ledger row cannot be replayed as a
-- cookie, and a forged cookie cannot be matched to a row.
--
-- This touches ONLY public.job_contact_unlocks. It does not alter the jobs
-- table, the platform settings row, or any requirement/support payment object,
-- and it does not change any existing RLS policy.
-- ============================================================

alter table public.job_contact_unlocks
  add column if not exists guest_token_hash text;

comment on column public.job_contact_unlocks.guest_token_hash is
  'SHA-256 hash of the guest unlock token. The raw token is only ever held in an HttpOnly cookie set by the server; it is never stored and never sent to the browser in page data.';

-- A token can identify at most one unlock row.
create unique index if not exists job_contact_unlocks_guest_token_idx
  on public.job_contact_unlocks (guest_token_hash)
  where guest_token_hash is not null;

-- ============================================================
-- End of Job Contact Access payment - Phase 3
-- ============================================================

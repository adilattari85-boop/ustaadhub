-- ============================================================
-- Jobs & Opportunities (homepage ticker, admin-managed)
-- ============================================================
-- Adds public.jobs, the admin-controlled source for the thin
-- "Jobs & Opportunities" scrolling ticker shown under the homepage
-- navigation (both / and /ur).
--
-- Bilingual approach: the project has no bilingual DB columns yet;
-- homepage Urdu is display-only label maps (see lib/urdu.ts). To stay
-- consistent while supporting /ur ticker content, the canonical
-- English columns (title / short_description) are kept exactly as
-- specified, with two OPTIONAL Urdu overrides added:
--
--   title_en              -> uses `title` (canonical English, NOT NULL)
--   title_ur              -> Urdu override, shown on /ur with fallback
--   short_description_en  -> uses `short_description` (canonical)
--   short_description_ur  -> Urdu override, shown on /ur with fallback
--
-- No existing table, policy, RPC or trigger is modified.
-- ============================================================

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_ur text null,
  short_description text null,
  short_description_ur text null,
  location text null,
  job_type text null,
  apply_url text null,
  is_active boolean not null default true,
  is_pinned boolean not null default false,
  display_order integer not null default 0,
  starts_at timestamptz null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_title_check check (btrim(title) <> ''),
  constraint jobs_apply_url_check check (
    apply_url is null
    or btrim(apply_url) = ''
    or apply_url ~ '^https?://[^[:space:]]+$'
    or apply_url ~ '^/[^[:space:]]*$'
  ),
  constraint jobs_expiry_check check (
    starts_at is null
    or expires_at is null
    or expires_at > starts_at
  )
);

comment on table public.jobs is
  'Admin-managed Jobs & Opportunities shown in the homepage ticker. Canonical English title/short_description with optional Urdu overrides (title_ur / short_description_ur).';

create index if not exists jobs_active_order_idx
  on public.jobs (is_active, is_pinned desc, display_order asc, created_at desc);

alter table public.jobs enable row level security;

-- Keep updated_at fresh on edits (same pattern as learning_requirements).
create or replace function public.set_job_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.jobs'::regclass
      and tgname = 'jobs_set_updated_at'
      and not tgisinternal
  ) then
    create trigger jobs_set_updated_at
    before update on public.jobs
    for each row
    execute function public.set_job_updated_at();
  end if;
end
$$;

-- ------------------------------------------------------------
-- RLS: public/anonymous may read ONLY eligible active jobs.
-- Expired, future-scheduled and inactive jobs are never visible.
-- ------------------------------------------------------------
drop policy if exists "Public can view active jobs" on public.jobs;

create policy "Public can view active jobs"
on public.jobs
for select
to anon, authenticated
using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (expires_at is null or expires_at > now())
);

-- ------------------------------------------------------------
-- RLS: admins (public.is_admin()) get full CRUD.
-- ------------------------------------------------------------
drop policy if exists "Admins can view all jobs" on public.jobs;
drop policy if exists "Admins can insert jobs" on public.jobs;
drop policy if exists "Admins can update jobs" on public.jobs;
drop policy if exists "Admins can delete jobs" on public.jobs;

create policy "Admins can view all jobs"
on public.jobs
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert jobs"
on public.jobs
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update jobs"
on public.jobs
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete jobs"
on public.jobs
for delete
to authenticated
using (public.is_admin());

-- Grants: reads for everyone (RLS still filters), writes for
-- authenticated (RLS restricts writes to admins only).
grant select on table public.jobs to anon, authenticated;
grant insert, update, delete on table public.jobs to authenticated;

-- ============================================================
-- End of jobs migration
-- ============================================================

-- ============================================================
-- Jobs & Opportunities — public job listing (find-jobs + details)
-- ============================================================
-- This is a FOLLOW-UP to 20260925_create_jobs.sql (that base table has
-- to be applied first). It turns the thin "ticker only" jobs table into
-- a full admin-managed job listing system without recreating it:
--
--   slug            Stable, unique, human readable. Auto-generated once on
--                   INSERT from the title (+ short id suffix) and NEVER
--                   regenerated on UPDATE, so previously shared WhatsApp /
--                   Facebook links keep working after every edit.
--   organization    Zimmedar / masjid / madrasa / institute name.
--   description     Full description (the ticker keeps `short_description`).
--   requirements    Eligibility / requirements.
--   salary          Salary / compensation (free text, optional).
--   contact_phone   Phone / WhatsApp — kept separate from the description.
--   contact_email   Email (optional).
--   status          draft | published | closed. Replaces the boolean-only
--                   workflow so a closed job can keep its public URL.
--
-- `is_active` is kept and synchronised (published => true) so the existing
-- jobs_active_order_idx index and any older code path stay correct.
--
-- No other table, policy, function, RPC or payment migration is modified.
-- ============================================================

-- ------------------------------------------------------------
-- 1. New columns
-- ------------------------------------------------------------
alter table public.jobs
  add column if not exists slug text,
  add column if not exists organization text,
  add column if not exists description text,
  add column if not exists requirements text,
  add column if not exists salary text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists status text not null default 'published';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'jobs_status_check'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_status_check
      check (status in ('draft', 'published', 'closed'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'jobs_slug_format_check'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_slug_format_check
      check (
        slug is null
        or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      );
  end if;
end
$$;

comment on column public.jobs.slug is
  'Stable shareable URL segment for /jobs/<slug>. Generated once on insert and never changed on edit.';
comment on column public.jobs.status is
  'draft | published | closed. Only published jobs appear as active public listings; closed jobs keep their public URL but show a closed notice.';
comment on column public.jobs.organization is
  'Zimmedar / masjid / madrasa / institute posting the opportunity.';

-- ------------------------------------------------------------
-- 2. Slug generation — runs on INSERT only, so edits never break
--    previously shared links. A 6 char id suffix guarantees uniqueness
--    (e.g. "quran-teacher-bareilly" -> "quran-teacher-bareilly-a1b2c3").
-- ------------------------------------------------------------
create or replace function public.jobs_assign_slug()
returns trigger
language plpgsql
as $$
declare
  base text;
  suffix text;
begin
  if new.slug is null or btrim(new.slug) = '' then
    base := trim(
      both '-' from
      regexp_replace(
        lower(regexp_replace(coalesce(new.title, ''), '[^a-zA-Z0-9]+', '-', 'g')),
        '^-+|-+$', '', 'g'
      )
    );
    if base = '' then
      base := 'job';
    end if;
    if char_length(base) > 60 then
      base := left(base, 60);
    end if;
    suffix := left(replace(new.id::text, '-', ''), 6);
    new.slug := base || '-' || suffix;
  end if;

  -- Normalise an admin supplied slug (lowercase, single dashes, no edges).
  new.slug := trim(
    both '-' from
    regexp_replace(lower(btrim(new.slug)), '[^a-z0-9]+', '-', 'g')
  );

  if new.slug = '' then
    new.slug := 'job-' || left(replace(new.id::text, '-', ''), 6);
  end if;

  return new;
end;
$$;

drop trigger if exists jobs_assign_slug on public.jobs;
create trigger jobs_assign_slug
  before insert on public.jobs
  for each row
  execute function public.jobs_assign_slug();

-- Backfill slugs for any row created before this migration.
update public.jobs j
set slug = coalesce(nullif(src.base, ''), 'job')
          || '-' || left(replace(j.id::text, '-', ''), 6)
from (
  select
    id,
    trim(
      both '-' from
      regexp_replace(
        lower(regexp_replace(coalesce(title, ''), '[^a-zA-Z0-9]+', '-', 'g')),
        '^-+|-+$', '', 'g'
      )
    ) as base
  from public.jobs
  where slug is null or btrim(slug) = ''
) as src
where src.id = j.id;

-- ------------------------------------------------------------
-- 3. Keep the legacy is_active flag in sync with status
-- ------------------------------------------------------------
create or replace function public.jobs_sync_is_active()
returns trigger
language plpgsql
as $$
begin
  new.is_active := (new.status = 'published');
  return new;
end;
$$;

drop trigger if exists jobs_sync_is_active on public.jobs;
create trigger jobs_sync_is_active
  before insert or update of status on public.jobs
  for each row
  execute function public.jobs_sync_is_active();

update public.jobs
set is_active = (status = 'published')
where is_active is distinct from (status = 'published');

-- ------------------------------------------------------------
-- 4. Indexes
-- ------------------------------------------------------------
create unique index if not exists jobs_slug_unique_idx
  on public.jobs (slug)
  where slug is not null;

create index if not exists jobs_public_listing_idx
  on public.jobs (status, is_pinned desc, display_order asc, created_at desc);

-- ------------------------------------------------------------
-- 5. RLS
--    Public/anon may read published AND closed jobs (a closed job must
--    keep its shared URL working), but NEVER drafts. Admins keep full
--    CRUD via the already existing public.is_admin() policies.
--    The jobs table is never publicly writable.
-- ------------------------------------------------------------
drop policy if exists "Public can view active jobs" on public.jobs;
drop policy if exists "Public can view published jobs" on public.jobs;

create policy "Public can view published jobs"
  on public.jobs
  for select
  to anon, authenticated
  using (status in ('published', 'closed'));

grant select on table public.jobs to anon, authenticated;
grant insert, update, delete on table public.jobs to authenticated;

-- ============================================================
-- End of jobs public listing migration
-- ============================================================

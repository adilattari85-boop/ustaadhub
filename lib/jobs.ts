// Jobs & Opportunities — the single shared jobs data source.
//
// Source of truth is the public.jobs table (see
// supabase/migrations/20260925_create_jobs.sql and
// supabase/migrations/20260927_jobs_public_listing.sql).
//
// Everything (admin manager, homepage ticker, /jobs listing, /jobs/[slug]
// details) reads and writes through this module so there is only ever one
// jobs system in the app.
//
// Canonical English content lives in `title` / `short_description` /
// `description` / `requirements`; the optional Urdu overrides
// (`title_ur` / `short_description_ur`) are used on /ur with fallback to
// English so the ticker never renders empty.

import type { SupabaseClient } from "@supabase/supabase-js";

export type JobLocale = "en" | "ur";

/** draft = invisible, published = active listing, closed = URL kept, hidden from list. */
export type JobStatus = "draft" | "published" | "closed";

export const JOB_STATUSES: JobStatus[] = ["draft", "published", "closed"];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
};

/**
 * Islamic education specific categories. `job_type` stays a plain text
 * column so an admin can always type a custom value; these are the
 * suggestions shown in the admin form and the public filter.
 */
export const JOB_TYPE_OPTIONS = [
  "Imamat",
  "Tadrees",
  "Quran Teaching",
  "Hifz Teaching",
  "Khateeb",
  "Muazzin",
  "Arabic Teaching",
  "Islamic Studies",
  "Other",
] as const;

export const SITE_URL = "https://www.ustaadhub.in";

/**
 * A public job row.
 *
 * contact_phone / contact_email are intentionally NOT part of this type. It is
 * the shape returned by JOB_PUBLIC_COLUMNS, so TypeScript now makes it a
 * compile error to render a contact detail on a public page that only received
 * this object. Protected contact arrives separately, from
 * JobContactDetails, and only after the server has confirmed a paid unlock.
 */
export type Job = {
  id: string;
  slug: string | null;
  title: string;
  title_ur: string | null;
  organization: string | null;
  location: string | null;
  job_type: string | null;
  salary: string | null;
  short_description: string | null;
  short_description_ur: string | null;
  description: string | null;
  requirements: string | null;
  apply_url: string | null;
  status: JobStatus;
  is_active: boolean;
  is_pinned: boolean;
  display_order: number;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * The contact details of ONE job, released only by the server after a paid
 * unlock. Never part of a Job.
 */
export type JobContactDetails = {
  contact_phone: string | null;
  contact_email: string | null;
};

/**
 * A full job row including the protected contact columns.
 *
 * Only the admin manager receives this shape (JOB_ADMIN_COLUMNS), behind the
 * admin-gated authenticated read.
 */
export type AdminJob = Job & JobContactDetails;

/** Back-compat alias used by the admin manager. */
export type JobRow = AdminJob;

/** Minimal fields needed by the homepage ticker. */
export type JobTickerItem = Pick<
  Job,
  | "id"
  | "slug"
  | "title"
  | "title_ur"
  | "location"
  | "job_type"
  | "is_pinned"
  | "display_order"
  | "starts_at"
  | "expires_at"
  | "status"
>;

const TICKER_COLUMNS = [
  "id",
  "slug",
  "title",
  "title_ur",
  "location",
  "job_type",
  "is_pinned",
  "display_order",
  "starts_at",
  "expires_at",
  "status",
].join(", ");

/**
 * Everything a public job card / detail page needs.
 *
 * contact_phone and contact_email are DELIBERATELY absent.
 *
 * This string is interpolated straight into .select(), so the columns are never
 * fetched by PostgREST for anonymous or unauthenticated readers. That means they
 * cannot reach the browser through the RSC payload, the inlined flight data, or
 * a direct table query - not merely hidden with CSS. When Job Contact Access is
 * ON the contact is released only through the authenticated
 * /api/jobs/[slug]/contact endpoint after a paid unlock is confirmed server-side.
 */
export const JOB_PUBLIC_COLUMNS = [
  ...TICKER_COLUMNS.split(", "),
  "organization",
  "salary",
  "short_description",
  "short_description_ur",
  "apply_url",
  "created_at",
].join(", ");

/** Everything a public job details page needs. */
export const JOB_DETAIL_COLUMNS = [
  ...JOB_PUBLIC_COLUMNS.split(", "),
  "description",
  "requirements",
  "is_active",
  "updated_at",
].join(", ");

/**
 * Everything the admin manager needs.
 *
 * The admin panel is the one place contact details legitimately belong, and it
 * reads through the authenticated (admin-gated) path, so contact columns are
 * added back here ONLY. Adding a contact column to JOB_PUBLIC_COLUMNS instead
 * would leak it to every visitor.
 */
export const JOB_ADMIN_COLUMNS = [
  ...JOB_DETAIL_COLUMNS.split(", "),
  "contact_phone",
  "contact_email",
].join(", ");

/** Kept for the previous ticker-only callers. */
export const JOB_TICKER_COLUMNS = TICKER_COLUMNS;

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

/** Lowercase, dash separated, no leading/trailing dashes. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Client-side mirror of the database slug trigger, used to preview the URL a
 * new job will get. The database always appends a short id suffix so the real
 * slug stays unique; this preview is informational only.
 */
export function buildJobSlug(title: string): string {
  return slugify(title) || "job";
}

/** Public path for a job. Falls back to the id so links never break. */
export function getJobPath(job: Pick<Job, "slug" | "id">): string {
  return `/jobs/${job.slug || job.id}`;
}

/** Absolute, shareable URL — e.g. https://www.ustaadhub.in/jobs/quran-teacher-bareilly */
export function getJobUrl(job: Pick<Job, "slug" | "id">, baseUrl = SITE_URL) {
  return `${baseUrl.replace(/\/$/, "")}${getJobPath(job)}`;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Display title for a locale, falling back to English. */
export function getJobTitle(
  job: Pick<Job, "title" | "title_ur">,
  locale: JobLocale = "en",
): string {
  if (locale === "ur") {
    const urdu = (job.title_ur || "").trim();
    if (urdu) return urdu;
  }
  return job.title;
}

/** Short summary for a locale, falling back to English then to description. */
export function getJobSummary(
  job: Pick<Job, "short_description" | "short_description_ur" | "description">,
  locale: JobLocale = "en",
): string {
  if (locale === "ur") {
    const urdu = (job.short_description_ur || "").trim();
    if (urdu) return urdu;
  }
  return (job.short_description || job.description || "").trim();
}

// ---------------------------------------------------------------------------
// Visibility rules
// ---------------------------------------------------------------------------

/** Drafts are never public. Closed jobs keep their URL but leave the list. */
export function isJobPubliclyReadable(job: Pick<Job, "status">): boolean {
  return job.status === "published" || job.status === "closed";
}

function withinTimeWindow(job: {
  starts_at?: string | null;
  expires_at?: string | null;
}): boolean {
  const now = Date.now();
  if (job.starts_at && new Date(job.starts_at).getTime() > now) return false;
  if (job.expires_at && new Date(job.expires_at).getTime() <= now) return false;
  return true;
}

/** Back-compat: eligibility for the homepage ticker. */
export function isJobEligibleForTicker(job: {
  is_active?: boolean | null;
  starts_at?: string | null;
  expires_at?: string | null;
}): boolean {
  if (!job.is_active) return false;
  return withinTimeWindow(job);
}

/** Active public listing: published AND inside its start/deadline window. */
export function isJobActiveListing(
  job: Pick<Job, "status" | "starts_at" | "expires_at">,
): boolean {
  if (job.status !== "published") return false;
  return withinTimeWindow(job);
}

export function isJobClosed(job: Pick<Job, "status">): boolean {
  return job.status === "closed";
}

export function isJobExpired(job: Pick<Job, "expires_at">): boolean {
  if (!job.expires_at) return false;
  return new Date(job.expires_at).getTime() <= Date.now();
}

// ---------------------------------------------------------------------------
// Queries (shared by /jobs, /jobs/[slug] and the ticker)
// ---------------------------------------------------------------------------

/**
 * Active public jobs. This is THE jobs data source for /jobs and the
 * homepage ticker — drafts, closed and expired jobs are never returned.
 */
export async function fetchPublishedJobs(
  client: SupabaseClient,
  options?: { signal?: AbortSignal; limit?: number },
): Promise<Job[]> {
  const { data, error } = await client
    .from("jobs")
    .select(JOB_PUBLIC_COLUMNS)
    .eq("status", "published")
    .order("is_pinned", { ascending: false })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 200)
    .abortSignal(options?.signal ?? new AbortController().signal);

  if (error) throw error;

  return ((data || []) as unknown as Job[]).filter(isJobActiveListing);
}

/** Homepage ticker list. Thin wrapper over the same source. */
export async function fetchTickerJobs(
  client: SupabaseClient,
  options?: { signal?: AbortSignal; limit?: number },
): Promise<JobTickerItem[]> {
  return fetchPublishedJobs(client, options);
}

/**
 * Single job by slug. Returns published AND closed jobs (so previously
 * shared links keep working) but never drafts — RLS already blocks those.
 */
export async function fetchJobBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<Job | null> {
  const { data, error } = await client
    .from("jobs")
    .select(JOB_DETAIL_COLUMNS)
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as Job | null) ?? null;
}

/** Admin listing: every job regardless of status (RLS allows admins only). */
export async function fetchAdminJobs(
  client: SupabaseClient,
): Promise<AdminJob[]> {
  const { data, error } = await client
    .from("jobs")
    .select(JOB_ADMIN_COLUMNS)
    .order("is_pinned", { ascending: false })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as AdminJob[];
}

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

/**
 * Dynamic share message for a job. Nothing is hardcoded per job — every line
 * is built from the selected record.
 */
export function buildJobShareMessage(
  job: Pick<
    Job,
    | "title"
    | "organization"
    | "location"
    | "job_type"
    | "short_description"
    | "expires_at"
  >,
  url: string,
): string {
  const lines: string[] = [`${job.title} Required`];

  if (job.location) lines.push(`Location: ${job.location}`);
  if (job.organization) lines.push(`Organization: ${job.organization}`);
  if (job.job_type) lines.push(`Job type: ${job.job_type}`);

  const summary = (job.short_description || "").trim();
  if (summary) {
    lines.push(
      "",
      summary.length > 220 ? `${summary.slice(0, 217)}...` : summary,
    );
  }

  if (job.expires_at) {
    lines.push(`Apply before: ${formatJobDate(job.expires_at)}`);
  }

  lines.push("", "Details:", url);
  return lines.join("\n");
}

export function getWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatJobDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatJobDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Normalised phone digits for wa.me links. */
export function toWhatsAppNumber(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

/** Accept absolute https URLs or site-relative paths; empty = no link. */
export function isValidApplyUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return true;
  return /^(https?:\/\/[^\s]+|\/[^\s]*)$/i.test(trimmed);
}

/** True for site-relative links (rendered with Next.js Link). */
export function isInternalApplyUrl(url: string): boolean {
  return url.startsWith("/");
}

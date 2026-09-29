import Link from "next/link";

import {
  formatJobDate,
  getJobPath,
  getJobSummary,
  getJobTitle,
  isJobClosed,
  isJobExpired,
  type Job,
  type JobLocale,
} from "@/lib/jobs";

type JobCardProps = {
  job: Job;
  locale?: JobLocale;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}

/** Public job card used by the /jobs listing. */
export default function JobCard({ job, locale = "en" }: JobCardProps) {
  const title = getJobTitle(job, locale);
  const summary = getJobSummary(job, locale);
  const deadline = formatJobDate(job.expires_at);
  const closed = isJobClosed(job);
  const expired = isJobExpired(job);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        {job.is_pinned && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">
            <span aria-hidden="true">📌</span> Pinned
          </span>
        )}
        {job.job_type && (
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-700">
            {job.job_type}
          </span>
        )}
        {closed && (
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
            Closed
          </span>
        )}
        {!closed && expired && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
            Expired
          </span>
        )}
      </div>

      <h3 className="mt-3 text-lg font-bold leading-snug text-slate-900">
        <Link
          href={getJobPath(job)}
          className="transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          {title}
        </Link>
      </h3>

      {job.organization && (
        <p className="mt-1 text-sm font-semibold text-blue-700">
          {job.organization}
        </p>
      )}

      <div className="mt-3 space-y-1">
        {job.location && <Row label="Location" value={job.location} />}
        {job.salary && <Row label="Salary" value={job.salary} />}
        {deadline && <Row label="Apply before" value={deadline} />}
      </div>

      {summary && (
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
          {summary}
        </p>
      )}

      <p className="mt-3 text-xs font-medium text-slate-500">
        View details to see how to apply
      </p>

      <div className="mt-4 pt-1">
        <Link
          href={getJobPath(job)}
          className="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}

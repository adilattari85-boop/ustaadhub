"use client";

import Link from "next/link";

import { getJobPath, getJobTitle, type JobTickerItem } from "@/lib/jobs";

type JobsTickerProps = {
  jobs: JobTickerItem[];
  locale?: "en" | "ur";
};

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2"
    >
      <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Homepage "Jobs & Opportunities" ticker.
 *
 * Reads the same real jobs data source as /jobs (server-fetched in
 * app/page.tsx via lib/jobs) — no mock data, no second jobs system.
 * Only published jobs are passed in, and every entry links to its real
 * /jobs/<slug> detail page.
 */
export default function JobsTicker({
  jobs,
  locale = "en",
}: JobsTickerProps) {
  if (!jobs.length) {
    return null;
  }

  const labels =
    locale === "ur"
      ? { heading: "ملازم اور مواقع", all: "تمام مواقع دیکھیں" }
      : { heading: "Jobs & Opportunities", all: "View all jobs" };

  return (
    <section
      aria-labelledby="jobs-ticker-heading"
      className="w-full border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex shrink-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-sm text-white"
          >
            💼
          </span>
          <h2
            id="jobs-ticker-heading"
            className="text-sm font-extrabold uppercase tracking-wide text-blue-800"
          >
            {labels.heading}
          </h2>
          <Link
            href="/jobs"
            className="whitespace-nowrap rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50"
          >
            {labels.all}
          </Link>
        </div>

        <ul className="flex min-w-0 flex-1 gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {jobs.map((job) => (
            <li key={job.id} className="shrink-0">
              <Link
                href={getJobPath(job)}
                className="flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-1.5 text-sm text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
              >
                {job.is_pinned && (
                  <span aria-hidden="true" title="Pinned">
                    📌
                  </span>
                )}
                <span className="max-w-[16rem] truncate font-medium">
                  {getJobTitle(job, locale)}
                </span>
                {job.location && (
                  <span className="text-xs text-slate-500">· {job.location}</span>
                )}
                <Chevron />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

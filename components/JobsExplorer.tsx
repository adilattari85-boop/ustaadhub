"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import JobCard from "@/components/JobCard";
import type { Job } from "@/lib/jobs";

type JobsExplorerProps = {
  jobs: Job[];
  error: string;
};

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

/**
 * Public /jobs listing: search + job type filter + location filter,
 * with error, empty and no-results states (loading comes from the
 * parent Suspense boundary).
 */
export default function JobsExplorer({ jobs, error }: JobsExplorerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState("all");
  const [location, setLocation] = useState("all");

  const jobTypes = useMemo(
    () =>
      Array.from(
        new Set(jobs.map((job) => (job.job_type || "").trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [jobs],
  );

  const locations = useMemo(
    () =>
      Array.from(
        new Set(jobs.map((job) => (job.location || "").trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [jobs],
  );

  const query = search.trim().toLowerCase();
  const filtersActive =
    query.length > 0 || jobType !== "all" || location !== "all";

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (jobType !== "all" && (job.job_type || "") !== jobType) return false;
      if (location !== "all" && (job.location || "") !== location) return false;
      if (!query) return true;

      return [
        job.title,
        job.title_ur,
        job.organization,
        job.location,
        job.job_type,
        job.salary,
        job.short_description,
      ]
        .map((value) => (value || "").toLowerCase())
        .some((value) => value.includes(query));
    });
  }, [jobs, jobType, location, query]);

  function resetFilters() {
    setSearch("");
    setJobType("all");
    setLocation("all");
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <div className="text-3xl" aria-hidden="true">
          ⚠️
        </div>
        <h2 className="mt-3 text-lg font-bold text-red-800">
          We could not load jobs right now
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-5 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <div className="text-3xl" aria-hidden="true">
          🔔
        </div>
        <h2 className="mt-3 text-lg font-bold text-slate-800">
          No open opportunities right now
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
          New jobs and opportunities are added regularly by masjids, madrasas
          and Islamic institutes. Please check back soon.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label
              htmlFor="jobs-search"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Search
            </label>
            <input
              id="jobs-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, masjid, madrasa or city..."
              className={inputCls}
            />
          </div>

          <div>
            <label
              htmlFor="jobs-type"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Job type
            </label>
            <select
              id="jobs-type"
              value={jobType}
              onChange={(event) => setJobType(event.target.value)}
              className={inputCls}
            >
              <option value="all">All job types</option>
              {jobTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="jobs-location"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Location
            </label>
            <select
              id="jobs-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={inputCls}
            >
              <option value="all">All locations</option>
              {locations.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-600">
            Showing{" "}
            <span className="font-semibold text-slate-900">{filtered.length}</span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">{jobs.length}</span>{" "}
            {jobs.length === 1 ? "opportunity" : "opportunities"}
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="text-3xl" aria-hidden="true">
            🔍
          </div>
          <h2 className="mt-3 text-lg font-bold text-slate-800">
            No jobs match your search
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
            Try a different keyword, job type or location.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

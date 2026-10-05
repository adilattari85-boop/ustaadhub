import { Suspense } from "react";
import type { Metadata } from "next";

import JobsExplorer from "@/components/JobsExplorer";
import JobsSiteHeader from "@/components/JobsSiteHeader";
import UdyamBadge from "@/components/UdyamBadge";
import { supabase } from "@/lib/supabase";
import { fetchPublishedJobs, type Job } from "@/lib/jobs";

// Always render from live Supabase data so a job published by an admin
// shows up on /jobs immediately (no hardcoded jobs, no stale build cache).
export const dynamic = "force-dynamic";

const TITLE = "Find Jobs & Opportunities";
const DESCRIPTION =
  "Browse current jobs and opportunities for Imamat, Tadrees, Quran teaching, Hifz, Khateeb, Muazzin, Arabic and Islamic Studies roles at masjids, madrasas and Islamic institutes. Fresh listings added regularly.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.ustaadhub.in/jobs" },
  openGraph: {
    title: `${TITLE} | UstaadHub`,
    description: DESCRIPTION,
    url: "https://www.ustaadhub.in/jobs",
    siteName: "UstaadHub",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | UstaadHub`,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

function JobsLoadingState() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="sr-only">Loading jobs...</p>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-[42px] animate-pulse rounded-xl bg-slate-100 sm:col-span-2" />
          <div className="h-[42px] animate-pulse rounded-xl bg-slate-100" />
          <div className="h-[42px] animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>
    </div>
  );
}

async function JobsSection() {
  let jobs: Job[] = [];
  let error = "";

  try {
    jobs = await fetchPublishedJobs(supabase);
  } catch (jobsError) {
    error =
      jobsError instanceof Error
        ? jobsError.message
        : "Unexpected error while loading jobs.";
  }

  return <JobsExplorer jobs={jobs} error={error} />;
}

export default function JobsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <JobsSiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
        <header className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
            UstaadHub
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Find Jobs
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Current openings for Imam, Mudarris, Quran Teacher, Hifz Teacher and
            related roles at masjids, madrasas and Islamic institutes — including
            online teaching positions.
          </p>
        </header>

        <Suspense fallback={<JobsLoadingState />}>
          <JobsSection />
        </Suspense>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500 sm:px-6">
          Jobs and opportunities on UstaadHub are posted by masjids, madrasas and
          Islamic institutes. Always verify the organisation before sharing
          personal details.

          {/* Udyam (MSME) registration trust badge — see components/UdyamBadge.tsx. */}
          <UdyamBadge className="mt-5" />
        </div>
      </footer>
    </div>
  );
}

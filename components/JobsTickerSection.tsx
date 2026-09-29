"use client";

import { useEffect, useState } from "react";

import JobsTicker from "@/components/JobsTicker";
import { supabase } from "@/lib/supabase";
import { fetchTickerJobs, type JobTickerItem } from "@/lib/jobs";

type JobsTickerSectionProps = {
  locale?: "en" | "ur";
  /** Bump to force a refetch (e.g. after a language switch). */
  refreshKey?: string;
};

/**
 * Homepage wrapper for JobsTicker.
 *
 * The homepage is a client component, so this fetches from the SAME
 * `fetchTickerJobs` source used by /jobs — published jobs only, no mock
 * data and no second jobs system. Renders nothing when there are no
 * published jobs, exactly like the ticker itself.
 */
export default function JobsTickerSection({
  locale = "en",
  refreshKey,
}: JobsTickerSectionProps) {
  const [jobs, setJobs] = useState<JobTickerItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function load() {
      try {
        const rows = await fetchTickerJobs(supabase, {
          signal: controller.signal,
          limit: 12,
        });
        if (isMounted) setJobs(rows);
      } catch {
        // Ticker is supplementary — stay silent if the query fails.
        if (isMounted) setJobs([]);
      }
    }

    void load();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [refreshKey]);

  if (!jobs.length) {
    return null;
  }

  return (
    <div dir={locale === "ur" ? "rtl" : undefined}>
      <JobsTicker jobs={jobs} locale={locale} />
    </div>
  );
}

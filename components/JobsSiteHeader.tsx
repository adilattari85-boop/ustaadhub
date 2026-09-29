import Link from "next/link";

/**
 * Lightweight site header for the standalone Jobs pages.
 * The homepage keeps its own richer navbar; this keeps /jobs and
 * /jobs/[slug] on-brand without touching it.
 */
export default function JobsSiteHeader() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="shrink-0 whitespace-nowrap text-xl font-extrabold tracking-tight text-blue-700 sm:text-2xl"
        >
          UstaadHub
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/teachers"
            className="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-blue-700 sm:px-3"
          >
            Find Teachers
          </Link>
          <Link
            href="/jobs"
            aria-current="page"
            className="whitespace-nowrap rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 sm:px-4"
          >
            Find Jobs
          </Link>
        </div>
      </div>
    </nav>
  );
}

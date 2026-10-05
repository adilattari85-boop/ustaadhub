import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import JobContactUnlock from "@/components/JobContactUnlock";
import JobShareButtons from "@/components/JobShareButtons";
import JobsSiteHeader from "@/components/JobsSiteHeader";
import UdyamBadge from "@/components/UdyamBadge";
import { supabase } from "@/lib/supabase";
import { readJobContactPaymentSettings } from "@/lib/payments/server";
import { DEFAULT_JOB_CONTACT_PAYMENT_SETTINGS } from "@/lib/payments/types";
import {
  hasPaidJobContactUnlock,
  hasVisitorIdentity,
  loadJobContactRelease,
  resolveJobContactVisitorFromHeaders,
  type JobContactRelease,
} from "@/lib/payments/jobContact";
import {
  buildJobShareMessage,
  fetchJobBySlug,
  fetchPublishedJobs,
  formatJobDate,
  getJobPath,
  getJobUrl,
  isJobClosed,
  isJobExpired,
  isInternalApplyUrl,
  JOB_STATUS_LABELS,
  toWhatsAppNumber,
  type Job,
} from "@/lib/jobs";

// Live data on every request: a closed job must immediately stop being an
// active listing while its shared URL keeps working.
export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-200 text-slate-600",
  draft: "bg-amber-100 text-amber-700",
};

function buildDescription(job: Job): string {
  const parts = [
    job.organization,
    job.location,
    job.job_type,
    job.salary,
    job.short_description || job.description,
  ]
    .map((part) => (part || "").trim())
    .filter(Boolean);

  const text = parts.join(" • ");
  return text.length > 300 ? `${text.slice(0, 297)}...` : text;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const job = await fetchJobBySlug(supabase, slug);
    if (!job) {
      return { title: "Job not found" };
    }

    const description =
      buildDescription(job) ||
      `${job.title} opportunity on UstaadHub.`;
    const url = getJobUrl(job);
    const title = `${job.title} — ${job.organization || "Jobs"} | UstaadHub`;

    return {
      title: job.title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        siteName: "UstaadHub",
        type: "article",
        images: [{ url: "/og-image.png", width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/og-image.png"],
      },
    };
  } catch {
    return { title: "Job not found" };
  }
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-2 space-y-3 whitespace-pre-line text-[15px] leading-7 text-slate-700">
        {children}
      </div>
    </section>
  );
}

export default async function JobDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let job: Job | null = null;
  try {
    job = await fetchJobBySlug(supabase, slug);
  } catch {
    job = null;
  }

  // Drafts are hidden by RLS, so they can never reach this page.
  if (!job) {
    notFound();
  }

  const currentJob = job;
  const url = getJobUrl(currentJob);
  const message = buildJobShareMessage(currentJob, url);
  const closed = isJobClosed(currentJob);
  const expired = isJobExpired(currentJob);
  const inactive = closed || expired;

  let related: Job[] = [];
  try {
    const all = await fetchPublishedJobs(supabase, { limit: 60 });
    related = all
      .filter((item) => item.id !== currentJob.id)
      .sort((a, b) => {
        const aMatch = a.job_type && a.job_type === currentJob.job_type ? 1 : 0;
        const bMatch = b.job_type && b.job_type === currentJob.job_type ? 1 : 0;
        return bMatch - aMatch;
      })
      .slice(0, 3);
  } catch {
    related = [];
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: currentJob.title,
    description:
      currentJob.short_description || currentJob.description || currentJob.title,
    datePosted: currentJob.created_at,
    ...(currentJob.organization
      ? { hiringOrganization: { name: currentJob.organization } }
      : {}),
    ...(currentJob.job_type
      ? { employmentType: "FULL_TIME" }
      : {}),
    jobLocation: {
      address: {
        ...(currentJob.location
          ? { addressLocality: currentJob.location }
          : {}),
        addressCountry: "IN",
      },
    },
    ...(currentJob.expires_at
      ? { validThrough: currentJob.expires_at }
      : {}),
    directApply: false,
    url,
  };

  // ---------------------------------------------------------------------------
  // Contact access
  // ---------------------------------------------------------------------------
  // The public job query deliberately does NOT select contact_phone /
  // contact_email, so they cannot reach the browser through the RSC payload,
  // the HTML source, the JSON-LD or the page props. They are read here, on the
  // server, only when the visitor is entitled to see them.
  //
  // `contactRelease` is the ONLY channel by which contact data can reach this
  // page, and it stays null unless the switch is OFF or the visitor already has
  // a paid unlock for THIS job.
  // A null read means the service-role client is unavailable, which is the
  // same as "we cannot prove an entitlement" - fall back to the safe default
  // rather than throwing or, worse, defaulting to "everything is free".
  const contactSettings =
    (await readJobContactPaymentSettings()) ?? DEFAULT_JOB_CONTACT_PAYMENT_SETTINGS;
  const contactAccessEnabled = contactSettings.enabled;

  // Only a real visitor (signed-in user or a recognised guest cookie) can hold an
  // unlock, and a closed/expired job must not re-trigger a charge.
  const checkUnlock =
    contactAccessEnabled && !inactive && currentJob.slug ? await headers() : null;
  const visitor = checkUnlock
    ? await resolveJobContactVisitorFromHeaders(checkUnlock)
    : null;
  const identifiedVisitor = hasVisitorIdentity(visitor) ? visitor : null;

  const alreadyUnlocked =
    identifiedVisitor && currentJob.id
      ? await hasPaidJobContactUnlock({
          jobId: currentJob.id,
          visitor: identifiedVisitor,
        })
      : false;

  // Free for everyone, or this visitor has already paid: read the contact.
  const shouldReleaseContact = !contactAccessEnabled || alreadyUnlocked;

  let contactRelease: JobContactRelease | null = null;
  if (shouldReleaseContact && currentJob.slug) {
    const release = await loadJobContactRelease({ slug: currentJob.slug });
    contactRelease = release.ok ? release.contact : null;
  }

  const visiblePhone = contactRelease?.contactPhone ?? null;
  const visibleEmail = contactRelease?.contactEmail ?? null;
  const whatsappDigits = visiblePhone ? toWhatsAppNumber(visiblePhone) : "";
  const hasAnyContact = Boolean(visiblePhone || visibleEmail);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <JobsSiteHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500">
          <Link href="/" className="transition hover:text-blue-700">
            Home
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <Link href="/jobs" className="transition hover:text-blue-700">
            Find Jobs
          </Link>
        </nav>

        {inactive && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <h2 className="text-base font-bold text-amber-900">
              {closed
                ? "This opportunity is closed."
                : "This opportunity has expired."}
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              {closed
                ? "This position is no longer accepting applications. The details below are kept here so previously shared links keep working."
                : "The application deadline for this position has passed. Browse current openings on the Find Jobs page."}
            </p>
            <Link
              href="/jobs"
              className="mt-3 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Browse current jobs
            </Link>
          </div>
        )}

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                STATUS_BADGE[currentJob.status] || "bg-slate-100 text-slate-600"
              }`}
            >
              {JOB_STATUS_LABELS[currentJob.status] || currentJob.status}
            </span>
            {currentJob.is_pinned && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                Pinned
              </span>
            )}
            {currentJob.job_type && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
                {currentJob.job_type}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            {currentJob.title}
          </h1>
          {currentJob.organization && (
            <p className="mt-2 text-base font-semibold text-blue-700">
              {currentJob.organization}
            </p>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-5 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
            {currentJob.location && (
              <DetailItem label="Location" value={currentJob.location} />
            )}
            {currentJob.job_type && (
              <DetailItem label="Job type" value={currentJob.job_type} />
            )}
            {currentJob.salary && (
              <DetailItem label="Salary" value={currentJob.salary} />
            )}
            {currentJob.expires_at && (
              <DetailItem
                label="Deadline"
                value={formatJobDate(currentJob.expires_at)}
              />
            )}
          </dl>

          {currentJob.short_description && (
            <Section title="About this opportunity">
              {currentJob.short_description}
            </Section>
          )}

          {currentJob.description && (
            <Section title="Full description">
              {currentJob.description}
            </Section>
          )}

          {currentJob.requirements && (
            <Section title="Eligibility & requirements">
              {currentJob.requirements}
            </Section>
          )}

          {contactAccessEnabled &&
          !alreadyUnlocked &&
          !inactive &&
          currentJob.slug ? (
            // While the contact is still locked, the unlock component owns this
            // whole section. It renders the "Contact Details" heading, the
            // "contact details are protected" notice and the Unlock button, so
            // each of those appears exactly once. Keeping the locked copy here
            // as well is what previously produced the duplicated heading.
            <JobContactUnlock
              slug={currentJob.slug}
              amount={contactSettings.amount}
              currency={contactSettings.currency}
              jobTitle={currentJob.title}
              disabled={false}
            />
          ) : (
          <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h2 className="text-base font-bold text-slate-900">Contact Details</h2>

            {alreadyUnlocked ? (
                <div className="mt-3">
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    <span aria-hidden="true">&#10003;</span>
                    Contact Unlocked
                  </p>
                  {hasAnyContact ? (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {visiblePhone && (
                        <a
                          href={`tel:${visiblePhone}`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50"
                        >
                          <span aria-hidden="true">&#128222;</span>
                          {visiblePhone}
                        </a>
                      )}
                      {visibleEmail && (
                        <a
                          href={`mailto:${visibleEmail}`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50"
                        >
                          <span aria-hidden="true">&#9993;</span>
                          {visibleEmail}
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-600">
                      This opportunity has no direct contact details listed.
                      Please share this link with the Zimmedar.
                    </p>
                  )}
                </div>
              ) : hasAnyContact ? (
              <div className="mt-3">
                <p className="text-sm text-slate-500">
                  Contact the Zimmedar directly for this opportunity.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {visiblePhone && (
                    <a
                      href={`tel:${visiblePhone}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <span aria-hidden="true">&#128222;</span>
                      {visiblePhone}
                    </a>
                  )}
                  {visibleEmail && (
                    <a
                      href={`mailto:${visibleEmail}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <span aria-hidden="true">&#9993;</span>
                      {visibleEmail}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                No direct contact was provided. Please share this link with the
                Zimmedar.
              </p>
            )}

          </section>
          )}

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h2 className="text-base font-bold text-slate-900">How to apply</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {inactive ? (
                <p className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500">
                  Applications are closed for this opportunity.
                </p>
              ) : (
                <>
                  {whatsappDigits && (
                    <a
                      href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
                        `Assalamu Alaikum, I am interested in "${currentJob.title}"${
                          currentJob.organization
                            ? ` at ${currentJob.organization}`
                            : ""
                        }. ${url}`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1eb95a]"
                    >
                      <span aria-hidden="true">💬</span>
                      Apply on WhatsApp
                    </a>
                  )}
                  {currentJob.apply_url &&
                    (isInternalApplyUrl(currentJob.apply_url) ? (
                      <Link
                        href={currentJob.apply_url}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                      >
                        Apply now
                      </Link>
                    ) : (
                      <a
                        href={currentJob.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                      >
                        Apply now
                      </a>
                    ))}
                  {!whatsappDigits && !currentJob.apply_url && (
                    <p className="text-sm text-slate-600">
                      Use the contact details above, or share this link with the
                      Zimmedar to apply.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h2 className="text-base font-bold text-slate-900">Share this job</h2>
            <p className="mt-1 text-sm text-slate-600">
              Send this opportunity to someone who is looking for it.
            </p>
            <div className="mt-3">
              <JobShareButtons
                url={url}
                message={message}
                title={currentJob.title}
                disabled={inactive}
              />
            </div>
          </div>
        </article>

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-slate-900">
              More opportunities
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-3">
              {related.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <Link
                    href={getJobPath(item)}
                    className="font-semibold text-slate-900 transition hover:text-blue-700"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">
                    {[item.organization, item.location]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 text-sm text-slate-500 sm:px-6">
          <Link href="/jobs" className="transition hover:text-blue-700">
            ← Back to all jobs
          </Link>

          {/* Udyam (MSME) registration trust badge — see components/UdyamBadge.tsx. */}
          <UdyamBadge className="mt-5" />
        </div>
      </footer>
    </div>
  );
}
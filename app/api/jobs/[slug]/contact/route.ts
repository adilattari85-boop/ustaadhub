import { jsonResponse, readJobContactPaymentSettings } from "@/lib/payments/server";
import {
  hasPaidJobContactUnlock,
  hasVisitorIdentity,
  loadJobContactRelease,
  resolveJobContactPrice,
  resolveJobContactVisitor,
} from "@/lib/payments/jobContact";

// Protected release of ONE job's contact details.
//
// This is the only path by which contact_phone / contact_email may reach a
// browser. It returns them only when all of the following hold:
//   * the admin Job Contact Access switch is ON,
//   * the job exists and is publicly readable (published or closed),
//   * the caller has a server-verifiable identity (signed-in account, or the
//     HttpOnly guest-unlock cookie set when they paid),
//   * that identity has a 'paid' job_contact_unlocks row for THIS job id.
//
// A locked visitor gets { contact: null } and no field names containing contact
// values: the response is a fixed shape, so nothing leaks through an error
// branch. Contact details for a different job can never be returned, because
// the unlock is matched on job_id AND the row is loaded by this slug.

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const trimmedSlug = (slug ?? "").trim();

  if (!trimmedSlug || trimmedSlug.length > 200) {
    return jsonResponse({ contact: null, reason: "invalid_job" }, 400);
  }

  // 1. The switch. Read from the server only - identical source for this
  //    endpoint, the page and the order route, so they can never disagree.
  const settings = await readJobContactPaymentSettings();

  if (settings === null) {
    return jsonResponse({ contact: null, reason: "server_not_configured" }, 503);
  }

  const price = resolveJobContactPrice(settings);

  if (!price.ok) {
    if (price.reason === "disabled") {
      // Contact details are free while the switch is off, so this endpoint has
      // nothing to release. The page renders them server-side instead.
      return jsonResponse({ contact: null, reason: "not_required" });
    }

    return jsonResponse({ contact: null, reason: price.reason }, 503);
  }

  // 2. Identity, derived from the request. Never from the body.
  const visitor = await resolveJobContactVisitor(request);

  if (!hasVisitorIdentity(visitor)) {
    return jsonResponse({ contact: null, reason: "locked" });
  }

  // 3. Resolve the job first, so the unlock is always checked against the job
  //    this URL is actually about.
  const job = await loadJobContactRelease({ slug: trimmedSlug });

  if (!job.ok) {
    return jsonResponse({ contact: null, reason: "not_found" }, 404);
  }

  // 4. A 'paid' unlock for this exact job and this exact identity.
  const unlocked = await hasPaidJobContactUnlock({
    jobId: job.jobId,
    visitor,
  });

  if (!unlocked) {
    return jsonResponse({ contact: null, reason: "locked" });
  }

  return jsonResponse({
    jobId: job.jobId,
    contact: {
      contactPhone: job.contact.contactPhone,
      contactEmail: job.contact.contactEmail,
    },
  });
}

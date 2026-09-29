// Server-only business logic for the JOB CONTACT UNLOCK payment.
//
// This is the third, independent UstaadHub payment flow. It deliberately does
// NOT share state, tables or status semantics with:
//   * public.payments        -> learning-requirement payments
//   * public.support_payments -> donations / "Support UstaadHub"
// Its ledger is public.job_contact_unlocks and its switch is the
// 'job_contact_payment' platform settings row.
//
// The Razorpay cryptography is NOT re-implemented here: the existing
// server-only helpers in lib/payments/razorpay.ts and the shared plumbing in
// lib/payments/server.ts do all gateway and signature work. This module only
// owns the job-contact rules on top of them.
//
// SECURITY (why the browser cannot cheat):
//   * the price is ALWAYS read from get_job_contact_payment_settings() and is
//     never taken from a request body, a query string or a header,
//   * the ledger is written ONLY through the service role, so the browser has
//     no INSERT/UPDATE path to public.job_contact_unlocks at all
//     (RLS is enabled and both anon and authenticated are revoked),
//   * user_id is derived from a verified access token, never from the payload,
//   * only the server may transition a row to 'paid', and only after the
//     gateway signature has been verified and the gateway's own payment object
//     has been cross-checked.

import { createHash, randomBytes } from "node:crypto";

import { createServiceClient } from "./server";

/** Ledger table used by this flow only. */
export const JOB_CONTACT_LEDGER_TABLE = "job_contact_unlocks";

/**
 * Marker written to the gateway order notes and re-checked server-side, so a
 * job-contact order can never be confused with a requirement or a donation.
 */
export const JOB_CONTACT_PURPOSE = "job_contact_unlock";

/**
 * The only job columns this flow ever reads.
 *
 * A private structural type (not the full @/lib/jobs Job) so it is impossible
 * for this helper to accidentally start selecting contact_phone / contact_email
 * while the contact-gating feature is still unimplemented.
 */
export type UnlockableJob = {
  id: string;
  slug: string | null;
  title: string;
  organization: string | null;
  location: string | null;
  status: string;
};

export type JobContactLedgerRow = {
  id: string;
  job_id: string;
  user_id: string | null;
  amount: number;
  currency: string;
  payment_status: "created" | "paid" | "failed";
  razorpay_payment_id: string | null;
};

function toLedgerRow(row: Record<string, unknown>): JobContactLedgerRow {
  const status = String(row.payment_status ?? "created");

  return {
    id: String(row.id ?? ""),
    job_id: String(row.job_id ?? ""),
    user_id: typeof row.user_id === "string" ? row.user_id : null,
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "INR"),
    payment_status:
      status === "paid" || status === "failed" ? status : "created",
    razorpay_payment_id:
      typeof row.razorpay_payment_id === "string" ? row.razorpay_payment_id : null,
  };
}

/**
 * Reads our own job-contact unlock row for a gateway order id.
 *
 * The verification route and the webhook both use this to compare the gateway
 * event against the amount WE recorded server-side: even a signature-verified
 * body is never trusted to decide what the visitor owed.
 */
export async function findJobContactUnlockByOrderId(
  orderId: string,
): Promise<JobContactLedgerRow | null> {
  const client = createServiceClient();

  if (!client) {
    return null;
  }

  try {
    const { data, error } = await client
      .from(JOB_CONTACT_LEDGER_TABLE)
      .select(
        "id, job_id, user_id, amount, currency, payment_status, razorpay_payment_id",
      )
      .eq("razorpay_order_id", orderId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "[payments/job-contact] unlock lookup failed:",
        error.message,
      );

      return null;
    }

    if (!data) {
      return null;
    }

    return toLedgerRow(data as Record<string, unknown>);
  } catch (err) {
    console.error(
      "[payments/job-contact] unlock lookup error:",
      err instanceof Error ? err.message : "unknown error",
    );

    return null;
  }
}

/**
 * Has this visitor already PAID for this job's contact details?
 *
 * For a signed-in visitor this is the anti double-charge check: the partial
 * UNIQUE index job_contact_unlocks_paid_job_user_idx also makes a race between
 * two concurrent orders impossible at the database level, so a second paid row
 * can never be written for the same (job, user).
 *
 * Guests pass user_id = null and are therefore never treated as "already
 * unlocked" here - the guest authorization mechanism is server-side and is
 * introduced in a later phase.
 */
export async function findPaidJobContactUnlock(params: {
  jobId: string;
  userId: string | null;
}): Promise<JobContactLedgerRow | null> {
  const client = createServiceClient();

  if (!client || !params.userId) {
    return null;
  }

  try {
    const { data, error } = await client
      .from(JOB_CONTACT_LEDGER_TABLE)
      .select(
        "id, job_id, user_id, amount, currency, payment_status, razorpay_payment_id",
      )
      .eq("job_id", params.jobId)
      .eq("user_id", params.userId)
      .eq("payment_status", "paid")
      .order("paid_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "[payments/job-contact] paid unlock lookup failed:",
        error.message,
      );

      return null;
    }

    if (!data) {
      return null;
    }

    return toLedgerRow(data as Record<string, unknown>);
  } catch (err) {
    console.error(
      "[payments/job-contact] paid unlock lookup error:",
      err instanceof Error ? err.message : "unknown error",
    );

    return null;
  }
}

export type CreateJobContactUnlockParams = {
  jobId: string;
  /** Verified session user, or null for an anonymous visitor. */
  userId: string | null;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  /**
   * Pre-generated ledger id.
   *
   * Generated by the caller BEFORE the gateway order exists so the id can be
   * written into the gateway order notes (that is the only way to carry the
   * ledger reference to Razorpay, whose notes are fixed at creation time).
   */
  id: string;
  /**
   * SHA-256 hash of the guest unlock token, or null for a signed-in visitor.
   *
   * The RAW token never reaches the database: the order route mints it, stores
   * only this hash, and puts the raw value in an HttpOnly cookie. A leaked
   * ledger row is therefore useless as a credential, and a forged cookie cannot
   * be matched to any row.
   */
  guestTokenHash?: string | null;
};

export type CreateJobContactUnlockResult =
  | { ok: true; id: string }
  | { ok: false; reason: "server_not_configured" | "insert_failed" };

/**
 * Records the unlock attempt BEFORE Checkout opens, keyed by the UNIQUE
 * razorpay_order_id, exactly like the support ledger does.
 *
 * The row is always written as 'created' and always with the server-read
 * amount - the caller cannot pass a price through here.
 */
export async function createJobContactUnlock(
  params: CreateJobContactUnlockParams,
): Promise<CreateJobContactUnlockResult> {
  const client = createServiceClient();

  if (!client) {
    return { ok: false, reason: "server_not_configured" };
  }

  try {
    const { data, error } = await client
      .from(JOB_CONTACT_LEDGER_TABLE)
      .insert({
        id: params.id,
        job_id: params.jobId,
        user_id: params.userId,
        razorpay_order_id: params.razorpayOrderId,
        amount: params.amount,
        currency: params.currency,
        payment_status: "created",
        guest_token_hash: params.guestTokenHash ?? null,
      })
      .select("id")
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.error(
        "[payments/job-contact] could not record the gateway order:",
        error?.message ?? "no row returned",
      );

      return { ok: false, reason: "insert_failed" };
    }

    return { ok: true, id: String((data as { id?: unknown }).id ?? "") };
  } catch (err) {
    console.error(
      "[payments/job-contact] could not record the gateway order:",
      err instanceof Error ? err.message : "unknown error",
    );

    return { ok: false, reason: "insert_failed" };
  }
}

export type ApplyJobContactUnlockParams = {
  orderId: string;
  paymentId: string | null;
  status: "paid" | "failed";
  failureReason?: string | null;
};

export type ApplyJobContactUnlockOutcome =
  | { ok: true; applied: boolean }
  | { ok: false; reason: string };

/**
 * Applies a VERIFIED job-contact result through the service role.
 *
 * Idempotency / safety rules (mirror public.apply_support_payment_result):
 *   * 'paid' only transitions rows that are not already 'paid', so a replayed
 *     verify call or a duplicate webhook delivery is a no-op,
 *   * 'failed' only applies while the row is still 'created', so an
 *     out-of-order event can never downgrade an already paid unlock,
 *   * razorpay_payment_id is UNIQUE, so one captured payment can never unlock
 *     two different jobs,
 *   * job_contact_unlocks_paid_job_user_idx blocks a second paid row for the
 *     same (job, user) even if two requests race; a violation surfaces as an
 *     update error rather than a double unlock.
 *
 * applied=false means "nothing matched" (already processed, or the concurrent
 * racer already recorded it) - callers treat that as SUCCESS, not a failure.
 */
export async function applyJobContactUnlockResult(
  params: ApplyJobContactUnlockParams,
): Promise<ApplyJobContactUnlockOutcome> {
  const client = createServiceClient();

  if (!client) {
    return { ok: false, reason: "server_not_configured" };
  }

  try {
    if (params.status === "paid") {
      if (!params.paymentId || params.paymentId.trim() === "") {
        return { ok: false, reason: "payment_id_required" };
      }

      const { data, error } = await client
        .from(JOB_CONTACT_LEDGER_TABLE)
        .update({
          payment_status: "paid",
          razorpay_payment_id: params.paymentId,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("razorpay_order_id", params.orderId)
        .neq("payment_status", "paid")
        .select("id");

      if (error) {
        console.error(
          "[payments/job-contact] unlock paid update failed:",
          error.message,
        );

        return { ok: false, reason: "update_failed" };
      }

      return { ok: true, applied: (data?.length ?? 0) > 0 };
    }

    const { data, error } = await client
      .from(JOB_CONTACT_LEDGER_TABLE)
      .update({
        payment_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", params.orderId)
      .eq("payment_status", "created")
      .select("id");

    if (error) {
      console.error(
        "[payments/job-contact] unlock failed update failed:",
        error.message,
      );

      return { ok: false, reason: "update_failed" };
    }

    return { ok: true, applied: (data?.length ?? 0) > 0 };
  } catch (err) {
    console.error(
      "[payments/job-contact] applyJobContactUnlockResult error:",
      err instanceof Error ? err.message : "unknown error",
    );

    return { ok: false, reason: "update_failed" };
  }
}

/**
 * Loads the job an unlock is being requested for and decides whether it is
 * publicly accessible RIGHT NOW.
 *
 * Uses the service role (not the browser-facing client) so the answer is derived
 * from the real row, and deliberately returns only what the checkout needs. A
 * draft, deleted or missing job is rejected, so nobody can pay to unlock a
 * listing that is not publicly visible.
 */
export async function loadPublicJobForUnlock(params: {
  jobId?: string;
  slug?: string;
}): Promise<
  | { ok: true; job: UnlockableJob }
  | { ok: false; reason: "invalid_job" | "not_found" }
> {
  const client = createServiceClient();

  if (!client) {
    return { ok: false, reason: "not_found" };
  }

  const jobId = (params.jobId ?? "").trim();
  const slug = (params.slug ?? "").trim();

  if (!jobId && !slug) {
    return { ok: false, reason: "invalid_job" };
  }

  // Max length guard, mirroring the identifier limits used by the other routes.
  if (jobId.length > 200 || slug.length > 200) {
    return { ok: false, reason: "invalid_job" };
  }

  try {
    const query = client
      .from("jobs")
      .select("id, slug, title, organization, location, status")
      .limit(1);

    const { data, error } = jobId
      ? await query.eq("id", jobId).maybeSingle()
      : await query.eq("slug", slug).maybeSingle();

    if (error || !data) {
      return { ok: false, reason: "not_found" };
    }

    // Only the columns the checkout needs are selected, so the service role
    // never pulls a job's phone/email into this flow.
    const job = data as UnlockableJob;

    // Public listing rules: 'published' is an active listing, 'closed' is still
    // reachable through its shared URL. A 'draft' is never unlockable.
    const status = String(job.status ?? "");
    const isPublic = status === "published" || status === "closed";

    if (!isPublic) {
      return { ok: false, reason: "not_found" };
    }

    return { ok: true, job };
  } catch (err) {
    console.error(
      "[payments/job-contact] job lookup error:",
      err instanceof Error ? err.message : "unknown error",
    );

    return { ok: false, reason: "not_found" };
  }
}

/**
 * Amount actually charged for one job-contact unlock.
 *
 * The value comes from the 'job_contact_payment' platform settings row via
 * get_job_contact_payment_settings() - the browser never supplies it. The
 * re-validation here is deliberate defence in depth: even a malformed settings
 * row (0, negative, NaN, absurd) can never become a real Razorpay amount.
 */
export const MAX_JOB_CONTACT_UNLOCK_AMOUNT = 100000; // ₹1,00,000 safety ceiling

export type ResolvedJobContactPrice = {
  enabled: boolean;
  amount: number;
  currency: string;
  minorUnits: number;
};

/** Converts a validated rupee amount to the gateway's minor units. */
export function toMinorUnitsFromRupees(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Resolves the server-side price and validates it before any gateway call.
 *
 * Returns ok:false with "disabled" when the admin switch is OFF, which the order
 * route reports to the client as "no payment required" rather than creating an
 * order.
 */
export function resolveJobContactPrice(
  settings: {
    enabled: boolean;
    amount: number;
    currency: string;
  } | null,
): { ok: true; price: ResolvedJobContactPrice } | { ok: false; reason: string } {
  if (!settings) {
    return { ok: false, reason: "server_not_configured" };
  }

  if (!settings.enabled) {
    return { ok: false, reason: "disabled" };
  }

  const amount = Number(settings.amount);
  const currency = String(settings.currency ?? "INR").toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    console.error(
      "[payments/job-contact] the configured unlock amount is not usable; refusing to create an order.",
    );

    return { ok: false, reason: "invalid_settings" };
  }

  if (amount > MAX_JOB_CONTACT_UNLOCK_AMOUNT) {
    console.error(
      "[payments/job-contact] the configured unlock amount exceeds the allowed maximum; refusing to create an order.",
    );

    return { ok: false, reason: "invalid_settings" };
  }

  if (currency !== "INR") {
    console.error(
      "[payments/job-contact] unexpected unlock currency; refusing to create an order.",
    );

    return { ok: false, reason: "invalid_settings" };
  }

  const minorUnits = toMinorUnitsFromRupees(amount);

  if (!Number.isFinite(minorUnits) || minorUnits <= 0) {
    return { ok: false, reason: "invalid_settings" };
  }

  return {
    ok: true,
    price: {
      enabled: true,
      // Round to paise so the ledger, the gateway and the verification compare
      // against exactly the same number.
      amount: minorUnits / 100,
      currency,
      minorUnits,
    },
  };
}

// ---------------------------------------------------------------------------
// Guest identity + contact release (Phase 3)
//
// A guest who pays has no account, so the server needs a durable, unforgeable
// way to recognise them on a later page load. The mechanism is deliberately the
// same shape as the existing support-payment guest flow: a random token minted
// on the server, delivered in an HttpOnly cookie, and stored ONLY as a SHA-256
// hash. There is no localStorage copy and no client-held secret, so a visitor
// cannot read, edit or replay it, and clearing cookies simply forfeits access
// (it never grants it).
// ---------------------------------------------------------------------------

/** HttpOnly cookie carrying the raw guest unlock token. */
export const JOB_CONTACT_GUEST_COOKIE = "ustadhub_job_unlock";

/** One year - long enough to keep an already-paid unlock usable. */
const GUEST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Mints a new guest token and its stored hash.
 *
 * 256 bits of entropy, so guessing is not a practical attack. The caller puts
 * `rawToken` in the HttpOnly cookie and passes `tokenHash` to the ledger.
 */
export function createGuestUnlockToken(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = randomBytes(32).toString("base64url");

  return { rawToken, tokenHash: hashGuestUnlockToken(rawToken) };
}

/** Hashes a cookie value for ledger lookup. */
export function hashGuestUnlockToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Builds the Set-Cookie value for the guest token (HttpOnly, SameSite=Lax). */
export function buildGuestCookie(rawToken: string): string {
  return [
    `${JOB_CONTACT_GUEST_COOKIE}=${rawToken}`,
    "Path=/",
    `Max-Age=${GUEST_COOKIE_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
    "Secure",
  ].join("; ");
}

/** Reads the guest token out of a Cookie header. Never throws. */
export function readGuestTokenFromHeader(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");

    if (rawName === JOB_CONTACT_GUEST_COOKIE) {
      const value = rest.join("=").trim();

      return value === "" ? null : value;
    }
  }

  return null;
}

/** The identity a visitor is checked against, both derived server-side. */
export type JobContactVisitor = {
  /** From a verified access token, never from a request body. */
  userId: string | null;
  /** From the HttpOnly cookie, never from client storage. */
  guestToken: string | null;
};

/**
 * Does this visitor carry a usable identity at all?
 *
 * A signed-in user is identified by userId; a guest is identified only by the
 * server-signed guest token. Anything else can hold no unlock, so callers use
 * this as a type guard to narrow away `null` before querying the ledger.
 */
export function hasVisitorIdentity(
  visitor: JobContactVisitor | null | undefined,
): visitor is JobContactVisitor {
  return Boolean(visitor && (visitor.userId || visitor.guestToken));
}

/**
 * Has THIS visitor paid for THIS job's contact details?
 *
 * Requires payment_status = 'paid' and a job_id match, so an unlock for one job
 * can never unlock another (requirement G). A visitor with no identity is never
 * unlocked - absence of evidence is treated as locked, never as free.
 */
export async function hasPaidJobContactUnlock(params: {
  jobId: string;
  visitor: JobContactVisitor;
}): Promise<boolean> {
  const client = createServiceClient();

  if (!client || !hasVisitorIdentity(params.visitor)) {
    return false;
  }

  try {
    let query = client
      .from(JOB_CONTACT_LEDGER_TABLE)
      .select("id")
      .eq("job_id", params.jobId)
      .eq("payment_status", "paid")
      .limit(1);

    if (params.visitor.userId) {
      query = query.eq("user_id", params.visitor.userId);
    } else {
      query = query
        .is("user_id", null)
        .eq("guest_token_hash", hashGuestUnlockToken(params.visitor.guestToken!));
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error(
        "[payments/job-contact] unlock check failed:",
        error.message,
      );

      return false;
    }

    return Boolean(data);
  } catch (err) {
    console.error(
      "[payments/job-contact] unlock check error:",
      err instanceof Error ? err.message : "unknown error",
    );

    return false;
  }
}

/**
 * Derives who is asking, from the request alone.
 *
 * The user id comes from a VERIFIED Supabase access token, and the guest token
 * comes from the HttpOnly cookie. Nothing is read from the body, a query string
 * or any client-writable storage, so a caller cannot claim another visitor's
 * identity by editing a request.
 *
 * A signed-in visitor is preferred: if a session exists, the guest cookie is
 * ignored, because the account is the stronger credential.
 */
export async function resolveJobContactVisitor(
  request: Request,
): Promise<JobContactVisitor> {
  const cookieToken = readGuestTokenFromHeader(request.headers.get("cookie"));

  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";

    if (accessToken) {
      const { resolveUserId } = await import("./server");
      const userId = await resolveUserId(accessToken);

      if (userId) {
        return { userId, guestToken: null };
      }
    }
  } catch (err) {
    console.error(
      "[payments/job-contact] visitor resolution error:",
      err instanceof Error ? err.message : "unknown error",
    );
  }

  return { userId: null, guestToken: cookieToken };
}

/**
 * Same as resolveJobContactVisitor(), for a Server Component that already holds
 * the incoming request headers (via next/headers) instead of a raw Request.
 *
 * This is what lets /jobs/[slug] decide the locked/unlocked state on the
 * server, so an already-unlocked visitor never sees a flash of the paywall.
 */
export async function resolveJobContactVisitorFromHeaders(
  incoming: Headers,
): Promise<JobContactVisitor> {
  return resolveJobContactVisitor({
    headers: incoming,
  } as Request);
}

// ---------------------------------------------------------------------------
// Contact release
// ---------------------------------------------------------------------------

/** A job's contact fields. Never sent to a visitor who has not paid. */
export type JobContactRelease = {
  contactPhone: string | null;
  contactEmail: string | null;
};

const CONTACT_COLUMNS = "id, slug, status, contact_phone, contact_email";

/**
 * Server-only read of a job's contact details.
 *
 * Runs on the service role and returns ONLY the two contact fields plus the
 * identity of the job they belong to - never the whole row - so a caller can
 * never accidentally ship the rest of the record, or another job's contact
 * details, to the browser.
 *
 * Callers MUST have established a paid unlock first; this function itself is
 * deliberately dumb about payment so the two concerns stay separate.
 */
export async function loadJobContactRelease(params: {
  jobId?: string;
  slug?: string;
}): Promise<
  | { ok: true; jobId: string; contact: JobContactRelease }
  | { ok: false; reason: "invalid_job" | "not_found" }
> {
  const client = createServiceClient();

  if (!client) {
    return { ok: false, reason: "not_found" };
  }

  const jobId = (params.jobId ?? "").trim();
  const slug = (params.slug ?? "").trim();

  if (!jobId && !slug) {
    return { ok: false, reason: "invalid_job" };
  }

  if (jobId.length > 200 || slug.length > 200) {
    return { ok: false, reason: "invalid_job" };
  }

  try {
    const query = client.from("jobs").select(CONTACT_COLUMNS).limit(1);
    const { data, error } = jobId
      ? await query.eq("id", jobId).maybeSingle()
      : await query.eq("slug", slug).maybeSingle();

    if (error || !data) {
      return { ok: false, reason: "not_found" };
    }

    const row = data as {
      id?: unknown;
      status?: string | null;
      contact_phone?: string | null;
      contact_email?: string | null;
    };
    const status = String(row.status ?? "");

    // Never release contact details for a draft, even to a paying visitor.
    if (status !== "published" && status !== "closed") {
      return { ok: false, reason: "not_found" };
    }

    return {
      ok: true,
      jobId: String(row.id ?? jobId),
      contact: {
        contactPhone: row.contact_phone ?? null,
        contactEmail: row.contact_email ?? null,
      },
    };
  } catch (err) {
    console.error(
      "[payments/job-contact] contact lookup error:",
      err instanceof Error ? err.message : "unknown error",
    );

    return { ok: false, reason: "not_found" };
  }
}

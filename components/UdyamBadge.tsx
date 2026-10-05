import { FaShieldAlt } from "react-icons/fa";

/**
 * Udyam (MSME) registration trust badge for the UstaadHub footer.
 *
 * Wording is intentionally limited to what the Udyam Registration Certificate
 * actually states. It is NOT a "Government Approved" / "Government Certified"
 * claim and must never be phrased that way.
 *
 * Verified certificate details (single source of truth):
 *   Enterprise ................ USTAADHUB
 *   Udyam Registration Number . UDYAM-UP-60-0034350
 *   Enterprise Type ........... Micro
 *   Major Activity ............ Services
 *
 * No official MSME / Udyam / Government logo asset exists in `public/` yet, and
 * none may be invented or altered. Until an authorised asset is added, the mark
 * is rendered with a neutral placeholder icon plus text styling. Swap the icon
 * for the official artwork (dropped into `public/`) once it is available.
 */
export const UDYAM_ENTERPRISE_NAME = "USTAADHUB";

export const UDYAM_REGISTRATION_NUMBER = "UDYAM-UP-60-0034350";

export const UDYAM_ENTERPRISE_TYPE = "Micro";

export const UDYAM_MAJOR_ACTIVITY = "Services";

type UdyamBadgeProps = {
  /**
   * Localised headline, e.g. "MSME • Udyam Registered".
   *
   * Optional: pages without a translation layer fall back to the English
   * wording. Pass an explicit value to localise it (see app/page.tsx).
   */
  title?: string;
  /**
   * Localised secondary line, e.g. "Micro enterprise • Services".
   *
   * Optional: defaults to the certificate values below, so callers never
   * have to repeat Udyam data.
   */
  meta?: string;
  /** Extra classes for the outer wrapper (spacing, width, ...). */
  className?: string;
};

export default function UdyamBadge({
  title = "MSME • Udyam Registered",
  meta = `${UDYAM_ENTERPRISE_TYPE} enterprise • ${UDYAM_MAJOR_ACTIVITY}`,
  className = "",
}: UdyamBadgeProps) {
  return (
    <div
      className={`inline-flex w-full max-w-xs items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 sm:w-auto ${className}`}
      title={`${UDYAM_ENTERPRISE_NAME} is Udyam registered (MSME). Udyam Registration Number: ${UDYAM_REGISTRATION_NUMBER}`}
    >
      {/* Placeholder mark — replace with the official MSME / Udyam logo asset. */}
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-700"
      >
        <FaShieldAlt className="h-5 w-5" />
      </span>

      <span className="min-w-0">
        <span className="sr-only">{UDYAM_ENTERPRISE_NAME} — </span>
        <span className="block text-[13px] font-semibold leading-5 text-slate-800">
          {title}
        </span>
        <span
          dir="ltr"
          className="mt-0.5 block font-mono text-[11px] font-medium leading-4 tracking-[0.06em] text-slate-500 sm:text-xs"
        >
          {UDYAM_REGISTRATION_NUMBER}
        </span>
        <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">
          {meta}
        </span>
      </span>
    </div>
  );
}

"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { getWhatsAppShareUrl } from "@/lib/jobs";

type JobShareButtonsProps = {
  /** Absolute shareable URL, built server-side from the canonical site URL. */
  url: string;
  /** Dynamic, job-specific message. */
  message: string;
  title: string;
  /** Closed jobs hide the active sharing CTA but keep the page useful. */
  disabled?: boolean;
};

const btnCls =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

/**
 * Share controls: copy link, WhatsApp and the native Web Share API on
 * supported mobile devices.
 */
export default function JobShareButtons({
  url,
  message,
  title,
  disabled = false,
}: JobShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  // Read-only external read of `navigator.share`. useSyncExternalStore keeps the
  // server snapshot (false) and the client snapshot consistent without a
  // setState-in-effect hydration mismatch.
  const canNativeShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );

  const copyLink = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const field = document.createElement("textarea");
        field.value = url;
        field.setAttribute("readonly", "");
        field.style.position = "absolute";
        field.style.left = "-9999px";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        document.body.removeChild(field);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }, [url]);

  const nativeShare = useCallback(async () => {
    try {
      await navigator.share({ title, text: message, url });
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
  }, [message, title, url]);

  const shareText = disabled
    ? `${title}\n\nThis opportunity is closed.\n\nPreviously shared details: ${url}`
    : message;

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => void copyLink()}
        className={`${btnCls} border border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700`}
      >
        <span aria-hidden="true">🔗</span>
        {copied ? "Link copied" : "Copy Link"}
      </button>

      <a
        href={getWhatsAppShareUrl(shareText)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btnCls} bg-[#25D366] text-white hover:bg-[#1eb95a]`}
      >
        <span aria-hidden="true">💬</span>
        Share on WhatsApp
      </a>

      {canNativeShare && (
        <button
          type="button"
          onClick={() => void nativeShare()}
          className={`${btnCls} bg-blue-700 text-white hover:bg-blue-800`}
        >
          <span aria-hidden="true">📤</span>
          Share
        </button>
      )}
    </div>
  );
}

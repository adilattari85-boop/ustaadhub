"use client";

import { useState } from "react";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";

interface HeroShowcaseProps {
  /** Existing UstaadHub screenshots — they are the hero visual. */
  slides: HeroSlide[];
  /** Address shown in the decorative browser bar. */
  urlLabel?: string;
  /** Autoplay interval for the screenshot crossfade, in ms. */
  autoplayInterval?: number;
}

/**
 * Hero website-preview showcase.
 *
 * The existing UstaadHub landing-page screenshots are presented inside a slim
 * browser frame, so the hero visual reads as a real website preview rather than
 * an invented dashboard. A narrow column on the far side keeps the next
 * screenshot visible, which gives the composition its tall website-preview feel.
 *
 * All motion stays very small and slow (see the `hero-showcase*` rules in
 * globals.css) and is disabled for users who prefer reduced motion.
 */
export default function HeroShowcase({
  slides,
  urlLabel = "ustaadhub.in",
  autoplayInterval = 5200,
}: HeroShowcaseProps) {
  const [current, setCurrent] = useState(0);
  const peekIndex = slides.length ? (current + 1) % slides.length : 0;

  return (
    <div className="hero-showcase relative">
      <div className="hero-showcase-frame relative overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-2xl shadow-blue-900/10 ring-1 ring-black/5">
        {/* Decorative browser bar */}
        <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-3 py-2 sm:px-4 sm:py-2.5">
          <div aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-300 sm:h-2.5 sm:w-2.5" />
            <span className="h-2 w-2 rounded-full bg-amber-300 sm:h-2.5 sm:w-2.5" />
            <span className="h-2 w-2 rounded-full bg-emerald-300 sm:h-2.5 sm:w-2.5" />
          </div>

          <div className="mx-auto flex min-w-0 items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1 text-[10px] font-medium text-gray-500 sm:text-[11px]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-3 w-3 shrink-0"
            >
              <rect x="4" y="10.5" width="16" height="10" rx="2" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
            </svg>

            <span className="truncate">{urlLabel}</span>
          </div>

          {/* Keeps the address pill centred in the bar */}
          <div aria-hidden="true" className="w-8 shrink-0" />
        </div>

        {/* The screenshot itself, with the site continuing on the far side */}
        {/* `dir="ltr"` locks the flex order so the narrow continuation always
            sits on the visual right, even when the /ur page is RTL. */}
        <div dir="ltr" className="relative flex overflow-hidden">
          <div className="relative aspect-[2/1] min-w-0 flex-1 bg-white">
            <HeroCarousel
              slides={slides}
              autoplayInterval={autoplayInterval}
              showArrows={false}
              showIndicators={false}
              onSlideChange={setCurrent}
            />
          </div>

          {slides.length > 1 && (
            <div className="hero-showcase-side relative hidden w-12 shrink-0 overflow-hidden bg-white sm:block lg:w-16 xl:w-20">
              {slides.map((slide, index) => (
                // The same screenshots, cropped by the column so only the start
                // of the page stays visible — i.e. the preview continues.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={slide.src}
                  src={slide.src}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  draggable={false}
                  className={`absolute inset-y-0 left-0 h-full w-auto max-w-none object-cover object-left transition-opacity duration-[2200ms] ease-in-out motion-reduce:transition-none ${
                    index === peekIndex ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}

              {/* Softly veils the crop so it reads as a continuation, not a cut */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-r from-white/30 via-white/10 to-white/75"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

export interface HeroSlide {
  src: string;
  alt: string;
}

interface HeroCarouselProps {
  /** Slides to display. Use existing project assets only. */
  slides: HeroSlide[];
  /** Autoplay interval in ms (defaults to 4500ms). */
  autoplayInterval?: number;
  /** Pause autoplay while hovering / focusing the carousel. */
  pauseOnHover?: boolean;
}

export default function HeroCarousel({
  slides,
  autoplayInterval = 4500,
  pauseOnHover = true,
}: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const multi = count > 1;

  // Keep the index in range if the slides array changes at runtime.
  useEffect(() => {
    if (current >= count) {
      setCurrent(0);
    }
  }, [count, current]);

  // Autoplay: only when there is more than one slide and not paused.
  // Depending on `current` means any manual navigation restarts the timer.
  useEffect(() => {
    if (!multi || paused) {
      return;
    }
    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % count);
    }, autoplayInterval);
    return () => window.clearInterval(timer);
  }, [multi, paused, count, autoplayInterval, current]);

  const goTo = useCallback(
    (index: number) => {
      const clamped = ((index % count) + count) % count;
      setCurrent(clamped);
    },
    [count],
  );

  const prev = () => goTo(current - 1);
  const next = () => goTo(current + 1);

  const pauseProps = pauseOnHover
    ? {
        onMouseEnter: () => setPaused(true),
        onMouseLeave: () => setPaused(false),
        onFocusCapture: () => setPaused(true),
        onBlurCapture: () => setPaused(false),
      }
    : {};

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="UstaadHub hero banner"
      className="absolute inset-0"
      {...pauseProps}
    >
      {/* Image layer */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {slides.map((slide, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            loading={index === 0 ? "eager" : "lazy"}
            draggable={false}
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ease-in-out ${
              index === current ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>
{/* Previous / Next controls — hidden when only one slide exists */}
      {multi && (
        <button
          type="button"
          onClick={prev}
          aria-label="Previous slide"
          className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-2.5 text-gray-800 shadow-md transition hover:bg-white hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:left-5 sm:p-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 sm:h-6 sm:w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {multi && (
        <button
          type="button"
          onClick={next}
          aria-label="Next slide"
          className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-2.5 text-gray-800 shadow-md transition hover:bg-white hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:right-5 sm:p-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 sm:h-6 sm:w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Bottom-center indicators — only rendered when more than one slide */}
      {multi && (
        <div
          className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5 sm:bottom-5"
          role="tablist"
          aria-label="Choose slide"
        >
          {slides.map((slide, index) => {
            const active = index === current;
            return (
              <button
                key={slide.src + index}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => goTo(index)}
                className={`rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  active
                    ? "w-7 bg-blue-700"
                    : "w-2.5 bg-gray-400/70 hover:bg-gray-600"
                } h-2.5`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
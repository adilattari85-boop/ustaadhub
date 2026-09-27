"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type FeaturedTeacher = {
  id: string;
  full_name: string | null;
  subjects: string[] | null;
  experience: string | null;
  languages: string[] | null;
  teaching_mode: string | null;
  fee_weekly: number | null;
  fee_monthly: number | null;
  profile_photo_url: string | null;
  is_verified: boolean;
};

export type FeaturedTeachersCarouselLabels = {
  verified: string;
  experience: string;
  teachingMode: string;
  languages: string;
  fees: string;
  viewProfile: string;
  subjectsNotSpecified: string;
  notSpecified: string;
};

type CarouselMetrics = {
  width: number;
  perView: number;
  gap: number;
};

// Below this count the list stays a plain responsive grid (no autoplay).
const MIN_TEACHERS_FOR_CAROUSEL = 3;
const AUTOPLAY_MS = 3800;
const SLIDE_TRANSITION_MS = 500;

// Carousel chrome copy only. Card copy is always passed in from the page so
// the page `copy` object stays the single source of truth.
const NAV_COPY = {
  en: {
    region: "Featured teachers",
    previous: "Previous teacher",
    next: "Next teacher",
    position: "Show teacher",
  },
  ur: {
    region: "نمایاں اساتذہ",
    previous: "پچھلا استاد",
    next: "اگلا استاد",
    position: "اساتذہ دکھائیں",
  },
};

function getInitials(name: string | null) {
  const initials = (name || "Teacher")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return initials || "T";
}

function formatFee(value: number | null, period: "week" | "month") {
  if (value === null || value === undefined) return null;

  return `₹${value.toLocaleString("en-IN")}/${period}`;
}

type TeacherCardProps = {
  teacher: FeaturedTeacher;
  labels: FeaturedTeachersCarouselLabels;
  fill?: boolean;
};

function TeacherCard({ teacher, labels, fill = false }: TeacherCardProps) {
  const weeklyFee = formatFee(teacher.fee_weekly, "week");
  const monthlyFee = formatFee(teacher.fee_monthly, "month");

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl${
        fill ? " h-full" : ""
      }`}
    >
      <div className="flex items-center gap-4 p-5 sm:p-6">
        {teacher.profile_photo_url ? (
          <img
            src={teacher.profile_photo_url}
            alt={teacher.full_name || "Teacher"}
            className="h-16 w-16 shrink-0 rounded-full object-cover sm:h-20 sm:w-20"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700 sm:h-20 sm:w-20 sm:text-xl">
            {getInitials(teacher.full_name)}
          </div>
        )}

        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-900 sm:text-lg">
            {teacher.full_name || "Ustaad"}
          </h3>

          <p className="mt-1 truncate text-sm text-blue-700">
            {(teacher.subjects || []).slice(0, 2).join(" & ") ||
              labels.subjectsNotSpecified}
          </p>

          <span className="mt-2 inline-block rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
            {labels.verified}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col border-t border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex justify-between gap-4 text-sm">
          <span className="shrink-0 text-slate-500">{labels.experience}</span>
          <span className="min-w-0 text-right font-semibold text-slate-800">
            {teacher.experience || labels.notSpecified}
          </span>
        </div>

        <div className="mt-3 flex justify-between gap-4 text-sm">
          <span className="shrink-0 text-slate-500">{labels.teachingMode}</span>
          <span className="min-w-0 text-right font-semibold text-slate-800">
            {teacher.teaching_mode || labels.notSpecified}
          </span>
        </div>

        <div className="mt-3 flex justify-between gap-4 text-sm">
          <span className="shrink-0 text-slate-500">{labels.languages}</span>
          <span className="min-w-0 text-right font-semibold text-slate-800">
            {(teacher.languages || []).join(", ") || labels.notSpecified}
          </span>
        </div>

        {(weeklyFee || monthlyFee) && (
          <div className="mt-3 flex justify-between gap-4 text-sm">
            <span className="shrink-0 text-slate-500">{labels.fees}</span>
            <span className="min-w-0 text-right font-semibold text-slate-800">
              {[weeklyFee, monthlyFee].filter(Boolean).join(" + ")}
            </span>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end pt-1">
          <Link
            href={`/teachers/${teacher.id}`}
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 sm:w-auto"
          >
            {labels.viewProfile}
          </Link>
        </div>
      </div>
    </div>
  );
}

type FeaturedTeachersCarouselProps = {
  teachers: FeaturedTeacher[];
  labels: FeaturedTeachersCarouselLabels;
  locale?: string;
};

export default function FeaturedTeachersCarousel({
  teachers,
  labels,
  locale = "en",
}: FeaturedTeachersCarouselProps) {
  const total = teachers.length;
  const isCarousel = total >= MIN_TEACHERS_FOR_CAROUSEL;
  const isUrdu = locale === "ur";
  const nav = isUrdu ? NAV_COPY.ur : NAV_COPY.en;

  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [metrics, setMetrics] = useState<CarouselMetrics | null>(null);
  const [ready, setReady] = useState(false);
  // Bumped on manual navigation so the autoplay timer restarts from zero.
  const [manualTick, setManualTick] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const paused = hovered || focused;

  // Keep the active index inside the list when filtering shrinks it.
  useEffect(() => {
    setActive((current) => (total > 0 ? current % total : 0));
  }, [total]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  // Measure the viewport so slides can be sized in pixels and the active slide
  // can be translated to the centre. ResizeObserver keeps this correct across
  // breakpoints, window resizes and layout shifts.
  useEffect(() => {
    if (!isCarousel) return;

    const node = viewportRef.current;
    if (!node) return;

    const measure = () => {
      const width = node.clientWidth;
      if (!width) return;

      // Slightly more than one slide on phones so the neighbouring card peeks
      // in, widening towards desktop.
      const perView = width < 640 ? 1.18 : width < 1024 ? 1.85 : 2.6;
      const gap = width < 640 ? 16 : 24;

      setMetrics((previous) =>
        previous &&
        previous.width === width &&
        previous.perView === perView &&
        previous.gap === gap
          ? previous
          : { width, perView, gap },
      );
      setReady(true);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, [isCarousel]);

  const goTo = useCallback(
    (index: number) => {
      if (total <= 0) return;
      setActive(((index % total) + total) % total);
      setManualTick((tick) => tick + 1);
    },
    [total],
  );

  // Autoplay: carousel only, never while hovered or focused, and never for
  // visitors who asked for reduced motion.
  useEffect(() => {
    if (!isCarousel || paused || reduceMotion) return;

    const timer = window.setInterval(() => {
      setActive((current) => (total > 0 ? (current + 1) % total : 0));
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [isCarousel, paused, reduceMotion, total, manualTick]);

  if (!isCarousel) {
    return (
      <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {teachers.map((teacher) => (
          <TeacherCard key={teacher.id} teacher={teacher} labels={labels} />
        ))}
      </div>
    );
  }

  const slideWidth = metrics
    ? (metrics.width - metrics.gap * (metrics.perView - 1)) / metrics.perView
    : 0;
  const trackOffset = metrics
    ? (metrics.width - slideWidth) / 2 - active * (slideWidth + metrics.gap)
    : 0;
  const slideTransition = reduceMotion
    ? "none"
    : `transform ${SLIDE_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${SLIDE_TRANSITION_MS}ms ease`;

  return (
    <div className="mt-8 sm:mt-10">
      <div
        ref={viewportRef}
        className="relative overflow-hidden"
        role="group"
        aria-roledescription="carousel"
        aria-label={nav.region}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setFocused(false);
          }
        }}
      >
        <div
          className="flex"
          style={{
            transform: metrics ? `translate3d(${trackOffset}px, 0, 0)` : undefined,
            transition:
              ready && !reduceMotion
                ? `transform ${SLIDE_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
                : undefined,
          }}
        >
          {teachers.map((teacher, index) => {
            const raw = Math.abs(index - active);
            // Wrap the distance so the carousel reads as a ring.
            const distance = Math.min(raw, total - raw);
            const isActive = distance === 0;
            const scale = isActive ? 1 : distance === 1 ? 0.94 : 0.9;
            const opacity = isActive ? 1 : distance === 1 ? 0.7 : 0.4;

            return (
              <div
                key={teacher.id}
                className="shrink-0"
                style={{
                  width: metrics ? `${slideWidth}px` : undefined,
                  marginRight:
                    metrics && index < total - 1 ? `${metrics.gap}px` : undefined,
                }}
              >
                <div
                  className="h-full origin-center"
                  style={{
                    transform:
                      ready && !reduceMotion ? `scale(${scale})` : undefined,
                    opacity,
                    transition: ready ? slideTransition : undefined,
                  }}
                >
                  <TeacherCard teacher={teacher} labels={labels} fill />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4 sm:mt-8">
        <button
          type="button"
          onClick={() => goTo(active - 1)}
          aria-label={nav.previous}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <span aria-hidden="true">{isUrdu ? "→" : "←"}</span>
        </button>

        <div className="flex items-center gap-2">
          {teachers.map((teacher, index) => (
            <button
              key={teacher.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`${nav.position} ${index + 1}`}
              aria-current={index === active ? "true" : undefined}
              className={`h-2.5 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                index === active ? "w-7 bg-blue-700" : "w-2.5 bg-slate-300"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(active + 1)}
          aria-label={nav.next}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <span aria-hidden="true">{isUrdu ? "←" : "→"}</span>
        </button>
      </div>
    </div>
  );
}

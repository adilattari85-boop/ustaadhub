"use client";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import HeroCarousel from "@/components/HeroCarousel";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { courseUrduLabels } from "@/lib/urdu";

// Structured data (JSON-LD) for the homepage — describes genuine UstaadHub
// organization/website info only. No invented ratings, reviews or offers.
const homeSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "UstaadHub",
  url: "https://www.ustaadhub.in",
  description:
    "Find trusted online teachers for Quran, Islamic Studies, Arabic, Urdu, languages and more. Learn through personalised one-to-one online classes with experienced teachers.",
  inLanguage: ["en", "ur"],
  publisher: {
    "@type": "Organization",
    name: "UstaadHub",
    url: "https://www.ustaadhub.in",
  },
};

type TeacherProfile = {
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

const teacherColumns =
  "id, full_name, subjects, experience, languages, teaching_mode, fee_weekly, fee_monthly, profile_photo_url, is_verified";

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

// Hero banner slides — 5 uploaded Gemini banner images (1440×720).
// The carousel autoplays every 4.5s with fade, arrows, dots and pause-on-hover.
const heroSlides = [
  {
    src: "/hero-1.png",
    alt: "UstaadHub – find the right teacher for Quran, Islamic studies, Arabic and more",
  },
  {
    src: "/hero-2.png",
    alt: "UstaadHub – personalised one-to-one online classes with experienced teachers",
  },
  {
    src: "/hero-3.png",
    alt: "UstaadHub – learn Quran, Islamic Studies, Arabic and languages online",
  },
  {
    src: "/hero-4.png",
    alt: "UstaadHub – connect with trusted, verified teachers",
  },
  {
    src: "/hero-5.png",
    alt: "UstaadHub – flexible timings and personalised learning",
  },
];

const copy = {
  en: {
    findTeachers: "Find Teachers",
    subjects: "Subjects",
    howItWorks: "How It Works",
    login: "Login",
    joinAsTeacher: "Join as Teacher",
    heroBadge: "✨ Learn from trusted teachers",
    heroTitleA: "Find the right",
    heroTitleC: "for you.",
    heroDescription:
      "Learn Quran, Islamic Studies, Arabic, languages and more from experienced teachers through personalised one-to-one online classes.",
    searchPlaceholder: "Search a course or subject...",
    matchingCourses: "Matching courses",
    popularCourses: "Popular courses",
    noMatchingCourse: "No matching course found.",
    searchCourses: "Search Courses",
    popular: "Popular:",
    postRequirement: "📝 Post Your Learning Requirement",
    tellUs:
      "Tell us what you want to learn — we’ll help you find the right teacher.",
    oneToOne: "✓ One-to-one classes",
    flexibleTimings: "✓ Flexible timings",
    experiencedTeachers: "✓ Experienced teachers",
    journeyStarts: "Your learning journey starts here",
    connectRight: "Connect with the right teacher for your goals.",
    classes: "Classes",
    teachers: "Teachers",
    learning: "Learning",
    exploreSubjects: "EXPLORE SUBJECTS",
    whatLearn: "What do you want to learn?",
    chooseSubject:
      "Choose a subject and discover teachers who can help you learn at your own pace.",
    findTeacher: "Find a teacher →",
    featuredTeachers: "FEATURED TEACHERS",
    learnExperienced: "Learn from experienced teachers",
    discoverVerified:
      "Discover verified teachers based on their expertise and fees.",
    viewAll: "View all teachers →",
    loadingVerified: "Loading verified teachers...",
    teachersError:
      "Unable to load featured teachers. Please refresh the page and try again.",
    noVerified: "No verified teachers available yet.",
    subjectsNotSpecified: "Subjects not specified",
    verified: "✓ Verified",
    experience: "Experience",
    notSpecified: "Not specified",
    teachingMode: "Teaching mode",
    languages: "Languages",
    fees: "Fees",
    viewProfile: "View Profile",
    simpleProcess: "SIMPLE PROCESS",
    howWorks: "How UstaadHub works",
    step1Title: "Choose what to learn",
    step1Desc:
      "Select Quran, Arabic, languages, Islamic Studies or another subject.",
    step2Title: "Find your teacher",
    step2Desc: "Explore teacher profiles, experience, ratings and fees.",
    step3Title: "Start learning",
    step3Desc:
      "Choose a suitable time and begin your personalised classes.",
    startToday: "Start Learning Today",
    rightTeacher: "Find the Right Teacher for You",
    demoDesc:
      "Book a demo class and experience the right learning approach before you decide.",
    bookDemo: "🎓 Book a Demo Class",
    rightsReserved: "© 2026 UstaadHub. All rights reserved.",
    about: "About",
    contact: "Contact",
    privacy: "Privacy",
    terms: "Terms",
  },
  ur: {
    findTeachers: "اساتذہ تلاش کریں",
    subjects: "مضامین",
    howItWorks: "یہ کیسے کام کرتا ہے؟",
    login: "لاگ اِن",
    joinAsTeacher: "بطور استاد شامل ہوں",
    heroBadge: "✨ معتبر اساتذہ سے سیکھیں",
    heroTitleA: "اپنے لیے صحیح",
    heroTitleC: "تلاش کریں۔",
    heroDescription:
      "قرآن، اسلامیات، عربی، زبانیں اور مزید مضامین تجربہ کار اساتذہ سے ذاتی نوعیت کی ون آن ون آن لائن کلاسز کے ذریعے سیکھیں۔",
    searchPlaceholder: "کورس یا مضمون تلاش کریں...",
    matchingCourses: "مماثل کورسز",
    popularCourses:"مقبول کورسز",
    noMatchingCourse:"کوئی مماثل کورس نہیں ملا۔",
    searchCourses:"کورسز تلاش کریں",
    popular:"مقبول:",
    postRequirement:"📝 اپنی تعلیمی ضرورت پوسٹ کریں",
    tellUs:
      "ہمیں بتائیں کہ آپ کیا سیکھنا چاہتے ہیں — ہم آپ کے لیے صحیح استاد تلاش کرنے میں مدد کریں گے۔",
    oneToOne:"✓ ون آن ون کلاسز",
    flexibleTimings:"✓ لچکدار اوقات",
    experiencedTeachers:"✓ تجربہ کار اساتذہ",
    journeyStarts:"آپ کے سیکھنے کا سفر یہاں سے شروع ہوتا ہے",
    connectRight:"اپنے مقاصد کے لیے صحیح استاد سے جڑیں۔",
    classes:"کلاسز",
    teachers:"اساتذہ",
    learning:"سیکھنا",
    exploreSubjects:"مضامین دریافت کریں",
    whatLearn:"آپ کیا سیکھنا چاہتے ہیں؟",
    chooseSubject:
      "ایک مضمون منتخب کریں اور ایسے اساتذہ تلاش کریں جو آپ کی اپنی رفتار سے سیکھنے میں مدد کر سکیں۔",
    findTeacher:"استاد تلاش کریں ←",
    featuredTeachers:"نمایاں اساتذہ",
    learnExperienced:"تجربہ کار اساتذہ سے سیکھیں",
    discoverVerified:
      "تصدیق شدہ اساتذہ کو ان کی مہارت اور فیسیں دیکھ کر تلاش کریں۔",
    viewAll:"تمام اساتذہ دیکھیں ←",
    loadingVerified:"تصدیق شدہ اساتذہ لوڈ ہو رہے ہیں...",
    teachersError:
      "نمایاں اساتذہ لوڈ نہیں ہو سکے۔ براہ کرم صفحہ دوبارہ لوڈ کر کے کوشش کریں۔",
    noVerified:"ابھی کوئی تصدیق شدہ استاد دستیاب نہیں۔",
    subjectsNotSpecified:"مضامین متعین نہیں",
    verified:"✓ تصدیق شدہ",
    experience:"تجربہ",
    notSpecified:"متعین نہیں",
    teachingMode:"تدریس کا طریقہ",
    languages:"زبانیں",
    fees:"فیسیں",
    viewProfile:"پروفائل دیکھیں",
    simpleProcess:"آسان طریقہ کار",
    howWorks:"UstaadHub کیسے کام کرتا ہے؟",
    step1Title:"انتخاب کریں کہ کیا سیکھنا ہے",
    step1Desc:
      "قرآن، عربی، زبانیں، اسلامیات یا کوئی اور مضمون منتخب کریں۔",
    step2Title:"اپنا استاد تلاش کریں",
    step2Desc:
      "اساتذہ کے پروفائلز، تجربہ، درجہ بندی اور فیسیں دیکھیں۔",
    step3Title:"سیکھنا شروع کریں",
    step3Desc:
      "مناسب وقت منتخب کریں اور اپنی ذاتی نوعیت کی کلاسز شروع کریں۔",
    startToday:"آج ہی سیکھنا شروع کریں",
    rightTeacher:"اپنے لیے صحیح استاد تلاش کریں",
    demoDesc:
      "فیصلہ کرنے سے پہلے ڈیمو کلاس بک کریں اور سیکھنے کا صحیح طریقہ آزمائیں۔",
    bookDemo:"🎓 ڈیمو کلاس بک کریں",
    rightsReserved:"© 2026 UstaadHub۔ جملہ حقوق محفوظ ہیں۔",
    about:"ہمارے بارے میں",
    contact:"رابطہ",
    privacy:"رازداری",
    terms:"شرائط",
  },
};

const categoryUrdu: Record<string, string> = {
  "Quran & Tajweed": "قرآن و تجوید",
  "Hifz-ul-Quran": "حفظ القرآن",
  "Islamic Studies": "اسلامیات",
  "Dua & Salah": "دعا و نماز",
  "Arabic": "عربی",
  "English": "انگریزی",
  "Hindi": "ہندی",
  "Urdu": "اردو",
};

const categories = [
  ["📖", "Quran & Tajweed"],
  ["🌙", "Hifz-ul-Quran"],
  ["🕌", "Islamic Studies"],
  ["🕋", "Dua & Salah"],
  ["📚", "Arabic"],
  ["🇬🇧", "English"],
  ["🇮🇳", "Hindi"],
  ["📝", "Urdu"],
];

const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 10000;

type Locale = "en" | "ur";

type HomeProps = {
  locale?: Locale;
};

export default function Home({ locale = "en" }: HomeProps) {
  const [featuredTeachers, setFeaturedTeachers] = useState<TeacherProfile[]>(
    [],
  );
  const [verifiedTeacherCount, setVerifiedTeacherCount] = useState(0);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [showCourseList, setShowCourseList] = useState(false);
  const courseSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        courseSearchRef.current &&
        !courseSearchRef.current.contains(event.target as Node)
      ) {
        setShowCourseList(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowCourseList(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const isUrdu = locale === "ur";
  const t = copy[locale];

const courses = [
  "Madni Qaida / Nazra Course",
   "Darse Nizami/aalim course",
  "Qaida Teacher Course",
  "Teacher Nazra Course",
  "Hifz-e-Quran",
  "Tajweed-o-Quran",
  "Husn-e-Quran Course",
  "Tafseer-e-Noor",
  "Hifz 40 Hadith",
  "Hadith Course",
  "Tafseer-e-Quran",
  "Farz Uloom",
  "Arabic",
  "English",
  "Hindi",
  "Urdu",
];

const filteredCourses = courses.filter((course) =>
  course.toLowerCase().includes(courseSearch.toLowerCase())
);

function selectCourse(course: string) {
  window.location.href = `/requirement?course=${encodeURIComponent(course)}${isUrdu ? "&lang=ur" : ""}`;
}

  useEffect(() => {
    let isMounted = true;

    async function loadFeaturedTeachers() {
      setTeachersLoading(true);
      setTeachersError("");

      let lastError: unknown = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (!isMounted) {
          return;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT,
        );

        try {
          const { data, error, count } = await supabase
  .from("teacher_profiles")
  .select(teacherColumns, { count: "exact" })
  .eq("is_verified", true)
  .limit(3)
  .abortSignal(controller.signal);

          window.clearTimeout(timeoutId);

          if (error) {
            throw error;
          }

          if (!isMounted) {
            return;
          }

          setFeaturedTeachers((data || []) as unknown as TeacherProfile[]);
          setVerifiedTeacherCount(count ?? 0);
          setTeachersError("");
          setTeachersLoading(false);
          return;
        } catch (error) {
          window.clearTimeout(timeoutId);
          lastError = error;

          if (attempt < MAX_RETRIES) {
            await new Promise((resolve) =>
              window.setTimeout(resolve, 500 * attempt),
            );
          }
        }
      }

      if (!isMounted) {
        return;
      }

      console.error("Unable to load featured teachers:", lastError);
      setFeaturedTeachers([]);
      setTeachersError(
        "Unable to load featured teachers. Please refresh the page and try again.",
      );
      setTeachersLoading(false);
    }

    void loadFeaturedTeachers();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema) }}
      />
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5 sm:py-4">
          <a href="#" className="whitespace-nowrap text-lg font-bold text-blue-700 sm:text-2xl">
            UstaadHub
          </a>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#teachers" className="whitespace-nowrap text-gray-700 hover:text-blue-700">
              {t.findTeachers}
            </a>
            <a href="#subjects" className="whitespace-nowrap text-gray-700 hover:text-blue-700">
              {t.subjects}
            </a>
            <a href="#how" className="whitespace-nowrap text-gray-700 hover:text-blue-700">
              {t.howItWorks}
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
  <LanguageSwitcher />

          <a
    href="/login"
              className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium hover:bg-gray-100 sm:px-4 sm:py-2 sm:text-base"
            >
              {t.login}
            </a>

            <a
              href="/register"
              className="whitespace-nowrap rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 sm:px-5 sm:py-2.5 sm:text-base"
            >
              {t.joinAsTeacher}
            </a>
          </div>
        </div>
      </nav>
 <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Hero banner carousel — full-width 2:1 (1440×720) banner shown clearly, no white overlay */}
        <div className="relative w-full overflow-hidden aspect-[2/1]">
          <HeroCarousel slides={heroSlides} autoplayInterval={4500} />
        </div>

        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-2 md:items-center md:py-28">
      {/* HERO */}
  <div className={isUrdu ? "min-w-0" : undefined}>

            <div className="mb-6 inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              {t.heroBadge}
            </div>

            <h1
              className={
                isUrdu
                  ? "text-4xl font-extrabold leading-normal tracking-normal md:text-5xl"
                  : "text-5xl font-extrabold leading-tight tracking-tight md:text-6xl"
              }
            >
              {t.heroTitleA}
              <span className="text-blue-700">{isUrdu ? " استاد " : " Ustaad "}</span>
              {t.heroTitleC}
            </h1>

            <p
              className={
                isUrdu
                  ? "mt-6 max-w-xl text-lg leading-9 text-gray-600"
                  : "mt-6 max-w-xl text-lg leading-8 text-gray-600"
              }
            >
              {t.heroDescription}
            </p>

            {/* COURSE SEARCH */}
            <div className="mt-8 max-w-4xl">
              <div className="rounded-2xl bg-white p-3 shadow-xl ring-1 ring-gray-200 sm:p-4">

                <div className="flex flex-col gap-3 sm:flex-row">

                  {/* SEARCH INPUT + COURSE DROPDOWN */}
                  <div
                    ref={courseSearchRef}
                    className="relative min-w-0 flex-1"
                  >

                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400">
                        🔍
                      </span>

                      <input
                        type="text"
                        value={courseSearch}
                        onChange={(e) => {
                          setCourseSearch(e.target.value);
                          setShowCourseList(true);
                        }}
                        onFocus={() => setShowCourseList(true)}
                        placeholder={t.searchPlaceholder}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-4 pl-12 pr-4 text-base outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:text-lg"
                      />
                    </div>

                    {/* COURSE SUGGESTIONS */}
                    {showCourseList && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">

                        <div className="border-b bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600">
                          {courseSearch.trim()
                            ? t.matchingCourses
                            : t.popularCourses}
                        </div>

                        <div className="max-h-64 overflow-y-auto p-2">

                          {filteredCourses.length > 0 ? (
                            filteredCourses.map((course) => (
                              <button
                                key={course}
                                type="button"
                                onClick={() => {
                                  selectCourse(course);
                                  setShowCourseList(false);
                                }}
                                className="flex w-full items-center rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-800 transition hover:bg-blue-50 hover:text-blue-700 sm:text-base"
                              >
                                <span className="mr-3 text-lg">
                                  📚
                                </span>

                                <span className="min-w-0 flex-1 truncate">
                                  {isUrdu ? (courseUrduLabels[course] ?? course) : course}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-6 text-center text-sm text-gray-500">
                              {t.noMatchingCourse}
                            </div>
                          )}

                        </div>
                      </div>
                    )}

                  </div>

                  {/* SEARCH BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      if (filteredCourses.length > 0) {
                        selectCourse(filteredCourses[0]);
                        setShowCourseList(false);
                      }
                    }}
                    disabled={filteredCourses.length === 0}
                    className="w-full rounded-xl bg-blue-700 px-7 py-4 text-base font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:text-lg"
                  >
                    {t.searchCourses}
                  </button>

                </div>

                {/* POPULAR COURSES */}
                <div className="mt-3 flex flex-wrap items-center gap-2 px-1 text-sm">

                  <span className="font-semibold text-gray-500">
                    {t.popular}
                  </span>

                  {[
                    "Quran & Tajweed",
                    "Hifz-ul-Quran",
                    "Arabic",
                    "English",
                  ].map((course) => (
                    <button
                      key={course}
                      type="button"
                      onClick={() => {
                        selectCourse(course);
                        setShowCourseList(false);
                      }}
                      className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {isUrdu ? (courseUrduLabels[course] ?? course) : course}
                    </button>
                  ))}

                </div>

              </div>
            </div>

            {/* REQUIREMENT BUTTON */}
            <div className="mt-5">
              <a
                href={isUrdu ? "/requirement?lang=ur" : "/requirement"}
                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-blue-800 sm:text-lg"
              >
                {t.postRequirement}
              </a>

              <p className="mt-3 text-sm text-gray-500">
                {t.tellUs}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              <span>{t.oneToOne}</span>
              <span>{t.flexibleTimings}</span>
              <span>{t.experiencedTeachers}</span>
            </div>

          </div>
          {/* HERO CARD */}
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-3xl bg-white p-5 shadow-2xl">
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center text-white">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white text-4xl font-bold text-blue-700 shadow-lg">
                  U
                </div>

                <h2 className="mt-6 text-2xl font-bold">
                  {t.journeyStarts}
                </h2>

                <p className="mt-3 text-blue-100">
                  {t.connectRight}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3">
                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <div className="text-xl font-bold text-blue-700">1:1</div>
                  <div className="mt-1 text-xs text-gray-500">{t.classes}</div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <div className="text-xl font-bold text-blue-700">
  {verifiedTeacherCount}+
</div>
                  <div className="mt-1 text-xs text-gray-500">{t.teachers}</div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <div className="text-xl font-bold text-blue-700">24/7</div>
                  <div className="mt-1 text-xs text-gray-500">{t.learning}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="subjects" className="py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="text-center">
            <p className="font-semibold text-blue-700">{t.exploreSubjects}</p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              {t.whatLearn}
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              {t.chooseSubject}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.map(([icon, title]) => (
              <div
                key={title}
                className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
              >
                <div className="text-4xl">{icon}</div>

                <h3 className="mt-4 font-bold">{isUrdu ? (categoryUrdu[title] ?? title) : title}</h3>

                <p className="mt-2 text-sm text-gray-500">
                  {t.findTeacher}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED TEACHERS */}
      <section id="teachers" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-semibold text-blue-700">
                {t.featuredTeachers}
              </p>

              <h2 className="mt-2 text-3xl font-bold md:text-4xl">
                {t.learnExperienced}
              </h2>

              <p className="mt-3 text-gray-600">
                {t.discoverVerified}
              </p>
            </div>

            <Link
              href="/teachers"
              className="w-fit rounded-lg font-semibold text-blue-700 hover:text-blue-900"
            >
              {t.viewAll}
            </Link>
          </div>

          {teachersLoading ? (
            <div className="mt-10 rounded-2xl bg-white p-12 text-center shadow-sm">
              {t.loadingVerified}
            </div>
          ) : teachersError ? (
            <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-12 text-center text-red-700">
              {isUrdu ? t.teachersError : teachersError}
            </div>
          ) : featuredTeachers.length === 0 ? (
            <div className="mt-10 rounded-2xl bg-white p-12 text-center shadow-sm">
              {t.noVerified}
            </div>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {featuredTeachers.map((teacher) => {
                const weeklyFee = formatFee(teacher.fee_weekly, "week");
                const monthlyFee = formatFee(teacher.fee_monthly, "month");

                return (
                  <div
                    key={teacher.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="flex items-center gap-4 p-6">
                      {teacher.profile_photo_url ? (
                        <img
                          src={teacher.profile_photo_url}
                          alt={teacher.full_name || "Teacher"}
                          className="h-20 w-20 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                          {getInitials(teacher.full_name)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold">
                          {teacher.full_name || "Ustaad"}
                        </h3>

                        <p className="mt-1 text-sm text-blue-700">
                          {(teacher.subjects || []).slice(0, 2).join(" & ") ||
                            isUrdu ? t.subjectsNotSpecified : "Subjects not specified"}
                        </p>

                        <span className="mt-2 inline-block rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                          {t.verified}
                        </span>
                      </div>
                    </div>

                    <div className="border-t px-6 py-5">
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-gray-500">{t.experience}</span>
                        <span className="text-right font-semibold">
                          {teacher.experience || (isUrdu ? t.notSpecified : "Not specified")}
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between gap-4 text-sm">
                        <span className="text-gray-500">{t.teachingMode}</span>
                        <span className="text-right font-semibold">
                          {teacher.teaching_mode || (isUrdu ? t.notSpecified : "Not specified")}
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between gap-4 text-sm">
                        <span className="text-gray-500">{t.languages}</span>
                        <span className="text-right font-semibold">
                          {(teacher.languages || []).join(", ") ||
                            isUrdu ? t.notSpecified : "Not specified"}
                        </span>
                      </div>

                      {(weeklyFee || monthlyFee) && (
                        <div className="mt-3 flex justify-between gap-4 text-sm">
                          <span className="text-gray-500">{t.fees}</span>
                          <span className="text-right font-semibold">
                            {[weeklyFee, monthlyFee]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                      )}

                      <div className="mt-5 flex items-center justify-end">
                        <Link
                          href={`/teachers/${teacher.id}`}
                          className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800"
                        >
                          {t.viewProfile}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center">
            <p className="font-semibold text-blue-700">{t.simpleProcess}</p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              {t.howWorks}
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              [
                "01",
                t.step1Title,
                t.step1Desc,
              ],
              [
                "02",
                t.step2Title,
                t.step2Desc,
              ],
              [
                "03",
                t.step3Title,
                t.step3Desc,
              ],
            ].map(([number, title, description]) => (
              <div key={number} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-700 text-xl font-bold text-white">
                  {number}
                </div>

                <h3 className="mt-5 text-xl font-bold">{title}</h3>

                <p className="mt-3 leading-7 text-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-6 pb-16">
  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-6 py-16 text-center shadow-xl md:px-12 md:py-20">
    {/* Decorative background */}
    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
    <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />

    <div className="relative mx-auto max-w-3xl">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
        {t.startToday}
      </p>

      <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
        {t.rightTeacher}
      </h2>

      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-blue-50 md:text-xl">
        {t.demoDesc}
      </p>

      <a
        href={isUrdu ? "/requirement?lang=ur" : "/requirement"}
        className="mt-9 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-1 hover:bg-green-700 hover:shadow-xl"
      >
        {t.bookDemo}
      </a>

      <p className="mt-4 text-sm text-blue-100">
        {t.tellUs}
      </p>
    </div>
  </div>
</section>

      {/* FOOTER */}
      <footer className="mt-10 border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
          <div>{t.rightsReserved}</div>

          <div className="flex gap-6">
            <span className="cursor-pointer hover:text-blue-700">{t.about}</span>
            <span className="cursor-pointer hover:text-blue-700">
              {t.contact}
            </span>
            <span className="cursor-pointer hover:text-blue-700">
              {t.privacy}
            </span>
            <span className="cursor-pointer hover:text-blue-700">{t.terms}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
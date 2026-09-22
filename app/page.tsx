"use client";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import HeroShowcase from "@/components/HeroShowcase";
import JobsTicker from "@/components/JobsTicker";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { courseUrduLabels } from "@/lib/urdu";
import {
  FACEBOOK_URL,
  INSTAGRAM_URL,
  WHATSAPP_URL,
  YOUTUBE_URL,
} from "@/lib/contact";
import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa";

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

// Hero banner slides — the existing 1440×720 UstaadHub screenshots in public/.
// They crossfade inside the hero website-preview frame (see HeroShowcase).
const heroSlides = [
  {
    src: "/hero-1.png",
    alt: "UstaadHub homepage — find the right teacher for Quran, Islamic studies, Arabic and more",
  },
  {
    src: "/hero-2.png",
    alt: "UstaadHub homepage — personalised one-to-one online classes with experienced teachers",
  },
  {
    src: "/hero-3.png",
    alt: "UstaadHub homepage — learn Quran, Islamic Studies, Arabic and languages online",
  },
  {
    src: "/hero-4.png",
    alt: "UstaadHub homepage — connect with trusted, verified teachers",
  },
  {
    src: "/hero-5.png",
    alt: "UstaadHub homepage — flexible timings and personalised learning",
  },
];

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

const copy = {
  en: {
    findTeachers: "Find Teachers",
    subjects: "Subjects",
    howItWorks: "How It Works",
    login: "Login",
    joinAsTeacher: "Join as Teacher",
    heroBadge: "✨ Verified 1:1 teachers",
    heroTitleA: "Find the right",
    heroTitleC: "for Quran, Arabic & Islamic Studies.",
    heroDescription:
      "Learn Quran, Islamic Studies, Arabic, languages and more from experienced teachers through personalised one-to-one online classes.",
    heroCtaPrimary: "Find a Teacher",
    heroCtaSecondary: "Post a Requirement",
    heroLiveClass: "Live 1:1 class",
    heroFocusSubject: "Quran & Tajweed",
    heroTeacherLabel: "Verified Teacher",
    heroTeacherSubjects: "Quran, Tajweed & Hifz",
    heroStudentLabel: "Student",
    heroLessonProgress: "Lesson progress",
    heroTrustVerifiedTitle: "Verified Teachers",
    heroTrustVerifiedDesc: "Reviewed and onboarded by UstaadHub",
    heroTrustFlexibleTitle: "Flexible Learning",
    heroTrustFlexibleDesc: "Pick timings that suit your schedule",
    heroTrustOneToOneTitle: "1:1 Live Classes",
    heroTrustOneToOneDesc: "Personal attention in every class",
    searchPlaceholder: "Search a course or subject...",
    matchingCourses: "Matching courses",
    popularCourses: "Popular courses",
    noMatchingCourse: "No matching course found.",
    searchCourses: "Find Teachers",
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
    // About section
    aboutUstaadHub: "ABOUT USTAADHUB",
    aboutTitle: "About UstaadHub",
    aboutDescription:
      "UstaadHub connects students with suitable teachers for Quran, Arabic, Islamic Studies, languages and more.",
    aboutStudentsTitle: "For students",
    aboutStudents:
      "Students can submit their learning requirement, and our admin team reviews it to help match them with a verified teacher.",
    aboutTeachersTitle: "For teachers",
    aboutTeachers:
      "Teachers can create a profile and go through our verification and onboarding process before they start offering classes.",
    aboutNotAutomatic:
      "Teacher matching is assisted by our admin team — it is not fully automatic.",
    // FAQ section
    faq: "FAQ",
    faqTitle: "Frequently Asked Questions",
    faqQuestion1: "How can I request a teacher?",
    faqAnswer1:
      "Visit the Find Teachers page to browse available teachers, or submit your learning requirement. Our admin team will review your requirement and help match you with a suitable verified teacher.",
    faqQuestion2: "How does teacher matching work?",
    faqAnswer2:
      "Matching is not fully automatic. After you submit a learning requirement, our admin team reviews it and assists in connecting you with a verified teacher whose expertise matches your needs.",
    faqQuestion3: "Are teachers verified?",
    faqAnswer3:
      "Yes, UstaadHub features verified teachers who have completed the verification and onboarding process. You can view their profiles on the Find Teachers page.",
    faqQuestion4: "What happens after I submit my requirement?",
    faqAnswer4:
      "After you submit your learning requirement, our admin team reviews it. If a suitable verified teacher is available, we assist in matching you. You may be contacted for further details.",
    faqQuestion5: "How can I become a teacher?",
    faqAnswer5:
      "Teacher registration is available on the Register page. Teachers can create a profile and go through the verification and onboarding process before they can start offering classes.",
    faqQuestion6: "How can I contact UstaadHub for help?",
    faqAnswer6:
      "You can reach out to UstaadHub support via WhatsApp or through the Contact section on this page. Our team is here to assist with any questions or issues.",
    // Contact section
    contactSupport: "CONTACT & SUPPORT",
    contactTitle: "Contact & Support",
    contactDescription:
      "Have questions or need help? Our team is here to assist you.",
    contactWhatsApp: "Chat with us on WhatsApp",
    contactRequirement: "Post a Learning Requirement",
    contactBrowseTeachers: "Browse Teachers",
    contactNeedHelp: "Need help? Contact UstaadHub support.",
    // Footer
    footerExplore: "Explore",
    footerCompany: "Company",
    footerForTeachers: "For Teachers",
    footerLegal: "Legal",
    footerFollow: "Follow UstaadHub",
    footerSocialYoutube: "UstaadHub on YouTube",
    footerSocialFacebook: "UstaadHub on Facebook",
    footerSocialInstagram: "UstaadHub on Instagram",
    footerDescription:
      "UstaadHub helps students find suitable, verified teachers for one-to-one online classes.",
    footerFindTeachers: "Find Teachers",
    footerRequestTeacher: "Request a Teacher",
    footerHowItWorks: "How It Works",
    footerSubjects: "Subjects",
    footerAbout: "About",
    footerFaq: "FAQ",
    footerContact: "Contact",
    footerBecomeTeacher: "Become a Teacher",
    footerPrivacyPolicy: "Privacy Policy",
    footerTermsConditions: "Terms & Conditions",
  },
  ur: {
    findTeachers: "اساتذہ تلاش کریں",
    subjects: "مضامین",
    howItWorks: "یہ کیسے کام کرتا ہے؟",
    login: "لاگ اِن",
    joinAsTeacher: "بطور استاد شامل ہوں",
    heroBadge: "✨ تصدیق شدہ 1:1 اساتذہ",
    heroTitleA: "درست",
    heroTitleC: "قرآن، عربی اور اسلامیات کے لئے تلاش کریں۔",
    heroDescription:
      "قرآن، اسلامیات، عربی، زبانیں اور مزید مضامین تجربہ کار اساتذہ سے ذاتی نوعیت کی ون آن ون آن لائن کلاسز کے ذریعے سیکھیں۔",
    heroCtaPrimary: "استاد تلاش کریں",
    heroCtaSecondary: "اپنی ضرورت پوسٹ کریں",
    heroLiveClass: "لائیو ون آن ون کلاس",
    heroFocusSubject: "قرآن و تجوید",
    heroTeacherLabel: "تصدیق شدہ استاد",
    heroTeacherSubjects: "قرآن، تجوید اور حفظ",
    heroStudentLabel: "طالب علم",
    heroLessonProgress: "سبق کی پیش رفت",
    heroTrustVerifiedTitle: "تصدیق شدہ اساتذہ",
    heroTrustVerifiedDesc: "UstaadHub کی جانب سے جانچ اور آن بورڈنگ",
    heroTrustFlexibleTitle: "لچکدار سیکھنا",
    heroTrustFlexibleDesc: "اپنے شیڈول کے مطابق اوقات منتخب کریں",
    heroTrustOneToOneTitle: "ون آن ون لائیو کلاسز",
    heroTrustOneToOneDesc: "ہر کلاس میں ذاتی توجہ",
    searchPlaceholder: "کورس یا مضمون تلاش کریں...",
    matchingCourses: "مماثل کورسز",
    popularCourses:"مقبول کورسز",
    noMatchingCourse:"کوئی مماثل کورس نہیں ملا۔",
    searchCourses:"اساتذہ تلاش کریں",
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
    // About section
    aboutUstaadHub:"ہمارے بارے میں",
    aboutTitle:"UstaadHub کے بارے میں",
    aboutDescription:
      "UstaadHub طلباء کو قرآن، عربی، اسلامیات، زبانیں اور مزید مضامین کے لیے مناسب اساتذہ سے جوڑتا ہے۔",
    aboutStudentsTitle:"طلباء کے لیے",
    aboutStudents:
      "طلباء اپنی تعلیمی ضرورت جمع کروا سکتے ہیں اور ہماری ایڈمن ٹیم اس کا جائزہ لے کر انہیں تصدیق شدہ استاد سے ملانے میں مدد کرتی ہے۔",
    aboutTeachersTitle:"اساتذہ کے لیے",
    aboutTeachers:
      "اساتذہ اپنا پروفائل بنا سکتے ہیں اور تصدیق و آن بورڈنگ کے عمل سے گزر کر کلاسز پیش کر سکتے ہیں۔",
    aboutNotAutomatic:
      "استاد کی میچنگ ہماری ایڈمن ٹیم کی مدد سے ہوتی ہے — یہ مکمل طور پر خودکار نہیں ہے۔",
    // FAQ section
    faq:"عام سوالات",
    faqTitle:"اکثر پوچھے جانے والے سوالات",
    faqQuestion1:"میں استاد کی درخواست کیسے کر سکتا ہوں؟",
    faqAnswer1:
      "اساتذہ تلاش کریں صفحے پر دستیاب اساتذہ دیکھیں، یا اپنی تعلیمی ضرورت جمع کروائیں۔ ہماری ایڈمن ٹیم آپ کی ضرورت کا جائزہ لے کر آپ کو مناسب تصدیق شدہ استاد سے ملانے میں مدد کرے گی۔",
    faqQuestion2:"استاد کی میچنگ کیسے ہوتی ہے؟",
    faqAnswer2:
      "میچنگ مکمل طور پر خودکار نہیں ہے۔ آپ کی تعلیمی ضرورت جمع ہونے کے بعد ہماری ایڈمن ٹیم اس کا جائزہ لیتی ہے اور آپ کو اس استاد سے ملانے میں مدد کرتی ہے جس کی مہارت آپ کی ضرورت کے مطابق ہو۔",
    faqQuestion3:"کیا اساتذہ کی تصدیق ہوتی ہے؟",
    faqAnswer3:
      "جی ہاں، UstaadHub میں وہ اساتذہ شامل ہیں جنہوں نے تصدیق اور آن بورڈنگ کا عمل مکمل کیا ہے۔ آپ ان کے پروفائل اساتذہ تلاش کریں صفحے پر دیکھ سکتے ہیں۔",
    faqQuestion4:"اپنی ضرورت جمع کروانے کے بعد کیا ہوتا ہے؟",
    faqAnswer4:
      "آپ کی تعلیمی ضرورت جمع ہونے کے بعد ہماری ایڈمن ٹیم اس کا جائزہ لیتی ہے۔ اگر مناسب تصدیق شدہ استاد دستیاب ہو تو ہم آپ کو اس سے ملانے میں مدد کرتے ہیں۔ مزید تفصیلات کے لیے آپ سے رابطہ کیا جا سکتا ہے۔",
    faqQuestion5:"میں استاد کیسے بن سکتا ہوں؟",
    faqAnswer5:
      "استاد کی رجسٹریشن رجسٹر صفحے پر دستیاب ہے۔ اساتذہ پروفائل بنا سکتے ہیں اور کلاسز شروع کرنے سے پہلے تصدیق و آن بورڈنگ کے عمل سے گزرتے ہیں۔",
    faqQuestion6:"مدد کے لیے UstaadHub سے کیسے رابطہ کروں؟",
    faqAnswer6:
      "آپ WhatsApp کے ذریعے یا اس صفحے کے رابطہ سیکشن سے UstaadHub کی معاونت حاصل کر سکتے ہیں۔ ہماری ٹیم کسی بھی سوال یا مسئلے میں مدد کے لیے موجود ہے۔",
    // Contact section
    contactSupport:"رابطہ",
    contactTitle:"رابطہ اور معاونت",
    contactDescription:
      "کوئی سوال ہے یا مدد چاہیے؟ ہماری ٹیم آپ کی معاونت کے لیے موجود ہے۔",
    contactWhatsApp:"WhatsApp پر ہم سے رابطہ کریں",
    contactRequirement:"اپنی تعلیمی ضرورت جمع کروائیں",
    contactBrowseTeachers:"اساتذہ دیکھیں",
    contactNeedHelp:"مدد چاہیے؟ UstaadHub کی معاونت سے رابطہ کریں۔",
    // Footer
    footerExplore:"دریافت کریں",
    footerCompany:"کمپنی",
    footerForTeachers:"اساتذہ کے لیے",
    footerLegal:"قانونی معلومات",
    footerFollow:"UstaadHub کو فالو کریں",
    footerSocialYoutube:"UstaadHub یوٹیوب پر",
    footerSocialFacebook:"UstaadHub فیس بک پر",
    footerSocialInstagram:"UstaadHub انسٹاگرام پر",
    footerDescription:
      "UstaadHub طلباء کو آن لائن ون ٹو ون کلاسز کے لیے مناسب اور تصدیق شدہ اساتذہ تلاش کرنے میں مدد کرتا ہے۔",
    footerFindTeachers:"اساتذہ تلاش کریں",
    footerRequestTeacher:"استاد کی درخواست",
    footerHowItWorks:"یہ کیسے کام کرتا ہے؟",
    footerSubjects:"مضامین",
    footerAbout:"ہمارے بارے میں",
    footerFaq:"عام سوالات",
    footerContact:"رابطہ",
    footerBecomeTeacher:"استاد بنیں",
    footerPrivacyPolicy:"رازداری کی پالیسی",
    footerTermsConditions:"شرائط و شرایط",
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

          <div className="hidden items-center gap-6 md:flex lg:gap-8">
            <a href="#teachers" className="whitespace-nowrap text-gray-700 hover:text-blue-700">
              {t.findTeachers}
            </a>
            <a href="#subjects" className="whitespace-nowrap text-gray-700 hover:text-blue-700">
              {t.subjects}
            </a>
            <a href="#how" className="whitespace-nowrap text-gray-700 hover:text-blue-700">
              {t.howItWorks}
            </a>
            <a href="#about" className="whitespace-nowrap text-gray-700 hover:text-blue-700">
              {t.footerAbout}
            </a>
            <a href="#faq" className="whitespace-nowrap text-gray-700 hover:text-blue-700">
              {t.footerFaq}
            </a>
            <a href="#contact" className="whitespace-nowrap text-gray-700 hover:text-blue-700">
              {t.footerContact}
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
      <JobsTicker locale={isUrdu ? "ur" : "en"} />
 <section id="hero" className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Static background — soft gradient blobs and a faint grid, purely decorative */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="hero-blob absolute -left-24 -top-32 h-80 w-80 bg-blue-300/40 sm:h-[26rem] sm:w-[26rem]" />
          <div className="hero-blob hero-blob-2 absolute -right-20 top-10 h-72 w-72 bg-indigo-300/35 sm:h-96 sm:w-96" />
          <div className="hero-blob hero-blob-3 absolute -bottom-24 left-1/3 h-72 w-72 bg-sky-200/45 sm:h-[22rem] sm:w-[22rem]" />
          <div className="hero-grid-overlay absolute inset-0" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-12 pt-10 sm:pt-12 md:grid-cols-2 md:items-center md:gap-12 md:pb-12 md:pt-8">
      {/* HERO */}
  <div className={isUrdu ? "min-w-0" : undefined}>

            <div className="hero-reveal mb-4 inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              {t.heroBadge}
            </div>

            <h1
              className={`hero-reveal hero-delay-1 text-balance ${
                isUrdu
                  ? "text-4xl font-extrabold leading-normal tracking-normal md:text-[2rem] lg:text-[2.25rem] xl:text-[2.5rem]"
                  : "text-5xl font-extrabold leading-[1.15] tracking-tight md:text-[2.25rem] lg:text-[2.5rem] xl:text-[3rem]"
              }`}
            >
              {t.heroTitleA}
              <span className="text-blue-700">{isUrdu ? " استاد " : " Ustaad "}</span>
              {t.heroTitleC}
            </h1>

            <p
              className={`hero-reveal hero-delay-2 ${
                isUrdu
                  ? "mt-3 max-w-xl text-lg leading-9 text-gray-600"
                  : "mt-3 max-w-xl text-lg leading-8 text-gray-600"
              }`}
            >
              {t.heroDescription}
            </p>

            {/* PRIMARY + SECONDARY CTA */}
            <div className="hero-reveal hero-delay-3 mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/teachers"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:text-lg"
              >
                {t.heroCtaPrimary}
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                href={isUrdu ? "/requirement?lang=ur" : "/requirement"}
                className="inline-flex items-center justify-center rounded-xl border-2 border-blue-700 bg-white/80 px-6 py-3.5 text-base font-bold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:text-lg"
              >
                {t.heroCtaSecondary}
              </Link>
            </div>

            <p className="hero-reveal hero-delay-4 mt-2 text-sm text-gray-500">
              {t.tellUs}
            </p>

            {/* COURSE SEARCH */}
            <div className="hero-reveal hero-delay-5 mt-4 max-w-4xl">
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

          </div>
          {/* HERO VISUAL — the existing UstaadHub screenshots presented as a website preview */}
          <div className="hero-reveal hero-delay-3 relative mx-auto w-full max-w-md md:max-w-none">
            {/* soft ambient glow behind the preview (decorative only) */}
            <div
              aria-hidden="true"
              className="absolute -inset-6 rounded-[3rem] bg-gradient-to-tr from-blue-200/50 via-sky-100/40 to-indigo-200/50 blur-2xl"
            />

            <HeroShowcase
              slides={heroSlides}
              urlLabel={isUrdu ? "ustaadhub.in/ur" : "ustaadhub.in"}
              autoplayInterval={5200}
            />

            {/* compact highlights — no longer floating over the screenshot */}
            <div className="relative mt-4">
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-blue-100/70 bg-white/70 p-2.5 text-center backdrop-blur sm:gap-3 sm:p-3">
                <div>
                  <div className="text-base font-bold text-blue-700 sm:text-lg">1:1</div>
                  <div className="mt-0.5 text-[11px] text-gray-500">{t.classes}</div>
                </div>

                <div>
                  <div className="text-base font-bold text-blue-700 sm:text-lg">
                    {verifiedTeacherCount}+
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-500">{t.teachers}</div>
                </div>

                <div>
                  <div className="text-base font-bold text-blue-700 sm:text-lg">24/7</div>
                  <div className="mt-0.5 text-[11px] text-gray-500">{t.learning}</div>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="flex items-start gap-2 rounded-xl border border-blue-100/70 bg-white/70 px-3 py-2">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-100 text-xs font-bold text-blue-700"
                  >
                    ✓
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900">{t.heroTrustVerifiedTitle}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
                      {t.heroTrustVerifiedDesc}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-xl border border-blue-100/70 bg-white/70 px-3 py-2">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-100 text-sm text-blue-700"
                  >
                    ⏰
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900">{t.heroTrustFlexibleTitle}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
                      {t.heroTrustFlexibleDesc}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-xl border border-blue-100/70 bg-white/70 px-3 py-2">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-100 text-[10px] font-bold text-blue-700"
                  >
                    1:1
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900">{t.heroTrustOneToOneTitle}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
                      {t.heroTrustOneToOneDesc}
                    </p>
                  </div>
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
                            (isUrdu ? t.subjectsNotSpecified : "Subjects not specified")}
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
                            (isUrdu ? t.notSpecified : "Not specified")}
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

      {/* ABOUT */}
      <section id="about" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center">
            <p className="font-semibold text-blue-700">{t.aboutUstaadHub}</p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              {t.aboutTitle}
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              {t.aboutDescription}
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
              <h3 className="text-xl font-bold">{t.aboutStudentsTitle}</h3>

              <p className="mt-3 leading-7 text-gray-600">
                {t.aboutStudents}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
              <h3 className="text-xl font-bold">{t.aboutTeachersTitle}</h3>

              <p className="mt-3 leading-7 text-gray-600">
                {t.aboutTeachers}
              </p>
            </div>
          </div>

          <p className="mt-8 rounded-2xl bg-blue-50 px-5 py-4 text-center text-sm leading-7 text-blue-800 sm:text-base">
            {t.aboutNotAutomatic}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-5">
          <div className="text-center">
            <p className="font-semibold text-blue-700">{t.faq}</p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              {t.faqTitle}
            </h2>
          </div>

          <div className="mt-10 space-y-3">
            {[
              [t.faqQuestion1, t.faqAnswer1],
              [t.faqQuestion2, t.faqAnswer2],
              [t.faqQuestion3, t.faqAnswer3],
              [t.faqQuestion4, t.faqAnswer4],
              [t.faqQuestion5, t.faqAnswer5],
              [t.faqQuestion6, t.faqAnswer6],
            ].map(([question, answer]) => (
              <details
                key={question}
                className="group rounded-2xl border border-gray-200 bg-white px-5 py-4 transition open:border-blue-300 open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-start font-semibold text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                  <span>{question}</span>

                  <span
                    aria-hidden="true"
                    className="shrink-0 text-xl leading-none text-blue-700 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>

                <p className="mt-3 leading-7 text-gray-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT & SUPPORT */}
      <section id="contact" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <p className="font-semibold text-blue-700">{t.contactSupport}</p>

          <h2 className="mt-2 text-3xl font-bold md:text-4xl">
            {t.contactTitle}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            {t.contactDescription}
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-green-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
            >
              {t.contactWhatsApp}
            </a>

            <Link
              href={isUrdu ? "/requirement?lang=ur" : "/requirement"}
              className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-6 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {t.contactRequirement}
            </Link>

            <Link
              href="/teachers"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-base font-semibold text-gray-800 transition hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {t.contactBrowseTeachers}
            </Link>
          </div>

          <p className="mt-5 text-sm text-gray-500">{t.contactNeedHelp}</p>
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
      <footer className="mt-10 border-t bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <p className="text-xl font-bold text-blue-700">UstaadHub</p>

              <p className="mt-3 max-w-xs text-sm leading-7 text-gray-500">
                {t.footerDescription}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {t.footerExplore}
              </h3>

              <ul className="mt-4 space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="/teachers" className="hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerFindTeachers}
                  </Link>
                </li>

                <li>
                  <Link
                    href={isUrdu ? "/requirement?lang=ur" : "/requirement"}
                    className="hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    {t.footerRequestTeacher}
                  </Link>
                </li>

                <li>
                  <a href="#how" className="hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerHowItWorks}
                  </a>
                </li>

                <li>
                  <a href="#subjects" className="hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerSubjects}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {t.footerCompany}
              </h3>

              <ul className="mt-4 space-y-2 text-sm text-gray-500">
                <li>
                  <a href="#about" className="hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerAbout}
                  </a>
                </li>

                <li>
                  <a href="#faq" className="hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerFaq}
                  </a>
                </li>

                <li>
                  <a href="#contact" className="hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerContact}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {t.footerForTeachers}
              </h3>

              <ul className="mt-4 space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="/register" className="hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerBecomeTeacher}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {t.footerLegal}
              </h3>

              <ul className="mt-4 space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="/privacy" className="hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerPrivacyPolicy}
                  </Link>
                </li>

                <li>
                  <Link href="/terms" className="hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerTermsConditions}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-900">
              {t.footerFollow}
            </h3>

            {/* Real, existing UstaadHub channels only — WhatsApp, YouTube,
                Facebook and Instagram. No placeholder links are added here. */}
            <ul className="mt-4 flex flex-wrap items-center gap-3">
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.contactWhatsApp}
                  title={t.contactWhatsApp}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition duration-200 hover:-translate-y-0.5 hover:border-green-600 hover:bg-green-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <FaWhatsapp aria-hidden="true" className="h-5 w-5" />
                </a>
              </li>

              <li>
                <a
                  href={YOUTUBE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.footerSocialYoutube}
                  title={t.footerSocialYoutube}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition duration-200 hover:-translate-y-0.5 hover:border-red-600 hover:bg-red-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <FaYoutube aria-hidden="true" className="h-5 w-5" />
                </a>
              </li>

              <li>
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.footerSocialFacebook}
                  title={t.footerSocialFacebook}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition duration-200 hover:-translate-y-0.5 hover:border-blue-600 hover:bg-blue-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <FaFacebookF aria-hidden="true" className="h-5 w-5" />
                </a>
              </li>

              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.footerSocialInstagram}
                  title={t.footerSocialInstagram}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition duration-200 hover:-translate-y-0.5 hover:border-pink-600 hover:bg-pink-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <FaInstagram aria-hidden="true" className="h-5 w-5" />
                </a>
              </li>
            </ul>

            <p className="mt-4 text-sm text-gray-500">
              <a
                href="#contact"
                className="hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {t.footerContact}
              </a>
            </p>
          </div>

          <p className="mt-8 border-t pt-6 text-sm text-gray-500">
            {t.rightsReserved}
          </p>
        </div>
      </footer>
    </main>
  );
}

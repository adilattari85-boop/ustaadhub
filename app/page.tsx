"use client";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import HeroShowcase from "@/components/HeroShowcase";
import { useEffect, useMemo, useRef, useState } from "react";
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
import SupportSection from "@/components/SupportSection";
import FeaturedTeachersCarousel from "@/components/FeaturedTeachersCarousel";

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

const copy = {
  en: {
    findTeachers: "Find Teachers",
    courses: "Courses",
    subjects: "Subjects",
    howItWorks: "How It Works",
    login: "Login",
    joinAsTeacher: "Join as Teacher",
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
    searchCourses: "Find Courses",
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
    tutorSearchPlaceholder: "Search by teacher name, subject, or language...",
    tutorSearchLabel: "Search teachers",
    tutorClearSearch: "Clear search",
    tutorFilterAll: "All",
    tutorFilterQuran: "Quran & Tajweed",
    tutorFilterHifz: "Hifz",
    tutorFilterAcademic: "Academic",
    tutorFilterIslamic: "Islamic Studies",
    tutorFilterLanguages: "Languages",
    tutorResultsCount: "teachers found",
    tutorNoResultsTitle: "No results found",
    tutorNoResultsHint: "Try a different name, subject, or category.",
    tutorResetFilters: "Reset Filters",
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
    support: {
      eyebrow: "SUPPORT USTAADHUB",
      title: "Support UstaadHub",
      desc: "Your one-time support helps students who cannot afford a teacher find one, and keeps UstaadHub growing for everyone.",
      donateTitle: "Donate",
      donateDesc:
        "Make a one-time contribution of any amount to support the platform and our outreach to students in need.",
      donateCta: "Donate Now",
      sponsorTitle: "Sponsor a Student",
      sponsorDesc:
        "Cover a student's learning so they can start one-to-one classes with a verified teacher.",
      sponsorCta: "Sponsor Now",
      chooseAmount: "Choose an amount",
      customLabel: "Custom amount",
      payNow: "Pay securely",
      processing: "Starting secure checkout...",
      verifying: "Payment received. Confirming it with the payment gateway...",
      successTitle: "Thank you for your support!",
      successDesc:
        "Your payment was received and recorded. Your support helps more students learn.",
      failedDesc:
        "The payment was not completed and no amount was charged. You can try again.",
      errorDesc:
        "We could not start the checkout. Please check your connection and try again.",
      disabled:
        "Online payments are currently disabled. Please try again later or contact us.",
      secure:
        "Payments are processed by Razorpay and verified on our server. UstaadHub never stores your card details.",
    },
  },
  ur: {
    support: {
      eyebrow: "USTAADHUB کی معاونت کریں",
      title: "UstaadHub کی معاونت کریں",
      desc: "آپ کی ایک بار کی معاونت ان طالب علم کی مدد کرتی ہے جو استاد کا اخراجات اٹھا نہیں سکتے، اور UstaadHub کو سب کے لیے آگے بڑھاتی ہے۔",
      donateTitle: "عطیہ دیں",
      donateDesc:
        "پلیٹ فارم اور ضرورت مند طالب علموں تک ہماری پہنچ کے لیے ایک بار کی رقم دیں۔",
      donateCta: "ابھی عطیہ دیں",
      sponsorTitle: "طالب علم کو سپانسر کریں",
      sponsorDesc:
        "کسی طالب علم کی تعلیم کا خرچہ وہ کریں تاکہ وہ تصدیق شدہ استاد سے نجی کلاسز شروع کر سکے۔",
      sponsorCta: "ابھی سپانسر کریں",
      chooseAmount: "رقم منتخب کریں",
      customLabel: "منفرد رقم",
      payNow: "محفوظ ادائیگی کریں",
      processing: "محفوظ چیک آؤٹ شروع کیا جا رہا ہے...",
      verifying: "ادائیگی موصول ہو گئی۔ پیمنٹ گیٹ وے سے تصدیق کی جا رہی ہے...",
      successTitle: "آپ کی معاونت کا شکریہ!",
      successDesc:
        "آپ کی ادائیگی وصول اور محفوظ طور پر درج ہو گئی ہے۔ آپ کی معاونت مزید طالب علموں کی تعلیم میں مدد دیتی ہے۔",
      failedDesc:
        "ادائیگی مکمل نہیں ہو سکی اور کوئی رقم وصول نہیں کی گئی۔ آپ دوبارہ کوشش کر سکتے ہیں۔",
      errorDesc:
        "ہم چیک آؤٹ شروع نہیں کر سکے۔ براہ کرم اپنا رابطہ چیک کریں اور دوبارہ کوشش کریں۔",
      disabled:
        "آن لائن ادائیگیاں فی الحال بند ہیں۔ براہ کرم بعد میں دوبارہ کوشش کریں یا ہم سے رابطہ کریں۔",
      secure:
        "ادائیگیاں Razorpay کے ذریعے کی جاتی ہیں اور ہمارے سرور پر تصدیق کی جاتی ہیں۔ UstaadHub آپ کے کارڈ کی تفصیلات محفوظ نہیں رکھتا۔",
    },
    findTeachers: "اساتذہ تلاش کریں",
    courses: "کورسز",
    subjects: "مضامین",
    howItWorks: "یہ کیسے کام کرتا ہے؟",
    login: "لاگ اِن",
    joinAsTeacher: "بطور استاد شامل ہوں",
    heroTitleA: "درست",
    heroTitleC: "قرآن، عربی اور اسلامیات کے لئے تلاش کریں۔",
    heroDescription:
      "قرآن، اسلامیات، عربی، زبانیں اور مزید مضامین تجربہ کار اساتذہ سے ذاتی نوعیت کی ون آن ون آن لائن کلاسز کے ذریعے سیکھیں۔",
    heroCtaPrimary: "استاد تلاش کریں",
    heroCtaSecondary: "اپنی تعلیمی ضرورت پوسٹ کریں",
    heroLiveClass: "لائیو 1:1 کلاس",
    heroFocusSubject: "قرآن و تجوید",
    heroTeacherLabel: "تصدیق شدہ استاد",
    heroTeacherSubjects: "قرآن، تجوید و حفظ",
    heroStudentLabel: "طالب علم",
    heroLessonProgress: "سبق کی پیش رفت",
    heroTrustVerifiedTitle: "تصدیق شدہ اساتذہ",
    heroTrustVerifiedDesc: "UstaadHub کے ذریعے جائزہ لیے گئے اور آن بورڈ کیے گئے",
    heroTrustFlexibleTitle: "لچکدار تعلیم",
    heroTrustFlexibleDesc: "اپنے شیڈول کے مطابق اوقات منتخب کریں",
    heroTrustOneToOneTitle: "1:1 لائیو کلاسز",
    heroTrustOneToOneDesc: "ہر کلاس میں ذاتی توجہ",
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
    tutorSearchPlaceholder:"استاد کے نام، مضمون یا زبان سے تلاش کریں...",
    tutorSearchLabel:"اساتذہ تلاش کریں",
    tutorClearSearch:"تلاش صاف کریں",
    tutorFilterAll:"تمام",
    tutorFilterQuran:"قرآن و تجوید",
    tutorFilterHifz:"حفظ",
    tutorFilterAcademic:"اکادمی",
    tutorFilterIslamic:"اسلامیات",
    tutorFilterLanguages:"زبانیں",
    tutorResultsCount:"اساتذہ ملے",
    tutorNoResultsTitle:"کوئی نتیجہ نہیں ملا",
    tutorNoResultsHint:"کسی اور نام، مضمون یا زمرے سے تلاش کریں۔",
    tutorResetFilters:"فلٹر ری سیٹ کریں",
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
    startToday:"آج ہی سیکھنا شروع ہوتا ہے",
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

type TutorCategoryKey = "all" | "quran" | "hifz" | "academic" | "islamic" | "languages";

const TUTOR_CATEGORY_FILTERS: readonly TutorCategoryKey[] = [
  "all",
  "quran",
  "hifz",
  "academic",
  "islamic",
  "languages",
];

const TUTOR_CATEGORY_KEYWORDS: Record<Exclude<TutorCategoryKey, "all">, string[]> = {
  quran: ["quran", "tajweed", "nazra", "qaida", "qar", "tajwid", "tilawat"],
  hifz: ["hifz", "hifz-e", "hifz-ul", "memorization", "huffaz", "hifaz"],
  academic: ["math", "physics", "chemistry", "biology", "science", "academic", "school", "class", "cbse", "neet", "jee", "account", "economic", "computer", "darse nizami", "aalim"],
  islamic: ["islamic", "fiqh", "hadith", "tafseer", "tafsir", "seerah", "aqeedah", "salah", "dua", "farz uloom", "deen"],
  languages: ["arabic", "english", "urdu", "hindi", "language", "spoken", "grammar"],
};

function teacherMatchesTutorCategory(teacher: TeacherProfile, category: TutorCategoryKey): boolean {
  if (category === "all") return true;
  const keywords = TUTOR_CATEGORY_KEYWORDS[category];
  const haystack = [
    teacher.full_name ?? "",
    (teacher.subjects || []).join(" "),
    (teacher.languages || []).join(" "),
    teacher.experience ?? "",
    teacher.teaching_mode ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [showCourseList, setShowCourseList] = useState(false);
  const [mobileCoursePickerOpen, setMobileCoursePickerOpen] = useState(false);
  const courseSearchRef = useRef<HTMLDivElement>(null);
  const [tutorQuery, setTutorQuery] = useState("");
  const [tutorCategory, setTutorCategory] = useState<TutorCategoryKey>("all");

  // Lightweight 60fps scroll reveals: one shared IntersectionObserver adds
  // `.is-visible` to every `.reveal` element once. CSS animates only
  // opacity + transform, so scrolling stays on the compositor thread.
  // No animation library is needed, keeping the homepage bundle small.
  const revealRootRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = revealRootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") {
      root?.querySelectorAll(".reveal").forEach((el) => {
        el.classList.add("is-visible");
      });
      return;
    }
    const targets = Array.from(root.querySelectorAll(".reveal"));
    if (targets.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [teachersLoading, locale]);

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
        setMobileCoursePickerOpen(false);
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

  // Mobile picker: keep the chosen course in the search field and let the
  // existing "Find Teachers" CTA perform the navigation (no second list).
  function pickCourseIntoSearch(course: string) {
    setCourseSearch(course);
    setShowCourseList(false);
    setMobileCoursePickerOpen(false);
  }

  // Lock background scroll while the mobile course picker sheet is open.
  useEffect(() => {
    if (!mobileCoursePickerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileCoursePickerOpen]);

  // Close the picker once the viewport leaves the phone range (rotation or
  // resize to desktop) so the background scroll lock never gets stuck on.
  useEffect(() => {
    if (!mobileCoursePickerOpen) return;
    const phoneQuery = window.matchMedia("(max-width: 639px)");
    function handlePhoneQueryChange(event: MediaQueryListEvent) {
      if (!event.matches) {
        setMobileCoursePickerOpen(false);
      }
    }
    phoneQuery.addEventListener("change", handlePhoneQueryChange);
    return () =>
      phoneQuery.removeEventListener("change", handlePhoneQueryChange);
  }, [mobileCoursePickerOpen]);

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
  .limit(12)
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

  const normalizedTutorQuery = tutorQuery.trim().toLowerCase();

  const filteredTutors = useMemo(() => {
    return featuredTeachers.filter((teacher) => {
      if (!teacherMatchesTutorCategory(teacher, tutorCategory)) return false;
      if (!normalizedTutorQuery) return true;
      const haystack = [
        teacher.full_name ?? "",
        (teacher.subjects || []).join(" "),
        (teacher.languages || []).join(" "),
        teacher.experience ?? "",
        teacher.teaching_mode ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return normalizedTutorQuery
        .split(/\s+/)
        .filter(Boolean)
        .every((token) => haystack.includes(token));
    });
  }, [featuredTeachers, tutorCategory, normalizedTutorQuery]);

  const tutorFiltersActive = normalizedTutorQuery.length > 0 || tutorCategory !== "all";

  function resetTutorFilters() {
    setTutorQuery("");
    setTutorCategory("all");
  }

  function tutorCategoryLabel(key: TutorCategoryKey): string {
    switch (key) {
      case "all":
        return t.tutorFilterAll;
      case "quran":
        return t.tutorFilterQuran;
      case "hifz":
        return t.tutorFilterHifz;
      case "academic":
        return t.tutorFilterAcademic;
      case "islamic":
        return t.tutorFilterIslamic;
      case "languages":
        return t.tutorFilterLanguages;
    }
  }

  return (
    <main ref={revealRootRef} className="min-h-screen bg-white text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema) }}
      />
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="landing-container flex min-h-16 items-center justify-between gap-3 py-3">
          <a
            href="#"
            className="shrink-0 whitespace-nowrap text-xl font-extrabold tracking-tight text-blue-700 sm:text-2xl"
          >
            UstaadHub
          </a>

          <div className="hidden items-center gap-6 lg:flex xl:gap-8">
            <a
              href="#teachers"
              className="whitespace-nowrap text-[15px] font-medium text-slate-700 transition hover:text-blue-700"
            >
              {t.findTeachers}
            </a>
            <a
              href="#subjects"
              className="whitespace-nowrap text-[15px] font-medium text-slate-700 transition hover:text-blue-700"
            >
              {t.subjects}
            </a>
            <a
              href="#how"
              className="whitespace-nowrap text-[15px] font-medium text-slate-700 transition hover:text-blue-700"
            >
              {t.howItWorks}
            </a>
            <a
              href="#about"
              className="whitespace-nowrap text-[15px] font-medium text-slate-700 transition hover:text-blue-700"
            >
              {t.footerAbout}
            </a>
            <a
              href="#faq"
              className="whitespace-nowrap text-[15px] font-medium text-slate-700 transition hover:text-blue-700"
            >
              {t.footerFaq}
            </a>
            <a
              href="#contact"
              className="whitespace-nowrap text-[15px] font-medium text-slate-700 transition hover:text-blue-700"
            >
              {t.footerContact}
            </a>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            <a
              href="/login"
              className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 md:block"
            >
              {t.login}
            </a>

            <a
              href="/login"
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 md:hidden"
            >
              {t.login}
            </a>

            <a
              href="/register"
              className="hidden whitespace-nowrap rounded-lg bg-blue-700 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:px-5 sm:py-2.5 sm:text-[15px] md:block"
            >
              {t.joinAsTeacher}
            </a>

            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100 lg:hidden"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden="true"
                className="h-5 w-5"
              >
                {mobileNavOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-slate-100 bg-white lg:hidden">
            <div className="landing-container flex flex-col gap-1 py-3">
              {[
                { href: "#teachers", label: t.findTeachers },
                { href: "#subjects", label: t.subjects },
                { href: "#subjects", label: t.courses },
                { href: "#how", label: t.howItWorks },
                { href: "#about", label: t.footerAbout },
                { href: "#faq", label: t.footerFaq },
                { href: "#contact", label: t.footerContact },
                { href: "#support", label: t.support.title },
                { href: "/register", label: t.joinAsTeacher },
              ].map((item) => (
                <a
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-3">
                <div className="sm:hidden">
                  <LanguageSwitcher />
                </div>
                <a
                  href="/login"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100 md:hidden"
                >
                  {t.login}
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>
      <section id="hero" className="relative bg-gradient-to-br from-blue-50 via-white to-indigo-50">
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

        <div className="landing-container relative grid gap-10 pb-12 pt-10 sm:pt-12 md:grid-cols-2 md:items-center md:gap-10 md:pb-16 md:pt-8 lg:gap-14">
      {/* HERO */}
  <div className="min-w-0">

            <h1
              className={`hero-reveal hero-delay-1 text-balance ${
                isUrdu
                  ? "text-3xl font-extrabold leading-normal tracking-normal sm:text-4xl md:text-[2rem] lg:text-[2.25rem] xl:text-[2.5rem]"
                  : "text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl md:text-[2.25rem] lg:text-[2.5rem] xl:text-[3rem]"
              }`}
            >
              {t.heroTitleA}
              <span className="text-blue-700">{isUrdu ? " استاد " : " Ustaad "}</span>
              {t.heroTitleC}
            </h1>

            <p
              className={`hero-reveal hero-delay-2 ${
                isUrdu
                  ? "mt-3 max-w-xl text-base leading-8 text-slate-600 sm:text-lg sm:leading-9"
                  : "mt-3 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8"
              }`}
            >
              {t.heroDescription}
            </p>

            {/* PRIMARY + SECONDARY CTA */}
            <div className="hero-reveal hero-delay-3 mt-4 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/teachers"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-base font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto sm:py-3.5 sm:text-lg"
              >
                {t.heroCtaPrimary}
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                href={isUrdu ? "/requirement?lang=ur" : "/requirement"}
                className="inline-flex w-full items-center justify-center rounded-xl border-2 border-blue-700 bg-white/90 px-6 py-3 text-base font-bold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto sm:py-3.5 sm:text-lg"
              >
                {t.heroCtaSecondary}
              </Link>
            </div>

            <p className="hero-reveal hero-delay-4 mt-1 text-sm text-slate-500">
              {t.tellUs}
            </p>

            {/* COURSE SEARCH */}
            <div
              className={`hero-reveal hero-delay-5 relative mt-4 w-full max-w-2xl ${showCourseList ? "z-30" : ""}`}
            >
              <div
                ref={courseSearchRef}
                className="relative z-30 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-200 sm:p-4"
              >

                <div className="flex flex-col gap-3 sm:flex-row">

                  {/* SEARCH INPUT */}
                  <div className="relative min-w-0 flex-1">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                          >
                            <circle cx="11" cy="11" r="7" />
                            <line x1="16.5" y1="16.5" x2="21" y2="21" />
                          </svg>
                        </span>

                      <input
                        type="text"
                        role="combobox"
                        aria-expanded={showCourseList}
                        aria-controls="hero-course-listbox"
                        aria-autocomplete="list"
                        value={courseSearch}
                        onChange={(e) => {
                          setCourseSearch(e.target.value);
                          setShowCourseList(true);
                        }}
                        onFocus={() => {
                          if (
                            typeof window !== "undefined" &&
                            window.matchMedia("(max-width: 639px)").matches
                          ) {
                            setShowCourseList(false);
                            setMobileCoursePickerOpen(true);
                            return;
                          }
                          setShowCourseList(true);
                        }}
                        onClick={() => {
                          if (
                            typeof window !== "undefined" &&
                            window.matchMedia("(max-width: 639px)").matches
                          ) {
                            setShowCourseList(false);
                            setMobileCoursePickerOpen(true);
                          }
                        }}
                        readOnly={
                          typeof window !== "undefined" &&
                          window.matchMedia("(max-width: 639px)").matches
                        }
                        inputMode="search"
                        placeholder={t.searchPlaceholder}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-base text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus-visible:ring-2 focus-visible:ring-blue-600 sm:text-lg"
                      />
                    </div>
                  </div>

                  {/* SEARCH BUTTON — opens the course list; picking a course
                      from that list continues to the requirement flow. */}
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        typeof window !== "undefined" &&
                        window.matchMedia("(max-width: 639px)").matches
                      ) {
                        setShowCourseList(false);
                        setMobileCoursePickerOpen(true);
                        return;
                      }
                      setShowCourseList(true);
                    }}
                    disabled={filteredCourses.length === 0}
                    className="w-full shrink-0 rounded-xl bg-blue-700 px-7 py-4 text-base font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto sm:text-lg"
                  >
                    {t.searchCourses}
                  </button>

                </div>

                {/* CUSTOM FLOATING COURSE SUGGESTIONS — full card width, floats above tags below */}
                {showCourseList && (
                  <div
                    className={`hero-search-dropdown is-visible absolute left-0 right-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-[0_20px_50px_rgba(15,23,42,0.15)] backdrop-blur-xl`}
                    ref={courseSearchRef}
                  >

                    <div className="px-4 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {courseSearch.trim()
                        ? t.matchingCourses
                        : t.popularCourses}
                    </div>

                    <div
                      id="hero-course-listbox"
                      role="listbox"
                      className="custom-scrollbar max-h-64 overflow-y-auto p-2">

                      {filteredCourses.length > 0 ? (
                        filteredCourses.map((course) => (
                          <button
                            key={course}
                            type="button"
                            role="option"
                            aria-selected={false}
                            onClick={() => {
                              selectCourse(course);
                              setShowCourseList(false);
                            }}
                            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 sm:text-[15px]"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.8}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                              >
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                              </svg>
                            </span>

                            <span className="min-w-0 flex-1 truncate font-medium">
                              {isUrdu ? (courseUrduLabels[course] ?? course) : course}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-sm text-slate-500">
                          {t.noMatchingCourse}
                        </div>
                      )}

                    </div>
                  </div>
                )}

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
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-blue-100/70 bg-white/80 p-2.5 text-center shadow-sm backdrop-blur sm:gap-3 sm:p-3">
                <div>
                  <div className="text-base font-bold text-blue-700 sm:text-lg">1:1</div>
                  <div className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{t.classes}</div>
                </div>

                <div>
                  <div className="text-base font-bold text-blue-700 sm:text-lg">
                    {verifiedTeacherCount}+
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{t.teachers}</div>
                </div>

                <div>
                  <div className="text-base font-bold text-blue-700 sm:text-lg">24/7</div>
                  <div className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{t.learning}</div>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
                    ⏱
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
      <section id="subjects" className="bg-white py-14 sm:py-16 lg:py-20">
        <div className="landing-container">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.exploreSubjects}</p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
              {t.whatLearn}
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-base">
              {t.chooseSubject}
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {categories.map(([icon, title]) => (
              <div
                key={title}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg sm:p-6"
              >
                <div className="text-3xl sm:text-4xl">{icon}</div>

                <h3 className="mt-4 text-[15px] font-bold text-slate-900 sm:text-base">{isUrdu ? (categoryUrdu[title] ?? title) : title}</h3>

                <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                  {t.findTeacher}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED TEACHERS */}
      <section id="teachers" className="bg-slate-50 py-14 sm:py-16 lg:py-20">
        <div className="landing-container">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                {t.featuredTeachers}
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
                {t.learnExperienced}
              </h2>

              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-base">
                {t.discoverVerified}
              </p>
            </div>

            <Link
              href="/teachers"
              className="inline-flex w-fit shrink-0 items-center gap-1 rounded-lg px-1 py-1 font-semibold text-blue-700 transition hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {t.viewAll}
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* SEARCH & FILTER */}
          <div className="mt-8 sm:mt-10">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <label htmlFor="tutor-search" className="sr-only">
                {t.tutorSearchLabel}
              </label>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                </span>
                <input
                  id="tutor-search"
                  type="search"
                  value={tutorQuery}
                  onChange={(event) => setTutorQuery(event.target.value)}
                  placeholder={t.tutorSearchPlaceholder}
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0"
                />
                {tutorQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTutorQuery("")}
                    aria-label={t.tutorClearSearch}
                    title={t.tutorClearSearch}
                    className="absolute right-2.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </div>

              <div
                role="tablist"
                aria-label={t.tutorSearchLabel}
                className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1"
              >
                {TUTOR_CATEGORY_FILTERS.map((key) => {
                  const active = tutorCategory === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTutorCategory(key)}
                      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                        active
                          ? "bg-blue-700 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {tutorCategoryLabel(key)}
                    </button>
                  );
                })}
              </div>

              {!teachersLoading && !teachersError && (
                <p aria-live="polite" className="mt-3 text-sm text-slate-500">
                  <span className="font-semibold text-slate-700">{filteredTutors.length}</span>{" "}
                  {t.tutorResultsCount}
                </p>
              )}
            </div>
          </div>

          {teachersLoading ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600 shadow-sm sm:mt-10 sm:p-12">
              {t.loadingVerified}
            </div>
          ) : teachersError ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-red-700 sm:mt-10 sm:p-12">
              {isUrdu ? t.teachersError : teachersError}
            </div>
          ) : featuredTeachers.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600 shadow-sm sm:mt-10 sm:p-12">
              {t.noVerified}
            </div>
          ) : filteredTutors.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm sm:mt-10 sm:p-12">
              <div
                aria-hidden="true"
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                  <path d="M8.5 11h5" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                {normalizedTutorQuery
                  ? `${t.tutorNoResultsTitle} for '${tutorQuery.trim()}'`
                  : t.tutorNoResultsTitle}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {t.tutorNoResultsHint}
              </p>
              {tutorFiltersActive && (
                <button
                  type="button"
                  onClick={resetTutorFilters}
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  {t.tutorResetFilters}
                </button>
              )}
            </div>
          ) : (
            <FeaturedTeachersCarousel
              teachers={filteredTutors}
              locale={locale}
              labels={{
                verified: t.verified,
                experience: t.experience,
                teachingMode: t.teachingMode,
                languages: t.languages,
                fees: t.fees,
                viewProfile: t.viewProfile,
                subjectsNotSpecified: isUrdu
                  ? t.subjectsNotSpecified
                  : "Subjects not specified",
                notSpecified: isUrdu ? t.notSpecified : "Not specified",
              }}
            />
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-white py-14 sm:py-16 lg:py-20">
        <div className="landing-container mx-auto max-w-6xl">
          <div className="reveal text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.simpleProcess}</p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
              {t.howWorks}
            </h2>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 md:grid-cols-3">
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
            ].map(([number, title, description], index) => (
              <div
                key={number}
                className={`reveal text-center ${index === 1 ? "reveal-delay-1" : index === 2 ? "reveal-delay-2" : ""}`}
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-700 text-xl font-bold text-white">
                  {number}
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-900 sm:text-xl">{title}</h3>

                <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-[15px]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="bg-slate-50 py-14 sm:py-16 lg:py-20">
        <div className="landing-container mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.aboutUstaadHub}</p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
              {t.aboutTitle}
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-base">
              {t.aboutDescription}
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7 lg:p-8">
              <h3 className="text-lg font-bold text-slate-900 sm:text-xl">{t.aboutStudentsTitle}</h3>

              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-[15px]">
                {t.aboutStudents}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7 lg:p-8">
              <h3 className="text-lg font-bold text-slate-900 sm:text-xl">{t.aboutTeachersTitle}</h3>

              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-[15px]">
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
      <section id="faq" className="bg-white py-14 sm:py-16 lg:py-20">
        <div className="landing-container mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.faq}</p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
              {t.faqTitle}
            </h2>
          </div>

          <div className="mt-8 space-y-3 sm:mt-10">
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

                <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-[15px]">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* SUPPORT USTAADHUB */}
      <SupportSection copy={t.support} />

      {/* CONTACT & SUPPORT */}
      <section id="contact" className="bg-slate-50 py-14 sm:py-16 lg:py-20">
        <div className="landing-container mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.contactSupport}</p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
            {t.contactTitle}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-base">
            {t.contactDescription}
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-xl bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 sm:w-auto sm:py-3.5"
            >
              {t.contactWhatsApp}
            </a>

            <Link
              href={isUrdu ? "/requirement?lang=ur" : "/requirement"}
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto sm:py-3.5"
            >
              {t.contactRequirement}
            </Link>

            <Link
              href="/teachers"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-800 transition hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto sm:py-3.5"
            >
              {t.contactBrowseTeachers}
            </Link>
          </div>

          <p className="mt-5 text-sm text-slate-500">{t.contactNeedHelp}</p>
        </div>
      </section>

      <section className="bg-white pb-14 sm:pb-16 lg:pb-20">
        <div className="landing-container">
  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-6 py-12 text-center shadow-xl sm:px-10 md:px-12 md:py-16">
    {/* Decorative background */}
    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
    <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />

    <div className="relative mx-auto max-w-3xl">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100 sm:text-sm">
        {t.startToday}
      </p>

      <h2 className="text-balance text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl">
        {t.rightTeacher}
      </h2>

      <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-blue-50 sm:mt-6 sm:text-lg sm:leading-8 md:text-xl">
        {t.demoDesc}
      </p>

      <a
        href={isUrdu ? "/requirement?lang=ur" : "/requirement"}
        className="demo-cta mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-1 hover:bg-green-700 hover:shadow-xl sm:mt-9 sm:w-auto sm:py-4 sm:text-lg"
      >
        {t.bookDemo}
      </a>

      <p className="mt-4 text-sm text-blue-100">
        {t.tellUs}
      </p>
    </div>
  </div>
        </div>
</section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="landing-container py-10 sm:py-12">
          <div className="grid gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-6">
            <div className="sm:col-span-2 lg:col-span-2">
              <p className="text-xl font-bold text-blue-700">UstaadHub</p>

              <p className="mt-3 max-w-xs text-sm leading-7 text-slate-500">
                {t.footerDescription}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                {t.footerExplore}
              </h3>

              <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
                <li>
                  <Link href="/teachers" className="transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerFindTeachers}
                  </Link>
                </li>

                <li>
                  <Link
                    href={isUrdu ? "/requirement?lang=ur" : "/requirement"}
                    className="transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    {t.footerRequestTeacher}
                  </Link>
                </li>

                <li>
                  <a href="#how" className="transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerHowItWorks}
                  </a>
                </li>

                <li>
                  <a href="#subjects" className="transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerSubjects}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                {t.footerCompany}
              </h3>

              <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
                <li>
                  <a href="#about" className="transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerAbout}
                  </a>
                </li>

                <li>
                  <a href="#faq" className="transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerFaq}
                  </a>
                </li>

                <li>
                  <a href="#contact" className="transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerContact}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                {t.footerForTeachers}
              </h3>

              <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
                <li>
                  <Link href="/register" className="transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerBecomeTeacher}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                {t.footerLegal}
              </h3>

              <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
                <li>
                  <Link href="/privacy" className="transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerPrivacyPolicy}
                  </Link>
                </li>

                <li>
                  <Link href="/terms" className="transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    {t.footerTermsConditions}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6 sm:mt-10">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
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
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition duration-200 hover:-translate-y-0.5 hover:border-green-600 hover:bg-green-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition duration-200 hover:-translate-y-0.5 hover:border-red-600 hover:bg-red-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition duration-200 hover:-translate-y-0.5 hover:border-blue-600 hover:bg-blue-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition duration-200 hover:-translate-y-0.5 hover:border-pink-600 hover:bg-pink-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <FaInstagram aria-hidden="true" className="h-5 w-5" />
                </a>
              </li>
            </ul>

            <p className="mt-4 text-sm text-slate-500">
              <a
                href="#contact"
                className="transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {t.footerContact}
              </a>
            </p>
          </div>

          <p className="mt-8 border-t border-slate-200 pt-6 text-sm text-slate-500">
            {t.rightsReserved}
          </p>
        </div>
      </footer>

      {/* MOBILE COURSE PICKER — bottom sheet (phones only)
          The hero course input is read-only on small screens and opens this
          sheet instead of the floating dropdown. Choosing a course writes it
          into the hero field and closes the sheet; the existing "Find
          Teachers" CTA then performs the navigation (see pickCourseIntoSearch).
          Background scroll is locked while the sheet is open. */}
      {mobileCoursePickerOpen && (
        <div className="fixed inset-0 z-[60] sm:hidden">
          <div
            aria-hidden="true"
            onClick={() => setMobileCoursePickerOpen(false)}
            className="course-picker-backdrop absolute inset-0 bg-slate-900/40"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              courseSearch.trim() ? t.matchingCourses : t.popularCourses
            }
            className="course-picker-sheet absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
          >
            {/* Sheet label + close */}
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {courseSearch.trim() ? t.matchingCourses : t.popularCourses}
              </span>

              <button
                type="button"
                onClick={() => setMobileCoursePickerOpen(false)}
                aria-label="Close course picker"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="h-4 w-4"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* Typing here filters the sheet list using the same search state */}
            <div className="shrink-0 px-4 pt-1">
              <input
                type="text"
                inputMode="search"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white"
              />
            </div>

            {/* Scrollable course list */}
            <div
              role="listbox"
              aria-label={t.popularCourses}
              className="custom-scrollbar mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-1"
            >
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course) => (
                  <button
                    key={course}
                    type="button"
                    role="option"
                    aria-selected={courseSearch.trim() === course}
                    onClick={() => {
                      // Same selection→navigation path as the desktop list: the
                      // chosen course is handed to the requirement page, so the
                      // visitor never has to type it again.
                      pickCourseIntoSearch(course);
                      selectCourse(course);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] text-slate-700 transition hover:bg-slate-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </span>

                    <span className="min-w-0 flex-1 truncate font-medium">
                      {isUrdu ? (courseUrduLabels[course] ?? course) : course}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  {t.noMatchingCourse}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


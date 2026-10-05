import type { Metadata } from "next";
import Link from "next/link";

import AIEnglishTutor from "@/components/AIEnglishTutor";

// Public, self-contained practice tool. It is deliberately independent of the
// teacher/student/payment flows: no database tables, no auth, no checkout.

const TITLE = "AI English Tutor";
const DESCRIPTION =
  "Practise English with your personal AI speaking practice partner. Get instant grammar corrections, simple explanations and natural vocabulary, tailored to your level, with help in Hindi or Urdu whenever something is unclear.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.ustaadhub.in/ai-english-tutor" },
  openGraph: {
    title: `${TITLE} | UstaadHub`,
    description: DESCRIPTION,
    url: "https://www.ustaadhub.in/ai-english-tutor",
    siteName: "UstaadHub",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | UstaadHub`,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export default function AiEnglishTutorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="shrink-0 whitespace-nowrap text-xl font-extrabold tracking-tight text-blue-700 sm:text-2xl"
          >
            UstaadHub
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/teachers"
              className="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-blue-700 sm:px-3"
            >
              Find Teachers
            </Link>
            <Link
              href="/ai-english-tutor"
              aria-current="page"
              className="whitespace-nowrap rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 sm:px-4"
            >
              AI Tutor
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 text-center sm:mb-8">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
            Your personal English speaking practice partner
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            AI English Tutor
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Practice speaking and writing in English with a friendly AI tutor
            that corrects your mistakes, gives simple explanations and guides
            each lesson around your level.
          </p>
        </header>

        <AIEnglishTutor />

        <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-6 text-slate-500">
          This is an AI practice assistant, not a human teacher. For one-to-one
          classes with a real English teacher,{" "}
          <Link
            href="/teachers"
            className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800"
          >
            find a teacher on UstaadHub
          </Link>
          .
        </p>
      </main>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Online Teachers & Tutors",
  description:
    "Browse verified online teachers and tutors for Quran & Tajweed, Hifz, Islamic Studies, Arabic, Urdu, English and more. Compare subjects, fees and teaching modes, then learn one-to-one online.",
  alternates: {
    canonical: "https://www.ustaadhub.in/teachers",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Find Online Teachers & Tutors | UstaadHub",
    description:
      "Browse verified online teachers for Quran, Islamic Studies, Arabic and more.",
    siteName: "UstaadHub",
    url: "https://www.ustaadhub.in/teachers",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "UstaadHub teachers",
      },
    ],
  },
};

export default function TeachersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
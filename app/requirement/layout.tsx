import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post a Learning Requirement – Find a Teacher Online",
  description:
    "Tell UstaadHub what you want to learn — Quran, Islamic Studies, Arabic, Urdu, languages or other subjects — and we will help you find a suitable online teacher for one-to-one online classes.",
  alternates: {
    canonical: "https://www.ustaadhub.in/requirement",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Post a Learning Requirement | UstaadHub",
    description:
      "Tell us what you want to learn and we will help you find the right online teacher.",
    siteName: "UstaadHub",
    url: "https://www.ustaadhub.in/requirement",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "UstaadHub requirement",
      },
    ],
  },
};

export default function RequirementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "UstaadHub – Find Online Teachers for Quran, Arabic, Islamic Studies & More (Urdu)",
  description:
    "آن لائن اساتذہ تلاش کریں — قرآن، اسلامیات، عربی، زبانوں اور مزید مضامین کے لیے تجربہ کار اساتذہ سے ون آن ون آن لائن کلاسز۔",
  alternates: {
    canonical: "https://www.ustaadhub.in/ur",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title:
      "UstaadHub – Find Online Teachers for Quran, Arabic, Islamic Studies & More",
    description:
      "Learn Quran, Islamic Studies, Arabic and more through one-to-one online classes with experienced teachers.",
    siteName: "UstaadHub",
    url: "https://www.ustaadhub.in/ur",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "UstaadHub",
      },
    ],
  },
};

export default function UrduLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
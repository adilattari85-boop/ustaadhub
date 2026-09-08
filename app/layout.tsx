import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import WhatsAppButton from "@/components/WhatsAppButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ustaadhub.in"),

  title: {
    default:
      "UstaadHub – Find Online Teachers for Quran, Arabic, Islamic Studies & More",
    template: "%s | UstaadHub",
  },

  description:
    "Find trusted online teachers for Quran, Islamic Studies, Arabic, Urdu, languages and more. Learn through personalised one-to-one online classes with experienced teachers.",

  keywords: [
    "online teachers",
    "online tutor",
    "find a teacher online",
    "online learning",
    "online Quran classes",
    "Quran teacher online",
    "learn Quran online",
    "online Quran tutor",
    "Islamic studies teacher online",
    "Arabic teacher online",
    "Urdu teacher online",
    "one to one online classes",
    "online Islamic teacher",
    "Quran classes for kids online",
  ],

  alternates: {
    canonical: "https://www.ustaadhub.in",
  },

  openGraph: {
    title:
      "UstaadHub – Find Online Teachers for Quran, Arabic, Islamic Studies & More",

    description:
      "Find trusted online teachers for Quran, Islamic Studies, Arabic, Urdu, languages and more. Learn through personalised one-to-one online classes with experienced teachers.",

    siteName: "UstaadHub",

    url: "https://www.ustaadhub.in",

    type: "website",

    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "UstaadHub – Find the Right Teacher",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title:
      "UstaadHub – Find Online Teachers for Quran, Arabic, Islamic Studies & More",

    description:
      "Learn through personalised one-to-one online classes with experienced teachers.",

    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
  },

  verification: {
    google: "WiQchNJyhAx-G3MEMGRrMOoNmG50shTIlX4dbJ2Uwqk",
  },

  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <WhatsAppButton />
      </body>
    </html>
  );
}
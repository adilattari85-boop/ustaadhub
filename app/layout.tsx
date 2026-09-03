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

  title: "UstaadHub – Find the Right Teacher",

  description:
    "UstaadHub helps students find quality teachers and tutors for better learning.",

  keywords: [
    "UstaadHub",
    "teachers",
    "tutors",
    "home tutors",
    "online teachers",
    "find a teacher",
  ],

  openGraph: {
    title: "UstaadHub – Find the Right Teacher",

    description:
      "Connect with quality teachers and discover better learning.",

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

    title: "UstaadHub – Find the Right Teacher",

    description:
      "Connect with quality teachers and discover better learning.",

    images: ["/og-image.png"],
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
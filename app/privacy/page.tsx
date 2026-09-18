import type { Metadata } from "next";
import Link from "next/link";
import { WHATSAPP_URL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How UstaadHub collects, uses and protects the information shared by students and teachers, including learning requirements and teacher profiles.",
  alternates: {
    canonical: "https://www.ustaadhub.in/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Privacy Policy | UstaadHub",
    description:
      "Read how UstaadHub handles student requirements, teacher profile information, account details and support conversations.",
    siteName: "UstaadHub",
    url: "https://www.ustaadhub.in/privacy",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "UstaadHub privacy policy",
      },
    ],
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-5">
          <Link
            href="/"
            className="text-2xl font-bold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:text-3xl"
          >
            UstaadHub
          </Link>

          <Link
            href="/"
            className="font-medium text-slate-700 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-bold sm:text-4xl">Privacy Policy</h1>

        <p className="mt-3 text-sm text-slate-500">Last updated: 18 September 2026</p>

        <p className="mt-6 leading-8 text-slate-700">
          This Privacy Policy explains what information UstaadHub collects when
          you use this website, why we collect it and how it is handled. It
          applies to students who look for a teacher, to teachers who create a
          profile with us, and to visitors who browse the site.
        </p>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Information you provide</h2>

          <p className="mt-3 leading-8 text-slate-700">
            When you create an account, submit a learning requirement or contact
            us for support, you may provide information such as your name, email
            address, phone number, city, account password and the details of the
            subject or course you want to learn. If you write to us through
            WhatsApp, the information you choose to share in that conversation is
            also received by us.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Teacher profile information</h2>

          <p className="mt-3 leading-8 text-slate-700">
            Teachers create a profile during registration and onboarding, which
            may include a name, profile photo, subjects taught, experience,
            languages, teaching mode, fees, qualifications and an introduction.
            This information is provided by the teacher and is reviewed as part
            of the verification and onboarding process described below.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Student learning requirements</h2>

          <p className="mt-3 leading-8 text-slate-700">
            Students can submit a learning requirement describing what they want
            to learn, along with preferences such as subjects, schedule,
            teaching mode and contact details. Learning requirements are stored
            in our systems and are reviewed by the UstaadHub admin team so that
            we can assist with matching a suitable verified teacher.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">How we use information</h2>

          <p className="mt-3 leading-8 text-slate-700">
            We use the information you provide to:
          </p>

          <ul className="mt-3 list-disc space-y-2 pl-6 leading-8 text-slate-700">
            <li>create and manage your account and keep you signed in;</li>
            <li>
              review student learning requirements and help match a suitable
              verified teacher;
            </li>
            <li>
              run the teacher verification and onboarding process and review
              teacher profiles;
            </li>
            <li>
              display teacher profiles so students can compare teachers and
              contact them;
            </li>
            <li>
              respond to questions, support requests and issues reported to us.
            </li>
          </ul>

          <p className="mt-3 leading-8 text-slate-700">
            Teacher matching is assisted by our admin team; it is not fully
            automatic.
          </p>
        </section>
      <section className="mt-10">
          <h2 className="text-2xl font-bold">Account and security</h2>

          <p className="mt-3 leading-8 text-slate-700">
            Accounts are protected by an email address and password. Passwords
            are stored in hashed form by our authentication provider and are
            never stored as plain text. Please keep your password confidential
            and contact us if you believe your account has been accessed without
            your permission. Some pages of the website require you to be signed
            in, and teachers, students and administrators each see only the areas
            of the site that are intended for their role.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Public teacher profiles</h2>

          <p className="mt-3 leading-8 text-slate-700">
            Verified teacher profiles are publicly visible on the Find Teachers
            page and on individual teacher profile pages. Anyone browsing the
            website can view the details a teacher has added, such as name,
            photo, subjects, experience, languages, teaching mode and fees.
            Please only add information to a teacher profile that you are
            comfortable appearing publicly.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">
            Sharing and disclosure limitations
          </h2>

          <p className="mt-3 leading-8 text-slate-700">
            We do not sell personal information. Information is used within
            UstaadHub so that the admin team can review learning requirements,
            verify teacher profiles and help students and teachers connect. We
            rely on service providers for hosting, database storage,
            authentication and website analytics, and information is processed
            by them on our behalf. We may also disclose information if we are
            required to do so by law or to protect the safety and rights of our
            users.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Cookies and analytics</h2>

          <p className="mt-3 leading-8 text-slate-700">
            This website uses Google Analytics 4 to understand how visitors use
            UstaadHub, for example which pages are viewed. Google Analytics sets
            its own cookies and processes usage data as described in the{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 underline hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Google Privacy Policy
            </a>
            . You can limit or block cookies in your browser settings, although
            parts of the site may then not work as expected.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Contact and support</h2>

          <p className="mt-3 leading-8 text-slate-700">
            If you have a question about this policy, want to correct the
            information held about you, or need help with your account, please
            contact UstaadHub support on{" "}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 underline hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              WhatsApp
            </a>
            . You can also use the{" "}
            <Link
              href="/#contact"
              className="font-medium text-blue-700 underline hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Contact &amp; Support
            </Link>{" "}
            section on the home page.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Updates to this policy</h2>

          <p className="mt-3 leading-8 text-slate-700">
            We may update this Privacy Policy as the UstaadHub website and its
            features change. The current version is always published on this
            page, together with the date it was last updated.
          </p>
        </section>
      </article>

      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 px-5 py-8 text-sm text-slate-500">
          <Link href="/" className="hover:text-blue-700">
            Home
          </Link>
          <Link href="/privacy" className="hover:text-blue-700">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-blue-700">
            Terms &amp; Conditions
          </Link>
        </div>
      </footer>
    </main>
  );
}
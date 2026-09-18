import type { Metadata } from "next";
import Link from "next/link";
import { WHATSAPP_URL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms for using UstaadHub as a student or teacher, including acceptable use, teacher verification, the matching process and account responsibilities.",
  alternates: {
    canonical: "https://www.ustaadhub.in/terms",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Terms & Conditions | UstaadHub",
    description:
      "Read the terms that apply to students, teachers and visitors using UstaadHub.",
    siteName: "UstaadHub",
    url: "https://www.ustaadhub.in/terms",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "UstaadHub terms and conditions",
      },
    ],
  },
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold sm:text-4xl">Terms &amp; Conditions</h1>

        <p className="mt-3 text-sm text-slate-500">Last updated: 18 September 2026</p>

        <p className="mt-6 leading-8 text-slate-700">
          These Terms &amp; Conditions apply to everyone who uses the UstaadHub
          website: students looking for a teacher, teachers who create a profile
          with us, and visitors who browse the site. By using UstaadHub you agree
          to these terms.
        </p>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Acceptable use</h2>

          <p className="mt-3 leading-8 text-slate-700">
            Use UstaadHub only for lawful purposes connected with finding or
            offering teaching. You must not misuse the website, attempt to access
            accounts or areas that are not intended for your role, submit false or
            misleading information, upload harmful content, or use the site to
            harass, impersonate or mislead other users. We may remove content or
            restrict access where these terms are not followed.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Student responsibilities</h2>

          <p className="mt-3 leading-8 text-slate-700">
            Students are responsible for the accuracy of the information and
            learning requirements they submit, including contact details, the
            subject they want to learn and their preferences. Students should
            communicate respectfully with teachers and admin team members, and
            should arrange classes only with teachers they are comfortable with.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Teacher responsibilities</h2>

          <p className="mt-3 leading-8 text-slate-700">
            Teachers are responsible for the profile they create, for the
            accuracy of their subjects, experience, languages, teaching mode and
            fees, and for the classes they agree to teach. Teachers must keep
            their availability and profile details up to date, behave
            professionally with students, and follow the verification and
            onboarding steps before offering classes on UstaadHub.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Teacher verification and review</h2>

          <p className="mt-3 leading-8 text-slate-700">
            Teacher profiles go through a verification and onboarding process.
            The UstaadHub admin team reviews submitted profiles and marks a
            profile as verified once that process is completed. Only verified
            teachers are shown on the public Find Teachers page. Verification
            confirms that our review process was completed; it is not a
            guarantee of any particular teaching outcome.
          </p>
        </section>
      <section className="mt-10">
          <h2 className="text-2xl font-bold">
            Matching and assignment process
          </h2>

          <p className="mt-3 leading-8 text-slate-700">
            Students can browse verified teachers directly, or submit a learning
            requirement for review. When a requirement is submitted, the UstaadHub
            admin team reviews it and assists in connecting the student with a
            suitable verified teacher. This matching is assisted by our team and
            is not a fully automatic process. A match depends on the availability
            of a suitable verified teacher.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Account responsibilities</h2>

          <p className="mt-3 leading-8 text-slate-700">
            You are responsible for the security of your account, for keeping your
            password confidential and for activity carried out through your
            account. Provide accurate registration details, use a single account
            for yourself, and tell us promptly if you believe your account has
            been accessed without your permission.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Content and profile accuracy</h2>

          <p className="mt-3 leading-8 text-slate-700">
            Information shown on a teacher profile — such as subjects, experience,
            languages, teaching mode and fees — is provided by the teacher, and
            learning requirement details are provided by the student. You must not
            post false, copied or misleading information. We may correct, hide or
            remove content or profiles that are inaccurate or that do not follow
            these terms.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Service limitations</h2>

          <p className="mt-3 leading-8 text-slate-700">
            UstaadHub provides a platform where students and teachers can find
            each other, with the help of our admin team. We do not deliver the
            classes ourselves and we do not process payments on this website.
            Fees shown on teacher profiles are set by the teachers. We cannot
            guarantee that a suitable teacher will always be available, and the
            website may occasionally be unavailable for maintenance or technical
            reasons.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Termination and suspension</h2>

          <p className="mt-3 leading-8 text-slate-700">
            We may suspend or remove an account or profile if these terms are
            breached, if information provided is false or misleading, if the
            account is misused, or if we are required to do so. You may stop using
            UstaadHub at any time, and you can ask us to help with removing your
            account.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Intellectual property</h2>

          <p className="mt-3 leading-8 text-slate-700">
            The UstaadHub name, website design, text and branding belong to
            UstaadHub. Photos, profile text and other content uploaded by teachers
            or students remain theirs, but by adding content you allow us to
            display and use it on the website for the purpose of providing the
            service.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Contact and support</h2>

          <p className="mt-3 leading-8 text-slate-700">
            For any question about these terms, please contact UstaadHub support
            on{" "}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 underline hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              WhatsApp
            </a>
            , or use the{" "}
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
          <h2 className="text-2xl font-bold">Changes to these terms</h2>

          <p className="mt-3 leading-8 text-slate-700">
            We may update these Terms &amp; Conditions as the UstaadHub website and
            its features change. The current version is always published on this
            page, together with the date it was last updated. Continuing to use the
            website after an update means you accept the updated terms.
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
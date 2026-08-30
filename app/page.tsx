const teachers = [
  {
    name: "Muhammad Ahsan",
    subject: "Quran & Tajweed",
    experience: "10+ years",
    rating: "4.9",
    students: "120+ students",
    fee: "₹300/hr",
    initials: "MA",
  },
  {
    name: "Abdul Rahman",
    subject: "Arabic & Islamic Studies",
    experience: "8+ years",
    rating: "4.8",
    students: "95+ students",
    fee: "₹350/hr",
    initials: "AR",
  },
  {
    name: "Fatima Zahra",
    subject: "Quran, Hifz & Tajweed",
    experience: "7+ years",
    rating: "5.0",
    students: "80+ students",
    fee: "₹300/hr",
    initials: "FZ",
  },
];

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

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="#" className="text-2xl font-bold text-blue-700">
            UstaadHub
          </a>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#teachers" className="text-gray-700 hover:text-blue-700">
              Find Teachers
            </a>
            <a href="#subjects" className="text-gray-700 hover:text-blue-700">
              Subjects
            </a>
            <a href="#how" className="text-gray-700 hover:text-blue-700">
              How It Works
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-lg px-4 py-2 font-medium hover:bg-gray-100">
              Login
            </button>

            <button className="rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800">
              Join as Teacher
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-2 md:items-center md:py-28">

          <div>
            <div className="mb-6 inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              ✨ Learn from trusted teachers
            </div>

            <h1 className="text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Find the right
              <span className="text-blue-700"> Ustaad </span>
              for you.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600">
              Learn Quran, Islamic Studies, Arabic, languages and more
              from experienced teachers through personalised one-to-one
              online classes.
            </p>

            {/* SEARCH */}
            <div className="mt-8 flex max-w-2xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-xl sm:flex-row">
              <input
                type="text"
                placeholder="What do you want to learn?"
                className="min-w-0 flex-1 rounded-xl border border-gray-200 px-5 py-4 outline-none focus:border-blue-500"
              /><div className="mt-5">
  <a
    href="/requirement"
    className="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-blue-800 sm:w-auto"
  >
    📝 Post Your Learning Requirement
  </a>

  <p className="mt-3 text-sm text-gray-500">
    Tell us what you want to learn — we&apos;ll help you find the right teacher.
  </p>
</div>

              <button className="rounded-xl bg-blue-700 px-7 py-4 font-bold text-white hover:bg-blue-800">
                Find a Teacher
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              <span>✓ One-to-one classes</span>
              <span>✓ Flexible timings</span>
              <span>✓ Experienced teachers</span>
            </div>
          </div>

          {/* HERO CARD */}
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-3xl bg-white p-5 shadow-2xl">
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center text-white">

                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white text-4xl font-bold text-blue-700 shadow-lg">
                  U
                </div>

                <h2 className="mt-6 text-2xl font-bold">
                  Your learning journey starts here
                </h2>

                <p className="mt-3 text-blue-100">
                  Connect with the right teacher for your goals.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3">
                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <div className="text-xl font-bold text-blue-700">1:1</div>
                  <div className="mt-1 text-xs text-gray-500">
                    Classes
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <div className="text-xl font-bold text-blue-700">100+</div>
                  <div className="mt-1 text-xs text-gray-500">
                    Teachers
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <div className="text-xl font-bold text-blue-700">24/7</div>
                  <div className="mt-1 text-xs text-gray-500">
                    Learning
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
            <p className="font-semibold text-blue-700">
              EXPLORE SUBJECTS
            </p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              What do you want to learn?
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              Choose a subject and discover teachers who can help you
              learn at your own pace.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.map(([icon, title]) => (
              <div
                key={title}
                className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
              >
                <div className="text-4xl">{icon}</div>

                <h3 className="mt-4 font-bold">
                  {title}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Find a teacher →
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
                FEATURED TEACHERS
              </p>

              <h2 className="mt-2 text-3xl font-bold md:text-4xl">
                Learn from experienced teachers
              </h2>

              <p className="mt-3 text-gray-600">
                Discover teachers based on subject, experience and reviews.
              </p>
            </div>

            <button className="w-fit rounded-lg font-semibold text-blue-700 hover:text-blue-900">
              View all teachers →
            </button>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">

            {teachers.map((teacher) => (
              <div
                key={teacher.name}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >

                <div className="flex items-center gap-4 p-6">

                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                    {teacher.initials}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold">
                      {teacher.name}
                    </h3>

                    <p className="mt-1 text-sm text-blue-700">
                      {teacher.subject}
                    </p>

                    <div className="mt-2 text-sm">
                      ⭐ {teacher.rating}
                    </div>
                  </div>

                </div>

                <div className="border-t px-6 py-5">

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Experience
                    </span>

                    <span className="font-semibold">
                      {teacher.experience}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-gray-500">
                      Students
                    </span>

                    <span className="font-semibold">
                      {teacher.students}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <div>
                      <span className="text-xl font-bold">
                        {teacher.fee}
                      </span>
                    </div>

                    <button className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800">
                      View Profile
                    </button>
                  </div>

                </div>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-6xl px-5">

          <div className="text-center">
            <p className="font-semibold text-blue-700">
              SIMPLE PROCESS
            </p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              How UstaadHub works
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">

            {[
              [
                "01",
                "Choose what to learn",
                "Select Quran, Arabic, languages, Islamic Studies or another subject.",
              ],
              [
                "02",
                "Find your teacher",
                "Explore teacher profiles, experience, ratings and fees.",
              ],
              [
                "03",
                "Start learning",
                "Choose a suitable time and begin your personalised classes.",
              ],
            ].map(([number, title, description]) => (
              <div key={number} className="text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-700 text-xl font-bold text-white">
                  {number}
                </div>

                <h3 className="mt-5 text-xl font-bold">
                  {title}
                </h3>

                <p className="mt-3 leading-7 text-gray-600">
                  {description}
                </p>

              </div>
            ))}

          </div>
        </div>
      </section>

      {/* TEACHER CTA */}
      <section className="px-5 py-10">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-blue-700 px-6 py-16 text-center text-white md:px-16">

          <h2 className="text-3xl font-bold md:text-4xl">
            Share your knowledge with the world.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-blue-100">
            Create your UstaadHub teacher profile and connect with
            students looking for your expertise.
          </p>

          <button className="mt-8 rounded-xl bg-white px-7 py-4 font-bold text-blue-700 hover:bg-blue-50">
            Join as a Teacher
          </button>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-10 border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">

          <div>
            © 2026 UstaadHub. All rights reserved.
          </div>

          <div className="flex gap-6">
            <span className="cursor-pointer hover:text-blue-700">
              About
            </span>

            <span className="cursor-pointer hover:text-blue-700">
              Contact
            </span>

            <span className="cursor-pointer hover:text-blue-700">
              Privacy
            </span>

            <span className="cursor-pointer hover:text-blue-700">
              Terms
            </span>
          </div>

        </div>
      </footer>

    </main>
  );
}
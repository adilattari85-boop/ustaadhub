const teacher = {
  name: "Muhammad Adil",
  initials: "MA",
  subjects: ["Quran", "Tajweed", "Hifz-ul-Quran", "Islamic Studies"],
  experience: "10+ years",
  rating: "5.0",
  reviews: 48,
  students: "120+",
  languages: ["Hindi", "Urdu", "English"],
  mode: "Online • One-to-one",
  fee: "₹300 / hour",
};

export default function TeacherProfile() {
  return (
    <main className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a
            href="/"
            className="text-3xl font-bold text-blue-600"
          >
            UstaadHub
          </a>

          <div className="flex items-center gap-4">
            <a
              href="/teachers"
              className="hidden font-medium text-slate-700 sm:block"
            >
              Find Teachers
            </a>

            <button className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
              Login
            </button>
          </div>
        </div>
      </header>

      {/* Profile */}
      <section className="mx-auto max-w-6xl px-6 py-12">

        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-slate-500">
          <a href="/teachers" className="hover:text-blue-600">
            Find Teachers
          </a>
          <span className="mx-2">/</span>
          Teacher Profile
        </div>

        {/* Main Profile Card */}
        <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">

          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-10 md:px-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">

              {/* Photo */}
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-4 border-white bg-blue-100 text-4xl font-bold text-blue-700 shadow-lg">
                {teacher.initials}
              </div>

              {/* Basic Info */}
              <div className="text-white">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold md:text-4xl">
                    {teacher.name}
                  </h1>

                  <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium">
                    ✓ Verified Teacher
                  </span>
                </div>

                <p className="mt-3 text-lg text-blue-100">
                  Quran & Islamic Education Teacher
                </p>

                <div className="mt-4 flex flex-wrap gap-5 text-sm">
                  <span>⭐ {teacher.rating}</span>
                  <span>{teacher.reviews} reviews</span>
                  <span>{teacher.students} students</span>
                  <span>{teacher.experience}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Content */}
          <div className="grid gap-10 p-6 md:grid-cols-3 md:p-10">

            {/* Left */}
            <div className="md:col-span-2">

              <h2 className="text-2xl font-bold">
                About the Teacher
              </h2>

              <p className="mt-4 leading-8 text-slate-600">
                Assalamu Alaikum! I am an experienced teacher specialising
                in Quran reading, Tajweed, Hifz-ul-Quran and Islamic
                Studies. My teaching approach is friendly, patient and
                interactive. I focus on understanding the student's level
                and creating a comfortable learning environment.
              </p>

              <p className="mt-4 leading-8 text-slate-600">
                Classes are personalised according to the student's age,
                current knowledge and learning goals. Beginners are welcome.
              </p>

              {/* Subjects */}
              <h2 className="mt-10 text-2xl font-bold">
                Subjects I Teach
              </h2>

              <div className="mt-5 flex flex-wrap gap-3">
                {teacher.subjects.map((subject) => (
                  <span
                    key={subject}
                    className="rounded-full bg-blue-50 px-4 py-2 font-medium text-blue-700"
                  >
                    {subject}
                  </span>
                ))}
              </div>

              {/* Teaching Style */}
              <h2 className="mt-10 text-2xl font-bold">
                Teaching Style
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  ["🤝", "Friendly & Patient"],
                  ["🎯", "Personalised Learning"],
                  ["💬", "Interactive Classes"],
                  ["👨‍🏫", "One-to-one Teaching"],
                ].map(([icon, title]) => (
                  <div
                    key={title}
                    className="rounded-xl border bg-slate-50 p-5"
                  >
                    <div className="text-2xl">{icon}</div>
                    <div className="mt-2 font-semibold">
                      {title}
                    </div>
                  </div>
                ))}
              </div>

              {/* Languages */}
              <h2 className="mt-10 text-2xl font-bold">
                Languages
              </h2>

              <div className="mt-5 flex flex-wrap gap-3">
                {teacher.languages.map((language) => (
                  <span
                    key={language}
                    className="rounded-lg border px-4 py-2 text-sm font-medium"
                  >
                    {language}
                  </span>
                ))}
              </div>

              {/* Reviews */}
              <h2 className="mt-10 text-2xl font-bold">
                Student Reviews
              </h2>

              <div className="mt-5 space-y-4">

                <div className="rounded-2xl border p-5">
                  <div className="font-semibold">
                    ⭐⭐⭐⭐⭐
                  </div>

                  <p className="mt-3 text-slate-600">
                    Very patient teacher. My child enjoys the Quran classes
                    and has improved significantly.
                  </p>

                  <p className="mt-3 text-sm font-medium">
                    — Parent of a student
                  </p>
                </div>

                <div className="rounded-2xl border p-5">
                  <div className="font-semibold">
                    ⭐⭐⭐⭐⭐
                  </div>

                  <p className="mt-3 text-slate-600">
                    Excellent teaching style and very easy to communicate with.
                  </p>

                  <p className="mt-3 text-sm font-medium">
                    — Student
                  </p>
                </div>

              </div>

            </div>

            {/* Right Booking Card */}
            <aside>
              <div className="sticky top-24 rounded-2xl border bg-white p-6 shadow-lg">

                <p className="text-sm text-slate-500">
                  Starting from
                </p>

                <div className="mt-1 text-3xl font-bold">
                  {teacher.fee}
                </div>

                <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
                  🟢 Available for new students
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Teaching mode
                    </span>
                    <span className="font-semibold">
                      Online
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Classes
                    </span>
                    <span className="font-semibold">
                      One-to-one
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Languages
                    </span>
                    <span className="font-semibold">
                      3
                    </span>
                  </div>
                </div>

                <button className="mt-7 w-full rounded-xl bg-blue-600 py-4 font-bold text-white hover:bg-blue-700">
                  Book a Trial Class
                </button>

                <button className="mt-3 w-full rounded-xl border border-blue-600 py-4 font-bold text-blue-600 hover:bg-blue-50">
                  Message Teacher
                </button>

                <p className="mt-5 text-center text-xs leading-5 text-slate-500">
                  You can contact the teacher before booking.
                </p>

              </div>
            </aside>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-slate-500">
          © 2026 UstaadHub. All rights reserved.
        </div>
      </footer>

    </main>
  );
}
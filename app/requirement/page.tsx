"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  courseUrduLabels,
  languageUrduLabels,
  optionUrduLabels,
  requirementSubjectUrduLabels,
  weekdayUrduLabels,
} from "@/lib/urdu";

const subjects = [
  "Madni Qaida/Nazra Course",
  "Qaida Teacher Course",
  "Dars e nizami",
  "Teacher Nazra Course",
  "Hifz-e-Quran",
  "Tajweed-o-Quran",
  "Husne Quran Course",
  "Tafseer-e-Noor",
  "Hifz 40 Hadith",
  "Hadith Course",
  "Tafseer-e-Quran",
  "Farz Uloom",
  "Arabic",
  "English",
  "Hindi",
  "Urdu",
  "Maths",
  "Science",
  "Computer",
  "Other",
];

const languages = ["Hindi", "Urdu", "English", "Arabic"];

const copy = {
  en: {
    subjectRequired: "Please select at least one subject.",
    languageRequired: "Please select at least one preferred language.",
    nameRequired: "Please enter student/parent name.",
    phoneRequired: "Please enter mobile number.",
    levelRequired: "Please select your current learning level.",
    dbError: "Database error: ",
    genericError: "Something went wrong. Please try again.",
    successTitle: "Requirement Submitted!",
    successDesc:
      "Thank you. We have received your learning requirement. Our team can review itand help you find a suitable teacher.",
    goHome: "Go Home",
    browseTeachers: "Browse Teachers",
    backToHome: "← Back to Home",
    pageTitle: "Find the Right Teacher",
    pageDesc: "Tell us what you want to learn and your preferred teacher.",
    studentInfo: "Student Information",
    nameLabel: "Student / Parent Name *",
    namePlaceholder: "Enter name",
    phoneLabel: "Mobile Number *",
    phonePlaceholder: "Enter mobile number",
    ageLabel: "Student Age",
    agePlaceholder: "Age",
    genderLabel: "Student Gender",
    cityLabel: "City",
    cityPlaceholder: "Your city",
    whatLearn: "What do you want to learn?",
    selectedCourseLabel: "Selected Course",
    levelLabel: "Learning Level",
    selectCurrentLevel: "Select current level",
    teacherPref: "Teacher Preference",
    teacherGenderLabel: "Teacher Gender",
    classModeLabel: "Class Mode",
    langLabel: "Preferred Teaching Language",
    scheduleLabel: "Class Schedule",
    preferredDaysLabel: "Preferred Class Days *",
    daysHelper: "Select the days you would prefer for your classes.",
    preferredTimeLabel: "Preferred Time",
    preferredDaysTextLabel: "Preferred Days",
    preferredDaysPlaceholder: "Example: Monday, Wednesday, Friday",
    budgetLabel: "Budget",
    monthlyBudgetLabel: "Monthly Budget",
    budgetPlaceholder: "Example: 2000",
    budgetHelper: "Leave blank if you are flexible.",
    additionalLabel: "Additional Requirement",
    additionalPlaceholder: "Tell us anything else we should know...",
    errorPrefix: "Error:",
    nextSteps: "What happens next?",
    next1: "✓ We review your learning requirement.",
    next2: "✓ We look for suitable teachers.",
    next3: "✓ We can help you choose the right match.",
    saving: "Saving Requirement...",
    submit: "Submit Learning Requirement",
    agreeNote:
      "By submitting, you agree that UstaadHub may contact you regarding your learning requirement.",
  },
  ur: {
    subjectRequired: "براہ کرم کم از کم ایک مضمون منتخب کریں۔",
    languageRequired: "براہ کرم کم از کم ایک پسندیدہ زبان منتخب کریں۔",
    nameRequired: "براہ کرم طالب علم / والدین کا نام درج کریں۔",
    phoneRequired: "براہ کرم موبائل نمبر درج کریں۔",
    levelRequired: "براہ کرم اپنی موجودہ تعلیمی سطح منتخب کریں۔",
    dbError: "ڈیٹا بیس کی خرابی: ",
    genericError: "کچھ غلط ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔",
    successTitle: "ضرورت جمع کر دی گئی!",
    successDesc:
      "شکریہ۔ ہمیں آپ کی تعلیمی ضرورت موصول ہو گئی ہے۔ ہماری ٹیم اس کا جائزہ لے کر آپ کے لیے موزوں استاد تلاش کرنے میں مدد کرے گی۔",
    goHome: "ہوم پیج پر جائیں",
    browseTeachers: "اساتذہ دیکھیں",
    backToHome: "→ واپس ہوم پیج",
    pageTitle:"اپنے لیے صحیح استاد تلاش کریں",
    pageDesc:"ہمیں بتائیں کہ آپ کیا سیکھنا چاہتے ہیں اور آپ کو کس قسم کا استاد پسند ہے۔",
    studentInfo: "طالب علم کی معلومات",
    nameLabel: "طالب علم / والدین کا نام *",
    namePlaceholder: "نام درج کریں",
    phoneLabel: "موبائل نمبر *",
    phonePlaceholder: "موبائل نمبر درج کریں",
    ageLabel: "طالب علم کی عمر",
    agePlaceholder: "عمر",
    genderLabel: "طالب علم کی جنس",
    cityLabel: "شہر",
    cityPlaceholder: "آپ کا شہر",
    whatLearn: "آپ کیا سیکھنا چاہتے ہیں؟",
    selectedCourseLabel: "منتخب کورس",
    levelLabel: "تعلیمی سطح",
    selectCurrentLevel: "موجودہ تعلیمی سطح منتخب کریں",
    teacherPref: "استاد کی ترجیح",
    teacherGenderLabel: "استاد کی جنس",
    classModeLabel: "کلاس کا طریقہ",
    langLabel: "پسندیدہ تدریسی زبان",
    scheduleLabel: "کلاس شیڈول",
    preferredDaysLabel: "پسندیدہ کلاس کے دن *",
    daysHelper: "ان دنوں کا انتخاب کریں جن میں آپ کلاسیں لینا پسند کریں گے۔",
    preferredTimeLabel: "پسندیدہ وقت",
    preferredDaysTextLabel: "پسندیدہ دن",
    preferredDaysPlaceholder: "مثال: پیر، بدھ، جمعہ",
    budgetLabel: "بجٹ",
    monthlyBudgetLabel: "ماہانہ بجٹ",
    budgetPlaceholder: "مثال: 2000",
    budgetHelper: "اگر آپ لچکدار ہیں تو خالی چھوڑ دیں۔",
    additionalLabel:"اضافی ضرورت",
    additionalPlaceholder:"اگر آپ کچھ اور بتانا چاہیں تو لکھیں...",
    errorPrefix:"خرابی:",
    nextSteps:"آگے کیا ہوتا ہے؟",
    next1:"✓ ہم آپ کی تعلیمی ضرورت کا جائزہ لیتے ہیں۔",
    next2:"✓ ہم موزوں اساتذہ تلاش کرتے ہیں۔",
    next3:"✓ ہم صحیح استاد منتخب کرنے میں آپ کی مدد کر سکتے ہیں۔",
    saving:"ضرورت محفوظ ہو رہی ہے...",
    submit:"تعلیمی ضرورت جمع کریں",
    agreeNote:
      "جمع کرنے سے، آپ اس بات سے متفق ہیں کہ UstaadHub آپ کی تعلیمی ضرورت کے سلسلے میں آپ سے رابطہ کر سکتا ہے۔",
  },
};

export default function RequirementPage() {const [isUrdu, setIsUrdu] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const course = params.get("course");
    const lang = params.get("lang");
    setIsUrdu(lang === "ur");

    if (course) {
      const decodedCourse = decodeURIComponent(course);

      setSelectedCourse(decodedCourse);
      setSelectedSubjects([decodedCourse]);
    }
  }, []);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const [teacherGender, setTeacherGender] = useState("Any");
  const [classMode, setClassMode] = useState("Online");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [studentGender, setStudentGender] = useState(
    "Prefer not to say"
  );

  const [level, setLevel] = useState("");
  const [classesPerWeek, setClassesPerWeek] = useState("1 class");
  const [preferredTime, setPreferredTime] = useState("Morning");
  const [preferredDays, setPreferredDays] = useState<string[]>([]);

const weekDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [city, setCity] = useState("");
  const [additionalRequirement, setAdditionalRequirement] =
    useState("");

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleSubject(subject: string) {
    setSelectedSubjects((current) =>
      current.includes(subject)
        ? current.filter((item) => item !== subject)
        : [...current, subject]
    );
  }

  function toggleLanguage(language: string) {
    setSelectedLanguages((current) =>
      current.includes(language)
        ? current.filter((item) => item !== language)
        : [...current, language]
    );
  }
  function togglePreferredDay(day: string) {
  setPreferredDays((current) =>
    current.includes(day)
      ? current.filter((item) => item !== day)
      : [...current, day]
  );
}

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (selectedSubjects.length === 0) {
      setError(isUrdu ? copy.ur.subjectRequired : copy.en.subjectRequired);
      return;
    }

    if (selectedLanguages.length === 0) {
      setError(isUrdu ? copy.ur.languageRequired : copy.en.languageRequired);
      return;
    }

    if (!name.trim()) {
      setError(isUrdu ? copy.ur.nameRequired : copy.en.nameRequired);
      return;
    }

    if (!phone.trim()) {
      setError(isUrdu ? copy.ur.phoneRequired : copy.en.phoneRequired);
      return;
    }

    if (!level) {
      setError(isUrdu ? copy.ur.levelRequired : copy.en.levelRequired);
      return;
    }

    setLoading(true);

    try {
      // ---------------------------------------
      // 1. GET CURRENT LOGGED-IN USER
      // ---------------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      console.log("CURRENT USER:", user);
      console.log("USER ERROR:", userError);


      // ---------------------------------------
      // 2. PREPARE DATABASE DATA
      // ---------------------------------------

      const requirementData = {
        user_id: user?.id ?? null,

        parent_student_name: name.trim(),
        mobile_number: phone.trim(),

        student_age: age ? Number(age) : null,
        student_gender: studentGender,

        subjects: selectedSubjects,
        current_level: level,

        class_mode: classMode,
        teacher_gender: teacherGender,
        preferred_languages: selectedLanguages,

        classes_per_week: classesPerWeek,
        preferred_time: preferredTime,
        preferred_days: preferredDays.join(", "),
        

        monthly_budget: monthlyBudget
          ? Number(monthlyBudget)
          : null,

        city_location: city.trim(),

        additional_requirement:
          additionalRequirement.trim(),
      };

      console.log(
        "REQUIREMENT DATA:",
        requirementData
      );

      // ---------------------------------------
      // 3. INSERT INTO SUPABASE
      // ---------------------------------------

      const { error: insertError } = await supabase
  .from("learning_requirements")
  .insert(requirementData);

console.log(
  "INSERT ERROR:",
  insertError
);

      // ---------------------------------------
      // 4. CHECK INSERT ERROR
      // ---------------------------------------

      if (insertError) {
        setError(
          isUrdu
            ? copy.ur.dbError + insertError.message
            : copy.en.dbError + insertError.message
        );
        return;
      }

      // ---------------------------------------
      // 5. MAKE SURE ROW WAS CREATED
      // ---------------------------------------
      
      // ---------------------------------------
      // 6. SUCCESS
      // ---------------------------------------

    console.log("SUCCESS - DATABASE ROW CREATED");

setSubmitted(true);
    } catch (err) {
      console.error("REQUIREMENT SUBMIT ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : isUrdu
            ? copy.ur.genericError
            : copy.en.genericError
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // SUCCESS SCREEN
  // ==========================================

  if (submitted) {
    return (
      <main
        dir={isUrdu ? "rtl" : undefined}
        lang={isUrdu ? "ur" : undefined}
        className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900"
      >
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-300 bg-white p-10 text-center shadow-sm">

          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-5xl text-green-600">
            ✓
          </div>

          <h1 className="mt-8 text-4xl font-bold">
            {isUrdu ? copy.ur.successTitle : copy.en.successTitle}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Thank you. We have received your learning
            requirement. Our team can review it and help
            you find a suitable teacher.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">

            <a
              href={isUrdu ? "/ur" : "/"}
              className="rounded-xl border border-slate-400 px-8 py-4 font-semibold text-slate-800 hover:bg-slate-50"
            >
              {isUrdu ? copy.ur.goHome : copy.en.goHome}
            </a>

            <a
              href="/teachers"
              className="rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white hover:bg-blue-700"
            >
              {isUrdu ? copy.ur.browseTeachers : copy.en.browseTeachers}
            </a>

          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // REQUIREMENT FORM
  // ==========================================

  return (
    <main
      dir={isUrdu ? "rtl" : undefined}
      lang={isUrdu ? "ur" : undefined}
      className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"
    >
      <div className="mx-auto max-w-4xl">

        <div className="mb-8">
          <a
            href={isUrdu ? "/ur" : "/"}
            className="font-semibold text-blue-600"
          >
            {isUrdu ? copy.ur.backToHome : copy.en.backToHome}
          </a>

          <h1 className="mt-6 text-4xl font-bold">
            {isUrdu ? copy.ur.pageTitle : copy.en.pageTitle}
          </h1>

          <p className="mt-2 text-slate-600">
            {isUrdu ? copy.ur.pageDesc : copy.en.pageDesc}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-8"
        >

          {/* BASIC INFORMATION */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
            {isUrdu ? copy.ur.studentInfo : copy.en.studentInfo}
          </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block font-semibold">
                  {isUrdu ? copy.ur.nameLabel : copy.en.nameLabel}
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder={isUrdu ? copy.ur.namePlaceholder : copy.en.namePlaceholder}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  {isUrdu ? copy.ur.phoneLabel : copy.en.phoneLabel}
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  placeholder={isUrdu ? copy.ur.phonePlaceholder : copy.en.phonePlaceholder}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  {isUrdu ? copy.ur.ageLabel : copy.en.ageLabel}
                </label>

                <input
                  type="number"
                  value={age}
                  onChange={(e) =>
                    setAge(e.target.value)
                  }
                  placeholder={isUrdu ? copy.ur.agePlaceholder : copy.en.agePlaceholder}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  {isUrdu ? copy.ur.genderLabel : copy.en.genderLabel}
                </label>

                <select
                  value={studentGender}
                  onChange={(e) =>
                    setStudentGender(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option>
                        {isUrdu ? optionUrduLabels["Prefer not to say"] : "Prefer not to say"}
                      </option>
                  <option>{isUrdu ? optionUrduLabels["Male"] : "Male"}</option>
                  <option>{isUrdu ? optionUrduLabels["Female"] : "Female"}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  {isUrdu ? copy.ur.cityLabel : copy.en.cityLabel}
                </label>

                <input
                  type="text"
                  value={city}
                  onChange={(e) =>
                    setCity(e.target.value)
                  }
                  placeholder={isUrdu ? copy.ur.cityPlaceholder : copy.en.cityPlaceholder}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

            </div>
          </section>

          {/* SUBJECTS */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              What do you want to learn?{selectedCourse && (
  <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
    <p className="text-sm font-semibold text-blue-600">
            {isUrdu ? copy.ur.selectedCourseLabel : copy.en.selectedCourseLabel}
          </p>

          <p className="mt-1 text-lg font-bold text-blue-900">
            ✓{" "}
            {isUrdu
              ? (courseUrduLabels[selectedCourse] ?? selectedCourse)
              : selectedCourse}
          </p>
  </div>
)}
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">

              {subjects.map((subject) => (
                <button
                  type="button"
                  key={subject}
                  onClick={() =>
                    toggleSubject(subject)
                  }
                  className={`rounded-xl border px-4 py-3 text-left font-medium ${
                    selectedSubjects.includes(subject)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {selectedSubjects.includes(subject)
                    ? "✓ "
                    : ""}
                  {isUrdu
                    ? (requirementSubjectUrduLabels[subject] ?? subject)
                    : subject}
                </button>
              ))}

            </div>
          </section>

          {/* LEVEL */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              {isUrdu ? copy.ur.levelLabel : copy.en.levelLabel}
            </h2>

            <select
              value={level}
              onChange={(e) =>
                setLevel(e.target.value)
              }
              className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">
                {isUrdu ? copy.ur.selectCurrentLevel : copy.en.selectCurrentLevel}
              </option>
              <option>{isUrdu ? optionUrduLabels["Beginner"] : "Beginner"}</option>
              <option>{isUrdu ? optionUrduLabels["Basic"] : "Basic"}</option>
              <option>{isUrdu ? optionUrduLabels["Intermediate"] : "Intermediate"}</option>
              <option>{isUrdu ? optionUrduLabels["Advanced"] : "Advanced"}</option>
              <option>{isUrdu ? optionUrduLabels["Not sure"] : "Not sure"}</option>
            </select>
          </section>

          {/* TEACHER PREFERENCE */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              {isUrdu ? copy.ur.teacherPref : copy.en.teacherPref}
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block font-semibold">
                  {isUrdu ? copy.ur.teacherGenderLabel : copy.en.teacherGenderLabel}
                </label>

                <select
                  value={teacherGender}
                  onChange={(e) =>
                    setTeacherGender(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option>{isUrdu ? optionUrduLabels["Any"] : "Any"}</option>
                  <option>{isUrdu ? optionUrduLabels["Male"] : "Male"}</option>
                  <option>{isUrdu ? optionUrduLabels["Female"] : "Female"}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  {isUrdu ? copy.ur.classModeLabel : copy.en.classModeLabel}
                </label>

                <select
                  value={classMode}
                  onChange={(e) =>
                    setClassMode(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option>{isUrdu ? optionUrduLabels["Online"] : "Online"}</option>
                  <option>{isUrdu ? optionUrduLabels["Offline"] : "Offline"}</option>
                  <option>{isUrdu ? optionUrduLabels["Both"] : "Both"}</option>
                </select>
              </div>

            </div>
          </section>

          {/* LANGUAGES */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              {isUrdu ? copy.ur.langLabel : copy.en.langLabel}
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">

              {languages.map((language) => (
                <button
                  type="button"
                  key={language}
                  onClick={() =>
                    toggleLanguage(language)
                  }
                  className={`rounded-xl border px-4 py-3 font-medium ${
                    selectedLanguages.includes(language)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {selectedLanguages.includes(language)
                    ? "✓ "
                    : ""}
                  {isUrdu ? (languageUrduLabels[language] ?? language) : language}
                </button>
              ))}

            </div>
          </section>

          {/* SCHEDULE */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              {isUrdu ? copy.ur.scheduleLabel : copy.en.scheduleLabel}
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              <div className="md:col-span-2">
  <label className="mb-3 block font-semibold">
    {isUrdu ? copy.ur.preferredDaysLabel : copy.en.preferredDaysLabel}
  </label>

  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
    {weekDays.map((day) => {
      const selected = preferredDays.includes(day);

      return (
        <button
          key={day}
          type="button"
          onClick={() => togglePreferredDay(day)}
          className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
            selected
              ? "border-blue-600 bg-blue-600 text-white shadow-md"
              : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            {selected && <span>✓</span>}
            {isUrdu ? (weekdayUrduLabels[day] ?? day) : day}
          </span>
        </button>
      );
    })}
  </div>

  <p className="mt-3 text-sm text-slate-500">
    {isUrdu ? copy.ur.daysHelper : copy.en.daysHelper}
  </p>
</div>

              <div>
                <label className="mb-2 block font-semibold">
                  {isUrdu ? copy.ur.preferredTimeLabel : copy.en.preferredTimeLabel}
                </label>

                <select
                  value={preferredTime}
                  onChange={(e) =>
                    setPreferredTime(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option>{isUrdu ? optionUrduLabels["Morning"] : "Morning"}</option>
                  <option>{isUrdu ? optionUrduLabels["Afternoon"] : "Afternoon"}</option>
                  <option>{isUrdu ? optionUrduLabels["Evening"] : "Evening"}</option>
                  <option>{isUrdu ? optionUrduLabels["Night"] : "Night"}</option>
                  <option>{isUrdu ? optionUrduLabels["Flexible"] : "Flexible"}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block font-semibold">
                  {isUrdu ? copy.ur.preferredDaysTextLabel : copy.en.preferredDaysTextLabel}
                </label>

                <input
                  type="text"
                  value={preferredDays}
                  onChange={(e) =>
setPreferredDays(
  e.target.value
    .split(",")
    .map((day) => day.trim())
    .filter(Boolean)
)                  }
                  placeholder={isUrdu ? copy.ur.preferredDaysPlaceholder : copy.en.preferredDaysPlaceholder}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

            </div>
          </section>

          {/* BUDGET */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              {isUrdu ? copy.ur.budgetLabel : copy.en.budgetLabel}
            </h2>

            <div className="mt-5">

              <label className="mb-2 block font-semibold">
                {isUrdu ? copy.ur.monthlyBudgetLabel : copy.en.monthlyBudgetLabel}
              </label>

              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) =>
                  setMonthlyBudget(e.target.value)
                }
                placeholder={isUrdu ? copy.ur.budgetPlaceholder : copy.en.budgetPlaceholder}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />

              <p className="mt-2 text-sm text-slate-500">
                {isUrdu ? copy.ur.budgetHelper : copy.en.budgetHelper}
              </p>

            </div>
          </section>

          {/* ADDITIONAL REQUIREMENT */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold">
              {isUrdu ? copy.ur.additionalLabel : copy.en.additionalLabel}
            </h2>

            <textarea
              value={additionalRequirement}
              onChange={(e) =>
                setAdditionalRequirement(
                  e.target.value
                )
              }
              rows={5}
              placeholder={isUrdu ? copy.ur.additionalPlaceholder : copy.en.additionalPlaceholder}
              className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </section>

          {/* ERROR */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <strong>{isUrdu ? copy.ur.errorPrefix : copy.en.errorPrefix}</strong> {error}
            </div>
          )}

          {/* SUBMIT */}

          <section className="rounded-2xl bg-blue-50 p-6">

            <h2 className="text-2xl font-bold text-blue-900">
              {isUrdu ? copy.ur.nextSteps : copy.en.nextSteps}
            </h2>

            <div className="mt-4 space-y-3 text-blue-800">
              <p>{isUrdu ? copy.ur.next1 : copy.en.next1}</p>
              <p>{isUrdu ? copy.ur.next2 : copy.en.next2}</p>
              <p>{isUrdu ? copy.ur.next3 : copy.en.next3}</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? (isUrdu ? copy.ur.saving : copy.en.saving)
                : (isUrdu ? copy.ur.submit : copy.en.submit)}
            </button>

            <p className="mt-4 text-center text-sm text-slate-600">
              {isUrdu ? copy.ur.agreeNote : copy.en.agreeNote}
            </p>

          </section>

        </form>
      </div>
    </main>
  );
}
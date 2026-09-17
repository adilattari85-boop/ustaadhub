// Shared teacher form data + validation.
//
// Extracted from app/register/page.tsx so the teacher registration form and the
// orphan-account completion flow (app/teacher/complete-profile) use exactly the
// same option lists and validation rules.

export const TEACHER_SUBJECTS = [
  "Quran & Tajweed",
  "Hifz-ul-Quran",
  "Islamic Studies",
  "Arabic",
  "English",
  "Hindi",
  "Urdu",
  "Maths",
  "Science",
  "Computer",
];

export const TEACHER_LANGUAGES = ["Hindi", "Urdu", "English", "Arabic"];

// Values must match the <select> options rendered in the form.
export const GENDER_OPTIONS = ["Male", "Female"];

// Stored without dashes so the comparison is independent of the en dash
// characters used in the <option> labels (see normalizeOption).
export const EXPERIENCE_OPTIONS = [
  "Less than 1 year",
  "1-3 years",
  "3-5 years",
  "5-10 years",
  "10+ years",
];

// <select> labels for the experience field. They intentionally keep the en dash
// used by app/register/page.tsx so both forms store the same value.
export const EXPERIENCE_LABELS = [
  "Less than 1 year",
  "1\u20133 years",
  "3\u20135 years",
  "5\u201310 years",
  "10+ years",
];

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const PHONE_ALLOWED_PATTERN = /^\+?[0-9\s()-]+$/;

// Everything the completion flow can collect. The email is intentionally
// optional: teacher registration asks for it, while the completion flow reads it
// from the authenticated session and must never ask for it again.
export type TeacherProfileFormValues = {
  name: string;
  email?: string;
  phone: string;
  gender: string;
  qualification: string;
  experience: string;
  subjects: string[];
  languages: string[];
  feeWeekly: string;
  feeMonthly: string;
  bio: string;
};

export type TeacherFormValues = TeacherProfileFormValues & {
  password: string;
  confirmPassword: string;
};

// Normalizes option strings so typographic dashes and repeated whitespace
// do not cause a valid selection to fail validation.
export function normalizeOption(value: string): string {
  return value
    .trim()
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ");
}

// Whitespace-only input is treated as "not provided". A provided fee must be
// numeric and greater than or equal to zero.
export function parseFeeInput(value: string): { valid: boolean; fee: number | null } {
  const trimmed = value.trim();

  if (!trimmed) {
    return { valid: true, fee: null };
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return { valid: false, fee: null };
  }

  return { valid: true, fee: parsed };
}

// Shared profile validation (no password fields, email only when collected).
// Returns a user-friendly error message, or an empty string when valid.
export function validateTeacherProfileFields(
  values: TeacherProfileFormValues
): string {
  const name = values.name.trim();
  const email = (values.email ?? "").trim();
  const phone = values.phone.trim();
  const qualification = values.qualification.trim();
  const bio = values.bio.trim();

  if (!name) {
    return "Please enter your full name.";
  }

  if (name.length < 2) {
    return "Please enter your full name (at least 2 characters).";
  }

  // Teacher registration collects the email, so it is validated there. The
  // completion flow passes no email and uses the authenticated session instead.
  if (values.email !== undefined) {
    if (!email) {
      return "Please enter your email address.";
    }

    if (!EMAIL_PATTERN.test(email)) {
      return "Please enter a valid email address.";
    }
  }

  if (!phone) {
    return "Please enter your phone number.";
  }

  if (!PHONE_ALLOWED_PATTERN.test(phone)) {
    return "Please enter a valid phone number (digits only, with optional + and spaces).";
  }

  const phoneDigits = phone.replace(/[^0-9]/g, "");

  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    return "Please enter a valid phone number with 7 to 15 digits.";
  }

  if (!values.gender.trim()) {
    return "Please select your gender.";
  }

  if (!GENDER_OPTIONS.includes(values.gender)) {
    return "Please select a valid gender option.";
  }

  if (!qualification) {
    return "Please enter your qualification.";
  }

  if (qualification.length < 2) {
    return "Please enter your qualification (at least 2 characters).";
  }

  if (!values.experience.trim()) {
    return "Please select your teaching experience.";
  }

  if (!EXPERIENCE_OPTIONS.includes(normalizeOption(values.experience))) {
    return "Please select a valid teaching experience option.";
  }

  if (values.subjects.length === 0) {
    return "Please select at least one subject.";
  }

  if (values.languages.length === 0) {
    return "Please select at least one language.";
  }

  const weeklyFee = parseFeeInput(values.feeWeekly);

  if (!weeklyFee.valid) {
    return "Weekly fee must be a valid number of 0 or more.";
  }

  const monthlyFee = parseFeeInput(values.feeMonthly);

  if (!monthlyFee.valid) {
    return "Monthly fee must be a valid number of 0 or more.";
  }

  if (weeklyFee.fee === null && monthlyFee.fee === null) {
    return "Please enter either weekly fee or monthly fee.";
  }

  if (!bio) {
    return "Please write a short introduction about yourself.";
  }

  if (bio.length < 2) {
    return "Please write a short introduction about yourself (at least 2 characters).";
  }

  return "";
}

// Full teacher registration validation: shared profile rules plus the account
// password rules. Order is unchanged from the original registration form.
export function validateTeacherForm(values: TeacherFormValues): string {
  const profileError = validateTeacherProfileFields(values);

  if (profileError) {
    return profileError;
  }

  if (!values.password) {
    return "Please enter a password.";
  }

  if (values.password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!values.confirmPassword) {
    return "Please confirm your password.";
  }

  if (values.password !== values.confirmPassword) {
    return "Passwords do not match.";
  }

  return "";
}
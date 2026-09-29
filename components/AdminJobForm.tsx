"use client";

import { JOB_TYPE_OPTIONS, type JobStatus } from "@/lib/jobs";

export type AdminJobFormState = {
  title: string;
  organization: string;
  location: string;
  job_type: string;
  short_description: string;
  description: string;
  requirements: string;
  salary: string;
  contact_phone: string;
  contact_email: string;
  apply_url: string;
  status: JobStatus;
  is_pinned: boolean;
  display_order: string;
  expires_at: string;
};

export const EMPTY_JOB_FORM: AdminJobFormState = {
  title: "",
  organization: "",
  location: "",
  job_type: JOB_TYPE_OPTIONS[0],
  short_description: "",
  description: "",
  requirements: "",
  salary: "",
  contact_phone: "",
  contact_email: "",
  apply_url: "",
  status: "draft",
  is_pinned: false,
  display_order: "0",
  expires_at: "",
};

export const FORM_INPUT_CLS =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const LABEL_CLS =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export const BTN_PRIMARY =
  "rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60";
export const BTN_GHOST =
  "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60";

type JobFormProps = {
  form: AdminJobFormState;
  onChange: (next: AdminJobFormState) => void;
  onSubmit: (nextStatus: JobStatus) => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
  isEdit: boolean;
  /** Live preview of the public URL (generated once, never changes on edit). */
  slugPreview: string;
};

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className={LABEL_CLS}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/** Admin Add/Edit job form. Contact details are kept separate from the copy. */
export default function JobForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  saving,
  error,
  isEdit,
  slugPreview,
}: JobFormProps) {
  function set<K extends keyof AdminJobFormState>(
    key: K,
    value: AdminJobFormState[K],
  ) {
    onChange({ ...form, [key]: value });
  }

  const isKnownType = JOB_TYPE_OPTIONS.includes(
    form.job_type as (typeof JOB_TYPE_OPTIONS)[number],
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form.status);
      }}
      className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">
          {isEdit ? "Edit job" : "Add job"}
        </h3>
        <p className="text-xs text-slate-500">
          Public URL:{" "}
          <span className="font-mono text-slate-700">/jobs/{slugPreview}</span>
        </p>
      </div>
      {isEdit && (
        <p className="mt-1 text-xs text-slate-500">
          The URL stays the same when you edit, so previously shared links keep
          working.
        </p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Job title" required>
          <input
            type="text"
            required
            value={form.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder="Imam, Mudarris, Quran Teacher, Hifz Teacher"
            className={FORM_INPUT_CLS}
          />
        </Field>

        <Field
          label="Zimmedar / Organization"
          required
          hint="Masjid, madrasa, Islamic institute or organisation name"
        >
          <input
            type="text"
            required
            value={form.organization}
            onChange={(event) => set("organization", event.target.value)}
            placeholder="Masjid Al-Noor, Darul Uloom Institute"
            className={FORM_INPUT_CLS}
          />
        </Field>

        <Field
          label="Location"
          required
          hint="City / area, or Online / Remote for online teaching"
        >
          <input
            type="text"
            required
            value={form.location}
            onChange={(event) => set("location", event.target.value)}
            placeholder="Bareilly, Uttar Pradesh or Online"
            className={FORM_INPUT_CLS}
          />
        </Field>

        <Field label="Job type" required>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={isKnownType ? form.job_type : "Other"}
              onChange={(event) => set("job_type", event.target.value)}
              className={FORM_INPUT_CLS}
            >
              {JOB_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={form.job_type}
              onChange={(event) => set("job_type", event.target.value)}
              placeholder="Custom type"
              aria-label="Custom job type"
              className={FORM_INPUT_CLS}
            />
          </div>
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Short description" required>
          <textarea
            required
            rows={2}
            value={form.short_description}
            onChange={(event) => set("short_description", event.target.value)}
            placeholder="One or two lines shown on the job card and in WhatsApp shares"
            className={FORM_INPUT_CLS}
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Full description">
          <textarea
            rows={5}
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder="Full details of the role, timings, subjects to teach, etc."
            className={FORM_INPUT_CLS}
          />
        </Field>

        <Field label="Eligibility / requirements">
          <textarea
            rows={5}
            value={form.requirements}
            onChange={(event) => set("requirements", event.target.value)}
            placeholder="Qualification required, age limit, experience, languages"
            className={FORM_INPUT_CLS}
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field
          label="Salary / compensation"
          hint="Optional — leave blank if not applicable"
        >
          <input
            type="text"
            value={form.salary}
            onChange={(event) => set("salary", event.target.value)}
            placeholder="₹12,000 per month, or Negotiable"
            className={FORM_INPUT_CLS}
          />
        </Field>

        <Field label="Deadline" hint="Optional — shown on the public job page">
          <input
            type="datetime-local"
            value={form.expires_at}
            onChange={(event) => set("expires_at", event.target.value)}
            className={FORM_INPUT_CLS}
          />
        </Field>
      </div>

      {/* CONTACT — deliberately separated from the description fields above. */}
      <fieldset className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          Contact (kept separate from description)
        </legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Phone / WhatsApp" required>
            <input
              type="tel"
              required
              value={form.contact_phone}
              onChange={(event) => set("contact_phone", event.target.value)}
              placeholder="+91 98765 43210"
              className={FORM_INPUT_CLS}
            />
          </Field>

          <Field label="Email" hint="Optional">
            <input
              type="email"
              value={form.contact_email}
              onChange={(event) => set("contact_email", event.target.value)}
              placeholder="contact@example.com"
              className={FORM_INPUT_CLS}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Apply link" hint="Optional — full URL or a site path">
              <input
                type="text"
                value={form.apply_url}
                onChange={(event) => set("apply_url", event.target.value)}
                placeholder="https://forms.example.com/apply or /register"
                className={FORM_INPUT_CLS}
              />
            </Field>
          </div>
        </div>
      </fieldset>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Field label="Status" required>
          <select
            value={form.status}
            onChange={(event) => set("status", event.target.value as JobStatus)}
            className={FORM_INPUT_CLS}
          >
            <option value="draft">Draft — not visible publicly</option>
            <option value="published">Published — live on /jobs</option>
            <option value="closed">Closed — removed from listings</option>
          </select>
        </Field>

        <Field label="Pinned">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(event) => set("is_pinned", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-700"
            />
            {form.is_pinned ? "Pinned to top" : "Not pinned"}
          </label>
        </Field>

        <Field label="Display order" hint="Lower numbers appear first">
          <input
            type="number"
            value={form.display_order}
            onChange={(event) => set("display_order", event.target.value)}
            className={FORM_INPUT_CLS}
          />
        </Field>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className={BTN_PRIMARY}>
          {saving
            ? "Saving..."
            : form.status === "published"
              ? "Save & publish"
              : form.status === "closed"
                ? "Save & close"
                : "Save draft"}
        </button>
        {form.status !== "published" && (
          <button
            type="button"
            disabled={saving}
            onClick={() => onSubmit("published")}
            className={BTN_PRIMARY}
          >
            Publish now
          </button>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className={BTN_GHOST}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

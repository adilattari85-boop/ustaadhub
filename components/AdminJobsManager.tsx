"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import JobForm, {
  BTN_GHOST,
  BTN_PRIMARY,
  EMPTY_JOB_FORM,
  type AdminJobFormState,
} from "@/components/AdminJobForm";
import { supabase } from "@/lib/supabase";
import {
  buildJobSlug,
  fetchAdminJobs,
  formatJobDateTime,
  getJobPath,
  isValidApplyUrl,
  JOB_STATUS_LABELS,
  type AdminJob,
  type Job,
  type JobStatus,
} from "@/lib/jobs";

const BTN_DANGER =
  "rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60";
const BTN_SMALL =
  "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60";

const STATUS_BADGE: Record<JobStatus, string> = {
  draft: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-200 text-slate-600",
};

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** datetime-local value -> ISO string (empty -> null). */
function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Builds the edit form from a full admin row.
 *
 * Takes an AdminJob (not a public Job) because this is the one place that is
 * allowed to see contact_phone / contact_email: the admin list is fetched
 * through the admin-gated read and the values only ever go back into this
 * form, never into public page data.
 */
function formFromJob(job: AdminJob): AdminJobFormState {
  return {
    title: job.title || "",
    organization: job.organization || "",
    location: job.location || "",
    job_type: job.job_type || "Other",
    short_description: job.short_description || "",
    description: job.description || "",
    requirements: job.requirements || "",
    salary: job.salary || "",
    contact_phone: job.contact_phone || "",
    contact_email: job.contact_email || "",
    apply_url: job.apply_url || "",
    status: job.status || "draft",
    is_pinned: Boolean(job.is_pinned),
    display_order: String(job.display_order ?? 0),
    expires_at: toDateTimeLocal(job.expires_at),
  };
}

function text(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Row payload shared by create + update. */
function toPayload(form: AdminJobFormState, status: JobStatus) {
  const order = Number.parseInt(form.display_order, 10);
  return {
    title: form.title.trim(),
    organization: text(form.organization),
    location: text(form.location),
    job_type: text(form.job_type),
    short_description: form.short_description.trim(),
    description: text(form.description),
    requirements: text(form.requirements),
    salary: text(form.salary),
    contact_phone: text(form.contact_phone),
    contact_email: text(form.contact_email),
    apply_url: text(form.apply_url),
    status,
    is_pinned: form.is_pinned,
    display_order: Number.isFinite(order) ? order : 0,
    expires_at: toIso(form.expires_at),
  };
}

export default function AdminJobsManager() {
  // AdminJob (not the public Job type) so the contact columns are available
  // here and only here.
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [rowError, setRowError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminJobFormState>(EMPTY_JOB_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // The first setState happens after the await, so the effect below never
  // sets state synchronously.
  const load = useCallback(async () => {
    try {
      const rows = await fetchAdminJobs(supabase);
      setJobs(rows);
      setLoadError("");
    } catch (error) {
      setJobs([]);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unexpected error while loading jobs.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch. setState only happens inside promise callbacks so the
    // effect itself never updates state synchronously.
    let active = true;

    fetchAdminJobs(supabase)
      .then((rows) => {
        if (!active) return;
        setJobs(rows);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setJobs([]);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unexpected error while loading jobs.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  /** Retry from the error state: show the skeleton again while re-querying. */
  function reload() {
    setLoading(true);
    setLoadError("");
    void load();
  }

  const counts = useMemo(
    () => ({
      total: jobs.length,
      published: jobs.filter((job) => job.status === "published").length,
      draft: jobs.filter((job) => job.status === "draft").length,
      closed: jobs.filter((job) => job.status === "closed").length,
    }),
    [jobs],
  );

  const slugPreview = useMemo(() => {
    if (editingId) {
      const job = jobs.find((item) => item.id === editingId);
      if (job?.slug) return job.slug;
    }
    return buildJobSlug(form.title) || "job";
  }, [editingId, form.title, jobs]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_JOB_FORM, display_order: String(counts.total) });
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(job: AdminJob) {
    setEditingId(job.id);
    setForm(formFromJob(job));
    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setFormError("");
  }

  function validate(): string {
    if (!form.title.trim()) return "Job title is required.";
    if (!form.organization.trim()) return "Zimmedar / Organization is required.";
    if (!form.location.trim()) return "Location is required.";
    if (!form.job_type.trim()) return "Job type is required.";
    if (!form.short_description.trim()) return "Short description is required.";
    if (!form.contact_phone.trim()) return "Contact phone / WhatsApp is required.";
    if (!isValidApplyUrl(form.apply_url)) {
      return "Apply link must be a full URL (https://...) or a site path (/...).";
    }
    return "";
  }

  async function handleSubmit(status: JobStatus) {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError("");
    setRowError("");
    setNotice("");

    try {
      const payload = toPayload(form, status);

      if (editingId) {
        // NOTE: `slug` is intentionally never part of the update payload, so
        // editing a published job keeps its public URL.
        const { error } = await supabase
          .from("jobs")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        setNotice(
          status === "published"
            ? "Job updated and live on /jobs."
            : "Job updated.",
        );
      } else {
        const { error } = await supabase.from("jobs").insert(payload);
        if (error) throw error;
        setNotice(
          status === "published"
            ? "Job published — it is now live on /jobs."
            : "Draft saved. Publish it when you are ready.",
        );
      }

      closeForm();
      await load();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not save the job.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(job: Job, status: JobStatus) {
    setBusyId(job.id);
    setRowError("");
    setNotice("");
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ status })
        .eq("id", job.id);
      if (error) throw error;
      setNotice(
        status === "published"
          ? `"${job.title}" is now published and visible on /jobs.`
          : status === "closed"
            ? `"${job.title}" was closed. It is no longer an active listing, but its shared URL still works.`
            : `"${job.title}" was moved back to draft.`,
      );
      await load();
    } catch (error) {
      setRowError(
        error instanceof Error ? error.message : "Could not update the job.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function togglePin(job: Job) {
    setBusyId(job.id);
    setRowError("");
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ is_pinned: !job.is_pinned })
        .eq("id", job.id);
      if (error) throw error;
      await load();
    } catch (error) {
      setRowError(
        error instanceof Error ? error.message : "Could not update pinning.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function moveJob(job: Job, direction: -1 | 1) {
    setBusyId(job.id);
    setRowError("");
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ display_order: (job.display_order ?? 0) + direction })
        .eq("id", job.id);
      if (error) throw error;
      await load();
    } catch (error) {
      setRowError(
        error instanceof Error ? error.message : "Could not change the order.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function removeJob(job: Job) {
    const confirmed = window.confirm(
      `Delete "${job.title}"? This permanently removes the job and its public link.`,
    );
    if (!confirmed) return;

    setBusyId(job.id);
    setRowError("");
    try {
      const { error } = await supabase.from("jobs").delete().eq("id", job.id);
      if (error) throw error;
      setNotice(`"${job.title}" was deleted.`);
      await load();
    } catch (error) {
      setRowError(
        error instanceof Error ? error.message : "Could not delete the job.",
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Jobs &amp; Opportunities
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {loading
              ? "Loading jobs..."
              : `${counts.total} ${counts.total === 1 ? "job" : "jobs"} managed — ${counts.published} published, ${counts.draft} draft, ${counts.closed} closed`}
          </p>
        </div>
        <button type="button" onClick={openCreate} className={BTN_PRIMARY}>
          + Add Job
        </button>
      </div>

      {notice && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {notice}
        </p>
      )}
      {rowError && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {rowError}
        </p>
      )}

      {formOpen && (
        <div className="mt-5">
          <JobForm
            form={form}
            onChange={setForm}
            onSubmit={(status) => void handleSubmit(status)}
            onCancel={closeForm}
            saving={saving}
            error={formError}
            isEdit={Boolean(editingId)}
            slugPreview={slugPreview}
          />
        </div>
      )}

      {loading && (
        <div className="mt-6 space-y-3" aria-busy="true" aria-live="polite">
          <p className="text-sm text-slate-500">Loading jobs...</p>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      )}

      {!loading && loadError && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6">
          <h3 className="text-base font-bold text-red-800">
            Could not load jobs
          </h3>
          <p className="mt-2 text-sm text-red-700">{loadError}</p>
          <p className="mt-2 text-sm text-red-700">
            Common causes: the <code className="font-mono">jobs</code> table or
            its RLS policies are missing, or this account is not an admin.
          </p>
          <button type="button" onClick={reload} className={BTN_GHOST}>
            Try again
          </button>
        </div>
      )}

      {!loading && !loadError && jobs.length === 0 && !formOpen && (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h3 className="text-lg font-bold text-slate-800">No jobs yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Add your first job using “+ Add Job”. Drafts stay private until you
            publish them.
          </p>
          <button type="button" onClick={openCreate} className={BTN_PRIMARY}>
            + Add Job
          </button>
        </div>
      )}

      {!loading && !loadError && jobs.length > 0 && (
        <ul className="mt-6 space-y-4">
          {jobs.map((job) => {
            const busy = busyId === job.id;
            return (
              <li
                key={job.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                          STATUS_BADGE[job.status]
                        }`}
                      >
                        {JOB_STATUS_LABELS[job.status]}
                      </span>
                      {job.is_pinned && (
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                          Pinned
                        </span>
                      )}
                      {job.job_type && (
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-indigo-700">
                          {job.job_type}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-bold text-slate-900">{job.title}</h3>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {[job.organization, job.location, job.salary]
                        .filter(Boolean)
                        .join(" • ") || "—"}
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-400">
                      /jobs/{job.slug || job.id} • Updated{" "}
                      {formatJobDateTime(job.updated_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {job.status !== "published" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setStatus(job, "published")}
                        className={BTN_PRIMARY}
                      >
                        Publish
                      </button>
                    )}
                    {job.status === "published" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setStatus(job, "closed")}
                        className={BTN_GHOST}
                      >
                        Close
                      </button>
                    )}
                    {job.status === "closed" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setStatus(job, "draft")}
                        className={BTN_GHOST}
                      >
                        Move to draft
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void togglePin(job)}
                      className={BTN_SMALL}
                    >
                      {job.is_pinned ? "Unpin" : "Pin"}
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void moveJob(job, -1)}
                      className={BTN_SMALL}
                      aria-label={`Move ${job.title} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void moveJob(job, 1)}
                      className={BTN_SMALL}
                      aria-label={`Move ${job.title} down`}
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openEdit(job)}
                      className={BTN_SMALL}
                    >
                      Edit
                    </button>

                    <Link href={getJobPath(job)} target="_blank" className={BTN_SMALL}>
                      View
                    </Link>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeJob(job)}
                      className={BTN_DANGER}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

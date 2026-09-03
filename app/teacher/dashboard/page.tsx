"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TeacherProfile = {
  id: string;
  full_name: string | null;
  is_verified: boolean;
  profile_photo_url: string | null;
};

export default function TeacherDashboard() {
  const router = useRouter();

  const [teacherName, setTeacherName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoStatus, setPhotoStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadTeacher() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user || user.user_metadata?.role !== "teacher") {
        router.replace("/login?role=teacher");
        return;
      }

      setTeacherName(user.user_metadata?.name || "");
      setEmail(user.email || "");

      try {
        const { data, error } = await supabase
          .from("teacher_profiles")
          .select("id, full_name, is_verified, profile_photo_url")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        setProfile((data as TeacherProfile | null) ?? null);
      } catch (error) {
        console.error("Error loading teacher profile:", error);
        setProfileError(
          "Unable to load your public profile status right now.",
        );
      } finally {
        setProfileLoading(false);
        setLoading(false);
      }
    }

    void loadTeacher();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login?role=teacher");
  }

  async function copyProfileLink() {
    if (!profile) {
      return;
    }

    const profileUrl = `${window.location.origin}/teachers/${profile.id}`;

    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopyStatus("Link copied");
      window.setTimeout(() => setCopyStatus(""), 2000);
    } catch (error) {
      console.error("Clipboard copy failed:", error);
      setCopyStatus("Copy failed");
      window.setTimeout(() => setCopyStatus(""), 2000);
    }
  }

  async function shareProfile() {
    if (!profile) {
      return;
    }

    const profileUrl = `${window.location.origin}/teachers/${profile.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: profile.full_name
            ? `${profile.full_name} | UstaadHub`
            : "UstaadHub Teacher Profile",
          text: "View my public teacher profile on UstaadHub.",
          url: profileUrl,
        });
        return;
      }

      await copyProfileLink();
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") {
        return;
      }

      console.error("Share failed:", error);
      await copyProfileLink();
    }
  }

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !profile) {
      return;
    }

    setPhotoStatus("");

    const isJpeg =
      file.type === "image/jpeg" ||
      file.name.toLowerCase().endsWith(".jpg") ||
      file.name.toLowerCase().endsWith(".jpeg");

    if (!isJpeg) {
      setPhotoStatus("Please select a JPG or JPEG image.");
      event.target.value = "";
      return;
    }

    if (file.size > 1024 * 1024) {
      setPhotoStatus("Image size must be 1 MB or less.");
      event.target.value = "";
      return;
    }

    setPhotoUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.id !== profile.id) {
        throw new Error("Unauthorized");
      }

      const filePath = `${user.id}/profile.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("teacher-profile-photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: "image/jpeg",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from("teacher-profile-photos")
          .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw signedUrlError || new Error("Unable to create photo URL.");
      }

      const { error: updateError } = await supabase
        .from("teacher_profiles")
        .update({
          profile_photo_url: signedUrlData.signedUrl,
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              profile_photo_url: signedUrlData.signedUrl,
            }
          : current,
      );

      setPhotoStatus("Profile photo updated successfully.");
    } catch (error) {
      console.error("Profile photo upload failed:", error);
      setPhotoStatus(
        "Unable to update profile photo. Please try again.",
      );
    } finally {
      setPhotoUploading(false);
      event.target.value = "";
    }
  }

  if (loading || profileLoading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <section className="px-6 py-14">
          <div className="mx-auto max-w-6xl">
            Loading your dashboard...
          </div>
        </section>
      </main>
    );
  }

  const isVerified = Boolean(profile?.is_verified);
  const profileUrl = profile
    ? `${window.location.origin}/teachers/${profile.id}`
    : "";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-3xl font-bold text-blue-600">
            UstaadHub
          </Link>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-600 px-5 py-2 font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="px-6 py-14">
        <div className="mx-auto max-w-6xl">

          {/* Welcome + Profile Photo */}
          <div className="rounded-2xl border bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-blue-600">
                  TEACHER DASHBOARD
                </p>

                <h1 className="mt-2 text-4xl font-bold">
                  Welcome{teacherName ? `, ${teacherName}` : ""}
                </h1>

                {email && (
                  <p className="mt-4 text-lg text-slate-600">
                    Signed in as{" "}
                    <span className="font-semibold text-slate-900">
                      {email}
                    </span>
                  </p>
                )}

                <p className="mt-8 text-slate-600">
                  Your teacher dashboard is ready. Profile and
                  class-management tools will appear here.
                </p>
              </div>

              {/* Profile Photo */}
              <div className="flex w-full flex-col items-center md:w-48">
                <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-slate-100 bg-slate-100 shadow-sm">
                  {profile?.profile_photo_url ? (
                    <img
                      src={profile.profile_photo_url}
                      alt={
                        profile.full_name || "Teacher profile photo"
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-slate-400">
                      {(profile?.full_name || teacherName || "T")
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,image/jpeg"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  {photoUploading ? "Uploading..." : "Update Photo"}
                </button>

                <p className="mt-2 text-center text-xs text-slate-500">
                  JPG/JPEG only • Max 1 MB
                </p>

                {photoStatus && (
                  <p
                    aria-live="polite"
                    className="mt-2 text-center text-sm font-medium text-slate-600"
                  >
                    {photoStatus}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* My Public Profile */}
          <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-900">
                My Public Profile
              </h2>

              {profile && isVerified && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                  Verified
                </span>
              )}
            </div>

            {profileError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {profileError}
              </div>
            )}

            {!profileError && !isVerified && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Your profile is under verification. Sharing will be
                available after approval.
              </div>
            )}

            {profile && isVerified && (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/teachers/${profile.id}`}
                    aria-label="View public profile"
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    View Profile
                  </Link>

                  <button
                    type="button"
                    aria-label="Copy public profile link"
                    onClick={copyProfileLink}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    Copy Profile Link
                  </button>

                  <button
                    type="button"
                    aria-label="Share public profile"
                    onClick={shareProfile}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    Share Profile
                  </button>
                </div>

                <p className="text-sm text-slate-500">
                  Public profile URL: {profileUrl}
                </p>

                {copyStatus && (
                  <p
                    aria-live="polite"
                    className="text-sm font-medium text-emerald-700"
                  >
                    {copyStatus}
                  </p>
                )}
              </div>
            )}
          </div>

        </div>
      </section>
    </main>
  );
}
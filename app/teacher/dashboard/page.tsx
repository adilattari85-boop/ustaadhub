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
type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  related_requirement_id: string | null;
  related_teacher_id: string | null;
  is_read: boolean;
  created_at: string;
};
type Requirement = {
  id: string;
  parent_student_name: string | null;
  mobile_number: string | null;
  student_age: number | null;
  student_gender: string | null;
  subjects: string[] | null;
  current_level: string | null;
  class_mode: string | null;
  preferred_languages: string[] | null;
  classes_per_week: string | null;
  preferred_time: string | null;
  preferred_days: string | null;
  monthly_budget: number | null;
  additional_requirement: string | null;
  status: string;
};

type Match = {
  id: string;
  requirement_id: string;
  teacher_id: string;
  status: "connected" | "accepted" | "rejected" | "completed" | "cancelled";
  connected_at: string;
  updated_at: string;
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
const [notificationLoading, setNotificationLoading] = useState(true);
const [showNotifications, setShowNotifications] = useState(false);
const [studentCount, setStudentCount] = useState(0);
const [requestCount, setRequestCount] = useState(0);
const [activeClassCount, setActiveClassCount] = useState(0);
const [selectedRequirement, setSelectedRequirement] =
  useState<Requirement | null>(null);

const [selectedNotification, setSelectedNotification] =
  useState<Notification | null>(null);

const [responding, setResponding] = useState(false);
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
  .eq("user_id", user.id)
  .maybeSingle();

if (error) {
  throw error;
}

setProfile((data as TeacherProfile | null) ?? null);

if (data?.id) {
  const { data: matchData, error: matchError } = await supabase
    .from("requirement_teacher_matches")
    .select("id, status")
    .eq("teacher_id", data.id);

  if (matchError) {
    console.error("Teacher matches load error:", matchError);
  } else {
    const matches = matchData || [];

    setStudentCount(
      matches.filter((match) => match.status === "accepted").length
    );

    setRequestCount(
      matches.filter((match) => match.status === "connected").length
    );

    setActiveClassCount(0);
  }
}
          const { data: matchData, error: matchError } = await supabase
  .from("requirement_teacher_matches")
  .select("id, status")
  .eq("teacher_id", user.id);

if (matchError) {
  console.error("Teacher matches load error:", matchError);
} else {
  const matches = matchData || [];

  setStudentCount(
    matches.filter((match) => match.status === "accepted").length
  );

  setRequestCount(
    matches.filter((match) => match.status === "connected").length
  );
}

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
  async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) {
    console.error("Notification read error:", error);
    return;
  }

  setNotifications((current) =>
    current.map((item) =>
      item.id === notificationId
        ? { ...item, is_read: true }
        : item
    )
  );
}
async function loadRequirement(requirementId: string) {
  console.log("Loading requirement:", requirementId);

  const { data, error } = await supabase
    .from("learning_requirements")
    .select("*")
    .eq("id", requirementId)
    .maybeSingle();

  console.log("Requirement data:", data);
  console.log("Requirement error:", error);

  if (error) {
    console.error("Requirement load error:", error);
    alert(`Requirement load failed: ${error.message}`);
    return;
  }

  if (!data) {
    alert("Requirement not found.");
    return;
  }

  setSelectedRequirement(data as Requirement);

  if (selectedNotification) {
    await markNotificationAsRead(selectedNotification.id);
  }
}
async function respondToRequirement(
  requirementId: string,
  response: "accepted" | "rejected"
) {
  setResponding(true);

  const { data, error } = await supabase.rpc(
    "teacher_respond_to_requirement",
    {
      p_requirement_id: requirementId,
      p_response: response,
    }
  );

  if (error) {
    console.error("Requirement response error:", error);
    alert(error.message);
    setResponding(false);
    return;
  }

  setSelectedRequirement(null);
  setSelectedNotification(null);
  setResponding(false);

  alert(
    response === "accepted"
      ? "Requirement accepted successfully."
      : "Requirement rejected."
  );
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
        .eq("user_id", user.id);

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
    const acceptedStudents = notifications.length > 0
  ? 1
  : 0;

const pendingRequests = notifications.filter(
  (item) => !item.is_read && item.type === "teacher_match"
).length;

const activeClasses = 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-3xl font-bold text-blue-600">
            UstaadHub
          </Link>
          <div className="relative">
  <button
    type="button"
    onClick={() => setShowNotifications((current) => !current)}
    className="relative rounded-lg border bg-white px-4 py-2 font-semibold transition hover:bg-slate-50"
  >
    🔔 Notifications

    {notifications.filter((item) => !item.is_read).length > 0 && (
      <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
        {notifications.filter((item) => !item.is_read).length}
      </span>
    )}
  </button>

  {showNotifications && (
    <div className="absolute right-0 z-50 mt-3 w-80 rounded-2xl border bg-white p-3 shadow-xl">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="font-bold">Notifications</h3>
        <span className="text-xs text-slate-500">
          {notifications.length} total
        </span>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notificationLoading ? (
          <p className="p-4 text-sm text-slate-500">
            Loading notifications...
          </p>
        ) : notifications.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">
            No notifications yet.
          </p>
        ) : (
         notifications.map((notification) => (
  <button
    type="button"
    key={notification.id}
    onClick={async () => {
      if (!notification.related_requirement_id) {
        return;
      }

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item,
        ),
      );

      setShowNotifications(false);

      router.push(
        `/teacher/dashboard/requirements/${notification.related_requirement_id}`,
      );
    }}
    className={`block w-full border-b px-2 py-4 text-left last:border-b-0 transition hover:bg-slate-100 ${
      notification.is_read ? "bg-white" : "bg-blue-50"
    }`}
  >
    <div className="flex items-start gap-2">
      {!notification.is_read && (
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
      )}

      <div>
        <p className="font-semibold text-slate-900">
          {notification.title}
        </p>

        <p className="mt-1 text-sm text-slate-600">
          {notification.message}
        </p>

        <p className="mt-2 text-xs text-slate-400">
          {new Date(notification.created_at).toLocaleString("en-IN")}
        </p>

        {notification.related_requirement_id && (
          <p className="mt-2 text-sm font-semibold text-blue-600">
            View Requirement →
          </p>
        )}
      </div>
    </div>
  </button>
))
        )}
      </div>
    </div>
  )}
</div>
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

               <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

  {/* My Students */}
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <div className="text-3xl">👨‍🎓</div>
    <p className="mt-3 text-sm font-semibold text-slate-500">
      My Students
    </p>
    <p className="mt-1 text-3xl font-bold text-slate-900">
      {studentCount}
    </p>

    <Link
      href="/teacher/dashboard/students"
      className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
    >
      View Students →
    </Link>
  </div>

  {/* Active Classes */}
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <div className="text-3xl">📚</div>
    <p className="mt-3 text-sm font-semibold text-slate-500">
      Active Classes
    </p>
    <p className="mt-1 text-3xl font-bold text-slate-900">
      {activeClassCount}
    </p>

    <Link
      href="/teacher/dashboard/classes"
      className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
    >
      Manage Classes →
    </Link>
  </div>

  {/* Upcoming Class */}
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <div className="text-3xl">🕐</div>
    <p className="mt-3 text-sm font-semibold text-slate-500">
      Upcoming Class
    </p>

    <p className="mt-1 text-lg font-bold text-slate-900">
      No class scheduled
    </p>

    <Link
      href="/teacher/dashboard/classes"
      className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
    >
      View Schedule →
    </Link>
  </div>

  {/* Requests */}
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <div className="text-3xl">🔔</div>
    <p className="mt-3 text-sm font-semibold text-slate-500">
      New Requests
    </p>

    <p className="mt-1 text-3xl font-bold text-slate-900">
      {requestCount}
    </p>

    <button
      type="button"
      onClick={() => setShowNotifications(true)}
      className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
    >
      View Requests →
    </button>
  </div>

</div>
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
     {selectedRequirement && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
      
      <div className="flex items-start justify-between gap-4 border-b pb-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            STUDENT REQUIREMENT
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            {selectedRequirement.parent_student_name || "Student"}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedRequirement(null);
            setSelectedNotification(null);
          }}
          className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          ✕
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Student Name
          </p>
          <p className="mt-1 font-semibold">
            {selectedRequirement.parent_student_name || "Not provided"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Student Age
          </p>
          <p className="mt-1 font-semibold">
            {selectedRequirement.student_age || "Not provided"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Gender
          </p>
          <p className="mt-1 font-semibold">
            {selectedRequirement.student_gender || "Not provided"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Subject
          </p>
          <p className="mt-1 font-semibold">
            {Array.isArray(selectedRequirement.subjects)
              ? selectedRequirement.subjects.join(", ")
              : selectedRequirement.subjects || "Not provided"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Current Level
          </p>
          <p className="mt-1 font-semibold">
            {selectedRequirement.current_level || "Not provided"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Class Mode
          </p>
          <p className="mt-1 font-semibold">
            {selectedRequirement.class_mode || "Not provided"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Classes Per Week
          </p>
          <p className="mt-1 font-semibold">
            {selectedRequirement.classes_per_week || "Not provided"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Preferred Time
          </p>
          <p className="mt-1 font-semibold">
            {selectedRequirement.preferred_time || "Not provided"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
          <p className="text-xs font-semibold text-slate-500">
            Preferred Days
          </p>
          <p className="mt-1 font-semibold">
            {selectedRequirement.preferred_days || "Not provided"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Monthly Budget
          </p>
          <p className="mt-1 font-semibold">
            {selectedRequirement.monthly_budget
              ? `₹${selectedRequirement.monthly_budget}`
              : "Not provided"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Languages
          </p>
          <p className="mt-1 font-semibold">
            {Array.isArray(selectedRequirement.preferred_languages)
              ? selectedRequirement.preferred_languages.join(", ")
              : selectedRequirement.preferred_languages || "Not provided"}
          </p>
        </div>

      </div>

      {selectedRequirement.additional_requirement && (
        <div className="mt-5 rounded-xl border bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">
            Additional Requirement
          </p>

          <p className="mt-2 text-slate-700">
            {selectedRequirement.additional_requirement}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={responding}
          onClick={() =>
            void respondToRequirement(
              selectedRequirement.id,
              "rejected"
            )
          }
          className="rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {responding ? "Please wait..." : "Reject"}
        </button>

        <button
          type="button"
          disabled={responding}
          onClick={() =>
            void respondToRequirement(
              selectedRequirement.id,
              "accepted"
            )
          }
          className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {responding ? "Please wait..." : "Accept Requirement"}
        </button>
      </div>

    </div>
  </div>
)}
    </main>
  );
}
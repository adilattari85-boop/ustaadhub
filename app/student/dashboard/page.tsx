"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  FaHome,
  FaMoneyBillWave,
  FaUser,
  FaBook,
  FaBullhorn,
  FaEnvelope,
  FaCertificate,
  FaPoll,
  FaClipboardCheck,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaGraduationCap,
  FaChevronDown,
  FaSearch,
} from "react-icons/fa";

// Navigation items for sidebar. Only "Home" has an existing route ("/student/dashboard").
// All others are disabled (no real routes in the project).
const navItems = [
  { id: "home", label: "Home", icon: FaHome, href: "/student/dashboard" },
  { id: "fees", label: "Student Fees Schedule", icon: FaMoneyBillWave, href: null },
  { id: "profile", label: "Student Profile", icon: FaUser, href: null },
  { id: "course", label: "Student Course", icon: FaBook, href: null },
  { id: "notice", label: "Notice Board", icon: FaBullhorn, href: null },
  { id: "contact", label: "Contact Us", icon: FaEnvelope, href: null },
  { id: "certificate", label: "Certificate", icon: FaCertificate, href: null },
  { id: "survey", label: "Survey Portal", icon: FaPoll, href: null },
  { id: "attendance", label: "Attendance Reports", icon: FaClipboardCheck, href: null },
];

// 8-card grid. Only "Home" links to an existing route ("/student/dashboard").
const quickAccessCards = [
  { icon: FaHome, title: "Home", description: "Go to your dashboard home.", href: "/student/dashboard", gradient: "from-blue-500 to-indigo-600" },
  { icon: FaMoneyBillWave, title: "Student Fees Schedule", description: "View your fee schedule and payments.", href: null, gradient: "from-green-500 to-teal-600" },
  { icon: FaUser, title: "Student Profile", description: "Manage your profile details.", href: null, gradient: "from-purple-500 to-violet-600" },
  { icon: FaBook, title: "Student Course", description: "Browse enrolled courses.", href: null, gradient: "from-amber-400 to-orange-500" },
  { icon: FaBullhorn, title: "Notice Board", description: "Latest announcements and notices.", href: null, gradient: "from-rose-500 to-pink-500" },
  { icon: FaEnvelope, title: "Contact Us", description: "Reach out to support.", href: null, gradient: "from-cyan-500 to-teal-600" },
  { icon: FaCertificate, title: "Certificate", description: "Download your certificates.", href: null, gradient: "from-yellow-400 to-amber-500" },
  { icon: FaPoll, title: "Survey Portal", description: "Participate in surveys.", href: null, gradient: "from-fuchsia-500 to-purple-600" },
];

// Statistics — no real data source exists, values show "—".
const statCards = [
  { label: "Active Courses", value: "—" },
  { label: "Completed Courses", value: "—" },
  { label: "Left Courses", value: "—" },
  { label: "Other Family Members", value: "—" },
];

function getInitials(email: string): string {
  if (!email) return "S";
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() || "S";
}

type ClassSession = {
  id: string;
  title: string;
  join_link: string;
  scheduled_at: string | null;
  teacher_name: string | null;
};

type StudentNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  related_requirement_id: string | null;
  related_teacher_id: string | null;
  is_read: boolean;
  created_at: string;
};

function renderNavItem(item: (typeof navItems)[number], isActive = false) {
  const Icon = item.icon;
  const content = (
    <>
      <Icon
        className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`}
      />
      <span className="truncate">{item.label}</span>
    </>
  );
  const baseClasses = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition";
  if (item.href) {
    return (
      <Link
        key={item.id}
        href={item.href}
        className={`${baseClasses} ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
      >
        {content}
      </Link>
    );
  }
  return (
    <div
      key={item.id}
      className={`${baseClasses} cursor-not-allowed text-slate-400`}
    >
      {content}
    </div>
  );
}

export default function StudentDashboard() {
  const [email, setEmail] = useState("");
  const [classSessions, setClassSessions] = useState<ClassSession[]>([]);
  const [classSessionsLoading, setClassSessionsLoading] = useState(true);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setEmail(user.email || "");

      // Fetch this student's notifications (e.g. teacher_match).
      // A failure here must not prevent the dashboard from loading.
      try {
        const { data: notificationData, error: notificationError } =
          await supabase
            .from("notifications")
            .select(
              "id, title, message, type, related_requirement_id, related_teacher_id, is_read, created_at"
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10);

        if (notificationError) {
          console.error("Notification load error:", notificationError);
          setNotifications([]);
        } else {
          setNotifications(
            (notificationData || []) as StudentNotification[]
          );
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
        setNotifications([]);
      } finally {
        setNotificationsLoading(false);
      }

      // Fetch class sessions for this student
      try {
        setClassSessionsLoading(true);

        // Step 1: Get all learning_requirements belonging to this user
        const { data: requirements, error: reqError } = await supabase
          .from("learning_requirements")
          .select("id")
          .eq("user_id", user.id);

        if (reqError) throw reqError;

        if (!requirements || requirements.length === 0) {
          setClassSessions([]);
          setClassSessionsLoading(false);
          return;
        }

        const requirementIds = requirements.map((r) => r.id);

        // Step 2: Get accepted matches for these requirements
        const { data: matches, error: matchError } = await supabase
          .from("requirement_teacher_matches")
          .select("id")
          .in("requirement_id", requirementIds)
          .eq("status", "accepted");

        if (matchError) throw matchError;

        if (!matches || matches.length === 0) {
          setClassSessions([]);
          setClassSessionsLoading(false);
          return;
        }

        const matchIds = matches.map((m) => m.id);

        // Step 3: Get class sessions for these accepted matches
        const { data: sessions, error: sessionsError } = await supabase
          .from("class_sessions")
          .select("id, title, join_link, scheduled_at, teacher_id")
          .in("match_id", matchIds);

        if (sessionsError) throw sessionsError;

        if (!sessions || sessions.length === 0) {
          setClassSessions([]);
          setClassSessionsLoading(false);
          return;
        }

        // Step 4: Get teacher names for these sessions
        const teacherIds = [...new Set(sessions.map((s) => s.teacher_id))];
        const { data: teachers, error: teachersError } = await supabase
          .from("teacher_profiles")
          .select("id, full_name")
          .in("id", teacherIds);

        if (teachersError) throw teachersError;

        const teacherMap = new Map(
          (teachers ?? []).map((t) => [t.id, t.full_name]),
        );

        // Step 5: Map to ClassSession type
        const mapped: ClassSession[] = sessions.map((s) => ({
          id: s.id,
          title: s.title,
          join_link: s.join_link,
          scheduled_at: s.scheduled_at,
          teacher_name: teacherMap.get(s.teacher_id) ?? null,
        }));

        setClassSessions(mapped);
      } catch (err) {
        console.error("Failed to fetch class sessions:", err);
        setClassSessions([]);
      } finally {
        setClassSessionsLoading(false);
      }
    }
    getUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function markNotificationRead(notificationId: string) {
    // Optimistically flip the flag, then persist it scoped to the
    // current authenticated user only. Never touch another user's row.
    const target = notifications.find((n) => n.id === notificationId);
    if (!target || target.is_read) return;

    setNotifications((current) =>
      current.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to mark notification as read:", error);
      // Revert the optimistic update so the unread state stays visible.
      setNotifications((current) =>
        current.map((n) =>
          n.id === notificationId ? { ...n, is_read: false } : n
        )
      );
    }
  }

  function formatNotificationDate(iso: string): string {
    try {
      const date = new Date(iso);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const time = date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      if (isToday) return `Today at ${time}`;
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday at ${time}`;
      }
      return date.toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  const initials = getInitials(email);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* TOP HEADER */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
            >
              {menuOpen ? <FaTimes className="h-5 w-5" /> : <FaBars className="h-5 w-5" />}
            </button>
            <Link href="/" className="whitespace-nowrap text-2xl font-bold text-blue-600 sm:text-3xl">
              UstaadHub
            </Link>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <div className="hidden min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 pr-1 pl-1 sm:flex sm:pr-3 sm:pl-3">
              <FaGraduationCap className="h-4 w-4 shrink-0 text-blue-600" />
              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-wide text-blue-600">Student</span>
                <span className="block max-w-[140px] truncate text-xs text-slate-600">{email || "—"}</span>
              </span>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{initials}</div>
              <FaChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
            </div>
            <button type="button" onClick={handleLogout} className="shrink-0 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 sm:px-5">
              Logout
            </button>
          </div>
        </div>
      </header>
      {/* MOBILE DRAWER */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Link href="/" className="text-xl font-bold text-blue-600" onClick={() => setMenuOpen(false)}>UstaadHub</Link>
              <button type="button" onClick={() => setMenuOpen(false)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100">
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-4">
              {navItems.map((item) => renderNavItem(item, item.id === "home"))}
            </nav>
            <div className="border-t p-4">
              <button type="button" onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700">
                <FaSignOutAlt className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
      {/* BODY WRAPPER */}
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* LEFT SIDEBAR (desktop) */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-[68px] -mt-[68px] h-[calc(100vh-68px)] min-h-[700px]">
            <nav className="flex flex-col gap-1 rounded-xl border bg-white p-3 shadow-sm">
              {navItems.map((item) => renderNavItem(item, item.id === "home"))}
            </nav>
            <button type="button" onClick={handleLogout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700">
              <FaSignOutAlt className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>
        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1 space-y-6">
          {/* WELCOME HERO */}
          <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-sky-50 to-white p-6 shadow-sm sm:p-8">
            <div className="relative z-10">
              <p className="font-semibold text-blue-600">STUDENT DASHBOARD</p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Welcome to UstaadHub 🎓</h1>
              <p className="mt-4 text-lg text-slate-600">You are logged in as:</p>
              <p className="mt-1 break-all font-semibold text-slate-900">{email || "—"}</p>
            </div>
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-200/30 blur-3xl" />
            <div className="absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-sky-200/30 blur-3xl" />
          </section>
          {/* NOTIFICATIONS */}
          <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-600">NOTIFICATIONS</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-800">Notifications</h2>
              </div>
              {notifications.some((n) => !n.is_read) && (
                <span className="shrink-0 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  {notifications.filter((n) => !n.is_read).length} new
                </span>
              )}
            </div>

            {notificationsLoading ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-6 text-center text-slate-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-6 text-center text-slate-500">
                No notifications yet
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => void markNotificationRead(notification.id)}
                      className={`flex w-full items-start gap-3 rounded-xl px-4 py-3.5 text-left transition hover:bg-slate-50 ${
                        notification.is_read ? "bg-white" : "bg-blue-50/40"
                      }`}
                    >
                      {!notification.is_read && (
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-900">
                          {notification.title}
                        </span>
                        <span className="mt-0.5 block text-sm leading-5 text-slate-600">
                          {notification.message}
                        </span>
                        <span className="mt-1 block text-xs text-slate-400">
                          {formatNotificationDate(notification.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {/* QUICK ACCESS CARDS (8 cards) */}
          <section>
            <h2 className="text-lg font-bold text-slate-800">Quick Access</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {quickAccessCards.map((card) => {
                const Icon = card.icon;
                const inner = (
                  <>
                    <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-lg`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-800">{card.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{card.description}</p>
                    {card.href && (
                      <span className="mt-3 inline-block text-sm font-semibold text-blue-600">Open →</span>
                    )}
                  </>
                );
                return card.href ? (
                  <Link key={card.title} href={card.href} className="group rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                    {inner}
                  </Link>
                ) : (
                  <div key={card.title} className="rounded-2xl border bg-white p-6 shadow-sm">
                    {inner}
                  </div>
                );
              })}
            </div>
          </section>
          {/* ATTENDANCE REPORTS (red/pink section) */}
          <section className="rounded-3xl border border-rose-100 bg-gradient-to-br from-pink-50 via-rose-50 to-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-rose-600">ATTENDANCE REPORTS</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-800">Attendance Reports</h2>
                <p className="mt-2 text-slate-600">Track your attendance across all enrolled courses.</p>
              </div>
              <div className="shrink-0">
                <span className="text-5xl font-bold text-rose-200">—</span>
              </div>
            </div>
          </section>
          {/* STATISTICS */}
          <section>
            <h2 className="text-lg font-bold text-slate-800">Statistics</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                  <p className="text-3xl font-bold text-slate-400">{stat.value}</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>
          {/* ACTIVE COURSE DETAILS */}
          <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
            <div>
              <p className="font-semibold text-emerald-600">ACTIVE COURSE DETAILS</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-800">Active Course Details</h2>
              <p className="mt-2 text-slate-600">View and manage your active enrolled courses.</p>
            </div>
            {/* Search + Go button + Actions dropdown */}
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="search" placeholder="Search courses..." disabled className="w-full rounded-xl border border-slate-300 bg-slate-100 px-10 py-2.5 text-sm text-slate-400 outline-none" />
              </div>
              <button type="button" disabled className="rounded-xl border border-slate-300 bg-slate-100 px-6 py-2.5 text-sm font-semibold text-slate-400">Go</button>
              <div className="relative">
                <select disabled className="w-[160px] appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-400 outline-none">
                  <option>Actions</option>
                  <option>Import</option>
                  <option>Export</option>
                  <option>Print</option>
                </select>
              </div>
            </div>
            {/* Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-100 bg-slate-50 text-left">
                    <th className="px-4 py-3 font-semibold text-slate-700">Join Class Link</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Teacher</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Class Title</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Scheduled</th>
                  </tr>
                </thead>
                <tbody>
                  {classSessionsLoading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">Loading...</td>
                    </tr>
                  ) : classSessions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">No active classes</td>
                    </tr>
                  ) : (
                    classSessions.map((session) => (
                      <tr key={session.id} className="border-b border-slate-100">
                        <td className="px-4 py-3">
                          <a
                            href={session.join_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            Join Class
                          </a>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{session.teacher_name || "Teacher"}</td>
                        <td className="px-4 py-3 text-slate-600">{session.title}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {session.scheduled_at
                            ? new Date(session.scheduled_at).toLocaleString()
                            : "Not scheduled"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
          {/* FOOTER */}
          <footer className="border-t pt-6 text-center text-sm text-slate-500">
            <p>© 2026 UstaadHub. All rights reserved.</p>
            <div className="mt-2 flex justify-center gap-6">
              <span className="cursor-default">Terms</span>
              <span className="cursor-default">Privacy</span>
              <span className="cursor-default">Support</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

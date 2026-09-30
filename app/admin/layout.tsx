"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaBars,
  FaBriefcase,
  FaClipboardList,
  FaCreditCard,
  FaTimes,
  FaTachometerAlt,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";

// Shared admin navigation. Only the routes that already exist are listed
// here: no placeholder or disabled entries, so the menu never points at a
// page that has not been built yet.
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: FaTachometerAlt, href: "/admin" },
  {
    id: "requirements",
    label: "Learning Requirements",
    icon: FaClipboardList,
    href: "/admin/requirements",
  },
  {
    id: "teachers",
    label: "Teacher Verification",
    icon: FaUserCheck,
    href: "/admin/teachers",
  },
  { id: "users", label: "All Users", icon: FaUsers, href: "/admin/users" },
  {
    id: "jobs",
    label: "Jobs & Opportunities",
    icon: FaBriefcase,
    href: "/admin/jobs",
  },
  {
    id: "payments",
    label: "Payments & Settings",
    icon: FaCreditCard,
    href: "/admin/payments",
  },
];

// "/admin" must match exactly, otherwise it would also light up as active
// while the admin is on "/admin/teachers" or "/admin/users".
function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock background scroll while the drawer is open, matching the behaviour
  // of the other mobile sheets in the app.
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  // The admin login screen lives under /admin/login, so it inherits this
  // layout. It is a centred card with its own branding, and it is what an
  // unauthenticated visitor is redirected TO - wrapping it in the sidebar
  // would fight its own layout. Render it bare.
  //
  // This layout deliberately performs NO auth check of its own: every admin
  // page keeps its existing verifyAdmin() redirect, so adding a second guard
  // here could only ever create a redirect loop, never prevent one.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  function renderNavItem(
    item: (typeof navItems)[number],
    onNavigate?: () => void
  ) {
    const Icon = item.icon;
    const isActive = isNavItemActive(pathname, item.href);

    return (
      <Link
        key={item.id}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        onClick={onNavigate}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? "bg-blue-50 text-blue-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <Icon
          className={`h-4 w-4 shrink-0 ${
            isActive ? "text-blue-600" : "text-slate-400"
          }`}
        />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* MOBILE HEADER */}
      <header className="sticky top-0 z-30 border-b bg-white lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
            >
              {menuOpen ? (
                <FaTimes className="h-5 w-5" />
              ) : (
                <FaBars className="h-5 w-5" />
              )}
            </button>

            <span className="whitespace-nowrap text-xl font-bold text-blue-700">
              UstaadHub
            </span>
          </div>

          <span className="truncate text-sm text-slate-500">Admin</span>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />

          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <span className="text-xl font-bold text-blue-700">UstaadHub</span>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 p-4">
              {navItems.map((item) =>
                renderNavItem(item, () => setMenuOpen(false))
              )}
            </nav>
          </div>
        </div>
      )}

      {/* BODY */}
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* LEFT SIDEBAR (desktop) */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-6">
            <nav className="flex flex-col gap-1 rounded-xl border bg-white p-3 shadow-sm">
              {navItems.map((item) => renderNavItem(item))}
            </nav>
          </div>
        </aside>

        {/* PAGE CONTENT
            Rendered as a plain div rather than <main>: every admin page
            already renders its own <main> element, and nesting one inside
            another is invalid HTML. */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
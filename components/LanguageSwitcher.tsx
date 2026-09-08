"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const isUrdu = pathname.startsWith("/ur");

  return (
    <Link
      href={isUrdu ? "/" : "/ur"}
      className="whitespace-nowrap rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700 sm:px-3 sm:py-2"
    >
      {isUrdu ? "English" : "اردو"}
    </Link>
  );
}
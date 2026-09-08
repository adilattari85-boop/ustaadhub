import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";

const baseUrl = "https://www.ustaadhub.in";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const { data } = await supabase
      .from("teacher_profiles")
      .select("full_name, subjects")
      .eq("id", id)
      .eq("is_verified", true)
      .maybeSingle();

    const teacher = data as {
      full_name: string | null;
      subjects: string[] | null;
    } | null;

    if (teacher?.full_name) {
      const subjects = teacher.subjects?.slice(0, 4) ?? [];
      const subjectText =
        subjects.length > 0 ? subjects.join(", ") : "your chosen subject";
      const title = `${teacher.full_name} – Online Teacher for ${subjects.join(" & ") || "Quran & more"}`;

      return {
        title,
        description: `Learn ${subjectText} online with ${teacher.full_name}, a verified teacher on UstaadHub.`,
        alternates: { canonical: `${baseUrl}/teachers/${id}` },
        robots: { index: true, follow: true },
        openGraph: {
          title,
          description: `Learn ${subjectText} online with ${teacher.full_name}, a verified teacher on UstaadHub.`,
          siteName: "UstaadHub",
          url: `${baseUrl}/teachers/${id}`,
          type: "profile",
          images: [
            {
              url: "/og-image.png",
              width: 1200,
              height: 630,
            },
          ],
        },
        twitter: {
          card: "summary_large_image",
          title,
          description: `Learn ${subjectText} online with ${teacher.full_name}.`,
          images: ["/og-image.png"],
        },
      };
    }
  } catch {
    // Teacher lookup failed; fall through to the default metadata below.
  }

  return {
    title: "Online Teacher Profile",
    description: "View a verified teacher profile on UstaadHub.",
    robots: { index: false, follow: true },
  };
}

export default function TeacherProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
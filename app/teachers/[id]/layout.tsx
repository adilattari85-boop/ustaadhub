import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";

const baseUrl = "https://www.ustaadhub.in";

function formatSubjectList(list: string[]): string {
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} & ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} & ${list[list.length - 1]}`;
}

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
      const subjectText = formatSubjectList(subjects);
      const title = subjectText
        ? `${teacher.full_name} – Online ${subjectText} Teacher`
        : `${teacher.full_name} – Online Teacher`;

      const description =
        subjects.length > 0
          ? `Learn ${subjects.join(", ")} online with ${teacher.full_name} through personalised one-to-one online classes on UstaadHub.`
          : `Learn online with ${teacher.full_name}, a verified teacher on UstaadHub, through personalised one-to-one online classes.`;

      return {
        title,
        description,
        alternates: { canonical: `${baseUrl}/teachers/${id}` },
        robots: { index: true, follow: true },
        openGraph: {
          title,
          description,
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
          description,
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
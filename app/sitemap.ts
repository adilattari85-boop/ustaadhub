import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const baseUrl = "https://www.ustaadhub.in";

// Regenerate hourly so newly verified teacher profiles appear without a
// redeploy. Every entry is still guaranteed to be a verified teacher.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/ur`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/teachers`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/requirement`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Public, verified teacher profile pages. Private/admin/dashboard routes are
  // intentionally excluded. If the database is unavailable at build/request
  // time, we still return the static public routes above.
  try {
    const { data } = await supabase
      .from("teacher_profiles")
      .select("id")
      .eq("is_verified", true);

    for (const teacher of (data as { id: string }[] | null) || []) {
      entries.push({
        url: `${baseUrl}/teachers/${teacher.id}`,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // Keep static entries when Supabase cannot be reached.
  }

  return entries;
}
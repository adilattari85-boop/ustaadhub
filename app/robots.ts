import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/teacher/dashboard/",
          "/student/dashboard/",
          "/students/dashboard/",
          "/login",
          "/register",
          "/signup",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: "https://www.ustaadhub.in/sitemap.xml",
  };
}
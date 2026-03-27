import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteOrigin = getSiteOrigin();
  const now = new Date();

  return [
    {
      url: new URL("/", siteOrigin).toString(),
      lastModified: now,
    },
    {
      url: new URL("/privacy", siteOrigin).toString(),
      lastModified: now,
    },
  ];
}

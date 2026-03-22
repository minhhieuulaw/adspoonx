import type { MetadataRoute } from "next";
import { NICHES } from "@/lib/niches";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://adspoonx.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,                    lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE_URL}/login`,         lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/pricing`,       lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
  ];

  const nicheRoutes: MetadataRoute.Sitemap = NICHES.map(n => ({
    url:             `${BASE_URL}/niche/${n.slug}`,
    lastModified:    now,
    changeFrequency: "hourly" as const,
    priority:        0.9,
  }));

  return [...staticRoutes, ...nicheRoutes];
}

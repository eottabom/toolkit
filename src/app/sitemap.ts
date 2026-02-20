import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/constants";
import { tools } from "@/lib/tools";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const toolPages = tools.map((tool) => ({
    url: `${BASE_URL}/${tool.slug}/`,
    lastModified: tool.createdAt ?? new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...toolPages,
  ];
}

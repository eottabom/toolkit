"use client";

import { useEffect } from "react";
import { RECENT_TOOL_MAX, RECENT_TOOL_SLUGS_KEY } from "@/lib/constants";

export function RecentToolTracker({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_TOOL_SLUGS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const stringSlugs = Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [];
      const prev = [...new Set(stringSlugs)];
      const next = [slug, ...prev.filter((item) => item !== slug)].slice(0, RECENT_TOOL_MAX);
      localStorage.setItem(RECENT_TOOL_SLUGS_KEY, JSON.stringify(next));
    } catch (error) {
      console.error("Failed to write recent tools cache:", error);
    }
  }, [slug]);

  return null;
}

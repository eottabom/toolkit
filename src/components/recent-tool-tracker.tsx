"use client";

import { useEffect } from "react";

const RECENT_TOOL_SLUGS_KEY = "recent-tool-slugs";
const RECENT_TOOL_MAX = 10;

export function RecentToolTracker({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_TOOL_SLUGS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const prev = Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [];
      const next = [slug, ...prev.filter((item) => item !== slug)].slice(0, RECENT_TOOL_MAX);
      localStorage.setItem(RECENT_TOOL_SLUGS_KEY, JSON.stringify(next));
    } catch (error) {
      console.error("Failed to write recent tools cache:", error);
    }
  }, [slug]);

  return null;
}


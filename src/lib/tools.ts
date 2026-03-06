export type ToolItem = {
  title: string;
  desc: string;
  tag: string;
  slug: string;
  createdAt?: string;
};

export const tools: ToolItem[] = [
  {
    title: "Base64 Encode/Decode",
    desc: "Encode plain text to Base64 or decode Base64 strings back to readable text instantly.",
    tag: "Encoding",
    slug: "base64",
    createdAt: "2026-02-11",
  },
  {
    title: "Diff Studio",
    desc: "Compare two texts side-by-side and highlight additions, deletions, and changes.",
    tag: "Formatter",
    slug: "diff",
    createdAt: "2026-02-11",
  },
  {
    title: "Json Viewer",
    desc: "Pretty-print, validate, and explore JSON data with tree view and syntax highlighting.",
    tag: "Formatter",
    slug: "json-viewer",
    createdAt: "2026-02-14",
  },
  {
    title: "JWT Encoder/Decoder",
    desc: "Inspect JWT header, payload, and signature or create tokens with HMAC-SHA256.",
    tag: "Encoding",
    slug: "jwt",
    createdAt: "2026-02-15",
  },
  {
    title: "URL Encoder/Decoder",
    desc: "Convert special characters to percent-encoding or decode URL-encoded strings back to text.",
    tag: "Encoding",
    slug: "url",
    createdAt: "2026-02-17",
  },
  {
    title: "Java Memory Calculator",
    desc: "Estimate heap, metaspace, thread stack, and direct memory for Cloud Foundry / Paketo Buildpack.",
    tag: "DevOps",
    slug: "java-memory-calculator",
    createdAt: "2026-02-18",
  },
  {
    title: "k6 Script Generator",
    desc: "Build k6 performance test scripts with scenarios, thresholds, and checks — export ready-to-run code.",
    tag: "Testing",
    slug: "k6-generator",
    createdAt: "2026-02-18",
  },
  {
    title: "Cron Expression Generator",
    desc: "Build and validate cron schedules for Linux, Jenkins, Spring, and Quartz with next-run preview.",
    tag: "DevOps",
    slug: "cron-generator",
    createdAt: "2026-02-21",
  },
  {
    title: "UTC & Unix Time Calculator",
    desc: "Convert between UTC/local datetime and Unix timestamps across timezones for logs and incidents.",
    tag: "DevOps",
    slug: "utc-unix-calculator",
    createdAt: "2026-03-04",
  },
];

export type ToolItem = {
  title: string;
  desc: string;
  conceptTitle: string;
  conceptSummary: string;
  tag: string;
  slug: string;
  createdAt?: string;
};

export const tools: ToolItem[] = [
  {
    title: "Base64 Encode/Decode",
    desc: "Encode plain text to Base64 or decode Base64 strings back to readable text instantly.",
    conceptTitle: "What is Base64?",
    conceptSummary: "Base64 is a binary-to-text encoding that turns raw bytes into ASCII text so data can travel safely in JSON, HTML, email, and HTTP payloads.",
    tag: "Encoding",
    slug: "base64",
    createdAt: "2026-02-11",
  },
  {
    title: "Diff Studio",
    desc: "Compare two texts side-by-side and highlight additions, deletions, and changes.",
    conceptTitle: "What is a diff?",
    conceptSummary: "A diff shows what changed between two versions of text or code, usually marking additions, deletions, and modified lines for review.",
    tag: "Formatter",
    slug: "diff",
    createdAt: "2026-02-11",
  },
  {
    title: "Json Viewer",
    desc: "Pretty-print, validate, and explore JSON data with tree view and syntax highlighting.",
    conceptTitle: "What is JSON?",
    conceptSummary: "JSON stands for JavaScript Object Notation, a lightweight text format for structured data used widely in APIs, configs, logs, and message payloads.",
    tag: "Formatter",
    slug: "json-viewer",
    createdAt: "2026-02-14",
  },
  {
    title: "JWT Encoder/Decoder",
    desc: "Inspect JWT header, payload, and signature or create tokens with HMAC-SHA256.",
    conceptTitle: "What is a JWT?",
    conceptSummary: "JWT means JSON Web Token, a compact signed token format used to pass claims like user identity, expiration time, or roles between systems.",
    tag: "Encoding",
    slug: "jwt",
    createdAt: "2026-02-15",
  },
  {
    title: "URL Encoder/Decoder",
    desc: "Convert special characters to percent-encoding or decode URL-encoded strings back to text.",
    conceptTitle: "What is URL encoding?",
    conceptSummary: "URL encoding, or percent-encoding, replaces reserved characters with percent codes so query strings and paths stay valid and unambiguous in URLs.",
    tag: "Encoding",
    slug: "url",
    createdAt: "2026-02-17",
  },
  {
    title: "Java Memory Calculator",
    desc: "Estimate heap, metaspace, thread stack, and direct memory for Cloud Foundry / Paketo Buildpack.",
    conceptTitle: "What is JVM memory sizing?",
    conceptSummary: "JVM memory sizing balances heap, metaspace, thread stacks, and native memory so Java apps stay within container limits without unstable garbage collection.",
    tag: "DevOps",
    slug: "java-memory-calculator",
    createdAt: "2026-02-18",
  },
  {
    title: "k6 Script Generator",
    desc: "Build k6 performance test scripts with scenarios, thresholds, and checks — export ready-to-run code.",
    conceptTitle: "What is k6?",
    conceptSummary: "k6 is a load testing tool that runs JavaScript-based performance scripts to measure latency, throughput, thresholds, and error rates for APIs and web services.",
    tag: "Testing",
    slug: "k6-generator",
    createdAt: "2026-02-18",
  },
  {
    title: "Cron Expression Generator",
    desc: "Build and validate cron schedules for Linux, Jenkins, Spring, and Quartz with next-run preview.",
    conceptTitle: "What is cron?",
    conceptSummary: "Cron is a scheduling syntax and daemon used to run recurring jobs at specific minutes, hours, days, or months on servers and automation platforms.",
    tag: "DevOps",
    slug: "cron-generator",
    createdAt: "2026-02-21",
  },
  {
    title: "UTC & Unix Time Calculator",
    desc: "Convert between UTC/local datetime and Unix timestamps across timezones for logs and incidents.",
    conceptTitle: "What are UTC and Unix time?",
    conceptSummary: "UTC is the global reference time standard, and Unix time is the number of seconds or milliseconds since 1970-01-01 00:00:00 UTC.",
    tag: "DevOps",
    slug: "utc-unix-calculator",
    createdAt: "2026-03-04",
  },
];

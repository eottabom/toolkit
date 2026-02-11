export type ToolItem = {
  title: string;
  desc: string;
  tag: string;
  slug: string;
  createdAt?: string;
};

export const tools: ToolItem[] = [
  {
    title: "Diff Studio",
    desc: "Compare text side-by-side and highlight changes.",
    tag: "Utility",
    slug: "diff",
    createdAt: "2026-02-11",
  },
  {
    title: "API Playground",
    desc: "Test endpoints, view schemas, and replay requests.",
    tag: "API",
    slug: "api-playground",
    createdAt: "2026-02-10",
  },
  {
    title: "Log Triage",
    desc: "Filter production logs by service and severity.",
    tag: "Ops",
    slug: "log-triage",
    createdAt: "2026-02-09",
  },
  {
    title: "Token Vault",
    desc: "Rotate keys and check expiry windows.",
    tag: "Security",
    slug: "token-vault",
    createdAt: "2026-02-08",
  },
  {
    title: "Preview Builder",
    desc: "Spin up a preview environment in minutes.",
    tag: "Deploy",
    slug: "preview-builder",
    createdAt: "2026-02-07",
  },
];

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
  }
];


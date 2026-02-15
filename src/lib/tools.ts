export type ToolItem = {
  title: string;
  desc: string;
  tag: string;
  slug: string;
  createdAt?: string;
};

export const tools: ToolItem[] = [
  {
    title: "Json Viewer",
    desc: "Pretty or Edit Json.",
    tag: "Utility",
    slug: "json-viewer",
    createdAt: "2026-02-14",
  },
  {
    title: "JWT Encoder/Decoder",
    desc: "Decode JWT tokens or encode Header/Payload with HMAC-SHA256.",
    tag: "Utility",
    slug: "jwt",
    createdAt: "2026-02-15",
  },
  {
    title: "Base64 Encode/Decode",
    desc: "Encode plain text to Base64 or decode Base64 back to text.",
    tag: "Utility",
    slug: "base64",
    createdAt: "2026-02-11",
  },
  {
    title: "Diff Studio",
    desc: "Compare text side-by-side and highlight changes.",
    tag: "Utility",
    slug: "diff",
    createdAt: "2026-02-11",
  }
];

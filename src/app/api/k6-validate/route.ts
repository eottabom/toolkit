import { NextResponse } from "next/server";

const OWNER = process.env.GH_OWNER || process.env.GITHUB_OWNER || "eottabom";
const REPO = process.env.GH_REPO || process.env.GITHUB_REPO || "toolkit";
const REF = process.env.GH_REF || process.env.GITHUB_REF || "main";
const WORKFLOW_ID = "k6-validate.yml";

export async function POST() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "GITHUB_TOKEN이 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: REF }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { ok: false, error: "워크플로우 실행 실패", details: text },
      { status: res.status },
    );
  }

  return NextResponse.json({ ok: true });
}

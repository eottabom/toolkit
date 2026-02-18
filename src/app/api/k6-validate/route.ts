import { NextResponse } from "next/server";

const OWNER = process.env.GH_OWNER || process.env.GITHUB_OWNER || "eottabom";
const REPO = process.env.GH_REPO || process.env.GITHUB_REPO || "toolkit";
const REF = process.env.GH_REF || process.env.GITHUB_REF || "main";
const WORKFLOW_ID = "k6-validate.yml";

async function getToken() {
  return process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
}

function getConfig() {
  return {
    owner: OWNER,
    repo: REPO,
    ref: REF,
    workflowId: WORKFLOW_ID,
  };
}

export async function POST() {
  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "GITHUB_TOKEN이 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const { owner, repo, ref, workflowId } = getConfig();
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref }),
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

export async function GET(req: Request) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "GITHUB_TOKEN이 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const { owner, repo, ref, workflowId } = getConfig();
  const url = new URL(req.url);
  const since = url.searchParams.get("since");

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?event=workflow_dispatch&branch=${encodeURIComponent(ref)}&per_page=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { ok: false, error: "워크플로우 조회 실패", details: text },
      { status: res.status },
    );
  }

  const data = await res.json();
  const run = data?.workflow_runs?.[0];
  if (!run) {
    return NextResponse.json({ ok: true, status: "not_found" });
  }

  if (since) {
    const sinceTime = new Date(since).getTime();
    const createdTime = new Date(run.created_at).getTime();
    if (Number.isFinite(sinceTime) && createdTime < sinceTime) {
      return NextResponse.json({ ok: true, status: "not_found" });
    }
  }

  return NextResponse.json({
    ok: true,
    status: run.status,
    conclusion: run.conclusion,
    htmlUrl: run.html_url,
    createdAt: run.created_at,
  });
}

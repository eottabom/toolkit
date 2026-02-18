"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { ToolItem } from "@/lib/tools";

/* 타입 */

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

type Header = { key: string; value: string };

type Check = { name: string; expression: string };

type ScenarioType = "ramping-vus" | "constant-vus" | "per-vu-iterations" | "constant-arrival-rate";

type RampingStage = { duration: string; target: number };

type Scenario = {
  name: string;
  type: ScenarioType;
  // constant-vus
  vus: number;
  duration: string;
  // ramping-vus
  stages: RampingStage[];
  // per-vu-iterations
  iterations: number;
  // constant-arrival-rate
  rate: number;
  timeUnit: string;
  preAllocatedVUs: number;
  maxVUs: number;
};

type Threshold = { metric: string; condition: string };

type ScriptTab = "auto" | "custom";

/* 기본값 */

const SCENARIO_TYPES: { value: ScenarioType; label: string }[] = [
  { value: "ramping-vus", label: "Ramping VUs" },
  { value: "constant-vus", label: "Constant VUs" },
  { value: "per-vu-iterations", label: "Per VU Iterations" },
  { value: "constant-arrival-rate", label: "Constant Arrival Rate" },
];

const DEFAULT_THRESHOLDS: Threshold[] = [
  { metric: "http_req_duration", condition: "p(95)<500" },
  { metric: "http_req_failed", condition: "rate<0.01" },
];

const DEFAULT_CHECKS: Check[] = [{ name: "status is 200", expression: "res.status === 200" }];

function newScenario(name: string): Scenario {
  return {
    name,
    type: "ramping-vus",
    vus: 10,
    duration: "30s",
    stages: [
      { duration: "10s", target: 10 },
      { duration: "20s", target: 20 },
      { duration: "10s", target: 0 },
    ],
    iterations: 10,
    rate: 50,
    timeUnit: "1s",
    preAllocatedVUs: 50,
    maxVUs: 100,
  };
}

/* 스크립트 생성 */

function generateScript(
  method: HttpMethod,
  url: string,
  headers: Header[],
  body: string,
  scenarios: Scenario[],
  thresholds: Threshold[],
  checks: Check[],
): string {
  const lines: string[] = [];

  // imports
  lines.push("import http from 'k6/http';");
  if (checks.length > 0) {
    lines.push("import { check } from 'k6';");
  }
  lines.push("");

  // options
  lines.push("export const options = {");

  // scenarios
  if (scenarios.length > 0) {
    lines.push("  scenarios: {");
    for (const sc of scenarios) {
      lines.push(`    ${sc.name}: {`);
      lines.push(`      executor: '${sc.type}',`);

      if (sc.type === "constant-vus") {
        lines.push(`      vus: ${sc.vus},`);
        lines.push(`      duration: '${sc.duration}',`);
      } else if (sc.type === "ramping-vus") {
        lines.push("      stages: [");
        for (const stage of sc.stages) {
          lines.push(`        { duration: '${stage.duration}', target: ${stage.target} },`);
        }
        lines.push("      ],");
      } else if (sc.type === "per-vu-iterations") {
        lines.push(`      vus: ${sc.vus},`);
        lines.push(`      iterations: ${sc.iterations},`);
      } else if (sc.type === "constant-arrival-rate") {
        lines.push(`      rate: ${sc.rate},`);
        lines.push(`      timeUnit: '${sc.timeUnit}',`);
        lines.push(`      duration: '${sc.duration}',`);
        lines.push(`      preAllocatedVUs: ${sc.preAllocatedVUs},`);
        lines.push(`      maxVUs: ${sc.maxVUs},`);
      }

      lines.push("    },");
    }
    lines.push("  },");
  }

  // thresholds
  if (thresholds.length > 0) {
    lines.push("  thresholds: {");
    for (const t of thresholds) {
      lines.push(`    '${t.metric}': ['${t.condition}'],`);
    }
    lines.push("  },");
  }

  lines.push("};");
  lines.push("");

  // default function
  lines.push("export default function () {");

  // headers
  const activeHeaders = headers.filter((h) => h.key.trim());
  const hasHeaders = activeHeaders.length > 0;
  if (hasHeaders) {
    lines.push("  const params = {");
    lines.push("    headers: {");
    for (const h of activeHeaders) {
      lines.push(`      '${h.key}': '${h.value}',`);
    }
    lines.push("    },");
    lines.push("  };");
    lines.push("");
  }

  // request
  const hasBody = ["POST", "PUT", "PATCH"].includes(method) && body.trim();
  const paramsArg = hasHeaders ? ", params" : "";

  if (hasBody) {
    lines.push(`  const payload = ${JSON.stringify(body.trim())};`);
    lines.push("");
    lines.push(`  const res = http.${method.toLowerCase()}('${url}'${hasBody ? ", payload" : ""}${paramsArg});`);
  } else if (method === "GET" || method === "DELETE") {
    lines.push(`  const res = http.${method.toLowerCase()}('${url}'${paramsArg});`);
  } else {
    lines.push(`  const res = http.${method.toLowerCase()}('${url}', null${paramsArg});`);
  }

  // checks
  if (checks.length > 0) {
    lines.push("");
    lines.push("  check(res, {");
    for (const c of checks) {
      lines.push(`    '${c.name}': (res) => ${c.expression},`);
    }
    lines.push("  });");
  }

  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

function getNextDefaultScenarioName(scenarios: Scenario[]): string {
  let maxIndex = 0;
  for (const sc of scenarios) {
    const m = sc.name.match(/^default_(\d+)$/);
    if (m) maxIndex = Math.max(maxIndex, Number(m[1]));
  }
  return `default_${maxIndex + 1}`;
}

/* 컴포넌트 */

export default function K6Generator({ tool }: { tool: ToolItem }) {
  // HTTP config
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("https://test.k6.io");
  const [headers, setHeaders] = useState<Header[]>([]);
  const [headerDraft, setHeaderDraft] = useState<Header>({ key: "", value: "" });
  const [body, setBody] = useState("");

  // Scenarios
  const [scenarios, setScenarios] = useState<Scenario[]>([newScenario("default_1")]);

  // Thresholds
  const [thresholds, setThresholds] = useState<Threshold[]>([...DEFAULT_THRESHOLDS]);

  // Checks
  const [checks, setChecks] = useState<Check[]>([...DEFAULT_CHECKS]);

  // UI state
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [scriptTab, setScriptTab] = useState<ScriptTab>("auto");
  const [customScript, setCustomScript] = useState("");

  const script = useMemo(
    () => generateScript(method, url, headers, body, scenarios, thresholds, checks),
    [method, url, headers, body, scenarios, thresholds, checks],
  );
  const [isCleared, setIsCleared] = useState(false);
  const outputScript = isCleared ? "" : script;
  const activeScript = scriptTab === "custom" ? customScript : outputScript;

  const handleCopy = useCallback(async () => {
    try {
      if (!activeScript.trim()) return;
      await navigator.clipboard.writeText(activeScript);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      // ignore
    }
  }, [activeScript]);

  const handleClear = () => {
    setIsCleared(true);
    setCopyState("idle");
  };

  useEffect(() => {
    if (isCleared) setIsCleared(false);
  }, [script, isCleared]);

  const handleCopyCiCommand = async () => {
    try {
      await navigator.clipboard.writeText("gh workflow run k6-validate.yml");
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      // ignore
    }
  };

  /* 헤더 헬퍼 */
  const updateHeaderDraft = (field: "key" | "value", val: string) => {
    setHeaderDraft((prev) => ({ ...prev, [field]: val }));
  };
  const addHeader = () => {
    if (!headerDraft.key.trim()) return;
    setHeaders((prev) => [...prev, { ...headerDraft }]);
    setHeaderDraft({ key: "", value: "" });
  };
  const removeHeader = (idx: number) => setHeaders((prev) => prev.filter((_, i) => i !== idx));

  /* 시나리오 헬퍼 */
  const updateScenario = (idx: number, patch: Partial<Scenario>) => {
    setScenarios((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };
  const addScenario = () => {
    setScenarios((prev) => [...prev, newScenario(getNextDefaultScenarioName(prev))]);
  };
  const removeScenario = (idx: number) => setScenarios((prev) => prev.filter((_, i) => i !== idx));
  const updateStage = (sIdx: number, stIdx: number, patch: Partial<RampingStage>) => {
    setScenarios((prev) =>
      prev.map((s, i) =>
        i === sIdx ? { ...s, stages: s.stages.map((st, j) => (j === stIdx ? { ...st, ...patch } : st)) } : s,
      ),
    );
  };
  const addStage = (sIdx: number) => {
    setScenarios((prev) =>
      prev.map((s, i) => (i === sIdx ? { ...s, stages: [...s.stages, { duration: "10s", target: 0 }] } : s)),
    );
  };
  const removeStage = (sIdx: number, stIdx: number) => {
    setScenarios((prev) =>
      prev.map((s, i) => (i === sIdx ? { ...s, stages: s.stages.filter((_, j) => j !== stIdx) } : s)),
    );
  };

  /* 임계값 헬퍼 */
  const updateThreshold = (idx: number, field: "metric" | "condition", val: string) => {
    setThresholds((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: val } : t)));
  };
  const addThreshold = () => setThresholds((prev) => [...prev, { metric: "", condition: "" }]);
  const removeThreshold = (idx: number) => setThresholds((prev) => prev.filter((_, i) => i !== idx));

  /* 체크 헬퍼 */
  const updateCheck = (idx: number, field: "name" | "expression", val: string) => {
    setChecks((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));
  };
  const addCheck = () => setChecks((prev) => [...prev, { name: "", expression: "" }]);
  const removeCheck = (idx: number) => setChecks((prev) => prev.filter((_, i) => i !== idx));

  /* 스타일 */
  const cardClass =
    "flex flex-col gap-3 rounded-3xl border border-[color:var(--card-border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]";
  const labelClass = "text-xs font-semibold text-[var(--muted)] uppercase tracking-[0.12em]";
  const inputClass =
    "h-9 rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--foreground)] focus:border-[color:var(--card-border-hover)] focus:outline-none";
  const smallBtnClass =
    "h-auto rounded-full border border-[color:var(--card-border)] bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[color:var(--card-border-hover)] hover:text-[var(--foreground)]";
  const addBtnClass =
    "h-auto rounded-full bg-blue-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-blue-700";
  const removeBtnClass =
    "h-8 min-w-[56px] rounded-full border border-rose-200 bg-rose-50 px-3 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-700/60 dark:bg-rose-900/20 dark:text-rose-300 dark:hover:bg-rose-900/40";
  const selectClass =
    "h-9 w-full rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-3 pr-8 text-sm text-[var(--foreground)] focus:border-[color:var(--card-border-hover)] focus:outline-none appearance-none cursor-pointer";
  const badgeClass =
    "rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 hover:bg-emerald-500/15 dark:bg-emerald-400/25 dark:text-emerald-200";
  const tabBtnClass = (active: boolean) =>
    `h-8 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
      active
        ? "bg-blue-600 text-white"
        : "border border-[color:var(--card-border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
    }`;

  const showBody = ["POST", "PUT", "PATCH"].includes(method);

  return (
    <div className="flex flex-col gap-8">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-[var(--foreground)]">{tool.title}</h1>
          <p className="text-sm text-[var(--muted)]">{tool.desc}</p>
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Script Generator</div>
      </div>

      {/* 안내 패널 */}
      <Card className="rounded-2xl border border-[color:var(--url-panel-border)] bg-[var(--url-panel-bg)] p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--url-panel-icon-bg)] text-sm text-[var(--url-panel-accent)]">
            k6
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">k6 Performance Test Script</h2>
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              HTTP 요청, 시나리오, 임계값, 체크를 설정하여 k6 성능 테스트 스크립트를 생성합니다. 생성된 스크립트를{" "}
              <code className="text-[var(--url-panel-accent)]">k6 run script.js</code>로 실행할 수 있습니다.
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="rounded-md bg-[var(--url-panel-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--url-panel-accent)]">
                Ramping VUs
              </span>
              <span className="rounded-md bg-[var(--url-panel-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--url-panel-accent)]">
                Constant Arrival Rate
              </span>
              <span className="rounded-md bg-[var(--url-panel-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--url-panel-accent)]">
                Thresholds & Checks
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* 입력 영역 */}
        <div className="flex flex-col gap-5">
          {/* HTTP 요청 */}
          <Card className={cardClass}>
            <Badge className={badgeClass}>HTTP Request</Badge>

            <div className="flex gap-2">
              <div className="relative w-28 shrink-0">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as HttpMethod)}
                  className={selectClass}
                >
                  {(["GET", "POST", "PUT", "DELETE", "PATCH"] as HttpMethod[]).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">
                  ▼
                </span>
              </div>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/api"
                className={`${inputClass} flex-1`}
              />
            </div>

            {/* 헤더 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={labelClass}>Headers</span>
                <Button type="button" variant="ghost" size="sm" className={addBtnClass} onClick={addHeader}>
                  + Add
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={headerDraft.key}
                  onChange={(e) => updateHeaderDraft("key", e.target.value)}
                  placeholder="Key"
                  className={`${inputClass} flex-1`}
                />
                <Input
                  value={headerDraft.value}
                  onChange={(e) => updateHeaderDraft("value", e.target.value)}
                  placeholder="Value"
                  className={`${inputClass} flex-1`}
                />
              </div>
              {headers.length > 0 && (
                <div className="flex flex-col gap-2">
                  {headers.map((h, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-3 py-2 text-xs">
                      <div className="flex flex-1 items-center gap-2 font-mono">
                        <span className="text-[var(--foreground)]">{h.key}</span>
                        <span className="text-[var(--muted)]">:</span>
                        <span className="text-[var(--muted)]">{h.value}</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" className={removeBtnClass} onClick={() => removeHeader(i)}>
                        삭제
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 바디 */}
            {showBody && (
              <div className="flex flex-col gap-2">
                <span className={labelClass}>Request Body</span>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="min-h-[100px] w-full resize-none rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4 font-mono text-xs text-[var(--foreground)] focus:border-[color:var(--card-border-hover)] focus:outline-none"
                />
              </div>
            )}
          </Card>

          {/* 시나리오 */}
          <Card className={cardClass}>
            <div className="flex items-center justify-between">
              <Badge className={badgeClass}>Scenarios</Badge>
              <Button type="button" variant="ghost" size="sm" className={addBtnClass} onClick={addScenario}>
                + Add Scenario
              </Button>
            </div>

            {scenarios.map((sc, sIdx) => (
              <div
                key={sIdx}
                className="flex flex-col gap-3 rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4"
              >
                <div className="flex items-center justify-between">
                  <Input
                    value={sc.name}
                    onChange={(e) => updateScenario(sIdx, { name: e.target.value })}
                    placeholder="scenario_name"
                    className={`${inputClass} w-48 font-mono text-xs`}
                  />
                  {scenarios.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" className={removeBtnClass} onClick={() => removeScenario(sIdx)}>
                      삭제
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <span className={labelClass}>Executor</span>
                  <div className="relative">
                    <select
                      value={sc.type}
                      onChange={(e) => updateScenario(sIdx, { type: e.target.value as ScenarioType })}
                      className={selectClass}
                    >
                      {SCENARIO_TYPES.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">
                      ▼
                    </span>
                  </div>
                </div>

                {/* constant-vus 입력 */}
                {sc.type === "constant-vus" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className={labelClass}>VUs</span>
                      <Input
                        type="number"
                        value={sc.vus}
                        onChange={(e) => updateScenario(sIdx, { vus: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={labelClass}>Duration</span>
                      <Input
                        value={sc.duration}
                        onChange={(e) => updateScenario(sIdx, { duration: e.target.value })}
                        placeholder="30s"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {/* ramping-vus 입력 */}
                {sc.type === "ramping-vus" && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className={labelClass}>Stages</span>
                      <Button type="button" variant="ghost" size="sm" className={addBtnClass} onClick={() => addStage(sIdx)}>
                        + Stage
                      </Button>
                    </div>
                    {sc.stages.map((st, stIdx) => (
                      <div key={stIdx} className="flex items-center gap-2">
                        <Input
                          value={st.duration}
                          onChange={(e) => updateStage(sIdx, stIdx, { duration: e.target.value })}
                          placeholder="10s"
                          className={`${inputClass} flex-1`}
                        />
                        <span className="text-xs text-[var(--muted)]">&rarr;</span>
                        <Input
                          type="number"
                          value={st.target}
                          onChange={(e) => updateStage(sIdx, stIdx, { target: Number(e.target.value) })}
                          placeholder="VUs"
                          className={`${inputClass} w-20`}
                        />
                        <span className="text-xs text-[var(--muted)]">VUs</span>
                        {sc.stages.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={removeBtnClass}
                            onClick={() => removeStage(sIdx, stIdx)}
                          >
                            삭제
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* per-vu-iterations 입력 */}
                {sc.type === "per-vu-iterations" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className={labelClass}>VUs</span>
                      <Input
                        type="number"
                        value={sc.vus}
                        onChange={(e) => updateScenario(sIdx, { vus: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={labelClass}>Iterations per VU</span>
                      <Input
                        type="number"
                        value={sc.iterations}
                        onChange={(e) => updateScenario(sIdx, { iterations: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {/* constant-arrival-rate 입력 */}
                {sc.type === "constant-arrival-rate" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className={labelClass}>Rate</span>
                      <Input
                        type="number"
                        value={sc.rate}
                        onChange={(e) => updateScenario(sIdx, { rate: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={labelClass}>Time Unit</span>
                      <Input
                        value={sc.timeUnit}
                        onChange={(e) => updateScenario(sIdx, { timeUnit: e.target.value })}
                        placeholder="1s"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={labelClass}>Duration</span>
                      <Input
                        value={sc.duration}
                        onChange={(e) => updateScenario(sIdx, { duration: e.target.value })}
                        placeholder="30s"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={labelClass}>Pre-allocated VUs</span>
                      <Input
                        type="number"
                        value={sc.preAllocatedVUs}
                        onChange={(e) => updateScenario(sIdx, { preAllocatedVUs: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={labelClass}>Max VUs</span>
                      <Input
                        type="number"
                        value={sc.maxVUs}
                        onChange={(e) => updateScenario(sIdx, { maxVUs: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </Card>

          {/* 임계값 */}
          <Card className={cardClass}>
            <div className="flex items-center justify-between">
              <Badge className={badgeClass}>Thresholds</Badge>
              <Button type="button" variant="ghost" size="sm" className={addBtnClass} onClick={addThreshold}>
                + Add
              </Button>
            </div>

            {thresholds.map((t, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={t.metric}
                  onChange={(e) => updateThreshold(i, "metric", e.target.value)}
                  placeholder="http_req_duration"
                  className={`${inputClass} flex-1 font-mono text-xs`}
                />
                <Input
                  value={t.condition}
                  onChange={(e) => updateThreshold(i, "condition", e.target.value)}
                  placeholder="p(95)<500"
                  className={`${inputClass} flex-1 font-mono text-xs`}
                />
                {thresholds.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" className={removeBtnClass} onClick={() => removeThreshold(i)}>
                    삭제
                  </Button>
                )}
              </div>
            ))}
          </Card>

          {/* 체크 */}
          <Card className={cardClass}>
            <div className="flex items-center justify-between">
              <Badge className={badgeClass}>Checks</Badge>
              <Button type="button" variant="ghost" size="sm" className={addBtnClass} onClick={addCheck}>
                + Add
              </Button>
            </div>

            {checks.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={c.name}
                  onChange={(e) => updateCheck(i, "name", e.target.value)}
                  placeholder="status is 200"
                  className={`${inputClass} flex-1`}
                />
                <Input
                  value={c.expression}
                  onChange={(e) => updateCheck(i, "expression", e.target.value)}
                  placeholder="res.status === 200"
                  className={`${inputClass} flex-1 font-mono text-xs`}
                />
                {checks.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" className={removeBtnClass} onClick={() => removeCheck(i)}>
                    삭제
                  </Button>
                )}
              </div>
            ))}
          </Card>
        </div>

        {/* 스크립트 미리보기 */}
        <div className="flex flex-col gap-5">
          <Card className={cardClass}>
            <div className="flex items-center justify-between">
              <Badge className={badgeClass}>Generated Script</Badge>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" className={smallBtnClass} onClick={handleCopyCiCommand}>
                  CI Command
                </Button>
                <Button type="button" variant="ghost" size="sm" className={smallBtnClass} onClick={handleCopy} disabled={!activeScript.trim()}>
                  {copyState === "copied" ? "Copied!" : "Copy"}
                </Button>
                {scriptTab === "custom" ? (
                  <Button type="button" variant="ghost" size="sm" className={smallBtnClass} onClick={() => setCustomScript("")}>
                    Clear
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" size="sm" className={smallBtnClass} onClick={handleClear}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className={tabBtnClass(scriptTab === "auto")} onClick={() => setScriptTab("auto")}>
                Auto
              </button>
              <button type="button" className={tabBtnClass(scriptTab === "custom")} onClick={() => setScriptTab("custom")}>
                Custom
              </button>
            </div>
            {scriptTab === "custom" ? (
              <Textarea
                value={customScript}
                onChange={(e) => setCustomScript(e.target.value)}
                placeholder="// 직접 작성하세요"
                className="min-h-[500px] w-full resize-none rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4 font-mono text-xs leading-relaxed text-[var(--foreground)] focus:border-[color:var(--card-border-hover)] focus:outline-none"
              />
            ) : (
              <pre className="min-h-[500px] overflow-auto whitespace-pre rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4 font-mono text-xs leading-relaxed text-[var(--foreground)]">
                {outputScript || "// 아직 생성된 스크립트가 없습니다."}
              </pre>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

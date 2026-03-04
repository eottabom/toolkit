"use client";

import { useCallback, useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  ToolActionButton,
  ToolAddButton,
  ToolBadge,
  ToolCard,
  ToolCodeOutput,
  ToolHeader,
  ToolInfoPanel,
  ToolInput,
  ToolLabel,
  ToolPage,
  ToolRemoveButton,
  ToolSelect,
} from "@/components/tool-ui";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

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
  vus: number;
  duration: string;
  stages: RampingStage[];
  iterations: number;
  rate: number;
  timeUnit: string;
  preAllocatedVUs: number;
  maxVUs: number;
};

type Threshold = { metric: string; condition: string };

type ScriptTab = "auto" | "custom";

/* 기본값 */

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];

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

  lines.push("import http from 'k6/http';");
  if (checks.length > 0) {
    lines.push("import { check } from 'k6';");
  }
  lines.push("");

  lines.push("export const options = {");

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

  if (thresholds.length > 0) {
    lines.push("  thresholds: {");
    for (const t of thresholds) {
      lines.push(`    '${t.metric}': ['${t.condition}'],`);
    }
    lines.push("  },");
  }

  lines.push("};");
  lines.push("");

  lines.push("export default function () {");

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

  const hasBody = ["POST", "PUT", "PATCH"].includes(method) && body.trim();
  const paramsArg = hasHeaders ? ", params" : "";

  if (hasBody) {
    lines.push(`  const payload = ${JSON.stringify(body.trim())};`);
    lines.push("");
    lines.push(`  const res = http.${method.toLowerCase()}('${url}', payload${paramsArg});`);
  } else if (method === "GET" || method === "DELETE") {
    lines.push(`  const res = http.${method.toLowerCase()}('${url}'${paramsArg});`);
  } else {
    lines.push(`  const res = http.${method.toLowerCase()}('${url}', null${paramsArg});`);
  }

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
    if (m) {
      maxIndex = Math.max(maxIndex, Number(m[1]));
    }
  }
  return `default_${maxIndex + 1}`;
}

/* 리스트 헬퍼 */

function updateAt<T>(list: T[], idx: number, patch: Partial<T>): T[] {
  return list.map((item, i) => (i === idx ? { ...item, ...patch } : item));
}

function removeAt<T>(list: T[], idx: number): T[] {
  return list.filter((_, i) => i !== idx);
}

/* 서브 컴포넌트 */

function ScenarioCard({
  scenario,
  canRemove,
  onUpdate,
  onRemove,
}: {
  scenario: Scenario;
  canRemove: boolean;
  onUpdate: (patch: Partial<Scenario>) => void;
  onRemove: () => void;
}) {
  const updateStage = (stIdx: number, patch: Partial<RampingStage>) => {
    onUpdate({ stages: updateAt(scenario.stages, stIdx, patch) });
  };
  const addStage = () => {
    onUpdate({ stages: [...scenario.stages, { duration: "10s", target: 0 }] });
  };
  const removeStage = (stIdx: number) => {
    onUpdate({ stages: removeAt(scenario.stages, stIdx) });
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-center justify-between">
        <ToolInput
          value={scenario.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="scenario_name"
          className="w-48 font-mono text-xs"
        />
        {canRemove && <ToolRemoveButton onClick={onRemove} />}
      </div>

      <div className="flex flex-col gap-2">
        <ToolLabel>Executor</ToolLabel>
        <ToolSelect
          value={scenario.type}
          onChange={(e) => onUpdate({ type: e.target.value as ScenarioType })}
        >
          {SCENARIO_TYPES.map((st) => (
            <option key={st.value} value={st.value}>
              {st.label}
            </option>
          ))}
        </ToolSelect>
      </div>

      {scenario.type === "constant-vus" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <ToolLabel>VUs</ToolLabel>
            <ToolInput
              type="number"
              value={scenario.vus}
              onChange={(e) => onUpdate({ vus: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <ToolLabel>Duration</ToolLabel>
            <ToolInput
              value={scenario.duration}
              onChange={(e) => onUpdate({ duration: e.target.value })}
              placeholder="30s"
            />
          </div>
        </div>
      )}

      {scenario.type === "ramping-vus" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <ToolLabel>Stages</ToolLabel>
            <ToolAddButton onClick={addStage}>+ Stage</ToolAddButton>
          </div>
          {scenario.stages.map((st, stIdx) => (
            <div key={stIdx} className="flex items-center gap-2">
              <ToolInput
                value={st.duration}
                onChange={(e) => updateStage(stIdx, { duration: e.target.value })}
                placeholder="10s"
                className="flex-1"
              />
              <span className="text-xs text-[var(--muted)]">&rarr;</span>
              <ToolInput
                type="number"
                value={st.target}
                onChange={(e) => updateStage(stIdx, { target: Number(e.target.value) })}
                placeholder="VUs"
                className="w-20"
              />
              <span className="text-xs text-[var(--muted)]">VUs</span>
              {scenario.stages.length > 1 && (
                <ToolRemoveButton onClick={() => removeStage(stIdx)} />
              )}
            </div>
          ))}
        </div>
      )}

      {scenario.type === "per-vu-iterations" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <ToolLabel>VUs</ToolLabel>
            <ToolInput
              type="number"
              value={scenario.vus}
              onChange={(e) => onUpdate({ vus: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <ToolLabel>Iterations per VU</ToolLabel>
            <ToolInput
              type="number"
              value={scenario.iterations}
              onChange={(e) => onUpdate({ iterations: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {scenario.type === "constant-arrival-rate" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <ToolLabel>Rate</ToolLabel>
            <ToolInput
              type="number"
              value={scenario.rate}
              onChange={(e) => onUpdate({ rate: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <ToolLabel>Time Unit</ToolLabel>
            <ToolInput
              value={scenario.timeUnit}
              onChange={(e) => onUpdate({ timeUnit: e.target.value })}
              placeholder="1s"
            />
          </div>
          <div className="flex flex-col gap-1">
            <ToolLabel>Duration</ToolLabel>
            <ToolInput
              value={scenario.duration}
              onChange={(e) => onUpdate({ duration: e.target.value })}
              placeholder="30s"
            />
          </div>
          <div className="flex flex-col gap-1">
            <ToolLabel>Pre-allocated VUs</ToolLabel>
            <ToolInput
              type="number"
              value={scenario.preAllocatedVUs}
              onChange={(e) => onUpdate({ preAllocatedVUs: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <ToolLabel>Max VUs</ToolLabel>
            <ToolInput
              type="number"
              value={scenario.maxVUs}
              onChange={(e) => onUpdate({ maxVUs: Number(e.target.value) })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* 메인 컴포넌트 */

export default function K6Generator({ tool }: { tool: ToolItem }) {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("https://test.k6.io");
  const [headers, setHeaders] = useState<Header[]>([]);
  const [headerDraft, setHeaderDraft] = useState<Header>({ key: "", value: "" });
  const [body, setBody] = useState("");

  const [scenarios, setScenarios] = useState<Scenario[]>([newScenario("default_1")]);
  const [thresholds, setThresholds] = useState<Threshold[]>([...DEFAULT_THRESHOLDS]);
  const [checks, setChecks] = useState<Check[]>([...DEFAULT_CHECKS]);

  const { copy, isCopied } = useCopyToClipboard();
  const [scriptTab, setScriptTab] = useState<ScriptTab>("auto");
  const [customScript, setCustomScript] = useState("");

  const script = useMemo(
    () => generateScript(method, url, headers, body, scenarios, thresholds, checks),
    [method, url, headers, body, scenarios, thresholds, checks],
  );
  const [clearedScript, setClearedScript] = useState<string | null>(null);
  const outputScript = clearedScript === script ? "" : script;
  const activeScript = scriptTab === "custom" ? customScript : outputScript;

  const handleCopy = useCallback(async () => {
    await copy(activeScript);
  }, [copy, activeScript]);

  const handleClear = () => setClearedScript(script);

  /* 헤더 헬퍼 */
  const addHeader = () => {
    if (!headerDraft.key.trim()) {
      return;
    }
    setHeaders((prev) => [...prev, { ...headerDraft }]);
    setHeaderDraft({ key: "", value: "" });
  };

  /* 시나리오 헬퍼 */
  const updateScenario = (idx: number, patch: Partial<Scenario>) => {
    setScenarios((prev) => updateAt(prev, idx, patch));
  };
  const addScenario = () => {
    setScenarios((prev) => [...prev, newScenario(getNextDefaultScenarioName(prev))]);
  };

  const showBody = ["POST", "PUT", "PATCH"].includes(method);

  const tabBtnClass = (active: boolean) =>
    `cursor-pointer h-8 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
      active
        ? "bg-blue-600 text-white"
        : "border border-[color:var(--card-border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
    }`;

  return (
    <ToolPage>
      <ToolHeader
        title={tool.title}
        description={tool.desc}
        right={
          <div className="self-start text-xs uppercase tracking-[0.2em] text-[var(--muted)] md:self-auto">
            Script Generator
          </div>
        }
      />

      <ToolInfoPanel
        icon="k6"
        title="k6 Performance Test Script"
        description={
          <>
            HTTP 요청, 시나리오, 임계값, 체크를 설정하여 k6 성능 테스트 스크립트를 생성합니다. 생성된 스크립트를{" "}
            <code className="text-[var(--url-panel-accent)]">k6 run script.js</code>로 실행할 수 있습니다.
          </>
        }
        chips={["Ramping VUs", "Constant Arrival Rate", "Thresholds & Checks"]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* 입력 영역 */}
        <div className="flex flex-col gap-5">
          {/* HTTP 요청 */}
          <ToolCard>
            <ToolBadge>HTTP Request</ToolBadge>

            <div className="flex gap-2">
              <ToolSelect
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className="w-28 shrink-0"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </ToolSelect>
              <ToolInput
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/api"
                className="flex-1"
              />
            </div>

            {/* 헤더 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <ToolLabel>Headers</ToolLabel>
                <ToolAddButton onClick={addHeader}>+ Add</ToolAddButton>
              </div>
              <div className="flex gap-2">
                <ToolInput
                  value={headerDraft.key}
                  onChange={(e) => setHeaderDraft((prev) => ({ ...prev, key: e.target.value }))}
                  placeholder="Key"
                  className="flex-1"
                />
                <ToolInput
                  value={headerDraft.value}
                  onChange={(e) => setHeaderDraft((prev) => ({ ...prev, value: e.target.value }))}
                  placeholder="Value"
                  className="flex-1"
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
                      <ToolRemoveButton onClick={() => setHeaders((prev) => removeAt(prev, i))} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 바디 */}
            {showBody && (
              <div className="flex flex-col gap-2">
                <ToolLabel>Request Body</ToolLabel>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="min-h-[100px] w-full resize-none rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4 font-mono text-xs text-[var(--foreground)] focus:border-[color:var(--card-border-hover)] focus:outline-none"
                />
              </div>
            )}
          </ToolCard>

          {/* 시나리오 */}
          <ToolCard>
            <div className="flex items-center justify-between">
              <ToolBadge>Scenarios</ToolBadge>
              <ToolAddButton onClick={addScenario}>+ Add Scenario</ToolAddButton>
            </div>

            {scenarios.map((sc, sIdx) => (
              <ScenarioCard
                key={sIdx}
                scenario={sc}
                canRemove={scenarios.length > 1}
                onUpdate={(patch) => updateScenario(sIdx, patch)}
                onRemove={() => setScenarios((prev) => removeAt(prev, sIdx))}
              />
            ))}
          </ToolCard>

          {/* 임계값 */}
          <ToolCard>
            <div className="flex items-center justify-between">
              <ToolBadge>Thresholds</ToolBadge>
              <ToolAddButton onClick={() => setThresholds((prev) => [...prev, { metric: "", condition: "" }])}>
                + Add
              </ToolAddButton>
            </div>

            {thresholds.map((t, i) => (
              <div key={i} className="flex gap-2">
                <ToolInput
                  value={t.metric}
                  onChange={(e) => setThresholds((prev) => updateAt(prev, i, { metric: e.target.value }))}
                  placeholder="http_req_duration"
                  className="flex-1 font-mono text-xs"
                />
                <ToolInput
                  value={t.condition}
                  onChange={(e) => setThresholds((prev) => updateAt(prev, i, { condition: e.target.value }))}
                  placeholder="p(95)<500"
                  className="flex-1 font-mono text-xs"
                />
                {thresholds.length > 1 && (
                  <ToolRemoveButton onClick={() => setThresholds((prev) => removeAt(prev, i))} />
                )}
              </div>
            ))}
          </ToolCard>

          {/* 체크 */}
          <ToolCard>
            <div className="flex items-center justify-between">
              <ToolBadge>Checks</ToolBadge>
              <ToolAddButton onClick={() => setChecks((prev) => [...prev, { name: "", expression: "" }])}>
                + Add
              </ToolAddButton>
            </div>

            {checks.map((c, i) => (
              <div key={i} className="flex gap-2">
                <ToolInput
                  value={c.name}
                  onChange={(e) => setChecks((prev) => updateAt(prev, i, { name: e.target.value }))}
                  placeholder="status is 200"
                  className="flex-1"
                />
                <ToolInput
                  value={c.expression}
                  onChange={(e) => setChecks((prev) => updateAt(prev, i, { expression: e.target.value }))}
                  placeholder="res.status === 200"
                  className="flex-1 font-mono text-xs"
                />
                {checks.length > 1 && (
                  <ToolRemoveButton onClick={() => setChecks((prev) => removeAt(prev, i))} />
                )}
              </div>
            ))}
          </ToolCard>
        </div>

        {/* 스크립트 미리보기 */}
        <div className="flex flex-col gap-5">
          <ToolCard>
            <div className="flex items-center justify-between">
              <ToolBadge>Generated Script</ToolBadge>
              <div className="flex items-center gap-2">
                <ToolActionButton type="button" onClick={handleCopy} disabled={!activeScript.trim()}>
                  {isCopied() ? "Copied!" : "Copy"}
                </ToolActionButton>
                {scriptTab === "custom" ? (
                  <ToolActionButton type="button" onClick={() => setCustomScript("")}>
                    Clear
                  </ToolActionButton>
                ) : (
                  <ToolActionButton type="button" onClick={handleClear}>
                    Clear
                  </ToolActionButton>
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
              <ToolCodeOutput className="min-h-[500px]">
                {outputScript || "// 아직 생성된 스크립트가 없습니다."}
              </ToolCodeOutput>
            )}
          </ToolCard>
        </div>
      </div>
    </ToolPage>
  );
}

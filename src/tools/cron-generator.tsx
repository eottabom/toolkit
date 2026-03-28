"use client";

import { useCallback, useMemo, useState } from "react";
import {
  FIELD_DEFS,
  PLATFORMS,
  PRESETS,
  SECOND_DEF,
  YEAR_DEF,
  buildExpression,
  defaultField,
  describeExpression,
  fieldToExpression,
  getNextExecutions,
  type CronPlatform,
  type FieldKey,
  type FieldMode,
  type FieldState,
  type Preset,
  validateExpression,
} from "@eottabom/cron-core";
import { ToolActionButton, ToolBadge, ToolCard, ToolHeader, ToolInfoPanel, ToolInput, ToolPage } from "@/components/tool-ui";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

import type { ToolItem } from "@/lib/tools";

/* 컴포넌트 */

export default function CronGenerator({ tool }: { tool: ToolItem }) {
  const [platform, setPlatform] = useState<CronPlatform>("linux");
  const [fields, setFields] = useState<Record<FieldKey, FieldState>>(() => {
    const result = {} as Record<FieldKey, FieldState>;
    for (const def of FIELD_DEFS.linux) {
      result[def.key] = defaultField(def);
    }
    result.second = defaultField(SECOND_DEF);
    result.year = defaultField(YEAR_DEF);
    return result;
  });

  /* 수동 입력 모드 */
  const [manualMode, setManualMode] = useState(false);
  const [manualExpr, setManualExpr] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  /* Jenkins 해시 시드 (0~59) */
  const [hashSeed, setHashSeed] = useState(7);

  const { copy, isCopied } = useCopyToClipboard();

  const expression = useMemo(() => buildExpression(fields, platform), [fields, platform]);
  const description = useMemo(() => describeExpression(fields, platform), [fields, platform]);

  const activeExpr = manualMode ? manualExpr : expression;
  const breakdownParts = useMemo(() => activeExpr.trim().split(/\s+/).filter(Boolean), [activeExpr]);

  const validation = useMemo(() => {
    if (!activeExpr.trim()) {
      return null;
    }
    return validateExpression(activeExpr, platform);
  }, [activeExpr, platform]);

  const nextExecutions = useMemo(() => {
    if (!activeExpr.trim() || (validation && !validation.valid)) {
      return [];
    }
    return getNextExecutions(activeExpr, platform, 5, platform === "jenkins" ? hashSeed : undefined);
  }, [activeExpr, platform, validation, hashSeed]);

  const handlePlatformChange = useCallback(
    (p: CronPlatform) => {
      setPlatform(p);

      const jenkinsModes: FieldMode[] = ["hash", "hashInterval", "hashRange"];
      const standardOnlyModes: FieldMode[] = ["interval", "specific"];

      const isValidMode = (mode: FieldMode, target: CronPlatform): boolean => {
        if (target === "jenkins" && standardOnlyModes.includes(mode)) {
          return false;
        }
        if (target !== "jenkins" && jenkinsModes.includes(mode)) {
          return false;
        }
        return true;
      };

      // 새 플랫폼에 맞게 필드 초기화
      const result = {} as Record<FieldKey, FieldState>;
      for (const def of FIELD_DEFS[p]) {
        if (fields[def.key]) {
          const existing = { ...fields[def.key] };
          if (!isValidMode(existing.mode, p)) {
            existing.mode = "every";
          }
          result[def.key] = existing;
        } else {
          result[def.key] = defaultField(def);
        }
      }
      if (!result.second) {
        result.second = defaultField(SECOND_DEF);
      }
      if (!result.year) {
        result.year = defaultField(YEAR_DEF);
      }
      setFields(result);
      setSelectedPreset(null);
    },
    [fields],
  );

  const applyPreset = useCallback(
    (preset: Preset) => {
      setFields(preset.apply(platform));
      setManualMode(false);
      setSelectedPreset(preset.label);
    },
    [platform],
  );

  const updateField = useCallback((key: FieldKey, patch: Partial<FieldState>) => {
    setSelectedPreset(null);
    setFields((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  const toggleSpecific = useCallback((key: FieldKey, val: number) => {
    setSelectedPreset(null);
    setFields((prev) => {
      const field = prev[key];
      const specific = field.specific.includes(val) ? field.specific.filter((v) => v !== val) : [...field.specific, val];
      return { ...prev, [key]: { ...field, mode: "specific", specific } };
    });
  }, []);

  const handleCopy = useCallback(async () => {
    await copy(activeExpr);
  }, [copy, activeExpr]);

  /* 스타일 */
  const tabBtnClass = (active: boolean) =>
    `cursor-pointer h-9 rounded-xl px-3 text-xs font-semibold tracking-[0.06em] transition hover:brightness-95 ${
      active
        ? "border border-[color:var(--utc-to-local-output-border)] bg-[var(--utc-to-local-output-bg)] text-[var(--foreground)]"
        : "border border-[color:var(--card-border)] bg-[var(--surface-muted)] text-[var(--foreground)]"
    }`;

  const currentDefs = FIELD_DEFS[platform];
  const standardModes: { value: FieldMode; label: string }[] = [
    { value: "every", label: "매번 (*)" },
    { value: "specific", label: "특정 값" },
    { value: "range", label: "범위 (n-m)" },
    { value: "interval", label: "간격 (*/n)" },
  ];
  const jenkinsModes: { value: FieldMode; label: string }[] = [
    { value: "every", label: "매번 (*)" },
    { value: "hash", label: "H (해시)" },
    { value: "hashInterval", label: "H/n (해시 간격)" },
    { value: "hashRange", label: "H(n-m) (해시 범위)" },
  ];
  const getModesForField = () => platform === "jenkins" ? jenkinsModes : standardModes;

  return (
    <ToolPage>
      <ToolHeader
        title={tool.title}
        description={tool.desc}
        right={
          <div className="self-start text-xs uppercase tracking-[0.2em] text-[var(--muted)] md:self-auto">
            Expression Builder
          </div>
        }
      />

      <ToolInfoPanel
        icon="⏰"
        title="Cron Expression Generator"
        description={
          <>
            UI 기반으로 cron 표현식을 생성하거나, 직접 입력하여 유효성을 검사합니다.
            Linux, Jenkins, Spring, Quartz 등 다양한 플랫폼 형식을 지원합니다.
          </>
        }
        chips={["Linux (5필드)", "Jenkins (H)", "Spring (6필드)", "Quartz (7필드)"]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* 입력 영역 */}
        <div className="flex flex-col gap-5">
          {/* 플랫폼 선택 */}
          <ToolCard>
            <ToolBadge>Platform</ToolBadge>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handlePlatformChange(p.value)}
                  className={`cursor-pointer flex flex-col gap-1 rounded-2xl border p-3 text-left transition hover:brightness-95 ${
                    platform === p.value
                      ? "border-[color:var(--utc-to-local-output-border)] bg-[var(--utc-to-local-output-bg)] text-[var(--foreground)]"
                      : "border-[color:var(--card-border)] bg-[var(--surface-muted)] text-[var(--muted)] hover:brightness-95"
                  }`}
                >
                  <span className="text-sm font-semibold">{p.label}</span>
                  <span className="text-[10px]">{p.desc}</span>
                </button>
              ))}
            </div>
          </ToolCard>

          {/* 프리셋 */}
          <ToolCard>
            <ToolBadge>Presets</ToolBadge>
            <div className="flex flex-wrap gap-2">
              {PRESETS.filter((pr) => pr.platforms.includes(platform)).map((pr) => (
                <button
                  key={pr.label}
                  type="button"
                  onClick={() => applyPreset(pr)}
                  className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:brightness-95 ${
                    selectedPreset === pr.label
                      ? "border-[color:var(--utc-to-local-output-border)] bg-[var(--utc-to-local-output-bg)]"
                      : "border-[color:var(--card-border)] bg-[var(--surface-muted)]"
                  }`}
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </ToolCard>

          {/* 모드 전환 */}
          <div className="flex items-center gap-2">
            <button type="button" className={tabBtnClass(!manualMode)} onClick={() => setManualMode(false)}>
              UI Builder
            </button>
            <button type="button" className={tabBtnClass(manualMode)} onClick={() => setManualMode(true)}>
              Manual Input
            </button>
          </div>

          {manualMode ? (
            <ToolCard>
              <ToolBadge>Expression Input</ToolBadge>
              <ToolInput
                value={manualExpr}
                onChange={(e) => setManualExpr(e.target.value)}
                placeholder={platform === "quartz" ? "0 0 12 * * ? 2025" : platform === "spring" ? "0 0 12 * * *" : platform === "jenkins" ? "H H * * *" : "0 12 * * *"}
                className="w-full font-mono"
                aria-label="Cron expression"
              />
              <p className="text-xs text-[var(--muted)]">
                {platform === "linux" && "형식: 분 시 일 월 요일"}
                {platform === "jenkins" && "형식: 분 시 일 월 요일 — H, H/n, H(n-m) 사용"}
                {platform === "spring" && "형식: 초 분 시 일 월 요일"}
                {platform === "quartz" && "형식: 초 분 시 일 월 요일 연도"}
              </p>
              {validation && !validation.valid && (
                <div className="flex flex-col gap-1.5">
                  {validation.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl bg-[color:var(--error)]/10 px-3 py-2">
                      <span className="text-xs text-[color:var(--error)]">{err}</span>
                    </div>
                  ))}
                </div>
              )}
              {validation?.valid && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">유효한 표현식입니다.</span>
                </div>
              )}
            </ToolCard>
          ) : (
            /* 필드별 설정 */
            <div className="flex flex-col gap-4">
              {currentDefs.map((def) => (
                <ToolCard key={def.key}>
                  <div className="flex items-center justify-between">
                    <ToolBadge>{def.label}</ToolBadge>
                    <span className="font-mono text-xs text-[var(--muted)]">
                      {fieldToExpression(fields[def.key], def)}
                    </span>
                  </div>

                  {/* 모드 선택 */}
                  <div className="flex flex-wrap gap-1.5">
                    {getModesForField().map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => updateField(def.key, { mode: m.value })}
                  className={`cursor-pointer rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition hover:brightness-95 ${
                          fields[def.key].mode === m.value
                            ? "border-[color:var(--utc-to-local-output-border)] bg-[var(--utc-to-local-output-bg)] text-[var(--foreground)]"
                            : "border-[color:var(--card-border)] bg-[var(--surface-muted)] text-[var(--foreground)]"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* 모드별 UI */}
                  {fields[def.key].mode === "specific" && (
                    def.key === "weekday" ? (
                      /* 요일: 드롭다운 체크박스 */
                      <div className="flex flex-col gap-1.5 rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-2">
                        {Array.from({ length: def.max - def.min + 1 }, (_, i) => def.min + i).map((v) => (
                          <label
                            key={v}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-[var(--surface)]"
                          >
                            <input
                              type="checkbox"
                              checked={fields[def.key].specific.includes(v)}
                              onChange={() => toggleSpecific(def.key, v)}
                              className="h-3.5 w-3.5 cursor-pointer rounded accent-blue-600"
                            />
                            <span className="font-medium text-[var(--foreground)]">
                              {def.names ? (def.names[v] ?? v) : v}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : def.key === "month" ? (
                      /* 월: 체크박스 */
                      <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-2 sm:grid-cols-3">
                        {Array.from({ length: def.max - def.min + 1 }, (_, i) => def.min + i).map((v) => (
                          <label
                            key={v}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-[var(--surface)]"
                          >
                            <input
                              type="checkbox"
                              checked={fields[def.key].specific.includes(v)}
                              onChange={() => toggleSpecific(def.key, v)}
                              className="h-3.5 w-3.5 cursor-pointer rounded accent-blue-600"
                            />
                            <span className="font-medium text-[var(--foreground)]">
                              {v}월 ({def.names?.[v] ?? v})
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      /* 초/분/시/일/연도: 텍스트 입력 */
                      <div className="flex flex-col gap-1.5">
                        <ToolInput
                          value={[...fields[def.key].specific].sort((a, b) => a - b).join(", ")}
                          onChange={(e) => {
                            const vals = e.target.value
                              .split(",")
                              .map((s) => parseInt(s.trim()))
                              .filter((n) => !isNaN(n) && n >= def.min && n <= def.max);
                            updateField(def.key, { specific: vals });
                          }}
                          placeholder={`${def.min}~${def.max} 쉼표로 구분 (예: 0, 15, 30)`}
                          className="w-full font-mono text-xs"
                          aria-label={`${def.label} specific values`}
                        />
                        <p className="text-[10px] text-[var(--muted)]">범위: {def.min}~{def.max}</p>
                      </div>
                    )
                  )}

                  {fields[def.key].mode === "range" && (
                    <div className="flex items-center gap-2">
                      <ToolInput
                        type="number"
                        min={def.min}
                        max={def.max}
                        value={fields[def.key].rangeStart}
                        onChange={(e) => updateField(def.key, { rangeStart: Number(e.target.value) })}
                        className="w-20"
                        aria-label={`${def.label} range start`}
                      />
                      <span className="text-xs text-[var(--muted)]">~</span>
                      <ToolInput
                        type="number"
                        min={def.min}
                        max={def.max}
                        value={fields[def.key].rangeEnd}
                        onChange={(e) => updateField(def.key, { rangeEnd: Number(e.target.value) })}
                        className="w-20"
                        aria-label={`${def.label} range end`}
                      />
                    </div>
                  )}

                  {fields[def.key].mode === "interval" && (
                    <div className="flex items-center gap-2">
                      <ToolInput
                        type="number"
                        min={def.min}
                        max={def.max}
                        value={fields[def.key].intervalBase}
                        onChange={(e) => updateField(def.key, { intervalBase: Number(e.target.value) })}
                        className="w-20"
                        aria-label={`${def.label} interval base`}
                      />
                      <span className="text-xs text-[var(--muted)]">부터 매</span>
                      <ToolInput
                        type="number"
                        min={1}
                        value={fields[def.key].intervalStep}
                        onChange={(e) => updateField(def.key, { intervalStep: Number(e.target.value) })}
                        className="w-20"
                        aria-label={`${def.label} interval step`}
                      />
                      <span className="text-xs text-[var(--muted)]">마다</span>
                    </div>
                  )}

                  {platform === "jenkins" && fields[def.key].mode === "hash" && (
                    <p className="text-xs text-[var(--muted)]">Jenkins가 빌드별로 자동 분산합니다.</p>
                  )}

                  {platform === "jenkins" && fields[def.key].mode === "hashInterval" && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--muted)]">H /</span>
                      <ToolInput
                        type="number"
                        min={1}
                        value={fields[def.key].intervalStep}
                        onChange={(e) => updateField(def.key, { intervalStep: Number(e.target.value) })}
                        className="w-20"
                        aria-label={`${def.label} hash interval`}
                      />
                    </div>
                  )}

                  {platform === "jenkins" && fields[def.key].mode === "hashRange" && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--muted)]">H(</span>
                      <ToolInput
                        type="number"
                        min={def.min}
                        max={def.max}
                        value={fields[def.key].rangeStart}
                        onChange={(e) => updateField(def.key, { rangeStart: Number(e.target.value) })}
                        className="w-20"
                        aria-label={`${def.label} hash range start`}
                      />
                      <span className="font-mono text-xs text-[var(--muted)]">-</span>
                      <ToolInput
                        type="number"
                        min={def.min}
                        max={def.max}
                        value={fields[def.key].rangeEnd}
                        onChange={(e) => updateField(def.key, { rangeEnd: Number(e.target.value) })}
                        className="w-20"
                        aria-label={`${def.label} hash range end`}
                      />
                      <span className="font-mono text-xs text-[var(--muted)]">)</span>
                    </div>
                  )}
                </ToolCard>
              ))}
            </div>
          )}
        </div>

        {/* 결과 영역 */}
        <div className="flex flex-col gap-5">
          {/* 생성된 표현식 */}
          <ToolCard>
            <div className="flex items-center justify-between">
              <ToolBadge>Generated Expression</ToolBadge>
              <ToolActionButton type="button" onClick={handleCopy} tone="teal" disabled={!activeExpr.trim()}>
                {isCopied() ? "Copied!" : "Copy"}
              </ToolActionButton>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-4 py-4">
              <code className="flex-1 text-lg font-bold text-[var(--foreground)]">{activeExpr || "* * * * *"}</code>
            </div>
            <p className="text-xs text-[var(--muted)]">{description}</p>
          </ToolCard>

          {/* 필드 분해 */}
          {!manualMode && (
            <ToolCard>
              <ToolBadge>Field Breakdown</ToolBadge>
              <div className="flex flex-col gap-1.5">
                {currentDefs.map((def, i) => (
                    <div
                      key={def.key}
                      className="flex items-center justify-between rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-3 py-2"
                    >
                      <span className="text-xs text-[var(--muted)]">{def.label}</span>
                      <code className="text-xs font-semibold text-[var(--foreground)]">{breakdownParts[i] ?? "*"}</code>
                    </div>
                  ))}
              </div>
            </ToolCard>
          )}

          {/* 다음 실행 시간 */}
          <ToolCard>
            <ToolBadge>Next Executions</ToolBadge>
            {platform === "jenkins" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted)]">해시 시드</span>
                  <ToolInput
                    type="number"
                    min={0}
                    max={59}
                    value={hashSeed}
                    onChange={(e) => setHashSeed(Number(e.target.value))}
                    className="w-20"
                    aria-label="해시 시드값"
                  />
                  <span className="text-[10px] text-[var(--muted)]">실제 값은 잡 이름에 따라 다릅니다</span>
                </div>
              </div>
            )}
            {nextExecutions.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {nextExecutions.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-3 py-2"
                  >
                    <span className="text-xs text-[var(--muted)]">#{i + 1}</span>
                    <code className="text-xs font-semibold text-[var(--foreground)]">
                      {d.toLocaleString("ko-KR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        weekday: "short",
                      })}
                    </code>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)]">
                {activeExpr.trim() ? "다음 실행 시간을 계산할 수 없습니다." : "표현식을 생성하면 다음 실행 시간을 표시합니다."}
              </p>
            )}
          </ToolCard>

          {/* 플랫폼 참고 */}
          <ToolCard>
            <ToolBadge>Reference</ToolBadge>
            <div className="flex flex-col gap-2 text-xs text-[var(--muted)]">
              {platform === "linux" && (
                <>
                  <p className="font-semibold text-[var(--foreground)]">Linux Cron (5필드)</p>
                  <code className="rounded-lg bg-[var(--surface-muted)] px-2 py-1 font-mono">분 시 일 월 요일</code>
                  <p>* = 모든 값, , = 목록, - = 범위, / = 간격</p>
                </>
              )}
              {platform === "jenkins" && (
                <>
                  <p className="font-semibold text-[var(--foreground)]">Jenkins Cron (5필드 + H)</p>
                  <code className="rounded-lg bg-[var(--surface-muted)] px-2 py-1 font-mono">분 시 일 월 요일</code>
                  <p>H = 해시 기반 분산 (빌드 부하 분산 용도)</p>
                  <p>H/15 = 해시 기반 15분 간격</p>
                </>
              )}
              {platform === "spring" && (
                <>
                  <p className="font-semibold text-[var(--foreground)]">Spring Cron (6필드)</p>
                  <code className="rounded-lg bg-[var(--surface-muted)] px-2 py-1 font-mono">초 분 시 일 월 요일</code>
                  <p>@Scheduled(cron = &quot;0 0 12 * * *&quot;)</p>
                </>
              )}
              {platform === "quartz" && (
                <>
                  <p className="font-semibold text-[var(--foreground)]">Quartz Cron (7필드)</p>
                  <code className="rounded-lg bg-[var(--surface-muted)] px-2 py-1 font-mono">초 분 시 일 월 요일 연도</code>
                  <p>? = 미지정 (일/요일 중 하나에 사용)</p>
                  <p>요일: 1(SUN) ~ 7(SAT)</p>
                </>
              )}
            </div>
          </ToolCard>
        </div>
      </div>
    </ToolPage>
  );
}

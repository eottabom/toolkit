"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToolActionButton, ToolCard, ToolHeader, ToolInfoPanel, ToolPage } from "@/components/tool-ui";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

import type { ToolItem } from "@/lib/tools";

type Mode = "calculate" | "reverse" | "quick";
type MemoryUnit = "MB" | "GB";

function toMB(value: number, unit: MemoryUnit): number {
  return unit === "GB" ? value * 1024 : value;
}

function formatMB(mb: number): string {
  if (mb >= 1024 && mb % 1024 === 0) return `${mb / 1024}G`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)}G`;
  return `${Math.round(mb)}M`;
}

/** JVM 메모리 문자열("512M", "1G", "1048576K" 등)을 MB로 변환 */
function parseMemSize(s: string): number | null {
  const m = s.trim().match(/^(\d+(?:\.\d+)?)\s*([KMGT]?)B?$/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  switch (m[2].toUpperCase()) {
    case "K":
      return v / 1024;
    case "M":
    case "":
      return v;
    case "G":
      return v * 1024;
    case "T":
      return v * 1024 * 1024;
    default:
      return v;
  }
}

/** JVM 플래그 문자열에서 알려진 메모리 플래그를 추출 */
function parseJvmFlags(flags: string) {
  const result: {
    heapMB?: number;
    metaspaceMB?: number;
    codeCacheMB?: number;
    directMemoryMB?: number;
    stackSizeMB?: number;
  } = {};
  const patterns: Array<{ re: RegExp; key: keyof typeof result }> = [
    { re: /-Xmx(\S+)/i, key: "heapMB" },
    { re: /-XX:MaxMetaspaceSize=(\S+)/i, key: "metaspaceMB" },
    { re: /-XX:ReservedCodeCacheSize=(\S+)/i, key: "codeCacheMB" },
    { re: /-XX:MaxDirectMemorySize=(\S+)/i, key: "directMemoryMB" },
    { re: /-Xss(\S+)/i, key: "stackSizeMB" },
  ];
  for (const { re, key } of patterns) {
    const m = flags.match(re);
    if (m) {
      const v = parseMemSize(m[1]);
      if (v !== null) result[key] = v;
    }
  }
  return result;
}

const COLORS = [
  "var(--chart-heap, #22c55e)",
  "var(--chart-metaspace, #3b82f6)",
  "var(--chart-codecache, #a855f7)",
  "var(--chart-threads, #f59e0b)",
  "var(--chart-direct, #ec4899)",
  "var(--chart-headroom, #64748b)",
];

function ResultPanel({
  regions,
  totalMB,
  heapMB,
  isError,
  jvmFlags,
  recommendedTotal,
  usageRegions,
}: {
  regions: Array<{ label: string; mb: number }>;
  totalMB: number;
  heapMB: number;
  isError: boolean;
  jvmFlags: string;
  recommendedTotal?: number;
  usageRegions?: Array<{ label: string; mb: number }>;
}) {
  const { copy, isCopied } = useCopyToClipboard();

  return (
    <ToolCard className="gap-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Memory Allocation</h3>

      {/* 추천 모드 결과 */}
      {recommendedTotal !== undefined && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
          Recommended Total Memory:{" "}
          <strong>
            {formatMB(Math.ceil(recommendedTotal))} ({Math.ceil(recommendedTotal)} MB)
          </strong>
        </div>
      )}

      {/* 오류 표시 */}
      {isError && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
          Not enough memory. Heap would be <strong>{heapMB.toFixed(1)} MB</strong>. Increase total memory or reduce
          other allocations.
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex h-8 w-full overflow-hidden rounded-lg">
          {regions.map((region, i) => {
            const pct = totalMB > 0 ? Math.max(0, (region.mb / totalMB) * 100) : 0;
            if (pct <= 0) return null;
            return (
              <div
                key={region.label}
                style={{
                  width: `${pct}%`,
                  backgroundColor: COLORS[i % COLORS.length],
                  minWidth: pct > 0 ? "2px" : 0,
                }}
                className="transition-all duration-300"
                title={`${region.label}: ${region.mb.toFixed(1)} MB (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {usageRegions && (
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)] mb-1">
            <span>Region</span>
            <span className="text-right">Usage</span>
            <span className="text-right">Recommended</span>
          </div>
        )}
        {regions.map((region, i) => {
          const pct = totalMB > 0 ? (region.mb / totalMB) * 100 : 0;
          const isNegative = region.mb < 0;
          const usage = usageRegions?.[i];
          return (
            <div key={region.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-[var(--foreground)]">{region.label}</span>
              </div>
              <div className="flex items-center gap-3">
                {usage && <span className="font-mono text-[var(--muted)] opacity-60">{usage.mb.toFixed(1)} MB</span>}
                <span className={`font-mono ${isNegative ? "text-red-600 dark:text-red-400" : "text-[var(--muted)]"}`}>
                  {region.mb.toFixed(1)} MB ({pct.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
        <div className="mt-1 flex items-center justify-between border-t border-[color:var(--card-border)] pt-2 text-xs font-semibold">
          <span className="text-[var(--foreground)]">Total</span>
          <span className="font-mono text-[var(--foreground)]">{totalMB.toFixed(1)} MB</span>
        </div>
      </div>

      {/* JVM 플래그 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">JVM Flags</h4>
          <ToolActionButton
            type="button"
            onClick={() => copy(jvmFlags)}
            disabled={isError}
          >
            {isCopied() ? "Copied" : "Copy"}
          </ToolActionButton>
        </div>
        <div
          className={`whitespace-pre-wrap rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-3 font-mono text-xs leading-relaxed ${
            isError ? "text-red-500 dark:text-red-400" : "text-[var(--foreground)]"
          }`}
        >
          {isError ? "Cannot generate flags — heap is negative." : jvmFlags}
        </div>
      </div>

      {/* 계산식 */}
      <details open className="text-xs text-[var(--muted)]">
        <summary className="cursor-pointer font-semibold uppercase tracking-[0.2em] hover:text-[var(--foreground)]">
          Formula
        </summary>
        <div className="mt-2 rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-3 font-mono leading-relaxed">
          <p>Metaspace = (5,800 x loadedClassCount) + 14,000,000 bytes</p>
          <p>Thread Stacks = stackSize x threadCount</p>
          <p>Headroom = totalMemory x (headRoom% / 100)</p>
          <p className="mt-1 font-semibold">
            Heap = Total - Metaspace - CodeCache - ThreadStacks - DirectMemory - Headroom
          </p>
        </div>
      </details>
    </ToolCard>
  );
}

export default function JavaMemoryCalculator({ tool }: { tool: ToolItem }) {
  const [mode, setMode] = useState<Mode>("calculate");

  /* 계산 모드 상태 */
  const [totalMemory, setTotalMemory] = useState(1);
  const [memoryUnit, setMemoryUnit] = useState<MemoryUnit>("GB");
  const [fwLoadedClassCount, setFwLoadedClassCount] = useState(20000);
  const [fwThreadCount, setFwThreadCount] = useState(250);
  const [fwHeadRoomPercent, setFwHeadRoomPercent] = useState(0);
  const [fwStackSizeMB, setFwStackSizeMB] = useState(1);
  const [fwCodeCacheMB, setFwCodeCacheMB] = useState(240);
  const [fwDirectMemoryMB, setFwDirectMemoryMB] = useState(10);

  /* 추천 모드 상태: 실제 사용량 */
  const [revHeapUsageMB, setRevHeapUsageMB] = useState(300);
  const [revMetaspaceUsageMB, setRevMetaspaceUsageMB] = useState(80);
  const [revCodeCacheUsageMB, setRevCodeCacheUsageMB] = useState(50);
  const [revThreadCount, setRevThreadCount] = useState(250);
  const [revStackSizeMB, setRevStackSizeMB] = useState(1);
  const [revDirectMemoryUsageMB, setRevDirectMemoryUsageMB] = useState(5);
  /* 추천 모드 상태: 버퍼 비율 */
  const [heapBuffer, setHeapBuffer] = useState(50);
  const [metaspaceBuffer, setMetaspaceBuffer] = useState(30);
  const [codeCacheBuffer, setCodeCacheBuffer] = useState(20);
  const [directMemoryBuffer, setDirectMemoryBuffer] = useState(50);
  const [revHeadRoomPercent, setRevHeadRoomPercent] = useState(3);
  const [flagsInput, setFlagsInput] = useState("");

  /* 빠른 추천 모드 상태 */
  const [quickTotalMemory, setQuickTotalMemory] = useState(1);
  const [quickMemoryUnit, setQuickMemoryUnit] = useState<MemoryUnit>("GB");

  /* JVM 플래그를 파싱해 "현재 사용량"에 반영 */
  const handleParseFlags = () => {
    if (!flagsInput.trim()) return;
    const parsed = parseJvmFlags(flagsInput);
    if (parsed.heapMB !== undefined) setRevHeapUsageMB(parsed.heapMB);
    if (parsed.metaspaceMB !== undefined) setRevMetaspaceUsageMB(parsed.metaspaceMB);
    if (parsed.codeCacheMB !== undefined) setRevCodeCacheUsageMB(parsed.codeCacheMB);
    if (parsed.directMemoryMB !== undefined) setRevDirectMemoryUsageMB(parsed.directMemoryMB);
    if (parsed.stackSizeMB !== undefined) setRevStackSizeMB(parsed.stackSizeMB);
  };

  /* 계산 모드 결과 */
  const calculateResult = useMemo(() => {
    const totalMB = toMB(totalMemory, memoryUnit);
    const totalBytes = totalMB * 1024 * 1024;
    const headroomBytes = totalBytes * (fwHeadRoomPercent / 100);
    const metaspaceBytes = 5800 * fwLoadedClassCount + 14000000;
    const threadStacksBytes = fwStackSizeMB * 1024 * 1024 * fwThreadCount;

    const heapBytes =
      totalBytes -
      headroomBytes -
      metaspaceBytes -
      fwCodeCacheMB * 1024 * 1024 -
      threadStacksBytes -
      fwDirectMemoryMB * 1024 * 1024;
    const heapMB = heapBytes / (1024 * 1024);
    const metaspaceMB = metaspaceBytes / (1024 * 1024);
    const threadStacksMB = threadStacksBytes / (1024 * 1024);
    const headroomMB = headroomBytes / (1024 * 1024);
    const isError = heapBytes < 0;

    const regions = [
      { label: "Heap", mb: heapMB },
      { label: "Metaspace", mb: metaspaceMB },
      { label: "Code Cache", mb: fwCodeCacheMB },
      { label: "Thread Stacks", mb: threadStacksMB },
      { label: "Direct Memory", mb: fwDirectMemoryMB },
      { label: "Headroom", mb: headroomMB },
    ];

    const heapFormatted = formatMB(Math.floor(heapMB));
    const jvmFlags = isError
      ? ""
      : `-Xms${heapFormatted} -Xmx${heapFormatted} -XX:MaxMetaspaceSize=${formatMB(Math.ceil(metaspaceMB))} -XX:ReservedCodeCacheSize=${formatMB(fwCodeCacheMB)} -XX:MaxDirectMemorySize=${formatMB(fwDirectMemoryMB)}`;

    return { totalMB, regions, heapMB, isError, jvmFlags };
  }, [
    totalMemory,
    memoryUnit,
    fwLoadedClassCount,
    fwThreadCount,
    fwHeadRoomPercent,
    fwStackSizeMB,
    fwCodeCacheMB,
    fwDirectMemoryMB,
  ]);

  /* 추천 모드 계산: 사용량 × (1 + 버퍼%) = 권장 할당량 */
  const reverseResult = useMemo(() => {
    const recHeapMB = revHeapUsageMB * (1 + heapBuffer / 100);
    const recMetaspaceMB = revMetaspaceUsageMB * (1 + metaspaceBuffer / 100);
    const recCodeCacheMB = revCodeCacheUsageMB * (1 + codeCacheBuffer / 100);
    const threadStacksMB = revStackSizeMB * revThreadCount;
    const recDirectMemoryMB = revDirectMemoryUsageMB * (1 + directMemoryBuffer / 100);

    const sumMB = recHeapMB + recMetaspaceMB + recCodeCacheMB + threadStacksMB + recDirectMemoryMB;
    const headroomFactor = revHeadRoomPercent > 0 ? 1 - revHeadRoomPercent / 100 : 1;
    const recommendedTotal = headroomFactor > 0 ? sumMB / headroomFactor : sumMB;
    const headroomMB = recommendedTotal - sumMB;

    const regions = [
      { label: "Heap", mb: recHeapMB },
      { label: "Metaspace", mb: recMetaspaceMB },
      { label: "Code Cache", mb: recCodeCacheMB },
      { label: "Thread Stacks", mb: threadStacksMB },
      { label: "Direct Memory", mb: recDirectMemoryMB },
      { label: "Headroom", mb: headroomMB },
    ];

    const usageRegions = [
      { label: "Heap", mb: revHeapUsageMB },
      { label: "Metaspace", mb: revMetaspaceUsageMB },
      { label: "Code Cache", mb: revCodeCacheUsageMB },
      { label: "Thread Stacks", mb: threadStacksMB },
      { label: "Direct Memory", mb: revDirectMemoryUsageMB },
      { label: "Headroom", mb: 0 },
    ];

    const heapFormatted = formatMB(Math.floor(recHeapMB));
    const jvmFlags = `-Xms${heapFormatted} -Xmx${heapFormatted} -XX:MaxMetaspaceSize=${formatMB(Math.ceil(recMetaspaceMB))} -XX:ReservedCodeCacheSize=${formatMB(Math.ceil(recCodeCacheMB))} -XX:MaxDirectMemorySize=${formatMB(Math.ceil(recDirectMemoryMB))}`;

    return {
      totalMB: recommendedTotal,
      regions,
      usageRegions,
      heapMB: recHeapMB,
      isError: false,
      jvmFlags,
      recommendedTotal,
    };
  }, [
    revHeapUsageMB,
    revMetaspaceUsageMB,
    revCodeCacheUsageMB,
    revThreadCount,
    revStackSizeMB,
    revDirectMemoryUsageMB,
    heapBuffer,
    metaspaceBuffer,
    codeCacheBuffer,
    directMemoryBuffer,
    revHeadRoomPercent,
  ]);

  /* 빠른 추천: 총 메모리 → 빌드팩 기본값으로 자동 추천 */
  const quickResult = useMemo(() => {
    const totalMB = toMB(quickTotalMemory, quickMemoryUnit);
    const totalBytes = totalMB * 1024 * 1024;

    const loadedClassCount = 20000;
    const threadCount = 250;
    const stackSizeMB = 1;
    const codeCacheMB = 240;
    const directMemoryMB = 10;

    const metaspaceBytes = 5800 * loadedClassCount + 14000000;
    const threadStacksBytes = stackSizeMB * 1024 * 1024 * threadCount;

    const heapBytes =
      totalBytes - metaspaceBytes - codeCacheMB * 1024 * 1024 - threadStacksBytes - directMemoryMB * 1024 * 1024;
    const heapMB = heapBytes / (1024 * 1024);
    const metaspaceMB = metaspaceBytes / (1024 * 1024);
    const threadStacksMB = threadStacksBytes / (1024 * 1024);
    const isError = heapBytes < 0;

    const regions = [
      { label: "Heap", mb: heapMB },
      { label: "Metaspace", mb: metaspaceMB },
      { label: "Code Cache", mb: codeCacheMB },
      { label: "Thread Stacks", mb: threadStacksMB },
      { label: "Direct Memory", mb: directMemoryMB },
      { label: "Headroom", mb: 0 },
    ];

    const heapFormatted = formatMB(Math.floor(heapMB));
    const jvmFlags = isError
      ? ""
      : `-Xms${heapFormatted} -Xmx${heapFormatted} -XX:MaxMetaspaceSize=${formatMB(Math.ceil(metaspaceMB))} -XX:ReservedCodeCacheSize=${formatMB(codeCacheMB)} -XX:MaxDirectMemorySize=${formatMB(directMemoryMB)}`;

    return { totalMB, regions, heapMB, isError, jvmFlags };
  }, [quickTotalMemory, quickMemoryUnit]);

  /* 스타일 클래스 */
  const inputClass =
    "h-9 rounded-lg border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-3 font-mono text-sm text-[var(--foreground)] focus:border-[color:var(--card-border-hover)] focus:outline-none";
  const labelClass = "text-xs font-medium text-[var(--muted)]";
  const modeTabClass = (active: boolean) =>
    `cursor-pointer px-4 py-2 text-xs font-semibold transition rounded-lg ${
      active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600 hover:text-gray-900"
    }`;

  return (
    <ToolPage>
      {/* 상단 헤더 */}
      <ToolHeader
        title={tool.title}
        description={tool.desc}
        right={
          <div className="self-start text-xs uppercase tracking-[0.2em] text-[var(--muted)] md:self-auto">JVM Memory</div>
        }
      />

      {/* 안내 패널 */}
      <ToolInfoPanel
        icon="💻"
        title="Java Memory Calculator"
        description={
          <>
            <p>
              Cloud Foundry / Paketo Buildpack의 Java Memory Calculator와 동일한 로직으로 JVM 메모리 영역별
              할당량을 계산합니다.
            </p>
            <p>
              <strong className="text-[var(--foreground)]">Calculate</strong>는 세부 설정으로 계산,
              <strong className="text-[var(--foreground)]"> Recommend</strong>는 실제 사용량 기반 추천,
              <strong className="text-[var(--foreground)]"> Quick</strong>은 총 메모리만으로 즉시 추천합니다.
            </p>
          </>
        }
        chips={["Paketo Buildpack", "Cloud Foundry", "JVM Flags"]}
      />

      {/* 모드 전환 */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode("calculate")} className={modeTabClass(mode === "calculate")}>
          Calculate
        </button>
        <button type="button" onClick={() => setMode("reverse")} className={modeTabClass(mode === "reverse")}>
          Recommend
        </button>
        <button type="button" onClick={() => setMode("quick")} className={modeTabClass(mode === "quick")}>
          Quick
        </button>
      </div>

      {/* 계산 모드 */}
      {mode === "calculate" && (
        <section className="grid gap-4 lg:grid-cols-2">
          <ToolCard className="gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Configuration</h3>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Total Memory</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={totalMemory}
                  onChange={(e) => setTotalMemory(Number(e.target.value) || 1)}
                  className={`${inputClass} flex-1`}
                />
                <div className="flex rounded-lg border border-[color:var(--card-border)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      if (memoryUnit !== "MB") {
                        setMemoryUnit("MB");
                        setTotalMemory(totalMemory * 1024);
                      }
                    }}
                    className={`cursor-pointer px-3 py-1 text-xs font-semibold transition ${memoryUnit === "MB" ? "bg-blue-600 text-white" : "bg-[var(--surface-muted)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                  >
                    MB
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (memoryUnit !== "GB") {
                        setMemoryUnit("GB");
                        setTotalMemory(Math.max(1, Math.round(totalMemory / 1024)));
                      }
                    }}
                    className={`cursor-pointer px-3 py-1 text-xs font-semibold transition ${memoryUnit === "GB" ? "bg-blue-600 text-white" : "bg-[var(--surface-muted)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                  >
                    GB
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Loaded Class Count</label>
              <Input
                type="number"
                min={0}
                value={fwLoadedClassCount}
                onChange={(e) => setFwLoadedClassCount(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Thread Count</label>
              <Input
                type="number"
                min={1}
                value={fwThreadCount}
                onChange={(e) => setFwThreadCount(Number(e.target.value) || 1)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Head Room (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={fwHeadRoomPercent}
                onChange={(e) => setFwHeadRoomPercent(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Stack Size (MB)</label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={fwStackSizeMB}
                onChange={(e) => setFwStackSizeMB(Number(e.target.value) || 1)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Reserved Code Cache (MB)</label>
              <Input
                type="number"
                min={0}
                value={fwCodeCacheMB}
                onChange={(e) => setFwCodeCacheMB(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Direct Memory (MB)</label>
              <Input
                type="number"
                min={0}
                value={fwDirectMemoryMB}
                onChange={(e) => setFwDirectMemoryMB(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </ToolCard>

          <ResultPanel
            regions={calculateResult.regions}
            totalMB={calculateResult.totalMB}
            heapMB={calculateResult.heapMB}
            isError={calculateResult.isError}
            jvmFlags={calculateResult.jvmFlags}
          />
        </section>
      )}

      {/* 추천 모드 */}
      {mode === "reverse" && (
        <section className="grid gap-4 lg:grid-cols-2">
          <ToolCard className="gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Actual Usage</h3>

            {/* JVM 플래그 붙여넣기 */}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Paste JVM Flags (optional)</label>
              <Textarea
                value={flagsInput}
                onChange={(e) => setFlagsInput(e.target.value)}
                placeholder="-Xms512M -Xmx512M -XX:MaxMetaspaceSize=..."
                className="min-h-[60px] w-full resize-none rounded-lg border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-3 font-mono text-xs text-[var(--foreground)] focus:border-[color:var(--card-border-hover)] focus:outline-none"
              />
              <ToolActionButton
                type="button"
                onClick={handleParseFlags}
                className="self-start"
              >
                Parse & Fill
              </ToolActionButton>
            </div>

            <div className="my-1 border-t border-[color:var(--card-border)]" />

            {/* 사용량 + 버퍼: 좌우 배치 */}
            <div className="grid grid-cols-[1fr_80px] items-end gap-x-3 gap-y-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
                Actual Usage
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
                Buffer %
              </span>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Heap (MB)</label>
                <Input
                  type="number"
                  min={0}
                  value={revHeapUsageMB}
                  onChange={(e) => setRevHeapUsageMB(Number(e.target.value) || 0)}
                  className={inputClass}
                />
              </div>
              <Input
                type="number"
                min={0}
                max={300}
                value={heapBuffer}
                onChange={(e) => setHeapBuffer(Number(e.target.value) || 0)}
                className={inputClass}
              />

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Metaspace (MB)</label>
                <Input
                  type="number"
                  min={0}
                  value={revMetaspaceUsageMB}
                  onChange={(e) => setRevMetaspaceUsageMB(Number(e.target.value) || 0)}
                  className={inputClass}
                />
              </div>
              <Input
                type="number"
                min={0}
                max={300}
                value={metaspaceBuffer}
                onChange={(e) => setMetaspaceBuffer(Number(e.target.value) || 0)}
                className={inputClass}
              />

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Code Cache (MB)</label>
                <Input
                  type="number"
                  min={0}
                  value={revCodeCacheUsageMB}
                  onChange={(e) => setRevCodeCacheUsageMB(Number(e.target.value) || 0)}
                  className={inputClass}
                />
              </div>
              <Input
                type="number"
                min={0}
                max={300}
                value={codeCacheBuffer}
                onChange={(e) => setCodeCacheBuffer(Number(e.target.value) || 0)}
                className={inputClass}
              />

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Direct Memory (MB)</label>
                <Input
                  type="number"
                  min={0}
                  value={revDirectMemoryUsageMB}
                  onChange={(e) => setRevDirectMemoryUsageMB(Number(e.target.value) || 0)}
                  className={inputClass}
                />
              </div>
              <Input
                type="number"
                min={0}
                max={300}
                value={directMemoryBuffer}
                onChange={(e) => setDirectMemoryBuffer(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>

            <div className="my-1 border-t border-[color:var(--card-border)]" />

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Thread Count</label>
              <Input
                type="number"
                min={1}
                value={revThreadCount}
                onChange={(e) => setRevThreadCount(Number(e.target.value) || 1)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Stack Size (MB per thread)</label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={revStackSizeMB}
                onChange={(e) => setRevStackSizeMB(Number(e.target.value) || 1)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Head Room (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={revHeadRoomPercent}
                onChange={(e) => setRevHeadRoomPercent(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </ToolCard>

          <ResultPanel
            regions={reverseResult.regions}
            totalMB={reverseResult.totalMB}
            heapMB={reverseResult.heapMB}
            isError={reverseResult.isError}
            jvmFlags={reverseResult.jvmFlags}
            recommendedTotal={reverseResult.recommendedTotal}
            usageRegions={reverseResult.usageRegions}
          />
        </section>
      )}

      {/* 빠른 추천 모드 */}
      {mode === "quick" && (
        <section className="grid gap-4 lg:grid-cols-2">
          <ToolCard className="gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Quick Recommend</h3>
            <p className="text-xs text-[var(--muted)]">
              서버의 총 메모리만 입력하면 Buildpack 기본값(Class 20K, Thread 250, Stack 1MB, CodeCache 240MB, Direct
              10MB)으로 JVM 플래그를 추천합니다.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Total Memory</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={quickTotalMemory}
                  onChange={(e) => setQuickTotalMemory(Number(e.target.value) || 1)}
                  className={`${inputClass} flex-1`}
                />
                <div className="flex rounded-lg border border-[color:var(--card-border)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      if (quickMemoryUnit !== "MB") {
                        setQuickMemoryUnit("MB");
                        setQuickTotalMemory(quickTotalMemory * 1024);
                      }
                    }}
                    className={`cursor-pointer px-3 py-1 text-xs font-semibold transition ${quickMemoryUnit === "MB" ? "bg-blue-600 text-white" : "bg-[var(--surface-muted)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                  >
                    MB
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (quickMemoryUnit !== "GB") {
                        setQuickMemoryUnit("GB");
                        setQuickTotalMemory(Math.max(1, Math.round(quickTotalMemory / 1024)));
                      }
                    }}
                    className={`cursor-pointer px-3 py-1 text-xs font-semibold transition ${quickMemoryUnit === "GB" ? "bg-blue-600 text-white" : "bg-[var(--surface-muted)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                  >
                    GB
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-3 text-xs text-[var(--muted)]">
              <p className="font-semibold mb-1">Buildpack Defaults:</p>
              <ul className="space-y-0.5 font-mono">
                <li>Loaded Class Count: 20,000</li>
                <li>Thread Count: 250</li>
                <li>Stack Size: 1 MB</li>
                <li>Code Cache: 240 MB</li>
                <li>Direct Memory: 10 MB</li>
                <li>Head Room: 0%</li>
              </ul>
            </div>
          </ToolCard>

          <ResultPanel
            regions={quickResult.regions}
            totalMB={quickResult.totalMB}
            heapMB={quickResult.heapMB}
            isError={quickResult.isError}
            jvmFlags={quickResult.jvmFlags}
          />
        </section>
      )}
    </ToolPage>
  );
}

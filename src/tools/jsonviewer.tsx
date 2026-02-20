"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ToolItem } from "@/lib/tools";
import { ToolActionButton, ToolCard, ToolHeader, ToolInfoPanel, ToolPage } from "@/components/tool-ui";

type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
type JsonPath = Array<string | number>;

const sampleJson: JsonObject = {
  id: 101,
  name: "Toolkit",
  active: true,
  rating: 4.8,
  tags: ["utility", "json", "viewer"],
  profile: {
    owner: "dev-team",
    retries: 3,
    nullableField: null,
  },
};

/** JSON 경로 배열을 고유 문자열 ID로 변환 (RFC 6901 이스케이프 적용) */
function pathToId(path: JsonPath) {
  if (path.length === 0) {
    return "$";
  }
  return path.map((segment) => String(segment).replaceAll("~", "~0").replaceAll("/", "~1")).join("/");
}

/** JSON 값의 타입을 사람이 읽기 쉬운 라벨 문자열로 반환 (int, float, string, boolean, null, array, object) */
function getTypeLabel(value: JsonValue) {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (typeof value === "object") {
    return "object";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? "int" : "float";
  }
  return typeof value;
}

/** 값이 배열 또는 객체(컨테이너)인지 판별하는 타입 가드 */
function isContainer(value: JsonValue): value is JsonArray | JsonObject {
  return typeof value === "object" && value !== null;
}

/** 불변(immutable) 방식으로 JSON 트리의 특정 경로에 있는 값을 교체한 새 트리를 반환 */
function updateAtPath(root: JsonValue, path: JsonPath, nextValue: JsonValue): JsonValue {
  if (path.length === 0) {
    return nextValue;
  }

  const [head, ...rest] = path;
  const child = (root as JsonObject | JsonArray)[head as string & number];
  const updated = updateAtPath(child, rest, nextValue);

  if (Array.isArray(root)) {
    const next = [...root];
    next[head as number] = updated;
    return next;
  }

  return { ...(root as JsonObject), [head as string]: updated };
}

/** JSON 트리를 재귀 순회하며 모든 컨테이너(배열/객체) 노드의 경로 ID를 수집 (전체 접기에 사용) */
function collectContainerPaths(value: JsonValue, path: JsonPath = []): string[] {
  if (!isContainer(value)) {
    return [];
  }

  const currentPath = pathToId(path);
  const collected: string[] = [currentPath];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collected.push(...collectContainerPaths(item, [...path, index]));
    });
    return collected;
  }

  Object.entries(value).forEach(([key, item]) => {
    collected.push(...collectContainerPaths(item, [...path, key]));
  });

  return collected;
}

type PrimitiveEditorProps = {
  value: JsonPrimitive;
  onChange: (value: JsonPrimitive) => void;
};

/** 원시 타입(string, number, boolean, null) 값을 인라인 편집할 수 있는 입력 컴포넌트 */
function PrimitiveEditor({ value, onChange }: PrimitiveEditorProps) {
  const type = getTypeLabel(value);
  const [draft, setDraft] = useState(String(value));
  const toneClass = getValueToneClass(value);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  if (typeof value === "boolean") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={`h-7 rounded-lg px-2 font-mono text-[11px] ${toneClass}`}
        onClick={() => onChange(!value)}
      >
        {String(value)}
      </Button>
    );
  }

  if (type === "int" || type === "float") {
    return (
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const parsed = Number(draft);
          if (Number.isFinite(parsed)) {
            onChange(parsed);
            return;
          }
          setDraft(String(value));
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className={`h-7 max-w-[180px] rounded-lg border-[color:var(--card-border)] bg-[var(--surface)] px-2 font-mono text-xs ${toneClass}`}
      />
    );
  }

  if (value === null) {
    return <span className={`font-mono text-xs ${toneClass}`}>null</span>;
  }

  return (
    <Input
      value={String(value)}
      onChange={(event) => onChange(event.target.value)}
      className={`h-7 max-w-[260px] rounded-lg border-[color:var(--card-border)] bg-[var(--surface)] px-2 font-mono text-xs ${toneClass}`}
    />
  );
}

type TreeNodeProps = {
  value: JsonValue;
  path: JsonPath;
  name: string;
  depth: number;
  showTypes: boolean;
  collapsedPaths: Set<string>;
  onToggleCollapse: (pathId: string) => void;
  onChangeValue: (path: JsonPath, value: JsonPrimitive) => void;
};

/** JSON 값의 타입에 따라 색상 CSS 클래스를 반환 (globals.css --syntax-* 변수 사용) */
function getValueToneClass(value: JsonValue) {
  if (typeof value === "string") {
    return "text-[var(--syntax-string)]";
  }
  if (typeof value === "number") {
    return "text-[var(--syntax-number)]";
  }
  if (typeof value === "boolean") {
    return "text-[var(--syntax-boolean)]";
  }
  if (value === null) {
    return "text-[var(--muted)]";
  }
  return "text-[var(--muted)]";
}

/** 컨테이너 타입에 따라 괄호 문자열 반환 (배열: "[]", 객체: "{}") */
function getContainerShape(value: JsonArray | JsonObject) {
  return Array.isArray(value) ? "[]" : "{}";
}

/** 접힌 노드 옆에 표시할 축약 미리보기 문자열 생성 (maxLen 초과 시 말줄임 처리) */
function compactPreview(value: JsonValue, maxLen = 60): string {
  if (!isContainer(value)) {
    if (typeof value === "string") {
      return `"${value}"`;
    }
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    const items = value.map((v) => compactPreview(v, 20));
    const joined = `[ ${items.join(", ")} ]`;
    if (joined.length > maxLen) {
      return `[ ${items.slice(0, 3).join(", ")}, ... ]`;
    }
    return joined;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return "{}";
  }
  const items = entries.map(([k, v]) => `"${k}": ${compactPreview(v, 20)}`);
  const joined = `{ ${items.join(", ")} }`;
  if (joined.length > maxLen) {
    return `{ ${items.slice(0, 2).join(", ")}, ... }`;
  }
  return joined;
}

/** JSON 트리의 단일 노드를 재귀적으로 렌더링하는 컴포넌트 (컨테이너: 접기/펼치기, 원시값: 인라인 편집) */
function TreeNode({
  value,
  path,
  name,
  depth,
  showTypes,
  collapsedPaths,
  onToggleCollapse,
  onChangeValue,
}: TreeNodeProps) {
  const pathId = pathToId(path);
  const collapsed = collapsedPaths.has(pathId);
  const typeLabel = getTypeLabel(value);
  const isRoot = path.length === 0;

  if (isContainer(value)) {
    const entries = Array.isArray(value)
      ? value.map((item, index) => ({ key: `[${index}]`, value: item, path: [...path, index] as JsonPath }))
      : Object.entries(value).map(([key, item]) => ({ key, value: item, path: [...path, key] as JsonPath }));
    const [openBrace, closeBrace] = getContainerShape(value);

    return (
      <div>
        <div
          className="group flex min-h-8 items-center gap-2 rounded-md px-1 hover:bg-black/5 dark:hover:bg-white/5"
          style={{ paddingLeft: `${depth * 14}px` }}
        >
          <button
            type="button"
            onClick={() => onToggleCollapse(pathId)}
            className="cursor-pointer inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-[color:var(--card-border)] bg-[var(--surface)] font-mono text-[10px] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "+" : "-"}
          </button>
          {!isRoot && <span className="font-mono text-xs font-medium text-[var(--syntax-key)]">{`"${name}"`}</span>}
          {!isRoot && <span className="font-mono text-xs text-[var(--muted)]">:</span>}
          <span className="font-mono text-xs text-[var(--muted)]">{openBrace}</span>
          {collapsed && (
            <span
              className="flex items-center gap-1 truncate font-mono text-xs text-[var(--muted)]"
              title={compactPreview(value, 120)}
            >
              <span className="inline-block h-px w-4 bg-[var(--muted)]/30" />
              <span className="opacity-80">{compactPreview(value, 40).slice(1, -1).trim()}</span>
              <span className="inline-block h-px w-4 bg-[var(--muted)]/30" />
              {closeBrace}
            </span>
          )}
          {!collapsed && <span className="font-mono text-[11px] text-[var(--muted)]">{entries.length} item(s)</span>}
          {showTypes && (
            <span className="rounded border border-[color:var(--card-border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--muted)]">
              {typeLabel}
            </span>
          )}
        </div>
        {!collapsed && (
          <div className="ml-2 border-l border-dashed border-[color:var(--card-border)] pl-1">
            {entries.map((entry) => (
              <TreeNode
                key={pathToId(entry.path)}
                value={entry.value}
                path={entry.path}
                name={entry.key}
                depth={depth + 1}
                showTypes={showTypes}
                collapsedPaths={collapsedPaths}
                onToggleCollapse={onToggleCollapse}
                onChangeValue={onChangeValue}
              />
            ))}
            <div
              className="flex min-h-7 items-center rounded-md px-1 font-mono text-xs text-[var(--muted)]"
              style={{ paddingLeft: `${(depth + 1) * 14}px` }}
            >
              {closeBrace}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="group flex min-h-8 items-center gap-2 rounded-md px-1 hover:bg-black/5 dark:hover:bg-white/5"
      style={{ paddingLeft: `${depth * 14}px` }}
    >
      <span className="inline-block w-4 shrink-0" />
      <span className="min-w-20 font-mono text-xs font-medium text-[var(--syntax-key)]">{`"${name}"`}</span>
      <span className="font-mono text-xs text-[var(--muted)]">:</span>
      <PrimitiveEditor value={value} onChange={(next) => onChangeValue(path, next)} />
      {showTypes && (
        <span className="rounded border border-[color:var(--card-border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--muted)]">
          {typeLabel}
        </span>
      )}
    </div>
  );
}

/** JSON Viewer 도구의 메인 컴포넌트 — Raw JSON 편집기와 Tree Viewer를 양쪽 패널로 제공 */
export default function JsonViewerTool({ tool }: { tool: ToolItem }) {
  const initialRaw = useMemo(() => JSON.stringify(sampleJson, null, 2), []);
  const [jsonValue, setJsonValue] = useState<JsonValue>(sampleJson);
  const [rawInput, setRawInput] = useState(initialRaw);
  const [parseError, setParseError] = useState("");
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [showTypes, setShowTypes] = useState(true);
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [leftCopyState, setLeftCopyState] = useState<"idle" | "copied">("idle");
  const [rightCopyState, setRightCopyState] = useState<"idle" | "copied">("idle");
  const lineCount = useMemo(() => rawInput.split("\n").length, [rawInput]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  /** 텍스트 영역 스크롤 시 줄 번호 거터의 스크롤 위치를 동기화 */
  const handleTextareaScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) {
      return;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = ta.scrollTop;
    }
  }, []);

  const pendingCursor = useRef<number | null>(null);

  useEffect(() => {
    if (pendingCursor.current !== null && textareaRef.current) {
      const pos = pendingCursor.current;
      textareaRef.current.selectionStart = pos;
      textareaRef.current.selectionEnd = pos;
      pendingCursor.current = null;
    }
  }, [rawInput]);

  /** 에러 메시지에서 position 값을 읽어 해당 문자 위치가 몇 번째 줄인지 계산 */
  const getErrorLine = (raw: string, message: string): number | null => {
    const match = message.match(/position\s+(\d+)/i);
    if (!match) return null;
    const pos = Number(match[1]);
    return raw.slice(0, pos).split("\n").length;
  };

  /** Raw JSON 텍스트 변경 시 파싱하여 트리 상태를 동기화하고, 실패 시 에러 메시지를 표시 */
  const handleRawChange = (nextRaw: string) => {
    setRawInput(nextRaw);

    try {
      const parsed = JSON.parse(nextRaw) as JsonValue;
      setJsonValue(parsed);
      setParseError("");
      setErrorLine(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON";
      setParseError(message);
      setErrorLine(getErrorLine(nextRaw, message));
    }
  };

  /** 트리 뷰에서 원시값을 수정했을 때 JSON 트리와 Raw 텍스트를 모두 업데이트 */
  const handleChangeValue = (path: JsonPath, nextPrimitive: JsonPrimitive) => {
    const nextValue = updateAtPath(jsonValue, path, nextPrimitive);
    setJsonValue(nextValue);
    setRawInput(JSON.stringify(nextValue, null, 2));
    setParseError("");
    setErrorLine(null);
  };

  /** 특정 경로의 노드 접기/펼치기 상태를 토글 */
  const toggleCollapse = (pathId: string) => {
    setCollapsedPaths((current) => {
      const next = new Set(current);
      if (next.has(pathId)) {
        next.delete(pathId);
      } else {
        next.add(pathId);
      }
      return next;
    });
  };

  /** Raw JSON을 파싱 후 들여쓰기 2칸으로 포맷팅 (Pretty Print) */
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(rawInput) as JsonValue;
      const pretty = JSON.stringify(parsed, null, 2);
      setJsonValue(parsed);
      setRawInput(pretty);
      setParseError("");
      setErrorLine(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON";
      setParseError(message);
      setErrorLine(getErrorLine(rawInput, message));
    }
  };

  /** 모든 상태를 초기 샘플 JSON으로 되돌리기 */
  const handleReset = () => {
    setJsonValue(sampleJson);
    setRawInput(JSON.stringify(sampleJson, null, 2));
    setParseError("");
    setErrorLine(null);
    setCollapsedPaths(new Set());
  };

  /** 트리의 모든 컨테이너 노드를 접기 */
  const handleCollapseAll = () => {
    const paths = collectContainerPaths(jsonValue, []);
    setCollapsedPaths(new Set(paths));
  };

  /** 트리의 모든 노드를 펼치기 */
  const handleExpandAll = () => {
    setCollapsedPaths(new Set());
  };

  /** 트리 뷰의 현재 JSON 값을 클립보드에 복사 */
  const handleCopyTree = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonValue, null, 2));
      setLeftCopyState("copied");
      window.setTimeout(() => setLeftCopyState("idle"), 1000);
    } catch {
      setLeftCopyState("idle");
    }
  };

  /** Raw JSON 텍스트를 클립보드에 복사 */
  const handleCopyRaw = async () => {
    try {
      await navigator.clipboard.writeText(rawInput);
      setRightCopyState("copied");
      window.setTimeout(() => setRightCopyState("idle"), 1000);
    } catch {
      setRightCopyState("idle");
    }
  };

  return (
    <ToolPage>
      <ToolHeader
        title={tool.title}
        description={tool.desc}
        right={
          <label className="flex items-center gap-2 self-start rounded-full border border-[color:var(--card-border)] bg-[var(--surface)] px-3 py-1.5 shadow-[var(--card-shadow)] md:self-auto">
          <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Show Types</span>
          <Switch checked={showTypes} onCheckedChange={setShowTypes} className="h-4 w-8" />
          </label>
        }
      />

      {/* Info Panel */}
      <ToolInfoPanel
        icon="{}"
        title="JSON Viewer"
        description="왼쪽에서 Raw JSON을 입력/정리하고, 오른쪽 트리 뷰에서 구조를 확인/수정한 뒤 원하는 패널에서 복사하세요."
        chips={["JSON 파싱 & 포맷팅", "트리 뷰 탐색", "인라인 값 편집"]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <ToolCard className="min-h-[520px] gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Raw JSON</p>
            <div className="flex gap-2">
              <ToolActionButton
                type="button"
                onClick={handleCopyRaw}
                className="h-7 px-3"
              >
                {rightCopyState === "copied" ? "Copied" : "Copy"}
              </ToolActionButton>
              <ToolActionButton
                type="button"
                onClick={handleFormat}
                className="h-7 px-3"
              >
                Pretty
              </ToolActionButton>
              <ToolActionButton
                type="button"
                onClick={handleReset}
                className="h-7 px-3"
              >
                Reset sample
              </ToolActionButton>
            </div>
          </div>

          <div className="relative flex min-h-[430px] flex-1 overflow-hidden rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)]">
            <div
              ref={gutterRef}
              className="shrink-0 select-none overflow-hidden border-r border-[color:var(--card-border)]/50 bg-[var(--surface-muted)] py-4 pr-2 pl-2 font-mono text-[10px] leading-6 text-[var(--muted)]"
            >
              {Array.from({ length: lineCount }, (_, index) => {
                const lineNum = index + 1;
                const isError = errorLine === lineNum;
                return (
                  <div
                    key={index}
                    className={`text-right px-1 ${isError ? "bg-[var(--syntax-error)]/20 font-semibold text-[var(--syntax-error)]" : ""}`}
                  >
                    {lineNum}
                  </div>
                );
              })}
            </div>
            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={rawInput}
                onChange={(event) => handleRawChange(event.target.value)}
                onScroll={handleTextareaScroll}
                onKeyDown={(event) => {
                  if (event.key === "Tab") {
                    event.preventDefault();
                    const start = event.currentTarget.selectionStart;
                    const end = event.currentTarget.selectionEnd;
                    const next = rawInput.slice(0, start) + "\t" + rawInput.slice(end);
                    pendingCursor.current = start + 1;
                    handleRawChange(next);
                  }
                }}
                placeholder='{ "key": "value" }'
                style={{ tabSize: 4 }}
                className="absolute inset-0 resize-none rounded-none border-0 bg-transparent p-4 font-mono text-xs leading-6 text-[var(--foreground)] shadow-none outline-none ring-0 placeholder:text-[var(--muted)]/50 focus-visible:ring-0 focus-visible:outline-none"
                spellCheck={false}
              />
            </div>
          </div>

          {parseError ? (
            <p className="text-xs font-semibold text-[var(--syntax-error)]">
              JSON parse error{errorLine ? ` (line ${errorLine})` : ""}: {parseError}
            </p>
          ) : (
            <p className="text-xs text-[var(--syntax-valid)]">Valid JSON</p>
          )}
        </ToolCard>

        <ToolCard className="min-h-[520px] gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Tree Viewer</p>
            <div className="flex gap-2">
              <ToolActionButton
                type="button"
                onClick={handleCopyTree}
                className="h-7 px-3"
              >
                {leftCopyState === "copied" ? "Copied" : "Copy"}
              </ToolActionButton>
              <ToolActionButton
                type="button"
                onClick={handleExpandAll}
                className="h-7 px-3"
              >
                Expand all
              </ToolActionButton>
              <ToolActionButton
                type="button"
                onClick={handleCollapseAll}
                className="h-7 px-3"
              >
                Collapse all
              </ToolActionButton>
            </div>
          </div>

          <div className="flex-1 overflow-auto rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-3">
            <TreeNode
              value={jsonValue}
              path={[]}
              name="$"
              depth={0}
              showTypes={showTypes}
              collapsedPaths={collapsedPaths}
              onToggleCollapse={toggleCollapse}
              onChangeValue={handleChangeValue}
            />
          </div>
        </ToolCard>
      </section>
    </ToolPage>
  );
}

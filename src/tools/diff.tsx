"use client";

import { useMemo, useState } from "react";
import { DiffEngine, type LineStatus, type WordPart } from "@eottabom/diff-engine";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ToolActionButton, ToolBadge, ToolCard, ToolDiffText, ToolHeader, ToolInfoPanel, ToolPage, ToolTextarea } from "@/components/tool-ui";
import type { ToolItem } from "@/lib/tools";

const defaultLeft = `{
  "name": "toolkits",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev"
  }
}`;

const defaultRight = `{
  "name": "toolkits",
  "version": "1.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  }
}`;

const leftStatusClass: Record<LineStatus, string> = {
  same: "",
  added: "",
  removed: "bg-[var(--diff-removed)]",
  changed: "bg-[var(--diff-changed-left)]",
};

const rightStatusClass: Record<LineStatus, string> = {
  same: "",
  added: "bg-[var(--diff-added)]",
  removed: "",
  changed: "bg-[var(--diff-changed-right)]",
};

function renderWordParts(parts: WordPart[]) {
  return parts.map((part, index) => {
    const prefix = index === 0 ? "" : " ";
    const highlight =
      part.kind === "removed" ? "bg-[var(--diff-removed)]" : part.kind === "added" ? "bg-[var(--diff-added)]" : "";

    return (
      <span key={`${part.kind}-${index}`}>
        {prefix}
        <span className={highlight}>{part.text}</span>
      </span>
    );
  });
}
export default function DiffTool({ tool }: { tool: ToolItem }) {
  const [leftText, setLeftText] = useState(defaultLeft);
  const [rightText, setRightText] = useState(defaultRight);
  const [onlyChanges, setOnlyChanges] = useState(false);
  const [showWordDiff, setShowWordDiff] = useState(true);
  const [clearState, setClearState] = useState<"idle" | "left" | "right">("idle");

  const handleClear = (side: "left" | "right") => {
    if (side === "left") {
      setLeftText("");
    } else {
      setRightText("");
    }
    setClearState(side);
    window.setTimeout(() => setClearState("idle"), 900);
  };

  const allRows = useMemo(() => new DiffEngine(leftText, rightText).buildLineDiff(), [leftText, rightText]);

  const diffRows = useMemo(
    () => (onlyChanges ? allRows.filter((row) => row.status !== "same") : allRows),
    [allRows, onlyChanges],
  );

  return (
    <ToolPage>
      <ToolHeader
        title={tool.title}
        description={tool.desc}
        right={<div className="self-start text-xs uppercase tracking-[0.2em] text-[var(--muted)] md:self-auto">Compare</div>}
      />

      <div className="flex justify-end">
        <div className="flex items-center gap-4 rounded-full border border-[color:var(--card-border)] bg-[var(--surface)] px-4 py-1.5 shadow-[var(--card-shadow)]">
          <label className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Changes only</span>
            <Switch
              checked={onlyChanges}
              onCheckedChange={setOnlyChanges}
              className="h-4 w-8 data-[state=checked]:bg-[var(--accent-2)] data-[state=unchecked]:bg-black/20 dark:data-[state=unchecked]:bg-white/20"
            />
          </label>
          <div className="h-4 w-px bg-[var(--card-border)]" />
          <label className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Word highlight</span>
            <Switch
              checked={showWordDiff}
              onCheckedChange={setShowWordDiff}
              className="h-4 w-8 data-[state=checked]:bg-[var(--accent-2)] data-[state=unchecked]:bg-black/20 dark:data-[state=unchecked]:bg-white/20"
            />
          </label>
        </div>
      </div>

      <ToolInfoPanel
        icon="⇄"
        title="Text Diff"
        description="두 텍스트를 나란히 비교하여 변경된 부분을 하이라이트합니다. 추가/삭제/수정된 라인과 단어 단위 차이를 시각적으로 확인할 수 있습니다."
        chips={["라인 단위 비교", "단어 단위 하이라이트", "변경 사항만 필터"]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <ToolCard>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            <ToolBadge tone="orange">Original</ToolBadge>
            <div className="flex items-center gap-2">
              <ToolActionButton
                type="button"
                onClick={() => handleClear("left")}
                tone="orange"
                className="px-2 py-1 font-normal"
              >
                {clearState === "left" ? "Cleared" : "Clear"}
              </ToolActionButton>
            </div>
          </div>
          <ToolTextarea
            value={leftText}
            onChange={(event) => setLeftText(event.target.value)}
            className="min-h-[240px]"
          />
        </ToolCard>
        <ToolCard>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            <ToolBadge tone="teal">Updated</ToolBadge>
            <div className="flex items-center gap-2">
              <ToolActionButton
                type="button"
                onClick={() => handleClear("right")}
                tone="orange"
                className="px-2 py-1 font-normal"
              >
                {clearState === "right" ? "Cleared" : "Clear"}
              </ToolActionButton>
            </div>
          </div>
          <ToolTextarea
            value={rightText}
            onChange={(event) => setRightText(event.target.value)}
            className="min-h-[240px]"
          />
        </ToolCard>
      </section>

      <Card className="overflow-hidden rounded-3xl border border-[color:var(--card-border)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
        <div className="grid grid-cols-2 border-b border-[color:var(--card-border)] bg-[var(--surface-muted)] text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          <div className="px-4 py-3">
            <ToolBadge tone="orange">Original</ToolBadge>
          </div>
          <div className="px-4 py-3">
            <ToolBadge tone="teal">Updated</ToolBadge>
          </div>
        </div>
        <div className="divide-y divide-[color:var(--card-border)]">
          {diffRows.map((row) => {
            const wordDiff =
              row.status === "changed" && showWordDiff ? DiffEngine.buildWordDiff(row.left, row.right) : null;

            return (
              <div
                key={`${row.leftNumber ?? "x"}-${row.rightNumber ?? "y"}-${row.status}`}
                className="grid grid-cols-2 text-xs font-mono"
              >
                <div className={`flex min-w-0 items-start gap-3 px-4 py-2 ${leftStatusClass[row.status]}`}>
                  <span className="w-6 text-right text-[var(--muted)]">{row.leftNumber ?? ""}</span>
                  <ToolDiffText className="min-w-0 flex-1">
                    {wordDiff ? (
                      <>
                        {wordDiff.leadingLeft && <span>{wordDiff.leadingLeft}</span>}
                        {renderWordParts(wordDiff.leftParts)}
                      </>
                    ) : (
                      row.left || " "
                    )}
                  </ToolDiffText>
                </div>
                <div className={`flex min-w-0 items-start gap-3 px-4 py-2 ${rightStatusClass[row.status]}`}>
                  <span className="w-6 text-right text-[var(--muted)]">{row.rightNumber ?? ""}</span>
                  <ToolDiffText className="min-w-0 flex-1">
                    {wordDiff ? (
                      <>
                        {wordDiff.leadingRight && <span>{wordDiff.leadingRight}</span>}
                        {renderWordParts(wordDiff.rightParts)}
                      </>
                    ) : (
                      row.right || " "
                    )}
                  </ToolDiffText>
                </div>
              </div>
            );
          })}
          {diffRows.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-[var(--muted)]">No changes to show.</div>
          )}
        </div>
      </Card>
    </ToolPage>
  );
}

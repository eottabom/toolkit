"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ToolActionButton, ToolCard, ToolHeader, ToolInfoPanel, ToolPage, ToolTextarea } from "@/components/tool-ui";

type LineStatus = "same" | "changed" | "added" | "removed";

type DiffLine = {
  left: string;
  right: string;
  status: LineStatus;
  leftNumber?: number;
  rightNumber?: number;
};

type DiffOp = {
  type: "same" | "added" | "removed";
  line: string;
};

type WordPart = {
  text: string;
  kind: "same" | "added" | "removed";
};

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

class DiffEngine {
  private leftLines: string[];
  private rightLines: string[];

  constructor(leftText: string, rightText: string) {
    this.leftLines = leftText.split("\n");
    this.rightLines = rightText.split("\n");
  }

  buildLineDiff(): DiffLine[] {
    const m = this.leftLines.length;
    const n = this.rightLines.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i += 1) {
      for (let j = 1; j <= n; j += 1) {
        if (this.leftLines[i - 1] === this.rightLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const ops = this.collectOps(dp);
    return this.toRows(ops);
  }

  static buildWordDiff(leftLine: string, rightLine: string) {
    const leadingLeft = leftLine.match(/^\s*/)?.[0] ?? "";
    const leadingRight = rightLine.match(/^\s*/)?.[0] ?? "";
    const trimmedLeft = leftLine.trim();
    const trimmedRight = rightLine.trim();
    const leftWords = trimmedLeft.length ? trimmedLeft.split(/\s+/) : [];
    const rightWords = trimmedRight.length ? trimmedRight.split(/\s+/) : [];
    const m = leftWords.length;
    const n = rightWords.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i += 1) {
      for (let j = 1; j <= n; j += 1) {
        if (leftWords[i - 1] === rightWords[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const leftParts: WordPart[] = [];
    const rightParts: WordPart[] = [];
    let i = m;
    let j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && leftWords[i - 1] === rightWords[j - 1]) {
        leftParts.unshift({ text: leftWords[i - 1], kind: "same" });
        rightParts.unshift({ text: rightWords[j - 1], kind: "same" });
        i -= 1;
        j -= 1;
        continue;
      }

      if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        rightParts.unshift({ text: rightWords[j - 1], kind: "added" });
        j -= 1;
        continue;
      }

      if (i > 0) {
        leftParts.unshift({ text: leftWords[i - 1], kind: "removed" });
        i -= 1;
      }
    }

    return { leftParts, rightParts, leadingLeft, leadingRight };
  }

  static renderWordParts(parts: WordPart[]) {
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

  private collectOps(dp: number[][]): DiffOp[] {
    const ops: DiffOp[] = [];
    let i = this.leftLines.length;
    let j = this.rightLines.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && this.leftLines[i - 1] === this.rightLines[j - 1]) {
        ops.push({ type: "same", line: this.leftLines[i - 1] });
        i -= 1;
        j -= 1;
        continue;
      }

      if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.push({ type: "added", line: this.rightLines[j - 1] });
        j -= 1;
        continue;
      }

      if (i > 0) {
        ops.push({ type: "removed", line: this.leftLines[i - 1] });
        i -= 1;
      }
    }

    return ops.reverse();
  }

  private toRows(ops: DiffOp[]): DiffLine[] {
    const rows: DiffLine[] = [];
    let leftNo = 1;
    let rightNo = 1;

    for (let index = 0; index < ops.length; index += 1) {
      const op = ops[index];
      const next = ops[index + 1];

      if (op.type === "removed" && next?.type === "added") {
        rows.push({
          left: op.line,
          right: next.line,
          status: "changed",
          leftNumber: leftNo,
          rightNumber: rightNo,
        });
        leftNo += 1;
        rightNo += 1;
        index += 1;
        continue;
      }

      if (op.type === "same") {
        rows.push({
          left: op.line,
          right: op.line,
          status: "same",
          leftNumber: leftNo,
          rightNumber: rightNo,
        });
        leftNo += 1;
        rightNo += 1;
        continue;
      }

      if (op.type === "removed") {
        rows.push({
          left: op.line,
          right: "",
          status: "removed",
          leftNumber: leftNo,
        });
        leftNo += 1;
        continue;
      }

      rows.push({
        left: "",
        right: op.line,
        status: "added",
        rightNumber: rightNo,
      });
      rightNo += 1;
    }

    return rows;
  }
}

import type { ToolItem } from "@/lib/tools";

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
        icon="Δ"
        title="Text Diff"
        description="두 텍스트를 나란히 비교하여 변경된 부분을 하이라이트합니다. 추가/삭제/수정된 라인과 단어 단위 차이를 시각적으로 확인할 수 있습니다."
        chips={["라인 단위 비교", "단어 단위 하이라이트", "변경 사항만 필터"]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <ToolCard>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            <span>Left</span>
            <div className="flex items-center gap-3">
              <span>Original</span>
              <ToolActionButton
                type="button"
                onClick={() => handleClear("left")}
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
            <span>Right</span>
            <div className="flex items-center gap-3">
              <span>Updated</span>
              <ToolActionButton
                type="button"
                onClick={() => handleClear("right")}
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
          <div className="px-4 py-3">Left</div>
          <div className="px-4 py-3">Right</div>
        </div>
        <div className="divide-y divide-[color:var(--card-border)]">
          {diffRows.map((row, index) => {
            const wordDiff =
              row.status === "changed" && showWordDiff ? DiffEngine.buildWordDiff(row.left, row.right) : null;

            return (
              <div
                key={`${row.leftNumber ?? "x"}-${row.rightNumber ?? "y"}-${row.status}`}
                className="grid grid-cols-2 text-xs font-mono"
              >
                <div className={`flex items-start gap-3 px-4 py-2 ${leftStatusClass[row.status]}`}>
                  <span className="w-6 text-right text-[var(--muted)]">{row.leftNumber ?? ""}</span>
                  <span className="whitespace-pre-wrap text-[var(--foreground)]">
                    {wordDiff ? (
                      <>
                        {wordDiff.leadingLeft && <span>{wordDiff.leadingLeft}</span>}
                        {DiffEngine.renderWordParts(wordDiff.leftParts)}
                      </>
                    ) : (
                      row.left || " "
                    )}
                  </span>
                </div>
                <div className={`flex items-start gap-3 px-4 py-2 ${rightStatusClass[row.status]}`}>
                  <span className="w-6 text-right text-[var(--muted)]">{row.rightNumber ?? ""}</span>
                  <span className="whitespace-pre-wrap text-[var(--foreground)]">
                    {wordDiff ? (
                      <>
                        {wordDiff.leadingRight && <span>{wordDiff.leadingRight}</span>}
                        {DiffEngine.renderWordParts(wordDiff.rightParts)}
                      </>
                    ) : (
                      row.right || " "
                    )}
                  </span>
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

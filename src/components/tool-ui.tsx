"use client";

import type { ComponentProps, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ToolPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-8", className)}>{children}</div>;
}

export function ToolHeader({
  title,
  description,
  right,
  className,
}: {
  title: string;
  description: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:items-center md:justify-between", className)}>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">{title}</h1>
        <p className="text-sm text-[var(--muted)]">{description}</p>
      </div>
      {right}
    </div>
  );
}

export function ToolCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-3 rounded-3xl border border-[color:var(--card-border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]",
        className,
      )}
    >
      {children}
    </Card>
  );
}

export function ToolBadge({
  className,
  children,
  tone = "default",
}: {
  className?: string;
  children: ReactNode;
  tone?: "default" | "sky" | "orange" | "teal" | "green" | "red" | "purple" | "neutral" | "rose" | "cyan" | "lime";
}) {
  const toneClass =
    tone === "sky"
      ? "border-[color:var(--utc-to-local-output-border)] bg-[var(--utc-to-local-output-bg)] text-[var(--foreground)]"
      : tone === "orange"
        ? "border-[color:var(--local-to-utc-output-border)] bg-[var(--local-to-utc-output-bg)] text-[var(--foreground)]"
        : tone === "teal"
          ? "border-[color:var(--unix-to-date-output-border)] bg-[var(--unix-to-date-output-bg)] text-[var(--foreground)]"
          : tone === "green"
            ? "border-[color:var(--date-to-unix-output-border)] bg-[var(--date-to-unix-output-bg)] text-[var(--foreground)]"
            : tone === "red"
              ? "border-[color:var(--danger-output-border)] bg-[var(--danger-output-bg)] text-[var(--foreground)]"
                : tone === "purple"
                ? "border-[color:var(--purple-output-border)] bg-[var(--purple-output-bg)] text-[var(--foreground)]"
                : tone === "rose"
                    ? "border-rose-300/70 bg-rose-100/70 text-[var(--foreground)] dark:border-rose-300/40 dark:bg-rose-300/15"
                    : tone === "cyan"
                        ? "border-cyan-300/70 bg-cyan-100/70 text-[var(--foreground)] dark:border-cyan-300/40 dark:bg-cyan-300/15"
                        : tone === "lime"
                          ? "border-lime-300/70 bg-lime-100/70 text-[var(--foreground)] dark:border-lime-300/40 dark:bg-lime-300/15"
                : tone === "neutral"
                  ? "border-[color:var(--card-border)] bg-[var(--surface-muted)] text-[var(--foreground)]"
            : "border-[color:var(--date-to-unix-output-border)] bg-[var(--date-to-unix-output-bg)] text-[var(--foreground)]";
  return (
    <Badge
      variant="outline"
      className={cn(
        "self-start cursor-default rounded-xl border px-3 py-1 text-xs font-semibold tracking-[0.06em]",
        toneClass,
        className,
      )}
    >
      {children}
    </Badge>
  );
}

export function ToolActionButton({
  className,
  children,
  tone = "sky",
  ...props
}: ComponentProps<typeof Button> & {
  tone?: "sky" | "orange" | "teal" | "green" | "red" | "purple" | "neutral";
}) {
  const toneClass =
    tone === "sky"
      ? "border-[color:var(--utc-to-local-output-border)] bg-[var(--utc-to-local-output-bg)]"
      : tone === "orange"
        ? "border-[color:var(--local-to-utc-output-border)] bg-[var(--local-to-utc-output-bg)]"
        : tone === "teal"
          ? "border-[color:var(--unix-to-date-output-border)] bg-[var(--unix-to-date-output-bg)]"
          : tone === "green"
            ? "border-[color:var(--date-to-unix-output-border)] bg-[var(--date-to-unix-output-bg)]"
            : tone === "red"
              ? "border-[color:var(--danger-output-border)] bg-[var(--danger-output-bg)]"
              : tone === "purple"
                ? "border-[color:var(--purple-output-border)] bg-[var(--purple-output-bg)]"
                : "border-[color:var(--card-border)] bg-[var(--surface-muted)]";
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "cursor-pointer h-auto rounded-xl border px-3 py-1 text-xs font-semibold text-[var(--foreground)] transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--card-border-hover)] disabled:cursor-not-allowed disabled:opacity-50",
        toneClass,
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export function ToolTextarea({ className, ...props }: ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      className={cn(
        "w-full resize-none rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4 font-mono text-xs text-[var(--foreground)] focus:border-[color:var(--card-border-hover)] focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function ToolOutput({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-x-hidden whitespace-pre-wrap break-words rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4 font-mono text-xs text-[var(--foreground)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ToolCodeOutput({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <pre
      className={cn(
        "w-full overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4 font-mono text-xs leading-relaxed text-[var(--foreground)]",
        className,
      )}
    >
      {children}
    </pre>
  );
}

export function ToolDiffText({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("whitespace-pre-wrap break-words text-[var(--foreground)]", className)}>{children}</span>;
}

export function ToolLabel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "text-xs font-semibold text-[var(--muted)] uppercase tracking-[0.12em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ToolInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        "tool-input h-9 rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--foreground)] focus:border-[color:var(--card-border-hover)] focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function ToolSelect({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-9 w-full rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-3 pr-8 text-sm text-[var(--foreground)] focus:border-[color:var(--card-border-hover)] focus:outline-none appearance-none cursor-pointer",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">
        ▼
      </span>
    </div>
  );
}

export function ToolAddButton({ className, children, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "cursor-pointer h-auto rounded-xl border border-[color:var(--utc-to-local-output-border)] bg-[var(--utc-to-local-output-bg)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] transition hover:brightness-95",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export function ToolRemoveButton({ className, children = "Remove", ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "cursor-pointer h-8 rounded-xl border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.12)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:brightness-95 dark:border-[rgba(248,113,113,0.45)] dark:bg-[rgba(248,113,113,0.18)]",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export function ToolInfoPanel({
  icon,
  title,
  description,
  chips,
  className,
  children,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  chips?: ReactNode[];
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Card
      className={cn("rounded-2xl border border-[color:var(--url-panel-border)] bg-[var(--url-panel-bg)] p-4", className)}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--url-panel-icon-bg)] text-sm text-[var(--url-panel-accent)]">
            {icon}
          </span>
        ) : null}
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
          <div className="text-xs leading-relaxed text-[var(--muted)]">{description}</div>
          {children}
          {chips?.length ? (
            <div className="mt-1 flex flex-wrap gap-2">
              {chips.map((chip, index) => (
                <span
                  key={index}
                  className="rounded-md bg-[var(--url-panel-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--url-panel-accent)]"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

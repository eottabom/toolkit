"use client";

import type { ComponentProps, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

export function ToolBadge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Badge
      className={cn(
        "rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 hover:bg-emerald-500/15 dark:bg-emerald-400/25 dark:text-emerald-200",
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
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "cursor-pointer h-auto rounded-full border border-[color:var(--card-border)] bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[color:var(--card-border-hover)] hover:text-[var(--foreground)]",
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
        "whitespace-pre-wrap rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4 font-mono text-xs text-[var(--foreground)]",
        className,
      )}
    >
      {children}
    </div>
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

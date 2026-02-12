import * as React from "react";

type StatCardProps = {
  label: string;
  value: string;
  note?: string;
  icon?: React.ReactNode;
};

export function StatCard({ label, value, note, icon }: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-[color:var(--card-border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
        <span>{label}</span>
        {icon ? <span className="text-[var(--muted)]">{icon}</span> : null}
      </div>
      <div className="text-2xl font-semibold text-[var(--foreground)]">
        {value}
      </div>
      {note ? <div className="text-sm text-[var(--muted)]">{note}</div> : null}
    </div>
  );
}

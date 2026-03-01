import { cn } from "@/lib/utils";

type TagFilterButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

export function TagFilterButton({ label, active, onClick }: TagFilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] transition hover:-translate-y-0.5",
        active
          ? "border-transparent bg-[var(--foreground)] text-[var(--background)]"
          : "border-[color:var(--card-border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[color:var(--card-border-hover)]",
      )}
    >
      {label}
    </button>
  );
}

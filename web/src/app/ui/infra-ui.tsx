import type { InfraStatus } from "@/lib/infra";

export function statusLabel(status: InfraStatus): string {
  switch (status) {
    case "planned":
      return "Planned";
    case "in_progress":
      return "In Progress";
    case "live":
      return "Live";
    case "paused":
      return "Paused";
    case "cancelled":
      return "Cancelled";
  }
}

export function statusBadgeClassName(status: InfraStatus): string {
  switch (status) {
    case "live":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "in_progress":
      return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300";
    case "planned":
      return "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300";
    case "paused":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-800 dark:text-zinc-300";
    case "cancelled":
      return "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300";
  }
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-2 w-full rounded-full bg-muted" aria-label={`Progress ${pct.toFixed(0)}%`}>
      <div
        className="h-2 rounded-full bg-brand"
        style={{ width: `${pct.toFixed(2)}%` }}
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: InfraStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        statusBadgeClassName(status),
      ].join(" ")}
    >
      {statusLabel(status)}
    </span>
  );
}


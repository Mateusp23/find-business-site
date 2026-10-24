"use client";

import { ProgressBar } from "@heroui/react";
import { formatLimit } from "@/lib/billing/plans";

/** Barra de uso: "12 de 120". Sem limite, mostra "Ilimitado". */
export function UsageMeter({
  label,
  used,
  limit,
  hint,
}: {
  label: string;
  used: number;
  limit: number | null;
  hint?: string;
}) {
  const pct = limit === null || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const color =
    limit === null ? "accent" : pct >= 100 ? "danger" : pct >= 80 ? "warning" : "accent";

  return (
    <div className="space-y-2 rounded-xl bg-surface-secondary p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm tabular-nums">
          <span className="font-semibold">{used.toLocaleString("pt-BR")}</span>
          <span className="text-muted"> / {formatLimit(limit)}</span>
        </p>
      </div>
      {limit !== null && (
        <ProgressBar aria-label={label} value={pct} color={color} size="sm">
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      )}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

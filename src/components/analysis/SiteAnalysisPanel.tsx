"use client";

import { Button, Spinner } from "@heroui/react";
import { AlertTriangle, CheckCircle2, Gauge, RotateCcw } from "lucide-react";
import type { AnalysisEntry } from "@/store/slices/analysisSlice";
import type { SiteAnalysis } from "@/types/lead";

function scoreColor(v: number | null) {
  if (v === null) return "text-muted";
  if (v >= 90) return "text-success";
  if (v >= 50) return "text-warning";
  return "text-danger";
}

const METRICS: { key: keyof SiteAnalysis["scores"]; label: string }[] = [
  { key: "performance", label: "Velocidade" },
  { key: "seo", label: "Google (SEO)" },
  { key: "accessibility", label: "Acessibilidade" },
  { key: "bestPractices", label: "Boas práticas" },
];

export function SiteAnalysisResult({ data, compact }: { data: SiteAnalysis; compact?: boolean }) {
  return (
    <div className="space-y-3 rounded-xl bg-surface-secondary p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {data.isWeak ? (
            <AlertTriangle className="size-4 text-danger" />
          ) : (
            <CheckCircle2 className="size-4 text-success" />
          )}
          {data.isWeak ? "Site fraco" : "Site em bom estado"}
        </div>
        <div className="text-right">
          <span className={`text-lg font-semibold tabular-nums ${scoreColor(data.quality)}`}>
            {data.quality}
          </span>
          <span className="text-xs text-muted">/100</span>
        </div>
      </div>

      <div className={`grid gap-2 ${compact ? "grid-cols-4" : "grid-cols-2 sm:grid-cols-4"}`}>
        {METRICS.map((m) => (
          <div key={m.key} className="rounded-lg bg-surface px-2 py-1.5 text-center">
            <div className={`text-sm font-semibold tabular-nums ${scoreColor(data.scores[m.key])}`}>
              {data.scores[m.key] ?? "–"}
            </div>
            <div className="truncate text-[10px] text-muted">{m.label}</div>
          </div>
        ))}
      </div>

      {data.issues.length > 0 && (
        <ul className="space-y-1 text-xs text-muted">
          {data.issues.map((i) => (
            <li key={i.label} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
              {i.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface SiteAnalysisPanelProps {
  entry: AnalysisEntry | undefined;
  onAnalyze: () => void;
}

/** Botão "Analisar site" + estado de carregando/erro/resultado, usado no card. */
export function SiteAnalysisPanel({ entry, onAnalyze }: SiteAnalysisPanelProps) {
  if (!entry) {
    return (
      <Button size="sm" variant="tertiary" onPress={onAnalyze} className="self-start">
        <Gauge className="size-4" />
        Analisar site
      </Button>
    );
  }

  if (entry.status === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-surface-secondary p-3 text-xs text-muted">
        <Spinner size="sm" color="current" />
        Analisando o site no PageSpeed (pode levar até 40 s)...
      </div>
    );
  }

  if (entry.status === "error") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-danger-soft p-3 text-xs text-danger-soft-foreground">
        <span>{entry.error}</span>
        <Button size="sm" variant="ghost" onPress={onAnalyze}>
          <RotateCcw className="size-3.5" />
          Tentar de novo
        </Button>
      </div>
    );
  }

  return <SiteAnalysisResult data={entry.data} compact />;
}

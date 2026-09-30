import type { SiteAnalysis, SiteIssue } from "@/types/lead";

/** Pedaço do JSON do PageSpeed Insights v5 que usamos. */
export interface PsiResponse {
  id?: string;
  lighthouseResult?: {
    requestedUrl?: string;
    finalUrl?: string;
    finalDisplayedUrl?: string;
    runtimeError?: { code: string; message: string };
    categories?: Record<string, { score: number | null } | undefined>;
    audits?: Record<string, { score: number | null; numericValue?: number } | undefined>;
  };
  error?: { code: number; message: string };
}

const pct = (score: number | null | undefined) =>
  typeof score === "number" ? Math.round(score * 100) : null;

const passed = (score: number | null | undefined) =>
  typeof score === "number" ? score >= 0.9 : null;

const secondsFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Converte a resposta do PageSpeed em um diagnóstico em linguagem de cliente. */
export function analyzePsi(url: string, psi: PsiResponse): SiteAnalysis {
  const lh = psi.lighthouseResult ?? {};
  const cat = lh.categories ?? {};
  const audits = lh.audits ?? {};

  const scores = {
    performance: pct(cat.performance?.score),
    seo: pct(cat.seo?.score),
    accessibility: pct(cat.accessibility?.score),
    bestPractices: pct(cat["best-practices"]?.score),
  };
  const lcpMs = audits["largest-contentful-paint"]?.numericValue;
  const lcpSeconds = typeof lcpMs === "number" ? Math.round(lcpMs / 100) / 10 : null;
  const finalUrl = lh.finalDisplayedUrl ?? lh.finalUrl ?? url;

  const checks = {
    https: audits["is-on-https"] ? passed(audits["is-on-https"].score) : finalUrl.startsWith("https:"),
    mobileFriendly: passed(audits["viewport"]?.score),
    hasMetaDescription: passed(audits["meta-description"]?.score),
    hasTitle: passed(audits["document-title"]?.score),
  };

  const issues: SiteIssue[] = [];

  if (checks.mobileFriendly === false) {
    issues.push({
      label: "Não é adaptado para celular",
      pitch: "não se adapta à tela do celular",
    });
  }
  if (scores.performance !== null && scores.performance < 50) {
    const s = lcpSeconds !== null ? secondsFmt.format(lcpSeconds) : null;
    issues.push({
      label: s ? `Lento no celular (${s} s)` : `Lento no celular (${scores.performance}/100)`,
      pitch: s
        ? `demora ${s} segundos para abrir no celular`
        : "está bem lento para abrir no celular",
    });
  }
  if (checks.https === false) {
    issues.push({
      label: "Sem cadeado (não seguro)",
      pitch: "aparece como “não seguro” no navegador",
    });
  }
  if ((scores.seo !== null && scores.seo < 80) || checks.hasMetaDescription === false || checks.hasTitle === false) {
    issues.push({
      label: `Pouco otimizado para o Google${scores.seo !== null ? ` (${scores.seo}/100)` : ""}`,
      pitch: "não está preparado para aparecer bem nas buscas do Google",
    });
  }
  if (scores.accessibility !== null && scores.accessibility < 70) {
    issues.push({
      label: `Difícil de ler e navegar (${scores.accessibility}/100)`,
      pitch: "é difícil de ler e navegar",
    });
  }
  if (scores.bestPractices !== null && scores.bestPractices < 70) {
    issues.push({
      label: "Tecnologia desatualizada",
      pitch: "usa tecnologia desatualizada",
    });
  }

  // Nota geral: média ponderada das categorias disponíveis, com penalidades graves.
  const weights: [number | null, number][] = [
    [scores.performance, 0.4],
    [scores.seo, 0.25],
    [scores.accessibility, 0.2],
    [scores.bestPractices, 0.15],
  ];
  const available = weights.filter(([v]) => v !== null) as [number, number][];
  const totalWeight = available.reduce((sum, [, w]) => sum + w, 0);
  let quality = totalWeight
    ? available.reduce((sum, [v, w]) => sum + v * w, 0) / totalWeight
    : 50;
  if (checks.mobileFriendly === false) quality -= 25;
  if (checks.https === false) quality -= 20;
  quality = Math.max(0, Math.min(100, Math.round(quality)));

  const isWeak =
    quality < 60 ||
    checks.mobileFriendly === false ||
    checks.https === false ||
    (scores.performance !== null && scores.performance < 40);

  return {
    url,
    finalUrl,
    analyzedAt: new Date().toISOString(),
    scores,
    lcpSeconds,
    checks,
    quality,
    isWeak,
    issues,
  };
}

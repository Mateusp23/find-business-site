import type { Business, SiteAnalysis } from "@/types/lead";
import { scoreBusiness } from "./classify";

/** Só vale analisar quem tem site próprio (rede social e "sem site" não têm o que medir). */
export function canAnalyze(b: Business) {
  return Boolean(b.website) && (b.presence === "com_site" || b.presence === "site_fraco");
}

/**
 * Aplica o resultado do PageSpeed à empresa: reclassifica (tem site ↔ site fraco)
 * e recalcula a pontuação. A empresa original vinda do Google não é alterada.
 */
export function applyAnalysis(b: Business, analysis: SiteAnalysis | undefined): Business {
  if (!analysis || !canAnalyze(b)) return b;

  const presence = analysis.isWeak ? "site_fraco" : "com_site";
  const presenceDetail = analysis.isWeak
    ? `Nota do site: ${analysis.quality}/100`
    : `Site bom (nota ${analysis.quality}/100)`;

  const { score, reasons } = scoreBusiness({
    presence,
    presenceDetail,
    rating: b.rating,
    reviewCount: b.reviewCount,
    hasPhone: Boolean(b.phone),
    isMobile: b.isMobile,
    siteQuality: analysis.quality,
  });

  return { ...b, presence, presenceDetail, score, reasons };
}

import "server-only";

import { ApiError } from "./api/errors";
import type { SiteAnalysis } from "@/types/lead";
import { analyzePsi, type PsiResponse } from "./siteQuality";

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Cache em memória: o mesmo site não é analisado duas vezes no mesmo dia. */
const cache = new Map<string, { at: number; data: SiteAnalysis }>();

export class PageSpeedError extends ApiError {
  constructor(message: string, status: number) {
    super(message, status, "PAGESPEED");
  }
}

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol); // lança se for inválida
  if (!url.hostname.includes(".")) throw new Error("URL sem domínio");
  return url.toString();
}

export async function analyzeSite(rawUrl: string): Promise<SiteAnalysis> {
  let url: string;
  try {
    url = normalizeUrl(rawUrl);
  } catch {
    throw new PageSpeedError("Endereço de site inválido.", 400);
  }

  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const params = new URLSearchParams({ url, strategy: "MOBILE", locale: "pt_BR" });
  for (const c of ["PERFORMANCE", "SEO", "ACCESSIBILITY", "BEST_PRACTICES"]) {
    params.append("category", c);
  }
  // A chave é opcional: sem ela o Google aceita poucas análises por dia.
  const key = process.env.PAGESPEED_API_KEY;
  if (key) params.set("key", key);

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    throw new PageSpeedError("Sem resposta do PageSpeed (tempo esgotado ou sem internet).", 504);
  }
  const data = (await res.json().catch(() => ({}))) as PsiResponse;

  if (!res.ok || data.error) {
    if (res.status === 429) {
      throw new PageSpeedError(
        key
          ? "Limite de análises do PageSpeed atingido. Tente de novo em alguns minutos."
          : "Limite de análises sem chave atingido. Crie uma PAGESPEED_API_KEY (veja o README).",
        429,
      );
    }
    const message = data.error?.message ?? res.statusText;
    // Site fora do ar, bloqueando robôs ou com DNS quebrado também é sinal de site ruim.
    throw new PageSpeedError(`Não foi possível analisar o site: ${message}`, 422);
  }

  const runtime = data.lighthouseResult?.runtimeError;
  if (runtime && runtime.code !== "NO_ERROR") {
    throw new PageSpeedError(`O site não abriu para análise (${runtime.code}).`, 422);
  }

  const analysis = analyzePsi(url, data);
  cache.set(url, { at: Date.now(), data: analysis });
  return analysis;
}

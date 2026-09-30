import "server-only";

import { ApiError } from "./errors";
import type { ApiSession } from "./session.server";

export interface RateRule {
  /** Nome do limite, ex.: "search:hour". */
  bucket: string;
  limit: number;
  windowSeconds: number;
}

const envInt = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
};

/**
 * Limites por usuário. Ajustáveis por variável de ambiente sem mexer no código.
 * A busca é o que custa dinheiro (Google Places), por isso tem limite por hora e por dia.
 */
export const RATE_LIMITS = {
  search: [
    { bucket: "search:hour", limit: envInt("RATE_LIMIT_SEARCH_PER_HOUR", 30), windowSeconds: 3600 },
    { bucket: "search:day", limit: envInt("RATE_LIMIT_SEARCH_PER_DAY", 150), windowSeconds: 86400 },
  ],
  analysis: [
    {
      bucket: "analysis:hour",
      limit: envInt("RATE_LIMIT_ANALYSIS_PER_HOUR", 60),
      windowSeconds: 3600,
    },
  ],
  cities: [{ bucket: "cities:min", limit: 60, windowSeconds: 60 }],
} satisfies Record<string, RateRule[]>;

// ─────────────────────────────────────────────────────────────
// Modo local (sem Supabase): contador em memória por IP.
// Serve para desenvolvimento; em produção o limite fica no banco (vale entre servidores).
// ─────────────────────────────────────────────────────────────
const memory = new Map<string, { windowStart: number; count: number }>();

function checkMemory(key: string, rule: RateRule) {
  const now = Date.now();
  const windowStart = Math.floor(now / (rule.windowSeconds * 1000)) * rule.windowSeconds * 1000;
  const entry = memory.get(key);
  const count = entry && entry.windowStart === windowStart ? entry.count + 1 : 1;
  memory.set(key, { windowStart, count });
  if (memory.size > 10_000) memory.clear(); // proteção contra crescimento infinito
  return {
    allowed: count <= rule.limit,
    resetAt: new Date(windowStart + rule.windowSeconds * 1000),
  };
}

export function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function tooMany(resetAt: Date): never {
  const seconds = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
  const wait =
    seconds < 90
      ? `${seconds} segundos`
      : seconds < 5400
        ? `${Math.ceil(seconds / 60)} minutos`
        : `${Math.ceil(seconds / 3600)} horas`;
  throw new ApiError(`Você atingiu o limite de uso. Tente de novo em ${wait}.`, 429, "RATE_LIMIT", {
    "Retry-After": String(seconds),
  });
}

/** Aplica os limites; lança ApiError 429 (com Retry-After) quando estoura. */
export async function enforceRateLimit(
  session: ApiSession,
  rules: RateRule[],
  request: Request,
): Promise<void> {
  for (const rule of rules) {
    if (session.supabase && session.userId) {
      const { data, error } = await session.supabase.rpc("check_rate_limit", {
        p_bucket: rule.bucket,
        p_limit: rule.limit,
        p_window_seconds: rule.windowSeconds,
      });
      if (error) {
        // Migração 0003 ainda não aplicada: não derruba o app, mas avisa no log.
        if (error.code === "PGRST202" || error.code === "42883") {
          console.warn(
            "[rate-limit] função check_rate_limit não existe: rode supabase/migrations/0003",
          );
          continue;
        }
        throw error;
      }
      if (data && !data.allowed) tooMany(new Date(data.reset_at));
    } else {
      const r = checkMemory(`${clientIp(request)}:${rule.bucket}`, rule);
      if (!r.allowed) tooMany(r.resetAt);
    }
  }
}

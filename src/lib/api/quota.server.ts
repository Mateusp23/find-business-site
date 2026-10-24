import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin.server";
import type { QuotaKind } from "@/lib/supabase/types";
import { ApiError } from "./errors";
import type { ApiSession } from "./session.server";

const KIND_LABEL: Record<QuotaKind, [string, string]> = {
  search: ["créditos de busca", "crédito de busca"],
  analysis: ["análises de site", "análise de site"],
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

const missingFunction = (code?: string) => code === "PGRST202" || code === "42883";

/**
 * Gasta créditos do plano no banco (atômico). Lança 402 PLAN_LIMIT quando não cabe.
 * Modo local (sem Supabase) não tem plano: libera.
 * Devolve `true` se gastou (para devolver com refundQuota se a chamada falhar).
 */
export async function consumeQuota(
  session: ApiSession,
  kind: QuotaKind,
  amount = 1,
): Promise<boolean> {
  if (!session.supabase || !session.userId) return false;
  const { data, error } = await session.supabase.rpc("consume_quota", {
    p_kind: kind,
    p_amount: amount,
  });
  if (error) {
    if (missingFunction(error.code)) {
      console.warn("[planos] função consume_quota não existe: rode supabase/migrations/0004");
      return false;
    }
    throw error;
  }
  if (data && !data.allowed) {
    const [plural, singular] = KIND_LABEL[kind];
    const left = data.limit === null ? 0 : Math.max(data.limit - data.used, 0);
    const reset = dateFmt.format(new Date(`${data.resets_at}T12:00:00Z`));
    const detail =
      left > 0
        ? `${left === 1 ? "Resta" : "Restam"} ${left} ${left === 1 ? singular : plural} e esta busca precisa de ${amount}. Busque menos resultados ou`
        : `Você usou ${data.used} de ${data.limit} ${plural} do plano ${data.plan_name} este mês. Renova em ${reset}, ou`;
    throw new ApiError(`${detail} faça upgrade em Plano.`, 402, "PLAN_LIMIT");
  }
  return true;
}

/** Devolve créditos (chamada que falhou ou usou menos páginas). Melhor esforço: nunca lança. */
export async function refundQuota(session: ApiSession, kind: QuotaKind, amount: number) {
  if (!session.userId || amount < 1) return;
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.warn("[planos] sem SUPABASE_SECRET_KEY: não deu para devolver créditos");
    return;
  }
  for (let left = amount; left > 0; left -= 3) {
    const { error } = await admin.rpc("refund_quota", {
      p_user: session.userId,
      p_kind: kind,
      p_amount: Math.min(left, 3),
    });
    if (error) {
      console.error("[planos] erro ao devolver créditos", error);
      return;
    }
  }
}

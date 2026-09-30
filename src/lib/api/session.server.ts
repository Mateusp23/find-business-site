import "server-only";

import { getSupabaseServer } from "@/lib/supabase/server";
import { ApiError } from "./errors";

export interface ApiSession {
  /** Cliente do Supabase com a sessão do usuário (null no modo local). */
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>;
  userId: string | null;
}

/**
 * Confere a sessão dentro da própria rota (defesa em profundidade: o proxy já barra,
 * mas a rota não confia só nele). Exige 2FA verificado quando o usuário ativou.
 * No modo local (sem Supabase) libera, pois não existe login.
 */
export async function requireSession(): Promise<ApiSession> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { supabase: null, userId: null };

  const { data } = await supabase.auth.getClaims().catch(() => ({ data: null }));
  const claims = data?.claims;
  if (!claims?.sub) throw new ApiError("Sua sessão expirou. Entre novamente.", 401, "UNAUTHORIZED");

  if (claims.aal !== "aal2") {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2") {
      throw new ApiError("Confirme o código de verificação em duas etapas.", 401, "MFA_REQUIRED");
    }
  }
  return { supabase, userId: claims.sub };
}

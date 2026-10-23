import "server-only";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, isSupabaseConfigured } from "./env";
import type { Database } from "./types";

/**
 * Chave secreta do Supabase (sb_secret_... ou a antiga service_role).
 * Ignora o RLS: use SÓ no servidor e só para o que o usuário não pode fazer sozinho
 * (gravar a assinatura vinda do Stripe, devolver créditos). Nunca prefixe com NEXT_PUBLIC_.
 */
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isAdminConfigured = isSupabaseConfigured && Boolean(SECRET_KEY);

let admin: ReturnType<typeof createClient<Database>> | null = null;

/** Cliente administrativo (null se a chave secreta não estiver no .env). */
export function getSupabaseAdmin() {
  if (!isAdminConfigured) return null;
  admin ??= createClient<Database>(SUPABASE_URL, SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return admin;
}

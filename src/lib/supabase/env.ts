/**
 * Configuração do Supabase. Sem estas variáveis o app roda em "modo local":
 * sem login, com os dados salvos só no navegador.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
/** Chave pública do projeto (a "publishable key" nova ou a "anon key" antiga). */
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

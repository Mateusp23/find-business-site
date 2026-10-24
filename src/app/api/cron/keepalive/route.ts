import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonError, withApiErrors } from "@/lib/api/handler.server";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Chamado 1x por dia pelo Cron da Vercel (vercel.json) para o projeto grátis do
 * Supabase não ser pausado por falta de uso (o Supabase pausa após 7 dias parado).
 * Faz uma consulta leve de verdade no banco: a tabela pública de planos.
 *
 * Proteção: a Vercel manda "Authorization: Bearer <CRON_SECRET>". Com CRON_SECRET
 * definido, qualquer outra chamada recebe 401.
 */
export const dynamic = "force-dynamic";

export const GET = withApiErrors(async (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return jsonError(401, "Não autorizado.", "UNAUTHORIZED");
  }
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true, skipped: "modo local" });

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.from("plans").select("id").limit(1);
  if (error) throw error; // aparece como falha nos logs do Cron da Vercel

  return NextResponse.json(
    { ok: true, at: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
});

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { authErrorMessage } from "@/lib/supabase/errors";
import { safeNext } from "@/lib/supabase/routes";

/**
 * Destino dos links do Supabase: login com Google, confirmação de e-mail e
 * recuperação de senha. Troca o ?code= por uma sessão e segue para ?next=.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const providerError = url.searchParams.get("error_description");

  const fail = (message: string) =>
    NextResponse.redirect(new URL(`/login?erro=${encodeURIComponent(message)}`, url.origin));

  if (providerError) return fail(providerError);
  if (!code) return fail("Link inválido ou incompleto.");

  const supabase = await getSupabaseServer();
  if (!supabase) return NextResponse.redirect(new URL("/", url.origin));

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // O link só funciona no mesmo navegador em que o cadastro/recuperação foi pedido.
    return fail(
      error.code === "flow_state_not_found" || /code verifier/i.test(error.message)
        ? "Abra o link no mesmo navegador em que você pediu o cadastro ou a recuperação de senha."
        : authErrorMessage(error),
    );
  }
  return NextResponse.redirect(new URL(next, url.origin));
}

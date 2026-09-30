import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { buildCsp, createNonce } from "@/lib/security/csp";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/env";
import {
  GUEST_ONLY_ROUTES,
  MFA_PENDING_ROUTES,
  PUBLIC_ROUTES,
  matches,
} from "@/lib/supabase/routes";

/**
 * Roda antes de cada página/rota:
 * 1. cria o nonce e a Content-Security-Policy da página;
 * 2. renova a sessão do Supabase (cookies);
 * 3. manda quem não está logado para /login (ou 401 nas rotas /api);
 * 4. exige o código do 2FA de quem ativou (sessão aal1 → /verificar-2fa).
 * Sem Supabase configurado (modo local), só aplica a CSP.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // CSP com nonce só nas páginas (as rotas /api devolvem JSON).
  const nonce = createNonce();
  const proto =
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const csp = buildCsp(nonce, { isHttps: proto === "https" });
  const requestHeaders = new Headers(request.headers);
  if (!isApi) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
  }
  const next = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    if (!isApi) res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  if (!isSupabaseConfigured) return next();

  let response = next();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Os cookies novos também precisam ir para a requisição que segue para a página.
        requestHeaders.set("cookie", request.cookies.toString());
        response = next();
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Não coloque código entre a criação do cliente e getClaims(): é aqui que a sessão é renovada.
  const { data } = await supabase.auth.getClaims().catch(() => ({ data: null }));
  const claims = data?.claims;
  const isLoggedIn = Boolean(claims?.sub);

  const redirect = (to: string, keepNext = true) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search =
      keepNext && pathname !== "/" ? `?next=${encodeURIComponent(pathname + search)}` : "";
    const res = NextResponse.redirect(url);
    // Mantém os cookies de sessão renovados neste redirecionamento.
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };
  const unauthorized = (error: string, code: string) =>
    NextResponse.json({ error, code }, { status: 401, headers: { "Cache-Control": "no-store" } });

  if (!isLoggedIn) {
    if (matches(pathname, PUBLIC_ROUTES)) return response;
    if (isApi) return unauthorized("Sua sessão expirou. Entre novamente.", "UNAUTHORIZED");
    return redirect("/login");
  }

  // 2FA: entrou só com a senha (aal1), mas a conta tem fator verificado → pede o código.
  if (claims?.aal !== "aal2") {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      if (matches(pathname, MFA_PENDING_ROUTES) || matches(pathname, PUBLIC_ROUTES)) {
        return matches(pathname, GUEST_ONLY_ROUTES) ? redirect("/verificar-2fa", false) : response;
      }
      if (isApi)
        return unauthorized("Confirme o código de verificação em duas etapas.", "MFA_REQUIRED");
      return redirect("/verificar-2fa");
    }
  }

  // Já logado (e verificado): telas de login/cadastro e de 2FA não fazem sentido.
  if (matches(pathname, GUEST_ONLY_ROUTES) || pathname === "/verificar-2fa") {
    return redirect("/", false);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};

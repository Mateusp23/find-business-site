import { SUPABASE_URL } from "@/lib/supabase/env";

/** Domínio do captcha (Cloudflare Turnstile), usado só se NEXT_PUBLIC_TURNSTILE_SITE_KEY existir. */
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

/**
 * Content Security Policy com nonce: só roda JavaScript que o próprio Next marcou
 * com o nonce desta requisição. Um script injetado por um atacante (XSS) não tem o
 * nonce e é bloqueado pelo navegador.
 */
export function buildCsp(
  nonce: string,
  { isDev = process.env.NODE_ENV === "development", isHttps = true } = {},
) {
  const supabase = SUPABASE_URL ? new URL(SUPABASE_URL) : null;
  const supabaseHttp = supabase ? supabase.origin : "";
  const supabaseWs = supabase ? `wss://${supabase.host}` : "";

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      TURNSTILE_ORIGIN,
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // Estilos inline (atributo style) são usados pelos componentes; não executam código.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://*.googleusercontent.com", supabaseHttp],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      supabaseHttp,
      supabaseWs,
      TURNSTILE_ORIGIN,
      ...(isDev ? ["ws:", "wss:"] : []),
    ],
    "frame-src": [TURNSTILE_ORIGIN],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "manifest-src": ["'self'"],
  };

  const csp = Object.entries(directives)
    .map(([k, v]) => `${k} ${v.filter(Boolean).join(" ")}`)
    .join("; ");
  // Só em HTTPS: em http://localhost (pnpm start) ele quebraria a navegação.
  return !isDev && isHttps ? `${csp}; upgrade-insecure-requests` : csp;
}

/** Nonce aleatório por requisição (base64 de 16 bytes). */
export function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

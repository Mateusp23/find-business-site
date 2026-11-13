/** Rotas que não exigem login. */
// /api/billing/webhook: o Stripe chama sem login; a rota confere a assinatura do evento.
export const PUBLIC_ROUTES = [
  "/login",
  "/cadastro",
  "/esqueci-senha",
  "/auth",
  "/api/health",
  "/api/billing/webhook",
  // Cron da Vercel (mantém o Supabase grátis acordado); protegido por CRON_SECRET.
  "/api/cron/keepalive",
];

/** Rotas liberadas para quem entrou com senha mas ainda não digitou o código do 2FA. */
export const MFA_PENDING_ROUTES = ["/verificar-2fa", "/auth"];

/** Rotas de quem ainda não entrou: quem já está logado é mandado para o início. */
export const GUEST_ONLY_ROUTES = ["/login", "/cadastro", "/esqueci-senha"];

export const matches = (pathname: string, routes: string[]) =>
  routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));

/** Evita redirecionamento para outro site em ?next=. */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\"))
    return fallback;
  if (/[\r\n]/.test(next) || /^\/[a-z]+:/i.test(next)) return fallback;
  return next;
}

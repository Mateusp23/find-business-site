/** Rotas que não exigem login. */
export const PUBLIC_ROUTES = ["/login", "/cadastro", "/esqueci-senha", "/auth", "/api/health"];

/** Rotas de quem ainda não entrou: quem já está logado é mandado para o início. */
export const GUEST_ONLY_ROUTES = ["/login", "/cadastro", "/esqueci-senha"];

export const matches = (pathname: string, routes: string[]) =>
  routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));

/** Evita redirecionamento para outro site em ?next=. */
export function safeNext(next: string | null | undefined, fallback = "/") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

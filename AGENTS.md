<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Find Business: notas do projeto

- UI: **HeroUI v3** (API composta: `Card.Header`, `Select.Trigger`, `Modal.Backdrop`...). É diferente da v2. Use o MCP `heroui-react` (`.mcp.json`) ou leia os tipos em `node_modules/@heroui/react/dist/components/*`.
- Botões usam `onPress` (React Aria), não `onClick`. Select/ComboBox controlados usam `value` + `onChange`.
- Tema: next-themes (`class="light|dark"` no `<html>`), variáveis em `src/app/globals.css`. Use só tokens do HeroUI (`bg-surface`, `text-muted`...) para funcionar nos dois temas.
- Estado: Redux Toolkit. Chamadas HTTP só via RTK Query em `src/store/api/findBusinessApi.ts`.
- Chaves de API só no servidor (`src/lib/*.server.ts`, `import "server-only"`).
- Textos da interface em português do Brasil.
- Auth: Supabase via `@supabase/ssr`. `src/proxy.ts` protege as rotas; sem as variáveis `NEXT_PUBLIC_SUPABASE_*` o app roda em modo local (sem login).
- Dados do usuário: componentes só usam o Redux; `src/store/index.ts` salva cada ação no adaptador ativo (`src/lib/data/local.ts` ou `supabase.ts`). Mudou o schema? Atualize `supabase/migrations` e `src/lib/supabase/types.ts`.
- Formulários: React Hook Form + Zod. Schemas em `src/lib/validation/schemas.ts` (mensagens em português), campos prontos em `src/components/form` (`FormTextField`, `FormPasswordField`, `FormSelect`, `FormComboBox`, `SubmitButton`). Sempre `<form noValidate>`.
- Feedback: toda resposta de API/ação vira toast (canto inferior direito) via `notify` de `src/lib/notify.ts` (`success`, `error`, `info`, `warning`, `loading` + `update`). Erros do RTK Query já geram toast sozinhos em `src/store/feedback.ts` (configure o título em `API_ERROR_TITLES`). Validação de campo fica inline; estados permanentes da tela (modo demonstração, lista vazia) ficam na página. Toasts de salvamento só depois do adaptador confirmar (`src/store/index.ts`).
- Rotas `/api`: sempre `export const GET = withApiErrors(async (...) => ...)` e `throw new ApiError(msg, status, code)` para erros esperados. Nunca devolva `err.message` de erro desconhecido.
- Segurança: leia SECURITY.md. Rotas `/api` novas: `requireSession()` + schema Zod em `src/lib/validation/api.ts` + `enforceRateLimit()` se custar dinheiro ou for pesada. Tabela nova: RLS de dono + política restritiva de MFA (veja a migração 0003). Script externo novo: adicione o domínio em `src/lib/security/csp.ts`.

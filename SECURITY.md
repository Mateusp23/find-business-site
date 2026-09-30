# Segurança do Find Business

O que já está no código e o que precisa ser ligado no painel do Supabase e do Google.
Siga a seção **Checklist do painel** uma vez por projeto (e de novo ao criar o ambiente de produção).

## O que o código já faz

### Autenticação

- **Login com e-mail/senha ou Google** pelo Supabase Auth (`@supabase/ssr`, sessão em cookies).
- **2FA por app autenticador (TOTP):** ativado por cada usuário em **Perfil → Verificação em duas etapas**. Depois de ativado, o login pede o código de 6 números (`/verificar-2fa`), inclusive no login com Google. Dá para cadastrar mais de um autenticador (recomendado, como reserva).
- **Senha forte:** mínimo de 8 caracteres, com letra e número, e bloqueio de senhas muito comuns (`src/lib/validation/schemas.ts`).
- **Sair de todos os dispositivos** em Perfil → Sessões.
- **Captcha opcional (Cloudflare Turnstile)** no login, cadastro e recuperação de senha (`src/components/auth/Captcha.tsx`).
- **Proteção contra redirecionamento aberto** no `?next=` (`safeNext` em `src/lib/supabase/routes.ts`).

### Proteção das rotas (`src/proxy.ts`)

- Renova a sessão a cada requisição e manda para `/login` quem não está logado (`/api` responde 401).
- Conta com 2FA e sessão só com senha (`aal1`) → vai para `/verificar-2fa` (`/api` responde 401 `MFA_REQUIRED`).

### Rotas `/api` (back-end)

- **Sessão conferida dentro da própria rota** (`requireSession`), sem confiar só no proxy.
- **Entradas validadas com Zod** (`src/lib/validation/api.ts`): UF, cidade, nicho e quantidade na busca; endereço na análise de site.
- **Rate limit por usuário**, guardado no banco (vale mesmo com vários servidores):

  | Rota                                              | Limite padrão     | Variável                                                  |
  | ------------------------------------------------- | ----------------- | --------------------------------------------------------- |
  | Busca de empresas (Google Places, custa dinheiro) | 30/hora e 150/dia | `RATE_LIMIT_SEARCH_PER_HOUR`, `RATE_LIMIT_SEARCH_PER_DAY` |
  | Análise de site (PageSpeed)                       | 60/hora           | `RATE_LIMIT_ANALYSIS_PER_HOUR`                            |
  | Lista de cidades                                  | 60/minuto         | —                                                         |

  Estourou → resposta 429 com `Retry-After` e toast "Tente de novo em X minutos". Sem Supabase (modo local), o limite fica em memória por IP.

- **Erros padronizados:** erro inesperado vira "Erro inesperado no servidor" com um código (`ref`) que aparece no log; o detalhe técnico nunca vai para o navegador.
- **Chaves do Google só no servidor** (`import "server-only"`), nunca com `NEXT_PUBLIC_`.

### Navegador (cabeçalhos HTTP)

- **Content-Security-Policy com nonce** por requisição (`src/lib/security/csp.ts`): só executa JavaScript do próprio app. Bloqueia XSS, iframes de terceiros e envio de formulário para outros sites.
- `Strict-Transport-Security` (só HTTPS), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (câmera, microfone, localização desligados), `Cross-Origin-Opener-Policy`, sem `X-Powered-By` (`next.config.ts`).
- Respostas da `/api` com `Cache-Control: no-store`.

### Banco (migrações em `supabase/migrations`)

- **RLS em todas as tabelas:** cada usuário só lê e altera os próprios dados.
- **2FA exigido pelo próprio banco** (`0003`): se a conta tem 2FA, uma sessão sem o código não lê nem grava nada, mesmo chamando a API do Supabase direto.
- **Usuários sem login (`anon`)** não têm acesso a nenhuma tabela.
- **Perfil:** só nome, foto, serviço, tema e modelos podem ser alterados (id e datas travados).
- **Limite de tamanho** em anotações, modelos e dados salvos (evita lotar o banco).
- Funções com `search_path` fixo e esquema `private` fora da API.

## Checklist do painel

### Supabase

1. **SQL Editor:** rode todos os arquivos de `supabase/migrations/` em ordem (`0001`, `0002`, `0003`...).
2. **Authentication → Multi-Factor:** confirme que **TOTP (App Authenticator)** está ligado.
3. **Authentication → Rate Limits:** padrões do Supabase e sugestão para uso próprio:

   | Limite                   | Padrão                  | Sugestão                  |
   | ------------------------ | ----------------------- | ------------------------- |
   | Sign-ups e sign-ins      | 30 a cada 5 min por IP  | 15 a cada 5 min           |
   | Token refresh            | 150 a cada 5 min        | manter                    |
   | Verificações (links/OTP) | 30 a cada 5 min         | 15 a cada 5 min           |
   | E-mails enviados         | limitado no SMTP padrão | com SMTP próprio: 30/hora |
   | Desafios de MFA          | 15 por minuto (fixo)    | —                         |

4. **Authentication → Providers → Email:**
   - **Confirm email** ligado (em produção).
   - **Secure email change** e **Secure password change** ligados (troca de e-mail/senha pede confirmação).
   - Tamanho mínimo da senha **8** e exigir **letras e números**.
   - **Leaked password protection** (plano Pro): bloqueia senhas que já vazaram na internet.
5. **Authentication → Attack Protection (captcha):** ligue o **Cloudflare Turnstile**.
   1. No painel da Cloudflare, **Turnstile → Add site**, com o domínio do app e `localhost`.
   2. Cole a **Secret key** no Supabase.
   3. Coloque a **Site key** em `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no `.env`.

   Ligue os dois juntos: com o captcha ligado no Supabase e sem a site key no app, ninguém consegue entrar.

6. **Authentication → URL Configuration:** em _Redirect URLs_, só `http://localhost:3000/**` e o domínio de produção. Nada de curinga genérico.
7. **Authentication → Emails → SMTP:** configure um SMTP próprio (Resend, por exemplo) antes de abrir para outras pessoas.
8. **Authentication → Sessions** (plano Pro): tempo máximo de sessão e de inatividade.
9. **Advisors → Security Advisor:** rode e deixe sem alertas.
10. **Database → Settings:** _Enforce SSL_ ligado. Se o app rodar só em servidores conhecidos, use _Network Restrictions_.
11. **Sua conta do Supabase:** ative o 2FA da **sua** conta de administrador (Account → Security).

### Google Cloud

1. **Credenciais → chave do Places:** em _Restrições de API_, só **Places API (New)**. Em produção, restrinja também por IP do servidor, se o provedor tiver IP fixo.
2. **Chave do PageSpeed:** separada, restrita à **PageSpeed Insights API**.
3. **Faturamento → Orçamentos e alertas:** crie um orçamento mensal (ex.: R$ 100) com alerta em 50%, 90% e 100%.
4. **APIs e serviços → Places API (New) → Cotas:** defina um limite diário de chamadas como teto de gasto.

### GitHub

1. Repositório **privado** (já está).
2. **Settings → Code security:** ligue _Dependabot alerts_, _Dependabot security updates_ e _Secret scanning_.
3. Nunca faça commit do `.env` (já está no `.gitignore`). Se uma chave vazar, gere outra no painel e apague a antiga.

## Se perder o celular do 2FA

Entre com o outro autenticador cadastrado. Se não houver, o administrador remove o fator em **Supabase → Authentication → Users → (usuário) → MFA factors**, e a pessoa ativa o 2FA de novo.

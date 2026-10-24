# Find Business

Encontra empresas **sem site, só com rede social ou com site fraco** no Google Maps, ranqueia por oportunidade e gera a mensagem de WhatsApp e o prompt do site para cada uma.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · HeroUI v3 · Redux Toolkit + RTK Query · React Hook Form + Zod · Supabase (Auth + Postgres) · Stripe (assinaturas) · next-themes

## Rodando

```bash
pnpm install
cp .env.example .env.local   # preencha o que tiver (tudo é opcional)
pnpm dev                     # http://localhost:3000
```

Sem nenhuma chave o app já funciona: sem Supabase ele fica em **modo local** (sem login, dados no navegador), a busca entra em **modo demonstração** (empresas fictícias) e a análise de sites usa o PageSpeed sem chave.

### Supabase (login, cadastro e dados na nuvem)

1. Crie um projeto em [supabase.com](https://supabase.com) (região **South America (São Paulo)**).
2. **SQL Editor → New query**: rode **cada arquivo de `supabase/migrations/` em ordem** (`0001_init.sql`, `0002_lead_detail.sql`...), colando o conteúdo e clicando em **Run**. Eles criam as tabelas `profiles`, `leads`, `site_analyses` e `lead_activities`, com RLS (cada usuário só vê os próprios dados). Todos podem ser rodados de novo sem estragar nada. Sempre que um arquivo novo aparecer nessa pasta, rode ele também; se esquecer, o app avisa "O banco está desatualizado".
3. **Project Settings → API Keys:** copie a _Project URL_ e a _Publishable key_ para `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no `.env.local`.
4. **Authentication → URL Configuration:** _Site URL_ = `http://localhost:3000`; em _Redirect URLs_ adicione `http://localhost:3000/**`. Quando publicar, adicione também o domínio de produção.
5. **E-mail:** o cadastro por e-mail já vem ativo, com confirmação por link. O envio de e-mails padrão do Supabase é limitado (poucos por hora). Para testar à vontade, desligue _Confirm email_ em **Authentication → Sign In / Providers → Email**, ou configure um SMTP próprio (ex.: Resend).
6. Reinicie o `pnpm dev`. Na primeira vez que você entrar, os leads e análises salvos no navegador (modo local) são importados para a conta.

**Pausa do plano grátis:** o Supabase pausa projetos grátis depois de 7 dias sem uso. Na Vercel, o arquivo `vercel.json` agenda uma chamada diária a `/api/cron/keepalive`, que faz uma consulta leve no banco e mantém o projeto ativo. Cadastre `CRON_SECRET` nas variáveis da Vercel para só a Vercel conseguir chamar essa rota. Os logs ficam em **Vercel → Settings → Cron Jobs**.

### Login com Google

1. No **Supabase → Authentication → Sign In / Providers → Google**, copie a _Callback URL_ (algo como `https://SEU-PROJETO.supabase.co/auth/v1/callback`).
2. No **Google Cloud Console → APIs e serviços → Tela de consentimento OAuth**: tipo _Externo_, nome do app e e-mail de suporte.
3. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web.** Em _URIs de redirecionamento autorizados_, cole a Callback URL do passo 1.
4. Copie o _Client ID_ e o _Client Secret_ para o provedor Google no Supabase e ative.

Não é preciso faturamento no Google Cloud para o login com Google.

### Chave do Google Places (busca real)

1. [Google Cloud Console](https://console.cloud.google.com/) → crie um projeto e ative o faturamento.
2. **APIs e serviços → Biblioteca →** ative **Places API (New)**.
3. **Credenciais → Criar credenciais → Chave de API.** Em "Restrições de API", deixe só a Places API (New).
4. Cole em `.env.local` e reinicie o `npm run dev`.

### Chave do PageSpeed (opcional)

Sem chave, o PageSpeed aceita poucas análises por dia. Para usar à vontade: no Google Cloud, ative a **PageSpeed Insights API**, crie uma chave e coloque em `PAGESPEED_API_KEY`. A API é gratuita.

**Custo do Places:** cada busca usa 1 chamada a cada 20 empresas (máx. 3 chamadas = 60 empresas). Como pedimos site, telefone e avaliações, a chamada é do SKU _Text Search Enterprise_: 1.000 chamadas grátis por mês, depois cerca de US$ 35 a cada mil. A tela mostra quantas chamadas cada busca gastou, e voltar a uma busca já feita (na mesma sessão) não gasta de novo.

## Planos e pagamentos

Todo usuário novo nasce no plano **Grátis** (o banco cria a assinatura no cadastro). Os planos pagos são cobrados pelo **Stripe**, por assinatura mensal no cartão.

| Plano   | Preço  | Créditos de busca/mês | Análises/mês | Leads salvos |
| ------- | ------ | --------------------- | ------------ | ------------ |
| Grátis  | R$ 0   | 15 (300 empresas)     | 30           | 50           |
| Pro     | R$ 49  | 120 (2.400 empresas)  | 300          | ilimitado    |
| Agência | R$ 129 | 400 (8.000 empresas)  | 1.000        | ilimitado    |

- **1 crédito = 1 página de 20 empresas** = 1 chamada paga ao Google. Uma busca de 60 reserva 3 créditos e devolve os que o Google não usou; busca que falha devolve tudo. O modo demonstração não gasta.
- Os créditos viram no **dia 1 de cada mês** (horário de Brasília). Leads salvos é um total: quem volta para o Grátis com mais de 50 mantém todos, só não salva novos.
- Os limites ficam no banco (`supabase/migrations/0004_billing.sql`): valem mesmo para quem chama a API do Supabase direto. Para mudar preço ou limite, edite a tabela **`plans`** no Table Editor (e o preço no Stripe, para bater).
- Assinatura atrasada continua valendo por 3 dias depois do vencimento; cancelada volta para o Grátis no fim do período pago.
- **Custo x preço:** no pior caso (todos os créditos usados), o Pro gasta uns US$ 4 de Google e o Agência uns US$ 14, fora a taxa do Stripe. As 1.000 chamadas grátis/mês do Google são divididas entre todos os usuários.

Tela **Plano** (`/plano`): plano atual, uso do mês, assinar, trocar de plano e cancelar (portal do Stripe).

### Configurar o Stripe

Comece no **modo de teste** (chave `sk_test_`), que não cobra de verdade.

1. **Supabase → SQL Editor:** rode `supabase/migrations/0004_billing.sql`.
2. **Supabase → Project Settings → API Keys → Secret keys:** crie uma e coloque em `SUPABASE_SECRET_KEY` (só servidor).
3. Crie a conta em [stripe.com](https://stripe.com) (Brasil; dá para começar com CPF).
4. **Product catalog → Add product:** "Find Business Pro", preço **recorrente mensal** de R$ 49,00. Repita para "Find Business Agência" (R$ 129,00). Copie o ID de cada preço (`price_...`) para `STRIPE_PRICE_PRO` e `STRIPE_PRICE_AGENCIA`.
5. **Developers → API keys:** copie a _Secret key_ para `STRIPE_SECRET_KEY`.
6. **Settings → Billing → Customer portal:** ative. Ligue _atualizar forma de pagamento_, _ver faturas_, _cancelar assinatura_ (no fim do período) e _trocar de plano_, adicionando os dois produtos.
7. **Webhook:**
   - No seu PC: instale o [Stripe CLI](https://docs.stripe.com/stripe-cli) e rode `stripe listen --forward-to localhost:3000/api/billing/webhook`. Ele mostra um `whsec_...`: coloque em `STRIPE_WEBHOOK_SECRET`.
   - Em produção: **Developers → Webhooks → Add endpoint** com `https://SEU-DOMINIO/api/billing/webhook` e os eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid` e `invoice.payment_failed`. Copie o _Signing secret_.
8. Reinicie o `pnpm dev` e confira em **Ajustes** que "Pagamentos (Stripe)" está configurado. Teste com o cartão `4242 4242 4242 4242`, qualquer data futura e qualquer CVC.
9. Em produção: troque para as chaves e preços do modo **live** e defina `APP_URL` com o seu domínio.

Mesmo sem o webhook, a volta do checkout já atualiza o plano (`/api/billing/sync`). O webhook é o que mantém tudo certo depois: renovação, falha no cartão, troca de plano e cancelamento.

**Sua conta sem pagar:** no SQL Editor, troque o e-mail e rode:

```sql
update public.subscriptions
set plan_id = 'agencia', provider = 'manual', status = 'active', current_period_end = null
where user_id = (select id from auth.users where email = 'seu@email.com');
```

**Pix e boleto:** no Brasil, o Stripe cobra assinatura só no cartão. Se quiser Pix recorrente, dá para trocar por Asaas ou Mercado Pago: o código do gateway fica todo em `src/lib/billing/` e `src/app/api/billing/`.

## Como funciona

```
src/
├── proxy.ts                      Renova a sessão e protege as rotas (Next 16: antigo middleware)
├── app/
│   ├── (auth)/                   login, cadastro, esqueci-senha, redefinir-senha
│   ├── auth/callback/            Volta do Google / link de e-mail → cria a sessão
│   ├── (app)/                    Telas com a barra lateral
│   │   ├── page.tsx              Buscar empresas
│   │   ├── analisar/             Analisar qualquer site (PageSpeed)
│   │   ├── leads/                Leads salvos (funil) e leads/[placeId]: página de cada lead
│   │   ├── mensagens/            Editor dos modelos de mensagem
│   │   ├── perfil/               Nome, serviço padrão, tema, trocar senha, sair
│   │   └── ajustes/              Status das integrações
│   └── api/
│       ├── places/search/        POST → Google Places Text Search (sem chave = modo demonstração)
│       ├── site-analysis/        GET ?url= → PageSpeed Insights (celular), cache de 24 h
│       ├── ibge/municipios/[uf]  Cidades do estado (IBGE, cache de 1 dia)
│       └── health/               Quais chaves estão configuradas
├── lib/
│   ├── validation/schemas.ts     Schemas Zod de todos os formulários (mensagens em português)
│   ├── supabase/                 Clientes (navegador/servidor), tipos, erros em português
│   ├── data/                     Adaptadores de dados: local (localStorage) e Supabase
│   ├── places.server.ts          Chamada ao Google, paginação, filtro por cidade
│   ├── classify.ts               Sem site / só rede social / site fraco + pontuação
│   ├── siteQuality.ts            Lê o PageSpeed e gera nota, veredito e problemas em português
│   ├── effective.ts              Aplica a análise à empresa (reclassifica e recalcula a nota)
│   ├── demo.server.ts            Dados fictícios do modo demonstração
│   ├── templates.ts              Modelos de mensagem, link do WhatsApp, prompt do site
│   └── catalog.ts                Estados, nichos, serviços
├── store/                        Redux Toolkit
│   ├── api/findBusinessApi.ts    RTK Query (todas as chamadas /api)
│   ├── slices/                   session, search, leads, settings, analysis
│   └── index.ts                  Middleware que salva cada mudança no adaptador ativo
└── components/                   HeroUI v3
    └── form/                     Campos ligados ao React Hook Form (FormTextField, FormSelect...)
```

### Classificação

| Categoria          | Regra                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| **Sem site**       | Google não tem `websiteUri`                                                                               |
| **Só rede social** | Link aponta para Instagram, Facebook, Linktree, WhatsApp etc.                                             |
| **Site fraco**     | Construtor gratuito (Wix, Google Sites, Blogspot...), sem HTTPS, **ou reprovado na análise do PageSpeed** |
| Tem site           | Qualquer outro (fica oculto por padrão até ser analisado)                                                 |

### Análise de site (fase 2)

O botão **Analisar N sites** roda o PageSpeed (celular) em todos os resultados que têm site próprio, 2 por vez. Cada análise leva de 10 a 40 s.

- **Nota geral (0–100):** velocidade 40%, SEO 25%, acessibilidade 20%, boas práticas 15%. Perde 25 pontos se não for adaptado para celular e 20 se não tiver HTTPS.
- **É "site fraco" quando:** nota abaixo de 60, não é adaptado para celular, não tem HTTPS ou tem velocidade abaixo de 40.
- Quem era "tem site" e é reprovado vai para **Site fraco**, e a pontuação de oportunidade sobe quanto pior for a nota.
- Os problemas encontrados alimentam a variável `{diagnostico}`, o modelo **Diagnóstico do site** e o prompt do site.
- Os resultados ficam salvos no navegador (últimos 300 sites).

**Pontuação (0–100):** base pela categoria + movimento (nº de avaliações) + reputação (nota) + contato (telefone, bônus se for celular = provável WhatsApp).

## Página do lead e próximo contato

Cada lead salvo tem uma página (`/leads/[placeId]`) com:

- **Histórico** automático: lead salvo, mensagem enviada (com o modelo usado), mudança de etapa, próximo contato agendado e análise do site. Dá para adicionar anotações com data.
- **Próximo contato:** data do retorno, com atalhos (hoje, amanhã, 3 dias, 1 e 2 semanas). Ao mandar mensagem pelo WhatsApp, o retorno é agendado sozinho para daqui a 3 dias se não houver outro no futuro.
- Dados do Google, análise do site, anotações gerais, ligar, Maps e busca do Instagram.

Na lista de leads, quem tem retorno hoje ou atrasado aparece primeiro, com etiqueta colorida, um aviso no topo e o número em destaque no menu.

## Formulários

Todos seguem o mesmo padrão:

```tsx
const { control, handleSubmit, setError, formState } = useForm<LoginValues>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: "", password: "" },
});

const onSubmit = handleSubmit(async (values) => {
  const { error } = await algumaChamada(values);
  if (error) return notify.error("Não foi possível entrar", error); // toast
  notify.success("Pronto!");
});

<form onSubmit={onSubmit} noValidate>
  <FormTextField control={control} name="email" label="E-mail" type="email" />
  <SubmitButton isSubmitting={formState.isSubmitting}>Entrar</SubmitButton>
</form>;
```

O Perfil salva sozinho: o formulário valida com Zod e, a cada mudança válida, grava no Redux (que salva no Supabase). O editor de modelos de mensagem continua salvando direto, sem formulário.

## Feedback (toasts)

Toda resposta de API ou ação aparece num toast no canto inferior direito, pelo helper `notify` (`src/lib/notify.ts`):

| Situação                                                                      | Onde aparece                                                                                         |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Toda resposta de API (sucesso ou erro): busca, análise, login, salvar, copiar | Toast (`notify.success`, `notify.error`...)                                                          |
| Erros das chamadas do RTK Query                                               | Toast automático (`src/store/feedback.ts`); endpoint sem título configurado mostra "Algo deu errado" |
| Salvamentos (lead, etapa, anotação, perfil)                                   | Toast só depois que o banco confirmou; se falhar, toast de erro                                      |
| Erro inesperado no servidor                                                   | Toast "Erro inesperado no servidor" com um código (ex.: `a1b2c3d4`) que aparece no log do servidor   |
| Análise em lote                                                               | Um toast com progresso que vira o resumo no final                                                    |
| Remover lead                                                                  | Toast com botão **Desfazer**                                                                         |
| Campo inválido                                                                | Embaixo do campo                                                                                     |
| Estado da tela (modo demonstração, lista vazia)                               | Na própria página                                                                                    |

### Erros das rotas `/api`

Todas as rotas usam `withApiErrors` (`src/lib/api/handler.server.ts`) e respondem erro sempre no mesmo formato:

```json
{ "error": "Mensagem para o usuário", "code": "PLACES", "ref": "a1b2c3d4" }
```

- Erro esperado: `throw new ApiError("mensagem", 429, "CODIGO")`. A mensagem vai para o toast.
- Qualquer outro erro vira 500 com mensagem genérica e `ref`. O detalhe técnico fica só no log (`[api] erro inesperado ref=a1b2c3d4`) e nunca vai para o navegador.

Carregamentos automáticos (lista de cidades, status das integrações) só avisam quando dão erro, para não encher a tela de toasts.

## Segurança

Veja **[SECURITY.md](SECURITY.md)**: o que o código já protege (2FA, rate limit, CSP, RLS, pagamentos) e o checklist do que ligar no painel do Supabase, do Google Cloud e do GitHub.

## Roadmap

- [x] **Fase 1:** busca com a API oficial do Google, classificação, mensagens, prompt do site, leads salvos no navegador
- [x] **Fase 2:** "site fraco" de verdade com PageSpeed Insights, página "Analisar site", modo demonstração
- [x] **Fase 3:** Supabase: login (e-mail/senha e Google), cadastro, recuperação de senha, perfil, tema claro/escuro/sistema, leads e análises na nuvem
- [x] Página do lead com histórico e próximo contato (follow-up)
- [x] Segurança: 2FA, rate limit, CSP e cabeçalhos, validação no servidor, RLS reforçado (veja [SECURITY.md](SECURITY.md))
- [ ] Lista: agrupar por nicho/cidade, busca por nome, visão em colunas por etapa
- [ ] Taxa de resposta por modelo de mensagem
- [ ] Antes de comercializar: revisar o que guardamos do Google. Hoje o lead salva uma cópia dos dados da empresa; os termos do Google Maps restringem guardar dados além do `place_id`
- [ ] **Fase 4:** GPT para mensagem personalizada e prompt de site mais rico
- [x] **Fase 5:** planos (Grátis, Pro, Agência) com limites no banco e assinatura pelo Stripe

## MCP da HeroUI

O `.mcp.json` já registra o servidor `heroui-react`, e o Claude Code / Cursor carregam sozinhos ao abrir a pasta. Para adicionar manualmente:

```bash
claude mcp add heroui-react -- npx -y @heroui/react-mcp@latest
```

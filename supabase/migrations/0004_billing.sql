-- Find Business · planos e assinaturas
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar mais de uma vez.
-- Precisa das migrações 0001, 0002 e 0003.
--
-- O que este arquivo faz:
--   1. Tabela de planos (Grátis, Pro, Agência) com os limites de cada um.
--   2. Assinatura por usuário: todo usuário novo já nasce no plano Grátis.
--   3. Uso do mês (créditos de busca e análises) com cobrança atômica no banco.
--   4. Limite de leads salvos por plano (vale mesmo para quem chama a API do Supabase direto).
--
-- Quem muda plano e assinatura é só o servidor (webhook do Stripe, com a chave secreta).
-- O usuário logado só LÊ a própria assinatura e o próprio uso.

create schema if not exists private;

-- ─────────────────────────────────────────────────────────────
-- 1. Planos
-- ─────────────────────────────────────────────────────────────
-- Limites por mês. null = ilimitado. Preço em centavos (só para exibir; quem cobra é o Stripe).
-- 1 crédito de busca = 1 página de 20 resultados (= 1 chamada paga ao Google Places).
create table if not exists public.plans (
  id              text primary key check (id ~ '^[a-z_]{2,20}$'),
  name            text not null,
  description     text not null default '',
  price_cents     integer not null default 0 check (price_cents >= 0),
  search_credits  integer check (search_credits >= 0),
  analyses        integer check (analyses >= 0),
  saved_leads     integer check (saved_leads >= 0),
  features        text[] not null default '{}',
  sort            integer not null default 0,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Valores iniciais. Para mudar depois, edite a tabela no Table Editor (rodar de novo não sobrescreve).
insert into public.plans (id, name, description, price_cents, search_credits, analyses, saved_leads, features, sort)
values
  ('gratis', 'Grátis', 'Para conhecer o Find Business.', 0, 15, 30, 50,
   array['15 créditos de busca por mês (300 empresas)', '30 análises de site por mês', 'Até 50 leads salvos', 'Mensagens e prompt do site'], 0),
  ('pro', 'Pro', 'Para quem prospecta toda semana.', 4900, 120, 300, null,
   array['120 créditos de busca por mês (2.400 empresas)', '300 análises de site por mês', 'Leads ilimitados', 'Histórico e follow-up'], 1),
  ('agencia', 'Agência', 'Para quem vende site todo dia.', 12900, 400, 1000, null,
   array['400 créditos de busca por mês (8.000 empresas)', '1.000 análises de site por mês', 'Leads ilimitados', 'Prioridade nas novidades'], 2)
on conflict (id) do nothing;

alter table public.plans enable row level security;
drop policy if exists "planos: todos leem" on public.plans;
create policy "planos: todos leem" on public.plans for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.plans from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Assinaturas (uma por usuário)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  plan_id               text not null default 'gratis' references public.plans (id),
  status                text not null default 'active'
                        check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
  -- none = plano grátis; stripe = pago pelo Stripe; manual = liberado à mão (ex.: sua própria conta)
  provider              text not null default 'none' check (provider in ('none', 'stripe', 'manual')),
  customer_id           text unique,
  subscription_id       text unique,
  price_id              text,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean not null default false,
  canceled_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
drop policy if exists "assinatura: dono lê" on public.subscriptions;
create policy "assinatura: dono lê" on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.subscriptions from anon;
revoke insert, update, delete, truncate on public.subscriptions from authenticated;

-- Eventos do Stripe já processados (o Stripe pode reenviar o mesmo evento).
create table if not exists public.billing_events (
  id           text primary key,
  type         text not null,
  received_at  timestamptz not null default now()
);
alter table public.billing_events enable row level security;
revoke all on public.billing_events from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. Uso do mês
-- ─────────────────────────────────────────────────────────────
-- O mês vira no dia 1, no horário de Brasília.
create table if not exists public.usage (
  user_id    uuid not null references auth.users (id) on delete cascade,
  period     date not null,
  searches   integer not null default 0 check (searches >= 0),
  analyses   integer not null default 0 check (analyses >= 0),
  primary key (user_id, period)
);
alter table public.usage enable row level security;
drop policy if exists "uso: dono lê" on public.usage;
create policy "uso: dono lê" on public.usage for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.usage from anon;
revoke insert, update, delete, truncate on public.usage from authenticated;

-- 2FA também vale para as tabelas novas (mesma regra da migração 0003).
do $$
declare t text;
begin
  foreach t in array array['subscriptions', 'usage'] loop
    execute format('drop policy if exists "mfa: exige aal2 quando ativado" on public.%I', t);
    execute format(
      'create policy "mfa: exige aal2 quando ativado" on public.%I as restrictive for all to authenticated
         using ((select auth.jwt() ->> ''aal'') = ''aal2'' or not (select private.requires_mfa()))
         with check ((select auth.jwt() ->> ''aal'') = ''aal2'' or not (select private.requires_mfa()))',
      t
    );
  end loop;
end $$;

-- Mês atual (1º dia) no horário de Brasília.
create or replace function private.current_period()
returns date
language sql
stable
set search_path = ''
as $$
  select date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
$$;

-- Plano que vale agora. Assinatura vencida, cancelada ou sem pagamento volta para o Grátis.
-- 3 dias de tolerância depois do vencimento (atraso do webhook / nova tentativa de cobrança).
create or replace function private.plan_of(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.plan_id from public.subscriptions s
      where s.user_id = p_user
        and s.status in ('active', 'trialing', 'past_due')
        and (s.current_period_end is null or s.current_period_end > now() - interval '3 days')),
    'gratis'
  );
$$;
revoke all on function private.plan_of(uuid) from public, anon, authenticated;

-- Resumo para a tela "Plano": plano atual, assinatura, uso do mês e limites.
create or replace function public.billing_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  per date := private.current_period();
  pl public.plans;
  sub public.subscriptions;
  u public.usage;
  leads_count integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select * into pl from public.plans where id = private.plan_of(uid);
  select * into sub from public.subscriptions where user_id = uid;
  select * into u from public.usage where user_id = uid and period = per;
  select count(*) into leads_count from public.leads where user_id = uid;

  return jsonb_build_object(
    'plan', to_jsonb(pl),
    'subscription', case when sub.user_id is null then null else jsonb_build_object(
      'plan_id', sub.plan_id,
      'status', sub.status,
      'provider', sub.provider,
      'has_customer', sub.customer_id is not null,
      'current_period_end', sub.current_period_end,
      'cancel_at_period_end', sub.cancel_at_period_end
    ) end,
    'usage', jsonb_build_object(
      'searches', coalesce(u.searches, 0),
      'analyses', coalesce(u.analyses, 0),
      'saved_leads', leads_count
    ),
    'period', jsonb_build_object(
      'start', per,
      'resets_at', (per + interval '1 month')::date
    )
  );
end;
$$;
revoke all on function public.billing_overview() from public, anon;
grant execute on function public.billing_overview() to authenticated;

-- Gasta créditos do mês, de forma atômica. Devolve allowed=false sem gastar nada se não couber.
-- Ex.: select public.consume_quota('search', 3);
create or replace function public.consume_quota(p_kind text, p_amount integer default 1)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  per date := private.current_period();
  pl public.plans;
  lim integer;
  used integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_kind not in ('search', 'analysis') or p_amount is null or p_amount < 1 or p_amount > 3 then
    raise exception 'invalid quota params' using errcode = '22023';
  end if;

  select * into pl from public.plans where id = private.plan_of(uid);
  lim := case p_kind when 'search' then pl.search_credits else pl.analyses end;

  insert into public.usage (user_id, period) values (uid, per) on conflict do nothing;

  if p_kind = 'search' then
    update public.usage set searches = searches + p_amount
      where user_id = uid and period = per and (lim is null or searches + p_amount <= lim)
      returning searches into used;
  else
    update public.usage set analyses = analyses + p_amount
      where user_id = uid and period = per and (lim is null or analyses + p_amount <= lim)
      returning analyses into used;
  end if;

  if used is null then
    select case p_kind when 'search' then searches else analyses end into used
      from public.usage where user_id = uid and period = per;
    return jsonb_build_object('allowed', false, 'used', used, 'limit', lim, 'plan', pl.id, 'plan_name', pl.name,
                              'resets_at', (per + interval '1 month')::date);
  end if;
  return jsonb_build_object('allowed', true, 'used', used, 'limit', lim, 'plan', pl.id, 'plan_name', pl.name,
                            'resets_at', (per + interval '1 month')::date);
end;
$$;
revoke all on function public.consume_quota(text, integer) from public, anon;
grant execute on function public.consume_quota(text, integer) to authenticated;

-- Devolve créditos (busca que falhou no Google ou trouxe menos páginas).
-- Só o servidor (service_role) chama: o usuário não pode "recarregar" o próprio saldo.
create or replace function public.refund_quota(p_user uuid, p_kind text, p_amount integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare per date := private.current_period();
begin
  if p_kind not in ('search', 'analysis') or p_amount is null or p_amount < 1 or p_amount > 3 then
    raise exception 'invalid quota params' using errcode = '22023';
  end if;
  if p_kind = 'search' then
    update public.usage set searches = greatest(searches - p_amount, 0) where user_id = p_user and period = per;
  else
    update public.usage set analyses = greatest(analyses - p_amount, 0) where user_id = p_user and period = per;
  end if;
end;
$$;
revoke all on function public.refund_quota(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.refund_quota(uuid, text, integer) to service_role;

-- ─────────────────────────────────────────────────────────────
-- 4. Limite de leads salvos
-- ─────────────────────────────────────────────────────────────
-- Atualizar um lead que já existe sempre pode (o upsert do app passa por aqui).
-- Quem passou do limite (ex.: voltou do Pro para o Grátis) mantém os leads, só não salva novos.
create or replace function private.enforce_saved_leads_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  lim integer;
  total integer;
begin
  if exists (select 1 from public.leads where user_id = new.user_id and place_id = new.place_id) then
    return new;
  end if;
  select saved_leads into lim from public.plans where id = private.plan_of(new.user_id);
  if lim is null then
    return new;
  end if;
  -- Trava por usuário: dois salvamentos ao mesmo tempo não furam o limite.
  perform pg_advisory_xact_lock(hashtext('leads:' || new.user_id::text));
  select count(*) into total from public.leads where user_id = new.user_id;
  if total >= lim then
    raise exception 'PLAN_LIMIT_LEADS' using errcode = 'P0001', hint = lim::text,
      detail = 'Limite de leads salvos do plano atingido.';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_saved_leads_limit() from public, anon, authenticated;

drop trigger if exists leads_plan_limit on public.leads;
create trigger leads_plan_limit before insert on public.leads
  for each row execute function private.enforce_saved_leads_limit();

-- ─────────────────────────────────────────────────────────────
-- 5. Todo usuário novo nasce no plano Grátis
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Usuários que já existiam também ganham o Grátis.
insert into public.subscriptions (user_id)
select id from auth.users
on conflict (user_id) do nothing;

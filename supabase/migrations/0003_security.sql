-- Find Business · segurança
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar mais de uma vez.
--
-- O que este arquivo faz:
--   1. Exige 2FA no banco: quem ativou o 2FA só acessa os dados com a sessão verificada (aal2).
--   2. Limite de uso (rate limit) por usuário, usado pelas rotas /api do app.
--   3. Trava colunas que o usuário não pode alterar e limita o tamanho dos textos.
--   4. Corrige o search_path das funções (aviso do Security Advisor do Supabase).

-- Esquema privado: não é exposto pela API do Supabase.
create schema if not exists private;
revoke all on schema private from anon, authenticated;
grant usage on schema private to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 1. 2FA obrigatório para quem ativou
-- ─────────────────────────────────────────────────────────────
-- true se o usuário logado tem algum fator de 2FA verificado.
create or replace function private.requires_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  );
$$;
revoke all on function private.requires_mfa() from public, anon;
grant execute on function private.requires_mfa() to authenticated;

-- Políticas RESTRITIVAS: somam-se às de "dono". Sem 2FA ativo, nada muda.
do $$
declare t text;
begin
  foreach t in array array['profiles', 'leads', 'site_analyses', 'lead_activities'] loop
    execute format('drop policy if exists "mfa: exige aal2 quando ativado" on public.%I', t);
    execute format(
      'create policy "mfa: exige aal2 quando ativado" on public.%I as restrictive for all to authenticated
         using ((select auth.jwt() ->> ''aal'') = ''aal2'' or not (select private.requires_mfa()))
         with check ((select auth.jwt() ->> ''aal'') = ''aal2'' or not (select private.requires_mfa()))',
      t
    );
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Rate limit por usuário (janela fixa)
-- ─────────────────────────────────────────────────────────────
create table if not exists private.rate_limits (
  user_id       uuid not null references auth.users (id) on delete cascade,
  bucket        text not null,
  window_start  timestamptz not null,
  count         integer not null default 0,
  primary key (user_id, bucket, window_start)
);
create index if not exists rate_limits_window_idx on private.rate_limits (window_start);

-- Conta mais um uso no "bucket" e diz se ainda está dentro do limite.
-- Ex.: select public.check_rate_limit('search:hour', 30, 3600);
create or replace function public.check_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  win timestamptz;
  used integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_limit < 1 or p_window_seconds < 1 or length(p_bucket) > 64 then
    raise exception 'invalid rate limit params' using errcode = '22023';
  end if;

  win := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into private.rate_limits as r (user_id, bucket, window_start, count)
  values (uid, p_bucket, win, 1)
  on conflict (user_id, bucket, window_start) do update set count = r.count + 1
  returning r.count into used;

  -- Limpeza ocasional de janelas antigas.
  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;

  return jsonb_build_object(
    'allowed', used <= p_limit,
    'remaining', greatest(p_limit - used, 0),
    'reset_at', win + make_interval(secs => p_window_seconds)
  );
end;
$$;
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.check_rate_limit(text, integer, integer) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. Colunas protegidas e tamanho máximo dos textos
-- ─────────────────────────────────────────────────────────────
-- Anônimos (sem login) não têm nada a fazer nessas tabelas.
revoke all on public.profiles, public.leads, public.site_analyses, public.lead_activities from anon;

-- No perfil, o usuário só altera estes campos (id e datas ficam travados).
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url, service_id, theme, templates) on public.profiles to authenticated;

-- Limites de tamanho (evita alguém lotar o banco com textos gigantes).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_full_name_len') then
    alter table public.profiles add constraint profiles_full_name_len check (char_length(full_name) <= 80) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_templates_size') then
    alter table public.profiles add constraint profiles_templates_size check (pg_column_size(templates) <= 32768) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'leads_notes_len') then
    alter table public.leads add constraint leads_notes_len check (char_length(notes) <= 5000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'leads_business_size') then
    alter table public.leads add constraint leads_business_size check (pg_column_size(business) <= 16384) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lead_activities_data_size') then
    alter table public.lead_activities add constraint lead_activities_data_size check (pg_column_size(data) <= 8192) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'site_analyses_data_size') then
    alter table public.site_analyses add constraint site_analyses_data_size check (pg_column_size(data) <= 32768) not valid;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 4. search_path fixo nas funções antigas
-- ─────────────────────────────────────────────────────────────
alter function public.set_updated_at() set search_path = '';

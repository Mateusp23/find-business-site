-- Find Business · estrutura inicial
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.

-- ─────────────────────────────────────────────────────────────
-- Perfis (1 por usuário, criado automaticamente no cadastro)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  avatar_url  text,
  service_id  text not null default 'site',
  theme       text not null default 'dark' check (theme in ('system', 'light', 'dark')),
  -- Modelos de mensagem editados pelo usuário: [{ "id": "direto", "body": "..." }]
  templates   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Leads salvos (funil)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.leads (
  user_id          uuid not null references auth.users (id) on delete cascade,
  place_id         text not null,
  business         jsonb not null,
  niche            text not null,
  city             text not null,
  uf               text not null,
  status           text not null default 'novo'
                   check (status in ('novo', 'contatado', 'respondeu', 'proposta', 'fechado', 'perdido')),
  notes            text not null default '',
  saved_at         timestamptz not null default now(),
  last_contact_at  timestamptz,
  updated_at       timestamptz not null default now(),
  primary key (user_id, place_id)
);
create index if not exists leads_user_status_idx on public.leads (user_id, status);

-- ─────────────────────────────────────────────────────────────
-- Análises de site (PageSpeed)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.site_analyses (
  user_id      uuid not null references auth.users (id) on delete cascade,
  analysis_id  text not null, -- place_id da empresa ou "url:<endereço>"
  data         jsonb not null,
  analyzed_at  timestamptz not null default now(),
  primary key (user_id, analysis_id)
);

-- ─────────────────────────────────────────────────────────────
-- updated_at automático
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Cria o perfil quando alguém se cadastra (e-mail ou Google)
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Segurança: cada usuário só enxerga e altera os próprios dados
-- ─────────────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.leads         enable row level security;
alter table public.site_analyses enable row level security;

drop policy if exists "perfil: dono lê"      on public.profiles;
drop policy if exists "perfil: dono altera"  on public.profiles;
create policy "perfil: dono lê"     on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "perfil: dono altera" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "leads: dono" on public.leads;
create policy "leads: dono" on public.leads for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "analises: dono" on public.site_analyses;
create policy "analises: dono" on public.site_analyses for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

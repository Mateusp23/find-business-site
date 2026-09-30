-- Find Business · página do lead: próximo contato + histórico
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar mais de uma vez.

-- Próximo contato (só a data; o app destaca atrasados e "hoje")
alter table public.leads add column if not exists next_follow_up_on date;
create index if not exists leads_user_follow_up_idx on public.leads (user_id, next_follow_up_on);

-- Histórico de cada lead: salvo, mensagem enviada, mudança de etapa, anotação, análise...
create table if not exists public.lead_activities (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  place_id    text not null,
  type        text not null check (type in (
                'saved', 'message_sent', 'status_changed', 'note',
                'follow_up_set', 'analysis'
              )),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  -- Apagar o lead apaga o histórico dele.
  foreign key (user_id, place_id) references public.leads (user_id, place_id) on delete cascade
);
create index if not exists lead_activities_lead_idx
  on public.lead_activities (user_id, place_id, created_at desc);

alter table public.lead_activities enable row level security;

drop policy if exists "atividades: dono" on public.lead_activities;
create policy "atividades: dono" on public.lead_activities for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

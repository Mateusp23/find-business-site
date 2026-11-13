-- Controle comercial no próprio lead. Herda RLS de dono e política restritiva de MFA
-- de public.leads (0001 e 0003); não cria tabelas nem permissões novas.
alter table public.leads
  add column if not exists sale_amount_cents bigint not null default 0,
  add column if not exists sale_monthly_cents bigint not null default 0,
  add column if not exists sale_closed_on date,
  add column if not exists sale_recurring_end_on date;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.leads'::regclass and conname = 'leads_sale_valid') then
    alter table public.leads add constraint leads_sale_valid check (
      sale_amount_cents between 0 and 10000000000
      and sale_monthly_cents between 0 and 10000000000
      and (
        (sale_closed_on is null and sale_amount_cents = 0 and sale_monthly_cents = 0 and sale_recurring_end_on is null)
        or (sale_closed_on is not null and sale_closed_on >= date '2000-01-01'
          and (sale_amount_cents > 0 or sale_monthly_cents > 0)
          and (sale_recurring_end_on is null or sale_recurring_end_on >= sale_closed_on))
      )
    );
  end if;
end $$;
create index if not exists leads_user_sale_closed_idx on public.leads (user_id, sale_closed_on)
  where sale_closed_on is not null;

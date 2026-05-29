-- Phase 1 of Track feature: per-ticker transaction tracking
create table if not exists investment_transactions (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid references client_profiles(id) on delete cascade,
  date date not null,
  type text not null check (type in ('buy', 'sell', 'dividend')),
  ticker text not null,
  account_id text not null,
  currency text not null default 'USD',
  quantity numeric not null,
  amount_per_unit numeric not null,
  trading_fees numeric default 0,
  notes text default '',
  created_at timestamptz default now()
);
create index if not exists idx_inv_tx_profile_date on investment_transactions (client_profile_id, date);
create index if not exists idx_inv_tx_profile_ticker on investment_transactions (client_profile_id, ticker);
alter table investment_transactions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'investment_transactions' and policyname = 'advisor owns transactions') then
    create policy "advisor owns transactions" on investment_transactions for all
      using (client_profile_id in (select id from client_profiles where user_id = auth.uid()))
      with check (client_profile_id in (select id from client_profiles where user_id = auth.uid()));
  end if;
end $$;

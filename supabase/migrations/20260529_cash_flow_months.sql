create table if not exists cash_flow_months (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid references client_profiles(id) on delete cascade not null,
  month text not null,
  salary numeric not null default 0,
  take_home numeric not null default 0,
  spending numeric not null default 0,
  savings numeric not null default 0,
  investments numeric not null default 0,
  insurance numeric not null default 0,
  cpf numeric not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (client_profile_id, month)
);

create index if not exists cash_flow_months_profile_month on cash_flow_months (client_profile_id, month);

alter table cash_flow_months enable row level security;

create policy "advisor owns cash flow months" on cash_flow_months for all
  using (client_profile_id in (select id from client_profiles where user_id = auth.uid()))
  with check (client_profile_id in (select id from client_profiles where user_id = auth.uid()));

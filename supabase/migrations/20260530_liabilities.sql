create table if not exists liabilities (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid references client_profiles(id) on delete cascade not null,
  name text not null,
  type text not null default 'other' check (type in ('mortgage','car','student','personal','other')),
  balance numeric not null default 0,
  interest_rate numeric not null default 0,
  monthly_payment numeric not null default 0,
  start_date date,
  end_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists liabilities_profile on liabilities (client_profile_id);

alter table liabilities enable row level security;

create policy "advisor owns liabilities" on liabilities for all
  using (client_profile_id in (select id from client_profiles where user_id = auth.uid()))
  with check (client_profile_id in (select id from client_profiles where user_id = auth.uid()));

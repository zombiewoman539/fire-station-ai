-- Add client share-link columns to client_profiles
alter table client_profiles
  add column if not exists client_token text unique,
  add column if not exists client_visibility jsonb;

create index if not exists client_profiles_client_token on client_profiles (client_token) where client_token is not null;

-- RPC: fetch all data for a client-view token (security definer = bypasses RLS)
create or replace function get_client_view(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_visibility jsonb;
  v_result jsonb;
begin
  select id, client_visibility
  into v_profile_id, v_visibility
  from client_profiles
  where client_token = p_token;

  if v_profile_id is null then return null; end if;

  v_visibility := coalesce(v_visibility,
    '{"portfolio":true,"cashflow":false,"loans":false,"performance":false}'::jsonb);

  v_result := jsonb_build_object(
    'profileId', v_profile_id,
    'visibility', v_visibility
  );

  if (v_visibility->>'portfolio')::boolean then
    v_result := v_result || jsonb_build_object(
      'transactions', (
        select coalesce(jsonb_agg(t order by t.date desc), '[]'::jsonb)
        from investment_transactions t
        where t.client_profile_id = v_profile_id
      )
    );
  end if;

  if (v_visibility->>'cashflow')::boolean then
    v_result := v_result || jsonb_build_object(
      'cashflow', (
        select coalesce(jsonb_agg(m order by m.month desc), '[]'::jsonb)
        from cash_flow_months m
        where m.client_profile_id = v_profile_id
      )
    );
  end if;

  if (v_visibility->>'loans')::boolean then
    v_result := v_result || jsonb_build_object(
      'loans', (
        select coalesce(jsonb_agg(l), '[]'::jsonb)
        from liabilities l
        where l.client_profile_id = v_profile_id
      )
    );
  end if;

  return v_result;
end;
$$;

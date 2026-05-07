-- ============================================================
-- FIRE Station — Admin Gate Consolidation
-- Replaces the inline `auth.uid() != '<uuid>'::uuid` check inside
-- admin_list_users (and optionally admin_set_subscription) with a call to
-- public.is_admin(). After this migration, the admin UUID lives in exactly
-- one SQL spot: the body of public.is_admin() (defined in
-- supabase_admin_lockdown_migration.sql). Changing admins becomes a single
-- function-body edit instead of three.
--
-- Run in Supabase SQL Editor.
-- Depends on: supabase_admin_lockdown_migration.sql (must be applied first
-- so public.is_admin() exists).
-- ============================================================

-- Sanity check: is_admin() must already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) THEN
    RAISE EXCEPTION 'public.is_admin() not found. Run supabase_admin_lockdown_migration.sql first.';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- admin_list_users — replace inline UUID check with public.is_admin()
-- The function body otherwise is unchanged; preserves all return columns
-- in the same order, and the LEFT JOIN on subscriptions stays intact.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id              UUID,
  email           TEXT,
  created_at      TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  tier            TEXT,
  status          TEXT,
  trial_ends_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized: admin access required';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(s.tier, 'starter')::text,
    COALESCE(s.status, 'none')::text,
    s.trial_ends_at
  FROM auth.users u
  LEFT JOIN public.subscriptions s ON s.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- admin_set_subscription — see "MANUAL STEP" below.
-- The function body isn't fully reproduced in this repo (only a partial
-- view was shared in chat). The safest path is to edit it in place via
-- the Supabase Dashboard rather than risk dropping/recreating with a
-- truncated body.
--
-- MANUAL STEP:
--   1. Supabase Dashboard → Database → Functions → admin_set_subscription
--   2. Click "Definition" tab
--   3. Replace this block:
--        IF auth.uid() != 'ef44569c-5216-4847-9b19-3b7797d13ea9'::uuid THEN
--          RAISE EXCEPTION 'Access denied';
--        END IF;
--      with:
--        IF NOT public.is_admin() THEN
--          RAISE EXCEPTION 'Not authorized: admin access required';
--        END IF;
--   4. Save.
--
-- The rest of the function body (INSERT INTO subscriptions … ON CONFLICT …)
-- stays untouched. This keeps the function 100% functionally identical.
-- ────────────────────────────────────────────────────────────

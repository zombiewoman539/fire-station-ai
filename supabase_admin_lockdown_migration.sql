-- ============================================================
-- FIRE Station — Admin Lockdown
-- Adds server-side admin gating to all admin RPCs. Previously every
-- authenticated user could call admin_list_users / admin_set_subscription /
-- admin_list_user_activity from the browser console — only the React
-- AdminRoute was checking the admin UUID client-side.
--
-- Run this in the Supabase SQL Editor.
-- After running, you ALSO need to manually add the is_admin() check to
-- admin_list_users and admin_set_subscription — see "MANUAL STEP" below.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. is_admin() helper. Single source of truth for admin gating.
--    To add more admins later, expand to read from a table.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid() = 'ef44569c-5216-4847-9b19-3b7797d13ea9'::uuid;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 2. Replace admin_list_user_activity with a gated version.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_list_user_activity()
RETURNS TABLE (
  user_id        UUID,
  last_active_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
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
  WITH profile_activity AS (
    SELECT cp.user_id, MAX(cp.updated_at) AS last_at
    FROM public.client_profiles cp
    WHERE cp.deleted_at IS NULL
    GROUP BY cp.user_id
  ),
  task_created AS (
    SELECT t.created_by AS user_id, MAX(t.created_at) AS last_at
    FROM public.tasks t
    GROUP BY t.created_by
  ),
  task_completed AS (
    SELECT t.assigned_to AS user_id, MAX(t.completed_at) AS last_at
    FROM public.tasks t
    WHERE t.status = 'done' AND t.completed_at IS NOT NULL
    GROUP BY t.assigned_to
  )
  SELECT
    u.id AS user_id,
    GREATEST(
      u.last_sign_in_at,
      COALESCE(pa.last_at,  'epoch'::timestamptz),
      COALESCE(tc.last_at,  'epoch'::timestamptz),
      COALESCE(tcd.last_at, 'epoch'::timestamptz)
    ) AS last_active_at,
    u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN profile_activity pa  ON pa.user_id  = u.id
  LEFT JOIN task_created     tc  ON tc.user_id  = u.id
  LEFT JOIN task_completed   tcd ON tcd.user_id = u.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_user_activity() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 3. MANUAL STEP — add the same gate to admin_list_users and
--    admin_set_subscription. Their bodies aren't in this repo
--    (defined directly in the Supabase dashboard), so paste the
--    following snippet at the top of EACH function body, right
--    after the BEGIN keyword:
--
--      IF NOT public.is_admin() THEN
--        RAISE EXCEPTION 'Not authorized: admin access required';
--      END IF;
--
--    For admin_set_subscription, paste it BEFORE the UPDATE/INSERT.
--    For admin_list_users, paste it BEFORE the SELECT/RETURN QUERY.
--
--    Verify in Supabase Dashboard → Database → Functions → click
--    the function name → "Definition" tab.
--
--    Once both functions have the gate, any non-admin authenticated
--    user calling them from the browser console will get an
--    "Not authorized" error instead of a leak.
-- ────────────────────────────────────────────────────────────

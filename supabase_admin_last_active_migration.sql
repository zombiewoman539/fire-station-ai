-- ============================================================
-- FIRE Station — Admin "Last active" derivation
-- Adds an RPC that returns each user's most-recent meaningful activity:
-- the latest of (sign-in, client-profile edit, task created, task completed).
-- Run in Supabase SQL Editor. Purely additive — does not modify the
-- existing admin_list_users function.
-- ============================================================

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

-- Note: admin gating is enforced client-side in App.tsx (ADMIN_USER_ID
-- constant). If you want server-side gating, wrap this function body in
-- an "IF auth.uid() != '<admin-uuid>' THEN RAISE EXCEPTION; END IF;" check
-- or move the admin allowlist into a Postgres table + helper function.

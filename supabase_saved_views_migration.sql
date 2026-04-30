-- ============================================================
-- FIRE Station — Saved Views Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- Depends on: supabase_team_migration.sql (uses my_active_org_id, my_active_role)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.saved_views (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id          UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope           TEXT NOT NULL CHECK (scope IN ('personal', 'team')),
  name            TEXT NOT NULL,
  dashboard_kind  TEXT NOT NULL CHECK (dashboard_kind IN ('advisor', 'manager')),
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_views_owner ON public.saved_views(owner_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_org_team ON public.saved_views(org_id) WHERE scope = 'team';

ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

-- SELECT: own personal views OR any team view in own org
CREATE POLICY "saved_views_select" ON public.saved_views
  FOR SELECT USING (
    owner_id = auth.uid()
    OR (scope = 'team' AND org_id = public.my_active_org_id())
  );

-- INSERT personal: owner only, scope must be personal
CREATE POLICY "saved_views_insert_personal" ON public.saved_views
  FOR INSERT WITH CHECK (
    scope = 'personal' AND owner_id = auth.uid()
  );

-- INSERT team: managers only, org must match caller's active org
CREATE POLICY "saved_views_insert_team" ON public.saved_views
  FOR INSERT WITH CHECK (
    scope = 'team'
    AND owner_id = auth.uid()
    AND org_id = public.my_active_org_id()
    AND public.my_active_role() = 'manager'
  );

-- UPDATE personal: owner only
CREATE POLICY "saved_views_update_personal" ON public.saved_views
  FOR UPDATE USING (
    scope = 'personal' AND owner_id = auth.uid()
  );

-- UPDATE team: any manager in the same org
CREATE POLICY "saved_views_update_team" ON public.saved_views
  FOR UPDATE USING (
    scope = 'team'
    AND org_id = public.my_active_org_id()
    AND public.my_active_role() = 'manager'
  );

-- DELETE: owner of personal, or any manager in same org for team views
CREATE POLICY "saved_views_delete" ON public.saved_views
  FOR DELETE USING (
    (scope = 'personal' AND owner_id = auth.uid())
    OR (
      scope = 'team'
      AND org_id = public.my_active_org_id()
      AND public.my_active_role() = 'manager'
    )
  );

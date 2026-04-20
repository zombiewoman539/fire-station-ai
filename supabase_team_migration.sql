-- ============================================================
-- FIRE Station — Team / Manager CRM Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Team memberships
CREATE TABLE IF NOT EXISTS public.team_memberships (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('manager', 'advisor')),
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, email)
);

-- 3. Add org_id to client_profiles (nullable — solo advisors have NULL)
ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

-- ============================================================
-- SECURITY DEFINER helper — avoids recursive RLS lookups
-- ============================================================
CREATE OR REPLACE FUNCTION public.my_active_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id
  FROM public.team_memberships
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_active_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role
  FROM public.team_memberships
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;

-- ============================================================
-- RLS — organizations
-- ============================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select" ON public.organizations
  FOR SELECT USING (id = public.my_active_org_id());

-- ============================================================
-- RLS — team_memberships
-- ============================================================
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

-- Members can view everyone in their org
CREATE POLICY "team_members_select" ON public.team_memberships
  FOR SELECT USING (org_id = public.my_active_org_id());

-- ============================================================
-- RLS — client_profiles (add manager policy on top of existing)
-- ============================================================
-- Managers can see all profiles in their org
CREATE POLICY "managers_view_org_profiles" ON public.client_profiles
  FOR SELECT USING (
    org_id = public.my_active_org_id()
    AND public.my_active_role() = 'manager'
  );

-- ============================================================
-- Trigger: auto-stamp org_id on new profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.stamp_profile_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  SELECT org_id INTO NEW.org_id
  FROM public.team_memberships
  WHERE user_id = NEW.user_id AND status = 'active'
  LIMIT 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_stamp_profile_org ON public.client_profiles;
CREATE TRIGGER tr_stamp_profile_org
  BEFORE INSERT ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.stamp_profile_org();

-- ============================================================
-- RPC: create_organization (called by new manager)
-- Creates the org + inserts caller as active manager
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_organization(org_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  caller_email TEXT;
BEGIN
  -- Get caller's email
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();

  -- Create org
  INSERT INTO public.organizations (name)
  VALUES (org_name)
  RETURNING id INTO new_org_id;

  -- Add caller as active manager
  INSERT INTO public.team_memberships (org_id, user_id, email, role, status)
  VALUES (new_org_id, auth.uid(), caller_email, 'manager', 'active');

  RETURN new_org_id;
END;
$$;

-- ============================================================
-- RPC: invite_advisor (called by manager)
-- Inserts a pending membership for the given email
-- ============================================================
CREATE OR REPLACE FUNCTION public.invite_advisor(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  my_org UUID;
BEGIN
  -- Verify caller is an active manager
  SELECT org_id INTO my_org
  FROM public.team_memberships
  WHERE user_id = auth.uid() AND role = 'manager' AND status = 'active'
  LIMIT 1;

  IF my_org IS NULL THEN
    RAISE EXCEPTION 'Not authorized: caller is not a manager';
  END IF;

  -- Upsert pending membership (skip if already a member)
  INSERT INTO public.team_memberships (org_id, user_id, email, role, status, invited_by)
  VALUES (my_org, NULL, lower(p_email), 'advisor', 'pending', auth.uid())
  ON CONFLICT (org_id, email) DO NOTHING;
END;
$$;

-- ============================================================
-- RPC: accept_pending_invite (called on advisor sign-in)
-- Activates any pending invite matching the caller's email
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_pending_invite()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_email TEXT;
  rows_updated INT;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();

  UPDATE public.team_memberships
  SET user_id = auth.uid(), status = 'active'
  WHERE lower(email) = lower(caller_email)
    AND status = 'pending'
    AND user_id IS NULL;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

-- ============================================================
-- Done! Grant execute permissions to authenticated users
-- ============================================================
GRANT EXECUTE ON FUNCTION public.my_active_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_active_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_advisor(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_pending_invite() TO authenticated;

-- ============================================================
-- Audit log — tracks all writes to client_profiles
-- RLS enabled with no SELECT policy: only viewable via Supabase dashboard
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  action      TEXT,
  table_name  TEXT,
  record_id   UUID,
  changed_at  TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, action, table_name, record_id)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_audit_client_profiles ON public.client_profiles;
CREATE TRIGGER tr_audit_client_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_changes();

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FIRE Station — Stripe Subscriptions Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  tier                    TEXT NOT NULL DEFAULT 'starter'
                            CHECK (tier IN ('starter', 'pro', 'team')),
  status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- RLS: users can only read their own subscription
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_subscription" ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- Helper function: returns the current user's tier (defaults to 'starter')
CREATE OR REPLACE FUNCTION public.my_tier()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT tier FROM public.subscriptions
     WHERE user_id = auth.uid() AND status = 'active'
     LIMIT 1),
    'starter'
  );
$$;

GRANT EXECUTE ON FUNCTION public.my_tier() TO authenticated;

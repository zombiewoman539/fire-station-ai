import { supabase } from './supabaseClient';

export type Tier = 'starter' | 'pro' | 'team';

export interface Subscription {
  tier: Tier;
  status: string;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
}

export const PRICES = {
  pro_monthly:  'price_1TOLYyKQ4OjU0R9eXyO9p85H',
  pro_annual:   'price_1TOLZDKQ4OjU0R9ey7JlCVHA',
  team_monthly: 'price_1TOLZdKQ4OjU0R9egp11z5gX',
  team_annual:  'price_1TOLZuKQ4OjU0R9e1aYCnGvk',
} as const;

export async function getMySubscription(): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('tier, status, current_period_end, stripe_customer_id')
    .maybeSingle();

  if (error || !data) return null;

  return {
    tier: data.tier as Tier,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    stripeCustomerId: data.stripe_customer_id,
  };
}

export async function createCheckoutSession(priceId: string, returnUrl?: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const url = returnUrl ?? `${window.location.origin}/plans`;

  const response = await fetch(
    `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-checkout-session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ priceId, returnUrl: url }),
    }
  );

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.url;
}

export async function createPortalSession(returnUrl?: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-portal-session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ returnUrl: returnUrl ?? `${window.location.origin}/plans` }),
    }
  );

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  window.location.href = data.url;
}

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

export async function createCheckoutSession(priceId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-checkout-session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        priceId,
        returnUrl: `${window.location.origin}/settings`,
      }),
    }
  );

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.url;
}

export async function openCustomerPortal(): Promise<void> {
  // Redirect to Stripe customer portal for managing/cancelling subscription
  // For now, direct to settings — full portal integration can be added later
  window.location.href = '/settings';
}

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { getMySubscription, Tier, Subscription } from '../services/subscriptionService';

interface SubscriptionContextValue {
  tier: Tier;
  subscription: Subscription | null;
  loaded: boolean;
  isPro: boolean;
  isTeam: boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  tier: 'starter',
  subscription: null,
  loaded: false,
  isPro: false,
  isTeam: false,
  refresh: async () => {},
});

const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (isLocalDev) { setLoaded(true); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoaded(true); return; }
    const sub = await getMySubscription();
    setSubscription(sub);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const trialActive = subscription?.trialEndsAt != null && new Date(subscription.trialEndsAt) > new Date();
  const isActive = subscription?.status === 'active' || (subscription?.status === 'trialing' && trialActive);
  const tier: Tier = isLocalDev ? 'pro' : isActive ? subscription!.tier : 'starter';

  const value = useMemo(() => ({
    tier,
    subscription,
    loaded,
    isPro: tier === 'pro' || tier === 'team',
    isTeam: tier === 'team',
    refresh: load,
  }), [tier, subscription, loaded, load]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);

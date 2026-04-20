import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoaded(true); return; }
    const sub = await getMySubscription();
    setSubscription(sub);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const tier: Tier = subscription?.status === 'active' ? subscription.tier : 'starter';

  return (
    <SubscriptionContext.Provider value={{
      tier,
      subscription,
      loaded,
      isPro: tier === 'pro' || tier === 'team',
      isTeam: tier === 'team',
      refresh: load,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);

import React, { createContext, useContext, useState, useEffect } from 'react';

interface LicenseState {
  loaded: boolean;
  authenticated: boolean;
  firstRun: boolean;
  licenseValid: boolean;
  tier: string;
  isPro: boolean;
  expiresAt: string | null;
}

const LicenseContext = createContext<LicenseState>({
  loaded: false,
  authenticated: false,
  firstRun: false,
  licenseValid: false,
  tier: 'pro',
  isPro: false,
  expiresAt: null,
});

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LicenseState>({
    loaded: false,
    authenticated: false,
    firstRun: false,
    licenseValid: false,
    tier: 'pro',
    isPro: false,
    expiresAt: null,
  });

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then((data: { authenticated: boolean; firstRun: boolean; licenseValid: boolean; tier: string; expiresAt: string | null }) => {
        setState({
          loaded: true,
          authenticated: data.authenticated,
          firstRun: data.firstRun,
          licenseValid: data.licenseValid,
          tier: data.tier ?? 'pro',
          isPro: true,
          expiresAt: data.expiresAt ?? null,
        });
      })
      .catch(() => {
        setState(s => ({ ...s, loaded: true }));
      });
  }, []);

  return <LicenseContext.Provider value={state}>{children}</LicenseContext.Provider>;
}

export function useLicense() {
  return useContext(LicenseContext);
}

// Backward-compatible shim so existing components that call useSubscription() still work
export function useSubscription() {
  const { isPro, loaded, tier } = useLicense();
  return { isPro, loaded, tier, subscription: null, refresh: () => {} };
}

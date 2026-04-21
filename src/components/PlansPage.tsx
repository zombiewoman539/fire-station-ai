import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';
import { createCheckoutSession, createPortalSession, PRICES } from '../services/subscriptionService';
import type { Tier } from '../services/subscriptionService';

type Billing = 'monthly' | 'annual';

interface PlanDef {
  tier: Tier;
  name: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  monthlyPriceId: string | null;
  annualPriceId: string | null;
  accent: string;
  border: string;
  tagline: string;
  features: string[];
  popular?: boolean;
}

const PLANS: PlanDef[] = [
  {
    tier: 'starter',
    name: 'Starter',
    monthlyPrice: null,
    annualPrice: null,
    monthlyPriceId: null,
    annualPriceId: null,
    accent: '#94a3b8',
    border: 'rgba(148,163,184,0.25)',
    tagline: 'Get started for free.',
    features: [
      '3 client profiles',
      'FIRE projections & net worth chart',
      'CPF & insurance modelling',
      'What-If scenario planner',
      'PDF report export',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    monthlyPrice: 29,
    annualPrice: 290,
    monthlyPriceId: PRICES.pro_monthly,
    annualPriceId: PRICES.pro_annual,
    accent: '#34d399',
    border: 'rgba(52,211,153,0.4)',
    tagline: 'For the serious solo advisor.',
    popular: true,
    features: [
      'Everything in Starter',
      'Unlimited client profiles',
      'Advisor Dashboard',
      'Insights panel',
      'Presentation / client mode',
      'Priority support',
    ],
  },
  {
    tier: 'team',
    name: 'Team',
    monthlyPrice: 79,
    annualPrice: 790,
    monthlyPriceId: PRICES.team_monthly,
    annualPriceId: PRICES.team_annual,
    accent: '#818cf8',
    border: 'rgba(129,140,248,0.4)',
    tagline: 'For advisory practices.',
    features: [
      'Everything in Pro',
      'Manager Dashboard',
      'Team invites & multi-advisor',
      'Audit log',
      'Dedicated onboarding call',
    ],
  },
];

function tierRank(t: Tier): number {
  return t === 'starter' ? 0 : t === 'pro' ? 1 : 2;
}

export default function PlansPage() {
  const [billing, setBilling] = useState<Billing>('monthly');
  const [loadingPrice, setLoadingPrice] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const { tier: currentTier, subscription, loaded, refresh } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutStatus = searchParams.get('checkout');

  useEffect(() => {
    if (!checkoutStatus) return;
    const t = setTimeout(() => {
      setSearchParams({}, { replace: true });
      if (checkoutStatus === 'success') refresh();
    }, 5000);
    return () => clearTimeout(t);
  }, [checkoutStatus, setSearchParams, refresh]);

  const handleUpgrade = async (plan: PlanDef) => {
    const priceId = billing === 'annual' ? plan.annualPriceId : plan.monthlyPriceId;
    if (!priceId) return;
    setLoadingPrice(priceId);
    try {
      const url = await createCheckoutSession(priceId, `${window.location.origin}/plans`);
      window.location.href = url;
    } catch (err: any) {
      alert(err.message || 'Something went wrong. Please try again.');
      setLoadingPrice(null);
    }
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      await createPortalSession(`${window.location.origin}/plans`);
    } catch {
      // Portal not available — fall back to plans page
      setPortalLoading(false);
    }
  };

  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', color: 'var(--text-1)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Checkout banners */}
        {checkoutStatus === 'success' && (
          <div style={{
            background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
            borderRadius: 10, padding: '14px 20px', marginBottom: 28,
            color: '#34d399', fontSize: 14, fontWeight: 600,
          }}>
            ✓ Subscription activated — your plan has been upgraded.
          </div>
        )}
        {checkoutStatus === 'cancelled' && (
          <div style={{
            background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: 10, padding: '14px 20px', marginBottom: 28,
            color: '#fbbf24', fontSize: 14,
          }}>
            Checkout was cancelled — no charge was made.
          </div>
        )}

        {/* Current plan banner for paid subscribers */}
        {loaded && subscription?.status === 'active' && currentTier !== 'starter' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 20px', marginBottom: 28, gap: 16,
          }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                You're on the {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} plan
              </span>
              {periodEnd && (
                <span style={{ fontSize: 12, color: 'var(--text-4)', marginLeft: 12 }}>
                  Renews {periodEnd}
                </span>
              )}
            </div>
            <button
              onClick={handleManage}
              disabled={portalLoading}
              style={{
                padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-3)', fontSize: 12,
                fontWeight: 600, cursor: portalLoading ? 'not-allowed' : 'pointer',
                opacity: portalLoading ? 0.6 : 1, whiteSpace: 'nowrap',
              }}
            >
              {portalLoading ? 'Loading…' : 'Manage billing →'}
            </button>
          </div>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Plans & Pricing
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 0 28px' }}>
            All prices in SGD. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div style={{
            display: 'inline-flex', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 10, padding: 4, gap: 4,
          }}>
            {(['monthly', 'annual'] as Billing[]).map(b => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                style={{
                  padding: '8px 20px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  background: billing === b ? 'var(--bg)' : 'transparent',
                  color: billing === b ? 'var(--text-1)' : 'var(--text-4)',
                  boxShadow: billing === b ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {b === 'monthly' ? 'Monthly' : 'Annual'}
                {b === 'annual' && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#34d399',
                    background: 'rgba(52,211,153,0.15)', padding: '2px 6px', borderRadius: 4,
                  }}>
                    SAVE 17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {PLANS.map(plan => {
            const isCurrent = currentTier === plan.tier;
            const isHigherTier = tierRank(plan.tier) > tierRank(currentTier);
            const price = billing === 'annual' ? plan.annualPrice : plan.monthlyPrice;
            const priceId = billing === 'annual' ? plan.annualPriceId : plan.monthlyPriceId;
            const isProcessing = loadingPrice === priceId;
            const showPopular = plan.popular && !isCurrent;

            return (
              <div
                key={plan.tier}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isCurrent ? plan.border : plan.popular ? plan.border : 'var(--border)'}`,
                  borderRadius: 16,
                  padding: '32px 24px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: plan.popular && !isCurrent ? `0 0 0 1px ${plan.border}` : 'none',
                }}
              >
                {/* Badge */}
                {(showPopular || isCurrent) && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: plan.accent, color: '#0f172a',
                    fontSize: 10, fontWeight: 800, padding: '3px 12px', borderRadius: 20,
                    letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {isCurrent ? 'Current Plan' : 'Most Popular'}
                  </div>
                )}

                {/* Tier name */}
                <div style={{ fontSize: 15, fontWeight: 800, color: plan.accent, marginBottom: 4 }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 20 }}>
                  {plan.tagline}
                </div>

                {/* Price */}
                <div style={{ marginBottom: 28 }}>
                  {price === null ? (
                    <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                      Free
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-4)', paddingBottom: 7 }}>S$</span>
                        <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                          {price}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-4)', paddingBottom: 5 }}>
                          /{billing === 'annual' ? 'yr' : 'mo'}
                        </span>
                      </div>
                      {billing === 'annual' && (
                        <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 5 }}>
                          S${Math.round(price / 12)}/mo billed annually
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.4 }}>
                      <span style={{ color: plan.accent, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {!loaded ? (
                  <div style={{ height: 42 }} />
                ) : isCurrent ? (
                  <button
                    disabled
                    style={{
                      width: '100%', padding: '11px 0', borderRadius: 10,
                      border: `1px solid ${plan.border}`, background: 'transparent',
                      color: plan.accent, fontSize: 13, fontWeight: 700,
                      cursor: 'default', opacity: 0.65,
                    }}
                  >
                    Current Plan
                  </button>
                ) : isHigherTier ? (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={!!loadingPrice}
                    style={{
                      width: '100%', padding: '11px 0', borderRadius: 10,
                      border: 'none', background: plan.accent,
                      color: '#0f172a', fontSize: 13, fontWeight: 800,
                      cursor: loadingPrice ? 'not-allowed' : 'pointer',
                      opacity: loadingPrice && !isProcessing ? 0.45 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {isProcessing ? 'Redirecting…' : `Upgrade to ${plan.name} →`}
                  </button>
                ) : (
                  /* Lower tier shown while on a higher plan */
                  subscription?.status === 'active' ? (
                    <button
                      onClick={handleManage}
                      disabled={portalLoading}
                      style={{
                        width: '100%', padding: '11px 0', borderRadius: 10,
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--text-4)', fontSize: 13, fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {portalLoading ? 'Loading…' : 'Manage Subscription'}
                    </button>
                  ) : null
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-5)', marginTop: 36, lineHeight: 1.7 }}>
          Have questions? Email{' '}
          <a href="mailto:support@firestation.app" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>
            support@firestation.app
          </a>
        </p>
      </div>
    </div>
  );
}

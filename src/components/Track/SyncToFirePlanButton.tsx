import React, { useMemo, useState } from 'react';
import { ClientProfile } from '../../profileTypes';
import { HoldingWithMarketData, InvestmentBucket, SupportedCurrency } from '../../types';

/**
 * Sync portfolio to FIRE plan: writes back to inputs.assets.investments and inputs.assets.investmentBuckets.
 * Does NOT touch return rate, cash savings, contribution rate, or any product-type fields.
 */
export default function SyncToFirePlanButton({
  profile, holdings, baseCurrency, onSync,
}: {
  profile: ClientProfile;
  holdings: HoldingWithMarketData[];
  baseCurrency: SupportedCurrency;
  onSync: (newInvestments: number, newBuckets: InvestmentBucket[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { newTotal, currentTotal, newBuckets, currentBuckets, anyMissingPrice } = useMemo(() => {
    const openHoldings = holdings.filter(h => h.quantity > 0);
    const anyMissing = openHoldings.some(h => h.marketValueBase === null);
    const total = openHoldings.reduce((s, h) => s + (h.marketValueBase ?? 0), 0);

    // Group by category → bucket
    const byCategory = new Map<string, number>();
    for (const h of openHoldings) {
      if (h.marketValueBase === null) continue;
      byCategory.set(h.category, (byCategory.get(h.category) ?? 0) + h.marketValueBase);
    }

    // Preserve return rate from existing buckets where category name matches; else default 7%
    const existingByLabel = new Map<string, InvestmentBucket>();
    (profile.inputs.assets.investmentBuckets ?? []).forEach(b => existingByLabel.set(b.label, b));

    const buckets: InvestmentBucket[] = Array.from(byCategory.entries()).map(([cat, value]) => {
      const existing = existingByLabel.get(cat);
      return {
        id: existing?.id ?? newId(),
        label: cat,
        currentValue: Math.round(value),
        monthlyContribution: existing?.monthlyContribution ?? 0,
        annualReturnRate: existing?.annualReturnRate ?? profile.inputs.assets.investmentReturnRate ?? 7,
      };
    }).sort((a, b) => b.currentValue - a.currentValue);

    return {
      newTotal: Math.round(total),
      currentTotal: profile.inputs.assets.investments,
      newBuckets: buckets,
      currentBuckets: profile.inputs.assets.investmentBuckets ?? [],
      anyMissingPrice: anyMissing,
    };
  }, [holdings, profile]);

  const diff = newTotal - currentTotal;

  const handleSync = async () => {
    setSaving(true);
    try {
      await onSync(newTotal, newBuckets);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) =>
    `${baseCurrency === 'SGD' ? 'S$' : '$'}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={holdings.length === 0}
        style={{
          padding: '6px 14px', borderRadius: 8, border: '1px solid #4f46e5',
          background: 'rgba(79,70,229,0.15)', color: '#a5b4fc',
          fontSize: 12, fontWeight: 700, cursor: holdings.length === 0 ? 'not-allowed' : 'pointer',
          opacity: holdings.length === 0 ? 0.5 : 1,
        }}
      >
        ↻ Sync to FIRE plan
      </button>

      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
            padding: '24px 28px', width: '100%', maxWidth: 520,
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>Sync portfolio to FIRE plan</h2>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-3)' }}>
              This will update <strong style={{ color: 'var(--text-2)' }}>{profile.name}</strong>'s FIRE plan inputs.
            </p>

            {anyMissingPrice && (
              <div style={{
                marginBottom: 12, padding: '8px 12px', borderRadius: 7,
                background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
                fontSize: 11, color: '#fbbf24',
              }}>
                ⚠ Some holdings have no market price yet — they'll be excluded from the sync. Refresh prices first.
              </div>
            )}

            <div style={{ background: 'var(--inset)', borderRadius: 8, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                Total investments
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <span style={{ color: 'var(--text-3)' }}>{fmt(currentTotal)}</span>
                <span style={{ color: 'var(--text-4)' }}>→</span>
                <span style={{ fontWeight: 700 }}>{fmt(newTotal)}</span>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: diff >= 0 ? '#34d399' : '#f87171',
                }}>
                  {diff >= 0 ? '↑ +' : '↓ '}{fmt(diff)}
                </span>
              </div>
            </div>

            <div style={{ background: 'var(--inset)', borderRadius: 8, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Investment buckets ({currentBuckets.length} → {newBuckets.length})
              </div>
              {newBuckets.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-4)' }}>No buckets — all holdings will go into the single "investments" total.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {newBuckets.map(b => {
                    const existing = currentBuckets.find(c => c.label === b.label);
                    return (
                      <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-2)' }}>• {b.label}</span>
                        <span>
                          <span style={{ color: 'var(--text-4)' }}>{existing ? fmt(existing.currentValue) : '—'}</span>
                          <span style={{ color: 'var(--text-4)', margin: '0 6px' }}>→</span>
                          <span style={{ fontWeight: 600 }}>{fmt(b.currentValue)}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 16, lineHeight: 1.6 }}>
              Return rate, contribution rate, cash savings, product-type policies, and personal details will <strong>not</strong> change.
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={ghostBtn}>Cancel</button>
              <button onClick={handleSync} disabled={saving} style={primaryBtn}>
                {saving ? 'Syncing…' : 'Sync'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `bucket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const primaryBtn: React.CSSProperties = {
  padding: '8px 18px', borderRadius: 8, border: 'none', background: '#4f46e5',
  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const ghostBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

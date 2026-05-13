import React from 'react';
import { FireInputs, InvestmentBucket, AssetTransition } from '../../types';
import { NumberField, SliderField, SectionLabel, DetailToggleButton } from '../FormFields';
import { uid } from '../../utils/uid';

type ProductType = 'growth' | 'dividend' | 'annuity';

const PRODUCT_LABELS: Record<ProductType, string> = {
  growth: 'Growth',
  dividend: 'Dividend',
  annuity: 'Annuity',
};

function ProductTypePill({ value, onChange }: { value: ProductType; onChange: (v: ProductType) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
      {(['growth', 'dividend', 'annuity'] as ProductType[]).map(t => (
        <button key={t} type="button" onClick={() => onChange(t)} style={{
          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, cursor: 'pointer',
          border: `1px solid ${value === t ? 'var(--accent)' : 'var(--border)'}`,
          background: value === t ? 'var(--accent)' : 'transparent',
          color: value === t ? '#fff' : 'var(--text-3)',
          transition: 'all 0.12s',
        }}>{PRODUCT_LABELS[t]}</button>
      ))}
    </div>
  );
}

function BucketInput({ label, value, prefix, suffix, step = 1, onChange }: {
  label: string; value: number; prefix?: string; suffix?: string; step?: number;
  onChange: (v: number) => void;
}) {
  const [focused, setFocused] = React.useState(false);
  const [display, setDisplay] = React.useState(String(value));
  React.useEffect(() => { if (!focused) setDisplay(String(value)); }, [value, focused]);
  return (
    <div>
      <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 3 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '6px 8px' }}>
        {prefix && <span style={{ color: 'var(--text-4)', fontSize: 11, marginRight: 3 }}>{prefix}</span>}
        <input type="number" value={focused ? display : value} step={step}
          onFocus={e => { setFocused(true); setDisplay(String(value)); e.target.select(); }}
          onBlur={() => { setFocused(false); onChange(Number(display) || 0); }}
          onChange={e => { setDisplay(e.target.value); const n = Number(e.target.value); if (!isNaN(n)) onChange(n); }}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 12, width: '100%' }} />
        {suffix && <span style={{ color: 'var(--text-4)', fontSize: 11, marginLeft: 2 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function ProductDetailsPanel({ bucket, onChange }: { bucket: InvestmentBucket; onChange: (patch: Partial<InvestmentBucket>) => void }) {
  const isLimited = bucket.premiumType === 'limited';
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-soft)' }}>
      {/* Premium type toggle */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>Premium structure</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['single', 'limited'] as const).map(pt => (
            <button key={pt} type="button" onClick={() => onChange({ premiumType: pt })} style={{
              fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${bucket.premiumType === pt ? 'var(--accent)' : 'var(--border)'}`,
              background: bucket.premiumType === pt ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: bucket.premiumType === pt ? 'var(--accent)' : 'var(--text-3)',
              transition: 'all 0.12s',
            }}>{pt === 'single' ? 'Single premium' : 'Regular premiums'}</button>
          ))}
        </div>
      </div>

      {/* Limited pay fields */}
      {isLimited && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <BucketInput label="Annual premium" value={bucket.annualPremium ?? 0} prefix="S$"
            onChange={v => onChange({ annualPremium: v })} />
          <BucketInput label="Pay for (years)" value={bucket.premiumYears ?? 0}
            onChange={v => onChange({ premiumYears: v })} />
        </div>
      )}

      {/* Payout fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <BucketInput label="Payout start age" value={bucket.payoutStartAge ?? 65}
          onChange={v => onChange({ payoutStartAge: v })} />
        <BucketInput label="Annual payout" value={bucket.payoutAnnualAmount ?? 0} prefix="S$"
          onChange={v => onChange({ payoutAnnualAmount: v })} />
      </div>

      {/* Duration — only for annuity */}
      {bucket.productType === 'annuity' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <BucketInput
              label={bucket.payoutDurationYears == null ? 'Duration (lifetime)' : 'Duration (years)'}
              value={bucket.payoutDurationYears ?? 0}
              onChange={v => onChange({ payoutDurationYears: v === 0 ? null : v })}
            />
          </div>
          <div style={{ paddingTop: 18 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, color: 'var(--text-3)' }}>
              <input type="checkbox" checked={bucket.payoutDurationYears == null}
                onChange={e => onChange({ payoutDurationYears: e.target.checked ? null : 20 })}
                style={{ cursor: 'pointer' }} />
              Lifetime
            </label>
          </div>
        </div>
      )}

      {/* Summary line */}
      {(bucket.payoutAnnualAmount ?? 0) > 0 && (bucket.payoutStartAge ?? 0) > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#34d399', fontWeight: 500 }}>
          +S${(bucket.payoutAnnualAmount ?? 0).toLocaleString()}/yr from age {bucket.payoutStartAge}
          {bucket.productType === 'annuity' && bucket.payoutDurationYears != null
            ? ` for ${bucket.payoutDurationYears} yrs`
            : ' (lifetime)'}
        </div>
      )}
    </div>
  );
}

export function AssetsSection({ inputs, onChange }: { inputs: FireInputs; onChange: (i: FireInputs) => void }) {
  const updAssets = (field: string, v: number) => onChange({ ...inputs, assets: { ...inputs.assets, [field]: v } });

  const buckets = inputs.assets.investmentBuckets ?? [];

  const addBucket = () => {
    const newBucket: InvestmentBucket = { id: uid(), label: 'New investment', currentValue: 0, monthlyContribution: 0, annualReturnRate: 7 };
    onChange({ ...inputs, assets: { ...inputs.assets, investmentBuckets: [...buckets, newBucket] } });
  };
  const removeBucket = (id: string) => {
    onChange({ ...inputs, assets: { ...inputs.assets, investmentBuckets: buckets.filter(b => b.id !== id) } });
  };
  const updateBucket = (id: string, patch: Partial<InvestmentBucket>) => {
    onChange({ ...inputs, assets: { ...inputs.assets, investmentBuckets: buckets.map(b => b.id === id ? { ...b, ...patch } : b) } });
  };
  const expandBuckets = () => {
    const seed: InvestmentBucket = {
      id: uid(), label: 'Investments',
      currentValue: inputs.assets.investments,
      monthlyContribution: Math.round(inputs.income.annualInvestmentContribution / 12),
      annualReturnRate: inputs.assets.investmentReturnRate,
    };
    onChange({ ...inputs, assets: { ...inputs.assets, investmentBuckets: [seed] } });
  };
  const collapseBuckets = () => {
    const growthBuckets = buckets.filter(b => !b.productType || b.productType === 'growth');
    const totalVal = growthBuckets.reduce((s, b) => s + b.currentValue, 0);
    const blended = totalVal > 0
      ? growthBuckets.reduce((s, b) => s + (b.currentValue / totalVal) * b.annualReturnRate, 0)
      : inputs.assets.investmentReturnRate;
    const totalMonthly = growthBuckets.reduce((s, b) => s + b.monthlyContribution, 0);
    onChange({
      ...inputs,
      assets: { ...inputs.assets, investmentBuckets: [], investments: totalVal, investmentReturnRate: Math.round(blended * 10) / 10 },
      income: { ...inputs.income, annualInvestmentContribution: totalMonthly * 12 },
    });
  };

  const setProductType = (id: string, pt: ProductType) => {
    const patch: Partial<InvestmentBucket> = { productType: pt };
    if (pt !== 'growth') {
      // Seed sensible defaults when switching to a product type
      const b = buckets.find(x => x.id === id);
      if (!b?.premiumType) patch.premiumType = 'single';
      if (!b?.payoutStartAge) patch.payoutStartAge = inputs.personal.retirementAge;
      if (pt === 'annuity' && b?.payoutDurationYears === undefined) patch.payoutDurationYears = 20;
      if (pt === 'dividend' && b?.payoutDurationYears === undefined) patch.payoutDurationYears = null;
    }
    updateBucket(id, patch);
  };

  const bucketTotalVal = buckets.reduce((s, b) => s + b.currentValue, 0);
  const growthBuckets = buckets.filter(b => !b.productType || b.productType === 'growth');
  const bucketBlended = (() => {
    const tv = growthBuckets.reduce((s, b) => s + b.currentValue, 0);
    return tv > 0 ? growthBuckets.reduce((s, b) => s + (b.currentValue / tv) * b.annualReturnRate, 0) : 0;
  })();
  const bucketTotalMonthly = growthBuckets.reduce((s, b) => s + b.monthlyContribution, 0);

  const transitions = inputs.assets.transitions ?? [];
  const updTransitions = (ts: AssetTransition[]) =>
    onChange({ ...inputs, assets: { ...inputs.assets, transitions: ts } });
  const addTransition = () => updTransitions([...transitions, {
    id: uid(), atAge: inputs.personal.retirementAge,
    fromBucketId: buckets[0]?.id ?? '', toBucketId: buckets[1]?.id ?? '', portion: 0.5,
  }]);
  const removeTransition = (id: string) => updTransitions(transitions.filter(t => t.id !== id));
  const updateTransition = (id: string, patch: Partial<AssetTransition>) =>
    updTransitions(transitions.map(t => t.id === id ? { ...t, ...patch } : t));

  return (
    <div>
      <NumberField label="Cash Savings" value={inputs.assets.cashSavings} prefix="S$"
        tip="Cash in bank accounts, savings accounts, T-bills, SSBs. Earns the Cash Return Rate."
        onChange={v => updAssets('cashSavings', v)} />
      <SliderField label="Cash Return Rate" value={inputs.assets.cashReturnRate} min={0} max={5} step={0.25} unit="%"
        tip="Expected annual return on cash (e.g. high-yield savings, T-bills, SSBs). Singapore T-bills ~3–3.5%."
        onChange={v => updAssets('cashReturnRate', v)} />

      {buckets.length === 0 ? (
        <div>
          <NumberField label="Investments / Equities" value={inputs.assets.investments} prefix="S$"
            tip="Current value of your investment portfolio — stocks, ETFs, unit trusts, REITs, etc."
            rightSlot={<DetailToggleButton icon="⊞" label="Track per-bucket" onClick={expandBuckets} />}
            onChange={v => updAssets('investments', v)} />
          <NumberField label="Annual Investment Contribution" value={inputs.income.annualInvestmentContribution} prefix="S$"
            tip="How much you actively invest each year. Remaining surplus goes to cash savings."
            onChange={v => onChange({ ...inputs, income: { ...inputs.income, annualInvestmentContribution: v } })} />
          <SliderField label="Investment Return Rate" value={inputs.assets.investmentReturnRate} min={0} max={20} step={0.5} unit="%"
            tip="Expected annual return on equities. Global diversified ETFs average ~7% historically."
            onChange={v => updAssets('investmentReturnRate', v)} />
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SectionLabel>Investment Portfolio</SectionLabel>
            <DetailToggleButton icon="↑" label="Use single total" onClick={collapseBuckets} />
          </div>
          {buckets.map(bucket => {
            const isProduct = bucket.productType === 'dividend' || bucket.productType === 'annuity';
            const productType: ProductType = bucket.productType ?? 'growth';
            return (
              <div key={bucket.id} style={{ background: 'var(--inset)', borderRadius: 10, padding: '10px 12px', marginBottom: 8, border: '1px solid var(--border-soft)' }}>
                {/* Bucket header: name + remove */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <input value={bucket.label} onChange={e => updateBucket(bucket.id, { label: e.target.value })}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13, fontWeight: 600 }} />
                  <button onClick={() => removeBucket(bucket.id)}
                    style={{ color: 'var(--text-5)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
                </div>

                {/* Product type pills */}
                <ProductTypePill value={productType} onChange={pt => setProductType(bucket.id, pt)} />

                {/* Growth fields */}
                {!isProduct && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[
                      { key: 'currentValue' as const, label: 'Current value', prefix: 'S$' },
                      { key: 'monthlyContribution' as const, label: 'Monthly add', prefix: 'S$' },
                      { key: 'annualReturnRate' as const, label: 'Return % p.a.', suffix: '%' },
                    ].map(({ key, label, prefix, suffix }) => (
                      <BucketInput key={key} label={label} value={bucket[key] as number}
                        prefix={prefix} suffix={suffix}
                        step={key === 'annualReturnRate' ? 0.5 : 1}
                        onChange={v => updateBucket(bucket.id, { [key]: v })} />
                    ))}
                  </div>
                )}

                {/* Product bucket: just the capital value */}
                {isProduct && (
                  <div style={{ marginBottom: 2 }}>
                    <BucketInput
                      label={bucket.premiumType === 'single' ? 'Single premium (S$)' : 'Policy value today (S$)'}
                      value={bucket.currentValue} prefix="S$"
                      onChange={v => updateBucket(bucket.id, { currentValue: v })} />
                  </div>
                )}

                {/* Product details panel */}
                {isProduct && (
                  <ProductDetailsPanel bucket={bucket} onChange={patch => updateBucket(bucket.id, patch)} />
                )}
              </div>
            );
          })}
          <button onClick={addBucket} style={{
            width: '100%', padding: '8px 0', fontSize: 12, color: '#34d399',
            border: '1px dashed rgba(52,211,153,0.4)', borderRadius: 8, background: 'none', cursor: 'pointer', marginBottom: 8,
          }}>+ Add investment</button>
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>S${bucketTotalVal.toLocaleString()}</span> total &nbsp;·&nbsp;
            <span style={{ fontWeight: 700, color: '#34d399' }}>{bucketBlended.toFixed(1)}%</span> blended &nbsp;·&nbsp;
            +S${bucketTotalMonthly.toLocaleString()}/mo
          </div>

          {/* Transitions */}
          {buckets.length >= 2 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <SectionLabel>Transfers at age</SectionLabel>
                <button onClick={addTransition} style={{
                  fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}>+ Add transfer</button>
              </div>
              {transitions.length === 0 && (
                <p style={{ fontSize: 11, color: 'var(--text-4)', margin: 0 }}>
                  No transfers yet. Use these to model rebalancing or funding an annuity at retirement.
                </p>
              )}
              {transitions.map(t => {
                const fromBucket = buckets.find(b => b.id === t.fromBucketId);
                const toBucket = buckets.find(b => b.id === t.toBucketId);
                const isPast = t.atAge <= inputs.personal.currentAge;
                return (
                  <div key={t.id} style={{
                    background: 'var(--inset)', borderRadius: 8, padding: '8px 10px', marginBottom: 6,
                    border: `1px solid ${isPast ? 'rgba(239,68,68,0.3)' : 'var(--border-soft)'}`,
                    opacity: isPast ? 0.6 : 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>Age</span>
                      <input type="number" value={t.atAge}
                        onChange={e => updateTransition(t.id, { atAge: Number(e.target.value) || 0 })}
                        onFocus={e => e.target.select()}
                        style={{ width: 44, background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 6, padding: '3px 6px', fontSize: 12, color: 'var(--text-1)', outline: 'none' }} />
                      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>move</span>
                      <input type="number" min={1} max={100} value={Math.round(t.portion * 100)}
                        onChange={e => updateTransition(t.id, { portion: Math.min(1, Math.max(0, (Number(e.target.value) || 0) / 100)) })}
                        onFocus={e => e.target.select()}
                        style={{ width: 44, background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 6, padding: '3px 6px', fontSize: 12, color: 'var(--text-1)', outline: 'none' }} />
                      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>% of</span>
                      <select value={t.fromBucketId} onChange={e => updateTransition(t.id, { fromBucketId: e.target.value })}
                        style={{ flex: 1, minWidth: 80, background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 6, padding: '3px 6px', fontSize: 12, color: 'var(--text-1)', outline: 'none' }}>
                        {buckets.filter(b => b.id !== t.toBucketId).map(b => (
                          <option key={b.id} value={b.id}>{b.label}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>→</span>
                      <select value={t.toBucketId} onChange={e => updateTransition(t.id, { toBucketId: e.target.value })}
                        style={{ flex: 1, minWidth: 80, background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 6, padding: '3px 6px', fontSize: 12, color: 'var(--text-1)', outline: 'none' }}>
                        {buckets.filter(b => b.id !== t.fromBucketId).map(b => (
                          <option key={b.id} value={b.id}>{b.label}</option>
                        ))}
                      </select>
                      <button onClick={() => removeTransition(t.id)}
                        style={{ color: 'var(--text-5)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
                    </div>
                    {isPast && (
                      <p style={{ fontSize: 10, color: '#ef4444', margin: '4px 0 0' }}>Age already passed — transition will be ignored</p>
                    )}
                    {!isPast && fromBucket && toBucket && (
                      <p style={{ fontSize: 10, color: 'var(--text-4)', margin: '4px 0 0' }}>
                        At age {t.atAge}: move {Math.round(t.portion * 100)}% of <strong style={{ color: 'var(--text-3)' }}>{fromBucket.label}</strong> → <strong style={{ color: 'var(--text-3)' }}>{toBucket.label}</strong>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <SliderField
        label="Retirement Return Reduction"
        value={inputs.assets.retirementReturnReduction ?? 30}
        min={0} max={70} step={5} unit="%"
        tip="How much the investment return rate is reduced once retired. Reflects de-risking when income stops. Default 30% (e.g. 7% accumulation → 4.9% retirement)."
        onChange={v => updAssets('retirementReturnReduction', v)}
      />
    </div>
  );
}

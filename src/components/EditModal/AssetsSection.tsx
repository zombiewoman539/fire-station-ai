import React from 'react';
import { FireInputs, InvestmentBucket } from '../../types';
import { NumberField, SliderField, SectionLabel, DetailToggleButton } from '../FormFields';
import { uid } from '../../utils/uid';

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
    const totalVal = buckets.reduce((s, b) => s + b.currentValue, 0);
    const blended = totalVal > 0
      ? buckets.reduce((s, b) => s + (b.currentValue / totalVal) * b.annualReturnRate, 0)
      : inputs.assets.investmentReturnRate;
    const totalMonthly = buckets.reduce((s, b) => s + b.monthlyContribution, 0);
    onChange({
      ...inputs,
      assets: { ...inputs.assets, investmentBuckets: [], investments: totalVal, investmentReturnRate: Math.round(blended * 10) / 10 },
      income: { ...inputs.income, annualInvestmentContribution: totalMonthly * 12 },
    });
  };

  const bucketTotalVal = buckets.reduce((s, b) => s + b.currentValue, 0);
  const bucketBlended = bucketTotalVal > 0
    ? buckets.reduce((s, b) => s + (b.currentValue / bucketTotalVal) * b.annualReturnRate, 0)
    : 0;
  const bucketTotalMonthly = buckets.reduce((s, b) => s + b.monthlyContribution, 0);

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
          {buckets.map(bucket => (
            <div key={bucket.id} style={{ background: 'var(--inset)', borderRadius: 10, padding: '10px 12px', marginBottom: 8, border: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input value={bucket.label} onChange={e => updateBucket(bucket.id, { label: e.target.value })}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13, fontWeight: 600 }} />
                <button onClick={() => removeBucket(bucket.id)}
                  style={{ color: 'var(--text-5)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { key: 'currentValue' as const, label: 'Current value', prefix: 'S$' },
                  { key: 'monthlyContribution' as const, label: 'Monthly add', prefix: 'S$' },
                  { key: 'annualReturnRate' as const, label: 'Return % p.a.', suffix: '%' },
                ].map(({ key, label, prefix, suffix }) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 3 }}>{label}</label>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '6px 8px' }}>
                      {prefix && <span style={{ color: 'var(--text-4)', fontSize: 11, marginRight: 3 }}>{prefix}</span>}
                      <input type="number" value={bucket[key]} step={key === 'annualReturnRate' ? 0.5 : 1}
                        onChange={e => updateBucket(bucket.id, { [key]: Number(e.target.value) || 0 })}
                        style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 12, width: '100%' }} />
                      {suffix && <span style={{ color: 'var(--text-4)', fontSize: 11, marginLeft: 2 }}>{suffix}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button onClick={addBucket} style={{
            width: '100%', padding: '8px 0', fontSize: 12, color: '#34d399',
            border: '1px dashed rgba(52,211,153,0.4)', borderRadius: 8, background: 'none', cursor: 'pointer', marginBottom: 8,
          }}>+ Add investment</button>
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>S${bucketTotalVal.toLocaleString()}</span> total &nbsp;·&nbsp;
            <span style={{ fontWeight: 700, color: '#34d399' }}>{bucketBlended.toFixed(1)}%</span> blended &nbsp;·&nbsp;
            +S${bucketTotalMonthly.toLocaleString()}/mo
          </div>
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

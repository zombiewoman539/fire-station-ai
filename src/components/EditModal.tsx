import React from 'react';
import { FireInputs, InsurancePolicy, MajorPurchase, FundAllocation, ExpenseLineItem, InvestmentBucket } from '../types';
import { listProfiles } from '../services/profileStorageSupabase';
import { ClientProfile } from '../profileTypes';

interface Props {
  open: boolean;
  onClose: () => void;
  inputs: FireInputs;
  onChange: (inputs: FireInputs) => void;
  clientName?: string;
  currentProfileId?: string;
  profile?: ClientProfile | null;
  onProfileMetaChange?: (updates: Partial<Pick<ClientProfile, 'lastMeetingDate' | 'nextReviewDate' | 'notes'>>) => void;
}

type Section = 'personal' | 'income' | 'assets' | 'insurance' | 'purchases' | 'estate' | 'activity';

let _nextId = 200;
const uid = () => String(++_nextId);

// ── InfoTip ───────────────────────────────────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  const [show, setShow] = React.useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const tipWidth = 240;
      const left = Math.min(rect.left, window.innerWidth - tipWidth - 8);
      setPos({ top: rect.bottom + 6, left: Math.max(8, left) });
    }
    setShow(true);
  };

  return (
    <span ref={ref} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <span onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}
        style={{ color: '#3b82f6', cursor: 'help', fontSize: 11, marginLeft: 3, userSelect: 'none' }}>ⓘ</span>
      {show && (
        <div style={{
          position: 'fixed', top: pos.top, left: pos.left, width: 240, zIndex: 99999,
          background: 'var(--tip-bg)', border: '1px solid var(--tip-border)',
          borderRadius: 8, padding: '8px 10px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          fontSize: 11, color: 'var(--text-3)', lineHeight: 1.55,
          pointerEvents: 'none',
        }}>
          {text}
        </div>
      )}
    </span>
  );
}

// ── SliderField ───────────────────────────────────────────────────────────────
function SliderField({ label, value, min, max, step, unit, tip, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  unit?: string; tip?: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
          {label}{tip && <InfoTip text={tip} />}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
          {unit === '$' ? `S$${value.toLocaleString()}` : unit === '%' ? `${value}%` : value}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step || 1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%' }} />
    </div>
  );
}

// ── NumberField ───────────────────────────────────────────────────────────────
function NumberField({ label, value, prefix, tip, small, onChange }: {
  label: string; value: number; prefix?: string; tip?: string; small?: boolean;
  onChange: (v: number) => void;
}) {
  const [displayValue, setDisplayValue] = React.useState(String(value));
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) setDisplayValue(String(value));
  }, [value, focused]);

  return (
    <div style={{ marginBottom: small ? 8 : 14 }}>
      <label style={{ fontSize: small ? 11 : 12, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>
        {label}{tip && <InfoTip text={tip} />}
      </label>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--input-bg)', borderRadius: 8,
        padding: small ? '6px 10px' : '8px 12px',
        border: '1px solid var(--input-border)',
      }}>
        {prefix && <span style={{ color: 'var(--text-4)', fontSize: 13, marginRight: 6, fontWeight: 500 }}>{prefix}</span>}
        <input type="number" value={focused ? displayValue : value}
          onFocus={() => { setFocused(true); setDisplayValue(String(value)); }}
          onBlur={() => { setFocused(false); onChange(Number(displayValue) || 0); }}
          onChange={e => {
            setDisplayValue(e.target.value);
            const num = Number(e.target.value);
            if (!isNaN(num)) onChange(num);
          }}
          onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13, width: '100%' }} />
      </div>
    </div>
  );
}

// ── SelectField ───────────────────────────────────────────────────────────────
function SelectField({ label, value, options, small, onChange }: {
  label: string; value: string;
  options: { value: string; label: string }[];
  small?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: small ? 8 : 14 }}>
      <label style={{ fontSize: small ? 11 : 12, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)',
          borderRadius: 8, padding: small ? '6px 10px' : '8px 12px',
          color: 'var(--text-1)', fontSize: 13, outline: 'none', cursor: 'pointer',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, marginTop: 4 }}>
      {children}
    </div>
  );
}

// ── SECTIONS ─────────────────────────────────────────────────────────────────

function PersonalSection({ inputs, onChange }: { inputs: FireInputs; onChange: (i: FireInputs) => void }) {
  const upd = (field: string, v: number) => onChange({ ...inputs, personal: { ...inputs.personal, [field]: v } });
  const updDob = (dob: string | null) => onChange({ ...inputs, personal: { ...inputs.personal, dateOfBirth: dob || null } });

  // Compute live age from DOB for display
  const liveDobAge = (() => {
    const dob = inputs.personal.dateOfBirth;
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--;
    return age;
  })();

  return (
    <div>
      {/* Date of Birth */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6, fontWeight: 600 }}>
          Date of Birth
          <span style={{ fontWeight: 400, color: 'var(--text-5)', fontSize: 11, marginLeft: 6 }}>
            — used to track live age on Dashboard (doesn't affect financial plan)
          </span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="date"
            value={inputs.personal.dateOfBirth ?? ''}
            onChange={e => updDob(e.target.value || null)}
            style={{
              background: 'var(--input-bg)', border: '1px solid var(--input-border)',
              borderRadius: 8, padding: '7px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
            }}
          />
          {liveDobAge !== null && (
            <span style={{ fontSize: 12, color: 'var(--text-4)' }}>
              Currently <strong style={{ color: 'var(--text-2)' }}>{liveDobAge}</strong> years old today
            </span>
          )}
        </div>
      </div>

      <SliderField label="Current Age" value={inputs.personal.currentAge} min={18} max={70}
        tip="Age used for the financial projection. Set this to the age when the plan was created — it won't change over time automatically."
        onChange={v => upd('currentAge', v)} />
      <SliderField label="Retirement Age" value={inputs.personal.retirementAge} min={40} max={80}
        tip="The age you plan to stop working. Income stops and retirement drawdown begins."
        onChange={v => upd('retirementAge', v)} />
      <SliderField label="Life Expectancy" value={inputs.personal.lifeExpectancy} min={60} max={100}
        tip="How long the projection runs. Singapore avg ~84. Plan conservatively — 90–95 recommended."
        onChange={v => upd('lifeExpectancy', v)} />
    </div>
  );
}

function IncomeSection({ inputs, onChange }: { inputs: FireInputs; onChange: (i: FireInputs) => void }) {
  const upd = (field: string, v: number) => onChange({ ...inputs, income: { ...inputs.income, [field]: v } });

  const items = inputs.income.expenseItems ?? [];

  const addItem = () => {
    const newItem: ExpenseLineItem = { id: uid(), label: 'New expense', amount: 0, frequency: 'monthly', category: 'variable' };
    const next = [...items, newItem];
    const total = next.reduce((s, e) => s + (e.frequency === 'monthly' ? e.amount * 12 : e.amount), 0);
    onChange({ ...inputs, income: { ...inputs.income, expenseItems: next, annualExpenses: total } });
  };
  const removeItem = (id: string) => {
    const next = items.filter(e => e.id !== id);
    const total = next.reduce((s, e) => s + (e.frequency === 'monthly' ? e.amount * 12 : e.amount), 0);
    onChange({ ...inputs, income: { ...inputs.income, expenseItems: next, annualExpenses: total || inputs.income.annualExpenses } });
  };
  const updateItem = (id: string, patch: Partial<ExpenseLineItem>) => {
    const next = items.map(e => e.id === id ? { ...e, ...patch } : e);
    const total = next.reduce((s, e) => s + (e.frequency === 'monthly' ? e.amount * 12 : e.amount), 0);
    onChange({ ...inputs, income: { ...inputs.income, expenseItems: next, annualExpenses: total } });
  };
  const expandExpenses = () => {
    const seed: ExpenseLineItem = { id: uid(), label: 'Living expenses', amount: Math.round(inputs.income.annualExpenses / 12), frequency: 'monthly', category: 'variable' };
    onChange({ ...inputs, income: { ...inputs.income, expenseItems: [seed] } });
  };
  const collapseExpenses = () => {
    const total = items.reduce((s, e) => s + (e.frequency === 'monthly' ? e.amount * 12 : e.amount), 0);
    onChange({ ...inputs, income: { ...inputs.income, expenseItems: [], annualExpenses: total || inputs.income.annualExpenses } });
  };

  const expenseTotal = items.reduce((s, e) => s + (e.frequency === 'monthly' ? e.amount * 12 : e.amount), 0);

  return (
    <div>
      <NumberField label="Annual Take-Home Income" value={inputs.income.annualIncome} prefix="S$"
        tip="Your annual take-home income after deductions and tax. This is the cash you actually receive."
        onChange={v => upd('annualIncome', v)} />

      {/* ── Expense breakdown ── */}
      {items.length === 0 ? (
        <div>
          <NumberField label="Annual Living Expenses" value={inputs.income.annualExpenses} prefix="S$"
            tip="Total yearly spend — housing, food, transport, lifestyle."
            onChange={v => upd('annualExpenses', v)} />
          <button onClick={expandExpenses} style={{
            fontSize: 12, color: 'var(--text-4)', marginTop: -8, marginBottom: 16,
            background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block',
          }}>↓ Break down into monthly line items</button>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SectionLabel>Monthly Expenses</SectionLabel>
            <button onClick={collapseExpenses} style={{ fontSize: 11, color: 'var(--text-4)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              ↑ Use single total
            </button>
          </div>
          {items.map(item => {
            const annualEquiv = item.frequency === 'monthly' ? item.amount * 12 : item.amount;
            return (
              <div key={item.id} style={{ background: 'var(--inset)', borderRadius: 10, padding: '10px 12px', marginBottom: 8, border: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <input value={item.label} onChange={e => updateItem(item.id, { label: e.target.value })}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13, fontWeight: 600 }} />
                  <button onClick={() => removeItem(item.id)}
                    style={{ color: 'var(--text-5)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '6px 10px' }}>
                    <span style={{ color: 'var(--text-4)', fontSize: 12, marginRight: 4 }}>S$</span>
                    <input type="number" value={item.amount} onChange={e => updateItem(item.id, { amount: Number(e.target.value) || 0 })}
                      style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13, width: '100%' }} />
                  </div>
                  {/* Frequency toggle */}
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                    {(['monthly', 'annual'] as const).map(f => (
                      <button key={f} onClick={() => updateItem(item.id, { frequency: f })} style={{
                        fontSize: 11, padding: '6px 8px', border: 'none', cursor: 'pointer',
                        background: item.frequency === f ? 'var(--border-mid)' : 'var(--input-bg)',
                        color: item.frequency === f ? 'var(--text-1)' : 'var(--text-4)',
                        fontWeight: item.frequency === f ? 700 : 400,
                      }}>{f === 'monthly' ? '/mo' : '/yr'}</button>
                    ))}
                  </div>
                  {/* Category pill */}
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                    {(['fixed', 'variable'] as const).map(c => (
                      <button key={c} onClick={() => updateItem(item.id, { category: c })} style={{
                        fontSize: 11, padding: '6px 8px', border: 'none', cursor: 'pointer',
                        background: item.category === c ? (c === 'fixed' ? 'rgba(59,130,246,0.2)' : 'rgba(251,191,36,0.15)') : 'var(--input-bg)',
                        color: item.category === c ? (c === 'fixed' ? '#60a5fa' : '#fbbf24') : 'var(--text-4)',
                        fontWeight: item.category === c ? 700 : 400,
                      }}>{c === 'fixed' ? 'Fixed' : 'Var'}</button>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 4, textAlign: 'right' }}>= S${annualEquiv.toLocaleString()}/yr</div>
              </div>
            );
          })}
          <button onClick={addItem} style={{
            width: '100%', padding: '8px 0', fontSize: 12, color: '#34d399',
            border: '1px dashed rgba(52,211,153,0.4)', borderRadius: 8, background: 'none', cursor: 'pointer', marginBottom: 6,
          }}>+ Add expense</button>
          <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
            Total: S${expenseTotal.toLocaleString()}/yr
          </div>
        </div>
      )}

      <SliderField label="Salary Growth Rate" value={inputs.income.salaryGrowthRate} min={0} max={10} step={0.5} unit="%"
        tip="Expected annual salary increase. Singapore median is ~3–4%."
        onChange={v => upd('salaryGrowthRate', v)} />

      <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 16, marginTop: 8 }}>
        <SectionLabel>Retirement</SectionLabel>
        <NumberField label="Retirement Expenses / Year" value={inputs.income.retirementExpenses} prefix="S$"
          tip="Expected annual spending in retirement, in today's dollars. Inflation will be applied."
          onChange={v => upd('retirementExpenses', v)} />
      </div>

      <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 16, marginTop: 8 }}>
        <SectionLabel>FIRE Target Settings</SectionLabel>
        <SliderField label="Inflation Rate" value={inputs.income.inflationRate ?? 2.5} min={0} max={6} step={0.5} unit="%"
          tip="Annual inflation erodes purchasing power. Singapore MAS target ~2%. Higher rate increases your FIRE Number."
          onChange={v => upd('inflationRate', v)} />
        <SliderField label="Safe Withdrawal Rate" value={inputs.income.withdrawalRate} min={2} max={5} step={0.5} unit="%"
          tip="% of portfolio withdrawn per year in retirement. FIRE Number = Retirement Expenses ÷ SWR. 3.5% is conservative for Singapore."
          onChange={v => upd('withdrawalRate', v)} />
      </div>
    </div>
  );
}

function AssetsSection({ inputs, onChange }: { inputs: FireInputs; onChange: (i: FireInputs) => void }) {
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

      {/* ── Investment buckets ── */}
      {buckets.length === 0 ? (
        <div>
          <NumberField label="Investments / Equities" value={inputs.assets.investments} prefix="S$"
            tip="Current value of your investment portfolio — stocks, ETFs, unit trusts, REITs, etc."
            onChange={v => updAssets('investments', v)} />
          <NumberField label="Annual Investment Contribution" value={inputs.income.annualInvestmentContribution} prefix="S$"
            tip="How much you actively invest each year. Remaining surplus goes to cash savings."
            onChange={v => onChange({ ...inputs, income: { ...inputs.income, annualInvestmentContribution: v } })} />
          <SliderField label="Investment Return Rate" value={inputs.assets.investmentReturnRate} min={0} max={20} step={0.5} unit="%"
            tip="Expected annual return on equities. Global diversified ETFs average ~7% historically."
            onChange={v => updAssets('investmentReturnRate', v)} />
          <button onClick={expandBuckets} style={{
            fontSize: 12, color: 'var(--text-4)', marginTop: -8, marginBottom: 16,
            background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block',
          }}>↓ Break into investment buckets</button>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SectionLabel>Investment Portfolio</SectionLabel>
            <button onClick={collapseBuckets} style={{ fontSize: 11, color: 'var(--text-4)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              ↑ Use single total
            </button>
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
    </div>
  );
}

function InsuranceSection({ inputs, onChange, currentProfileId }: { inputs: FireInputs; onChange: (i: FireInputs) => void; currentProfileId?: string }) {
  const update = (policies: InsurancePolicy[]) => onChange({ ...inputs, policies });
  const upd = (id: string, field: keyof InsurancePolicy, val: string | number | null | FundAllocation[]) =>
    update(inputs.policies.map(p => p.id === id ? { ...p, [field]: val } : p));

  const [allProfiles, setAllProfiles] = React.useState<ClientProfile[]>([]);
  React.useEffect(() => {
    listProfiles().then(list => setAllProfiles(list.filter(p => p.id !== currentProfileId))).catch(() => {});
  }, [currentProfileId]);

  const addPolicy = () => update([...inputs.policies, {
    id: uid(), name: 'New Policy', policyType: 'whole-life',
    cashValue: 0, annualGrowthRate: 3,
    deathSumAssured: 0, tpdSumAssured: 0, eciSumAssured: 0, ciSumAssured: 0,
    premiumAmount: 0, premiumFrequency: 'monthly',
    premiumNextDueDate: null, premiumPaymentTerm: 'limited', premiumLimitedYears: 20,
    nomineeName: '', nomineeClientId: null,
    insurer: '', policyNumber: '', policyStatus: 'in-force' as const,
    commencementDate: null, maturityDate: null, fundAllocations: [],
  }]);

  const POLICY_TYPES = [
    { value: 'whole-life', label: 'Whole Life' },
    { value: 'term', label: 'Term' },
    { value: 'ilp', label: 'ILP (Investment-Linked)' },
    { value: 'endowment', label: 'Endowment' },
    { value: 'ci', label: 'Critical Illness (Standalone)' },
    { value: 'other', label: 'Other' },
  ];

  const FREQUENCIES = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'semi-annual', label: 'Semi-annual' },
    { value: 'annual', label: 'Annual' },
  ];

  return (
    <div>
      {inputs.policies.map(p => (
        <div key={p.id} style={{
          background: 'var(--inset)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '16px', marginBottom: 16, position: 'relative',
        }}>
          {/* Policy name + remove */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <input
              value={p.name}
              onChange={e => upd(p.id, 'name', e.target.value)}
              style={{
                flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                borderRadius: 8, padding: '7px 10px', fontSize: 14, fontWeight: 600,
                color: 'var(--text-1)', outline: 'none',
              }}
            />
            <button onClick={() => update(inputs.policies.filter(x => x.id !== p.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 16, padding: 4 }}
              title="Remove policy">✕</button>
          </div>

          <SelectField
            label="Policy Type"
            value={p.policyType}
            options={POLICY_TYPES}
            onChange={v => upd(p.id, 'policyType', v)}
          />

          {/* Policy management details */}
          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, marginTop: 4 }}>
            <SectionLabel>Policy Details</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              {/* Insurer */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>Insurer</label>
                <input
                  list={`insurer-list-${p.id}`}
                  value={p.insurer}
                  onChange={e => upd(p.id, 'insurer', e.target.value)}
                  placeholder="e.g. AIA, Prudential…"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                    borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                  }}
                />
                <datalist id={`insurer-list-${p.id}`}>
                  {['AIA', 'Prudential', 'Great Eastern', 'Income Insurance', 'Manulife', 'AXA', 'HSBC Life', 'Singlife', 'Tokio Marine', 'FWD', 'Sun Life'].map(i => (
                    <option key={i} value={i} />
                  ))}
                </datalist>
              </div>
              {/* Policy number */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>Policy Number</label>
                <input
                  value={p.policyNumber}
                  onChange={e => upd(p.id, 'policyNumber', e.target.value)}
                  placeholder="Contract / policy no."
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                    borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
            </div>
            {/* Status */}
            <SelectField
              label="Status"
              value={p.policyStatus}
              options={[
                { value: 'in-force', label: 'In Force' },
                { value: 'lapsed', label: 'Lapsed' },
                { value: 'surrendered', label: 'Surrendered' },
                { value: 'claimed', label: 'Claimed' },
                { value: 'matured', label: 'Matured' },
              ]}
              onChange={v => upd(p.id, 'policyStatus', v)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>Commencement Date</label>
                <input
                  type="date"
                  value={p.commencementDate ?? ''}
                  onChange={e => upd(p.id, 'commencementDate', e.target.value || null)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                    borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>
                  Maturity Date <span style={{ color: 'var(--text-5)', fontSize: 10 }}>(term / endowment)</span>
                </label>
                <input
                  type="date"
                  value={p.maturityDate ?? ''}
                  onChange={e => upd(p.id, 'maturityDate', e.target.value || null)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                    borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Premium section */}
          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, marginTop: 4 }}>
            <SectionLabel>Premium</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <NumberField label="Amount" value={p.premiumAmount} prefix="S$" small
                onChange={v => upd(p.id, 'premiumAmount', v)} />
              <SelectField label="Frequency" value={p.premiumFrequency} options={FREQUENCIES} small
                onChange={v => upd(p.id, 'premiumFrequency', v)} />
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>Next Due Date</label>
                <input
                  type="date"
                  value={p.premiumNextDueDate ?? ''}
                  onChange={e => upd(p.id, 'premiumNextDueDate', e.target.value || null)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                    borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              <SelectField label="Payment Term" value={p.premiumPaymentTerm} options={[
                { value: 'whole-life', label: 'Whole Life' },
                { value: 'limited', label: 'Limited Pay' },
              ]} small onChange={v => upd(p.id, 'premiumPaymentTerm', v)} />
            </div>
            {p.premiumPaymentTerm === 'limited' && (
              <NumberField label="Limited Pay Years" value={p.premiumLimitedYears} small
                onChange={v => upd(p.id, 'premiumLimitedYears', v)} />
            )}
          </div>

          {/* Coverage / Sum Assured */}
          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, marginTop: 4 }}>
            <SectionLabel>Coverage (Sum Assured)</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <NumberField label="☠️ Death" value={p.deathSumAssured} prefix="S$" small
                tip="Death benefit paid to beneficiaries. Used in the Death scenario."
                onChange={v => upd(p.id, 'deathSumAssured', v)} />
              <NumberField label="🦽 TPD" value={p.tpdSumAssured} prefix="S$" small
                tip="Total & Permanent Disability benefit."
                onChange={v => upd(p.id, 'tpdSumAssured', v)} />
              <NumberField label="⚡ ECI" value={p.eciSumAssured} prefix="S$" small
                tip="Early Critical Illness benefit — paid on early/intermediate stage diagnosis."
                onChange={v => upd(p.id, 'eciSumAssured', v)} />
              <NumberField label="🏥 Major CI" value={p.ciSumAssured} prefix="S$" small
                tip="Major Critical Illness benefit — paid on advanced/severe stage diagnosis."
                onChange={v => upd(p.id, 'ciSumAssured', v)} />
            </div>
          </div>

          {/* Cash Value */}
          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, marginTop: 4 }}>
            <SectionLabel>Cash Value</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <NumberField label="Current Value" value={p.cashValue} prefix="S$" small
                tip="Current surrender/cash value of the policy. Shown in the Insurance bar on the chart."
                onChange={v => upd(p.id, 'cashValue', v)} />
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>
                  Growth Rate
                </label>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.annualGrowthRate}% p.a.</span>
                </div>
                <input type="range" min={0} max={10} step={0.5} value={p.annualGrowthRate}
                  onChange={e => upd(p.id, 'annualGrowthRate', Number(e.target.value))}
                  style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Fund Allocations — ILP only */}
          {p.policyType === 'ilp' && (
            <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, marginTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <SectionLabel>Fund Allocations</SectionLabel>
                {(() => {
                  const total = (p.fundAllocations || []).reduce((s, f) => s + (f.percentage || 0), 0);
                  return total > 0 && (
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: Math.abs(total - 100) < 0.01 ? '#34d399' : '#fbbf24',
                    }}>
                      {total.toFixed(0)}% allocated
                    </span>
                  );
                })()}
              </div>
              {(p.fundAllocations || []).map((f, fi) => (
                <div key={fi} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Fund name (e.g. China Equity)"
                    value={f.fundName}
                    onChange={e => {
                      const allocs = [...(p.fundAllocations || [])];
                      allocs[fi] = { ...allocs[fi], fundName: e.target.value };
                      upd(p.id, 'fundAllocations', allocs);
                    }}
                    style={{
                      flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                      borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={f.percentage}
                      onChange={e => {
                        const allocs = [...(p.fundAllocations || [])];
                        allocs[fi] = { ...allocs[fi], percentage: Math.max(0, Math.min(100, Number(e.target.value))) };
                        upd(p.id, 'fundAllocations', allocs);
                      }}
                      style={{
                        width: 56, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                        borderRadius: 8, padding: '6px 8px', color: 'var(--text-1)', fontSize: 13,
                        outline: 'none', textAlign: 'right',
                      }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-4)' }}>%</span>
                  </div>
                  <button
                    onClick={() => {
                      const allocs = (p.fundAllocations || []).filter((_, i) => i !== fi);
                      upd(p.id, 'fundAllocations', allocs);
                    }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-5)', fontSize: 16,
                      cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0,
                    }}
                  >×</button>
                </div>
              ))}
              <button
                onClick={() => {
                  const allocs: FundAllocation[] = [...(p.fundAllocations || []), { fundName: '', percentage: 0 }];
                  upd(p.id, 'fundAllocations', allocs);
                }}
                style={{
                  marginTop: 4, background: 'none', border: '1px dashed var(--border-mid)',
                  borderRadius: 8, padding: '5px 12px', fontSize: 12, color: 'var(--text-4)',
                  cursor: 'pointer', width: '100%',
                }}
              >
                + Add Fund
              </button>
            </div>
          )}

          {/* Nomination */}
          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, marginTop: 4 }}>
            <SectionLabel>Nomination</SectionLabel>
            {/* Link to existing FIRE Station client */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>
                Link to FIRE Station client
              </label>
              <select
                value={p.nomineeClientId ?? ''}
                onChange={e => {
                  const val = e.target.value;
                  const linked = allProfiles.find(c => c.id === val);
                  upd(p.id, 'nomineeClientId', val || null);
                  if (linked) upd(p.id, 'nomineeName', linked.name);
                  if (!val) upd(p.id, 'nomineeName', '');
                }}
                style={{
                  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                  borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                }}
              >
                <option value="">— Not linked —</option>
                {allProfiles.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {/* Free-text nominee name */}
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>
                Nominee name {p.nomineeClientId && <span style={{ color: '#34d399', fontSize: 10 }}>(auto-filled from linked client)</span>}
              </label>
              <input
                value={p.nomineeName}
                onChange={e => upd(p.id, 'nomineeName', e.target.value)}
                placeholder="e.g. Spouse, Child..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                  borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                }}
              />
              {p.nomineeClientId && p.nomineeName && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: '#34d399' }}>●</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Linked to <strong style={{ color: 'var(--text-2)' }}>{p.nomineeName}</strong> in FIRE Station</span>
                  <button onClick={() => { upd(p.id, 'nomineeClientId', null); }}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-5)', fontSize: 11 }}>
                    Unlink
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      <button onClick={addPolicy}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 10,
          background: 'none', border: '1px dashed rgba(16, 185, 129, 0.4)',
          cursor: 'pointer', color: '#34d399', fontSize: 13, fontWeight: 600,
        }}>
        + Add Policy
      </button>
    </div>
  );
}

function PurchasesSection({ inputs, onChange }: { inputs: FireInputs; onChange: (i: FireInputs) => void }) {
  const update = (purchases: MajorPurchase[]) => onChange({ ...inputs, purchases });
  const upd = (id: string, field: keyof MajorPurchase, val: string | number) =>
    update(inputs.purchases.map(p => p.id === id ? { ...p, [field]: val } : p));

  const addPurchase = () => update([...inputs.purchases, {
    id: uid(), name: 'New Purchase', age: inputs.personal.currentAge + 5,
    lumpSum: 0, recurringCost: 0, recurringYears: 0, repeatEveryYears: 0,
  }]);

  const age = inputs.personal.currentAge;
  const PRESETS: { icon: string; label: string; purchase: Omit<MajorPurchase, 'id'> }[] = [
    { icon: '🏠', label: 'HDB Flat',  purchase: { name: 'HDB BTO Flat',          age: age + 3,  lumpSum: 400000, recurringCost: 0,     recurringYears: 0,  repeatEveryYears: 0 } },
    { icon: '🏙️', label: 'Condo',     purchase: { name: 'Private Condo',         age: age + 5,  lumpSum: 800000, recurringCost: 0,     recurringYears: 0,  repeatEveryYears: 0 } },
    { icon: '🔨', label: 'Reno',      purchase: { name: 'Home Renovation',       age: age + 3,  lumpSum: 60000,  recurringCost: 0,     recurringYears: 0,  repeatEveryYears: 0 } },
    { icon: '💍', label: 'Wedding',   purchase: { name: 'Wedding',               age: age + 2,  lumpSum: 30000,  recurringCost: 0,     recurringYears: 0,  repeatEveryYears: 0 } },
    { icon: '🚗', label: 'Car',       purchase: { name: 'Car (COE + Purchase)',  age: age + 2,  lumpSum: 120000, recurringCost: 0,     recurringYears: 0,  repeatEveryYears: 10 } },
    { icon: '👶', label: 'Child',     purchase: { name: 'Child',                age: age + 4,  lumpSum: 20000,  recurringCost: 15000, recurringYears: 20, repeatEveryYears: 0 } },
    { icon: '👴', label: 'Parents',   purchase: { name: "Parents' Support",      age: age + 10, lumpSum: 0,      recurringCost: 12000, recurringYears: 20, repeatEveryYears: 0 } },
  ];

  return (
    <div>
      {inputs.purchases.map(p => (
        <div key={p.id} style={{
          background: 'var(--inset)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px', marginBottom: 12, position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <input
              value={p.name}
              onChange={e => upd(p.id, 'name', e.target.value)}
              style={{
                flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                borderRadius: 8, padding: '7px 10px', fontSize: 13, fontWeight: 600,
                color: 'var(--text-1)', outline: 'none',
              }}
            />
            <button onClick={() => update(inputs.purchases.filter(x => x.id !== p.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 16, padding: 4 }}>✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <NumberField label="Age" value={p.age} small onChange={v => upd(p.id, 'age', v)} />
            <NumberField label="Lump Sum" value={p.lumpSum} prefix="S$" small
              tip="One-off payment at the specified age. Deducted from investments first, then cash."
              onChange={v => upd(p.id, 'lumpSum', v)} />
            <NumberField label="Recurring / yr" value={p.recurringCost} prefix="S$" small
              tip="Annual cost that recurs for a set number of years."
              onChange={v => upd(p.id, 'recurringCost', v)} />
            <NumberField label="For years" value={p.recurringYears} small
              tip="Number of years the recurring cost applies."
              onChange={v => upd(p.id, 'recurringYears', v)} />
            <NumberField label="Repeat every (yrs)" value={p.repeatEveryYears} small
              tip="If set, the lump sum repeats every N years (e.g. car renewal every 10 years). Set 0 for no repeat."
              onChange={v => upd(p.id, 'repeatEveryYears', v)} />
          </div>
        </div>
      ))}

      {/* Quick-add presets */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Quick add</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => update([...inputs.purchases, { id: uid(), ...p.purchase }])}
              style={{
                fontSize: 12, padding: '5px 12px', borderRadius: 20,
                background: 'var(--inset)', border: '1px solid var(--border)',
                color: 'var(--text-3)', cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#34d399'; (e.currentTarget as HTMLButtonElement).style.color = '#34d399'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={addPurchase}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 10,
          background: 'none', border: '1px dashed rgba(16, 185, 129, 0.4)',
          cursor: 'pointer', color: '#34d399', fontSize: 13, fontWeight: 600,
        }}>
        + Add Custom
      </button>
    </div>
  );
}

function EstatePlanningSection({ inputs, onChange }: { inputs: FireInputs; onChange: (i: FireInputs) => void }) {
  const ep = inputs.estatePlanning ?? { lpa: false, will: false };
  const upd = (field: 'lpa' | 'will', val: boolean) =>
    onChange({ ...inputs, estatePlanning: { ...ep, [field]: val } });

  const ToggleCard = ({ field, label, description, icon }: { field: 'lpa' | 'will'; label: string; description: string; icon: string }) => {
    const done = ep[field];
    return (
      <button
        onClick={() => upd(field, !done)}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          background: done ? 'rgba(16,185,129,0.1)' : 'var(--inset)',
          border: `2px solid ${done ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`,
          borderRadius: 12, padding: '18px 20px', marginBottom: 14,
          transition: 'all 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: done ? '#34d399' : 'var(--text-1)', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.5 }}>{description}</div>
          </div>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: done ? '#10b981' : 'var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: done ? '#fff' : 'var(--text-5)',
            transition: 'all 0.15s',
          }}>
            {done ? '✓' : '○'}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 20, lineHeight: 1.6 }}>
        Track whether this client has put their key estate planning documents in place.
        Click a card to toggle its status.
      </div>
      <ToggleCard
        field="lpa"
        label="Lasting Power of Attorney (LPA)"
        description="Authorises a trusted person to make decisions on the client's behalf if they lose mental capacity. Registered with the Office of the Public Guardian, Singapore."
        icon="⚖️"
      />
      <ToggleCard
        field="will"
        label="Will"
        description="A legal document specifying how the client's assets should be distributed after death. Without a Will, Singapore intestacy laws apply."
        icon="📜"
      />
    </div>
  );
}

function ActivitySection({ profile, onMetaChange }: {
  profile: ClientProfile | null | undefined;
  onMetaChange: (updates: Partial<Pick<ClientProfile, 'lastMeetingDate' | 'nextReviewDate' | 'notes'>>) => void;
}) {
  const lastMeeting = profile?.lastMeetingDate ?? '';
  const nextReview = profile?.nextReviewDate ?? '';
  const notes = profile?.notes ?? '';

  const daysSinceMeeting = lastMeeting ? Math.floor((Date.now() - new Date(lastMeeting).getTime()) / 86400000) : null;
  const reviewDate = nextReview ? new Date(nextReview) : null;
  const reviewOverdue = reviewDate ? reviewDate < new Date() : false;
  const daysUntilReview = reviewDate ? Math.ceil((reviewDate.getTime() - Date.now()) / 86400000) : null;

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 8, padding: '8px 12px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 20, lineHeight: 1.6 }}>
        Track client meetings, schedule reviews, and keep advisor notes. None of this affects financial calculations.
      </div>

      {/* Last Meeting */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
          Last Meeting Date
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="date" value={lastMeeting} onChange={e => onMetaChange({ lastMeetingDate: e.target.value || null })} style={inputStyle} />
          {daysSinceMeeting !== null && (
            <span style={{
              fontSize: 12, whiteSpace: 'nowrap', fontWeight: 600,
              color: daysSinceMeeting > 365 ? '#f87171' : daysSinceMeeting > 180 ? '#fbbf24' : '#34d399',
            }}>
              {daysSinceMeeting === 0 ? 'Today' : `${daysSinceMeeting} days ago`}
            </span>
          )}
        </div>
      </div>

      {/* Next Review */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
          Next Review Date
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="date" value={nextReview} onChange={e => onMetaChange({ nextReviewDate: e.target.value || null })} style={inputStyle} />
          {daysUntilReview !== null && (
            <span style={{
              fontSize: 12, whiteSpace: 'nowrap', fontWeight: 600,
              color: reviewOverdue ? '#f87171' : daysUntilReview <= 14 ? '#fbbf24' : '#34d399',
            }}>
              {reviewOverdue
                ? `Overdue by ${Math.abs(daysUntilReview)} days`
                : daysUntilReview === 0 ? 'Today'
                : `In ${daysUntilReview} days`}
            </span>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
          Advisor Notes
        </label>
        <textarea
          value={notes}
          onChange={e => onMetaChange({ notes: e.target.value })}
          placeholder="Client preferences, key concerns, action items, follow-ups…"
          rows={8}
          style={{
            ...inputStyle,
            resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
          }}
        />
      </div>
    </div>
  );
}

// ── Main EditModal ─────────────────────────────────────────────────────────────
const NAV: { key: Section; icon: string; label: string }[] = [
  { key: 'personal',  icon: '👤', label: 'Personal' },
  { key: 'income',    icon: '💰', label: 'Income & Expenses' },
  { key: 'assets',    icon: '🏦', label: 'Assets' },
  { key: 'insurance', icon: '🛡️', label: 'Insurance' },
  { key: 'purchases', icon: '🏠', label: 'Life Purchases' },
  { key: 'estate',    icon: '📋', label: 'Estate Planning' },
  { key: 'activity',  icon: '📅', label: 'Activity & Notes' },
];

export default function EditModal({ open, onClose, inputs, onChange, clientName, currentProfileId, profile, onProfileMetaChange }: Props) {
  const [activeSection, setActiveSection] = React.useState<Section>('personal');
  const activeSectionRef = React.useRef(activeSection);
  activeSectionRef.current = activeSection;

  // Close on Escape; arrow keys navigate sections
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const currentIdx = NAV.findIndex(n => n.key === activeSectionRef.current);
        const nextIdx = e.key === 'ArrowDown'
          ? (currentIdx + 1) % NAV.length
          : (currentIdx - 1 + NAV.length) % NAV.length;
        setActiveSection(NAV[nextIdx].key);
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  const isMobile = window.innerWidth < 768;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: isMobile ? 'stretch' : 'flex-start', justifyContent: 'center', paddingTop: isMobile ? 0 : '4vh' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: isMobile ? '100vw' : 900,
        maxWidth: isMobile ? '100vw' : 'calc(100vw - 32px)',
        maxHeight: isMobile ? '100dvh' : '92vh',
        height: isMobile ? '100dvh' : undefined,
        background: 'var(--surface)', borderRadius: isMobile ? 0 : 16,
        border: '1px solid var(--border)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Editing</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>{clientName || 'Client Details'}</div>
          </div>
          <button onClick={onClose}
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: 'var(--text-3)', fontSize: 14 }}>
            ✕ Close
          </button>
        </div>

        {/* Body: nav + content */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: isMobile ? 'column' : 'row' }}>
          {/* Nav — vertical on desktop, horizontal tabs on mobile */}
          {isMobile ? (
            <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', background: 'var(--deep)', flexShrink: 0, padding: '8px 8px 0' }}>
              {NAV.map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  style={{
                    flexShrink: 0, background: 'none', border: 'none',
                    borderBottom: activeSection === item.key ? '2px solid #34d399' : '2px solid transparent',
                    padding: '6px 12px 8px',
                    color: activeSection === item.key ? '#34d399' : 'var(--text-3)',
                    fontSize: 12, fontWeight: activeSection === item.key ? 600 : 400,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--border)', padding: '12px 8px', overflowY: 'auto', background: 'var(--deep)' }}>
              {NAV.map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  style={{
                    width: '100%', textAlign: 'left', background: activeSection === item.key ? 'rgba(16,185,129,0.12)' : 'none',
                    border: activeSection === item.key ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                    borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2,
                    color: activeSection === item.key ? '#34d399' : 'var(--text-2)',
                    fontSize: 13, fontWeight: activeSection === item.key ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (activeSection !== item.key) (e.currentTarget as HTMLButtonElement).style.background = 'var(--card)'; }}
                  onMouseLeave={e => { if (activeSection !== item.key) (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Right content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 16px' : '24px 28px' }}>
            {activeSection === 'personal'  && <PersonalSection inputs={inputs} onChange={onChange} />}
            {activeSection === 'income'    && <IncomeSection inputs={inputs} onChange={onChange} />}
            {activeSection === 'assets'    && <AssetsSection inputs={inputs} onChange={onChange} />}
            {activeSection === 'insurance' && <InsuranceSection inputs={inputs} onChange={onChange} currentProfileId={currentProfileId} />}
            {activeSection === 'purchases' && <PurchasesSection inputs={inputs} onChange={onChange} />}
            {activeSection === 'estate'    && <EstatePlanningSection inputs={inputs} onChange={onChange} />}
            {activeSection === 'activity'  && <ActivitySection profile={profile} onMetaChange={onProfileMetaChange ?? (() => {})} />}
          </div>
        </div>
      </div>
    </div>
  );
}

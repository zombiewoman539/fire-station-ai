import React from 'react';
import { FireInputs, InsurancePolicy, MajorPurchase, ExpenseLineItem, InvestmentBucket } from '../types';
import { formatSGD } from '../calculations';

interface Props {
  inputs: FireInputs;
  onChange: (inputs: FireInputs) => void;
}

let _nextId = 100;
const uid = () => String(++_nextId);

// ── InfoTip ──────────────────────────────────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  const [show, setShow] = React.useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const tipWidth = 230;
      const left = Math.min(rect.left, window.innerWidth - tipWidth - 8);
      setPos({ top: rect.bottom + 6, left: Math.max(8, left) });
    }
    setShow(true);
  };

  return (
    <span ref={ref} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <span
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        style={{ color: '#3b82f6', cursor: 'help', fontSize: 11, marginLeft: 3, userSelect: 'none' }}
      >ⓘ</span>
      {show && (
        <div style={{
          position: 'fixed', top: pos.top, left: pos.left, width: 230, zIndex: 99999,
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
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-400">
          {label}{tip && <InfoTip text={tip} />}
        </span>
        <span className="text-white font-semibold">
          {unit === '$' ? `S$${value.toLocaleString()}` : unit === '%' ? `${value}%` : value}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step || 1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full" />
    </div>
  );
}

// ── NumberField ───────────────────────────────────────────────────────────────
function NumberField({ label, value, prefix, tip, onChange }: {
  label: string; value: number; prefix?: string; tip?: string;
  onChange: (v: number) => void;
}) {
  const [displayValue, setDisplayValue] = React.useState(String(value));
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) setDisplayValue(String(value));
  }, [value, focused]);

  return (
    <div className="mb-3">
      <label className="text-xs text-gray-400 block mb-1">
        {label}{tip && <InfoTip text={tip} />}
      </label>
      <div className="flex items-center bg-gray-700 rounded-lg px-3 py-2 border border-gray-600 focus-within:border-emerald-500 transition-colors">
        {prefix && <span className="text-gray-400 text-sm mr-2 font-medium">{prefix}</span>}
        <input type="number" value={focused ? displayValue : value}
          onFocus={() => { setFocused(true); setDisplayValue(String(value)); }}
          onBlur={() => { setFocused(false); onChange(Number(displayValue) || 0); }}
          onChange={e => {
            setDisplayValue(e.target.value);
            const num = Number(e.target.value);
            if (!isNaN(num)) onChange(num);
          }}
          className="bg-transparent text-white text-sm w-full outline-none" />
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="mb-2">
      <button onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left py-2.5 px-1 text-xs font-bold text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors">
        <span>{title}</span>
        <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="pb-3 border-b border-gray-700/50">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function InputPanel({ inputs, onChange }: Props) {
  const update = <K extends keyof FireInputs>(key: K, val: FireInputs[K]) =>
    onChange({ ...inputs, [key]: val });

  const updatePersonal = (field: string, val: number) =>
    update('personal', { ...inputs.personal, [field]: val });
  const updateIncome = (field: string, val: number) =>
    update('income', { ...inputs.income, [field]: val });
  const updateAssets = (field: string, val: number) =>
    update('assets', { ...inputs.assets, [field]: val });

  const addPolicy = () => {
    update('policies', [...inputs.policies, {
      id: uid(), name: 'New Policy', policyType: 'whole-life' as const,
      cashValue: 0, annualGrowthRate: 3, deathSumAssured: 0, tpdSumAssured: 0, eciSumAssured: 0, ciSumAssured: 0,
      premiumAmount: 0, premiumFrequency: 'monthly' as const,
      premiumNextDueDate: null, premiumPaymentTerm: 'limited' as const, premiumLimitedYears: 20,
      nomineeName: '', nomineeClientId: null,
      insurer: '', policyNumber: '', policyStatus: 'in-force' as const,
      commencementDate: null, maturityDate: null, fundAllocations: [],
    }]);
  };
  const removePolicy = (id: string) => {
    update('policies', inputs.policies.filter(p => p.id !== id));
  };
  const updatePolicy = (id: string, field: keyof InsurancePolicy, val: string | number) => {
    update('policies', inputs.policies.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  // ── Expense line items ────────────────────────────────────────────────────────
  const addExpenseItem = () => {
    const newItem: ExpenseLineItem = {
      id: uid(), label: 'New expense', amount: 0, frequency: 'monthly', category: 'variable',
    };
    update('income', { ...inputs.income, expenseItems: [...inputs.income.expenseItems, newItem] });
  };
  const removeExpenseItem = (id: string) => {
    const remaining = inputs.income.expenseItems.filter(e => e.id !== id);
    const total = remaining.reduce((s, e) => s + (e.frequency === 'monthly' ? e.amount * 12 : e.amount), 0);
    update('income', { ...inputs.income, expenseItems: remaining, annualExpenses: total || inputs.income.annualExpenses });
  };
  const updateExpenseItem = (id: string, patch: Partial<ExpenseLineItem>) => {
    const items = inputs.income.expenseItems.map(e => e.id === id ? { ...e, ...patch } : e);
    const total = items.reduce((s, e) => s + (e.frequency === 'monthly' ? e.amount * 12 : e.amount), 0);
    update('income', { ...inputs.income, expenseItems: items, annualExpenses: total });
  };
  const expandExpenses = () => {
    // Seed with a single item matching the current total
    const seedItem: ExpenseLineItem = {
      id: uid(), label: 'Living expenses', amount: Math.round(inputs.income.annualExpenses / 12),
      frequency: 'monthly', category: 'variable',
    };
    update('income', { ...inputs.income, expenseItems: [seedItem] });
  };
  const collapseExpenses = () => {
    const total = inputs.income.expenseItems.reduce(
      (s, e) => s + (e.frequency === 'monthly' ? e.amount * 12 : e.amount), 0
    );
    update('income', { ...inputs.income, expenseItems: [], annualExpenses: total || inputs.income.annualExpenses });
  };

  // ── Investment buckets ────────────────────────────────────────────────────────
  const addBucket = () => {
    const newBucket: InvestmentBucket = {
      id: uid(), label: 'New investment', currentValue: 0, monthlyContribution: 0, annualReturnRate: 7,
    };
    update('assets', { ...inputs.assets, investmentBuckets: [...inputs.assets.investmentBuckets, newBucket] });
  };
  const removeBucket = (id: string) => {
    update('assets', { ...inputs.assets, investmentBuckets: inputs.assets.investmentBuckets.filter(b => b.id !== id) });
  };
  const updateBucket = (id: string, patch: Partial<InvestmentBucket>) => {
    update('assets', {
      ...inputs.assets,
      investmentBuckets: inputs.assets.investmentBuckets.map(b => b.id === id ? { ...b, ...patch } : b),
    });
  };
  const expandBuckets = () => {
    const seedBucket: InvestmentBucket = {
      id: uid(), label: 'Investments',
      currentValue: inputs.assets.investments,
      monthlyContribution: Math.round(inputs.income.annualInvestmentContribution / 12),
      annualReturnRate: inputs.assets.investmentReturnRate,
    };
    update('assets', { ...inputs.assets, investmentBuckets: [seedBucket] });
  };
  const collapseBuckets = () => {
    const buckets = inputs.assets.investmentBuckets;
    const totalVal = buckets.reduce((s, b) => s + b.currentValue, 0);
    const blendedRate = totalVal > 0
      ? buckets.reduce((s, b) => s + (b.currentValue / totalVal) * b.annualReturnRate, 0)
      : inputs.assets.investmentReturnRate;
    const totalMonthly = buckets.reduce((s, b) => s + b.monthlyContribution, 0);
    update('assets', { ...inputs.assets, investmentBuckets: [], investments: totalVal, investmentReturnRate: Math.round(blendedRate * 10) / 10 });
    update('income', { ...inputs.income, annualInvestmentContribution: totalMonthly * 12 });
  };

  // ── Purchases ─────────────────────────────────────────────────────────────────
  const addPurchase = () => {
    update('purchases', [...inputs.purchases, {
      id: uid(), name: 'New Purchase', age: inputs.personal.currentAge + 5,
      lumpSum: 0, recurringCost: 0, recurringYears: 0, repeatEveryYears: 0,
    }]);
  };
  const removePurchase = (id: string) => {
    update('purchases', inputs.purchases.filter(p => p.id !== id));
  };
  const updatePurchase = (id: string, field: keyof MajorPurchase, val: string | number) => {
    update('purchases', inputs.purchases.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const PURCHASE_PRESETS: { icon: string; name: string; purchase: Omit<MajorPurchase, 'id'> }[] = [
    { icon: '🏠', name: 'HDB Flat',   purchase: { name: 'HDB BTO Flat',            age: inputs.personal.currentAge + 3,  lumpSum: 400000, recurringCost: 0,     recurringYears: 0,  repeatEveryYears: 0 } },
    { icon: '🏙️', name: 'Condo',      purchase: { name: 'Private Condo',           age: inputs.personal.currentAge + 5,  lumpSum: 800000, recurringCost: 0,     recurringYears: 0,  repeatEveryYears: 0 } },
    { icon: '🔨', name: 'Reno',       purchase: { name: 'Home Renovation',         age: inputs.personal.currentAge + 3,  lumpSum: 60000,  recurringCost: 0,     recurringYears: 0,  repeatEveryYears: 0 } },
    { icon: '💍', name: 'Wedding',    purchase: { name: 'Wedding',                 age: inputs.personal.currentAge + 2,  lumpSum: 30000,  recurringCost: 0,     recurringYears: 0,  repeatEveryYears: 0 } },
    { icon: '🚗', name: 'Car',        purchase: { name: 'Car (COE + Purchase)',    age: inputs.personal.currentAge + 2,  lumpSum: 120000, recurringCost: 0,     recurringYears: 0,  repeatEveryYears: 10 } },
    { icon: '👶', name: 'Child',      purchase: { name: 'Child',                  age: inputs.personal.currentAge + 4,  lumpSum: 20000,  recurringCost: 15000, recurringYears: 20, repeatEveryYears: 0 } },
    { icon: '👴', name: 'Parents',    purchase: { name: "Parents' Support",        age: inputs.personal.currentAge + 10, lumpSum: 0,      recurringCost: 12000, recurringYears: 20, repeatEveryYears: 0 } },
  ];
  const addPreset = (preset: typeof PURCHASE_PRESETS[0]) => {
    update('purchases', [...inputs.purchases, { id: uid(), ...preset.purchase }]);
  };

  return (
    <>
      {/* Personal Details */}
      <Section title="Personal Details" defaultOpen={false}>
        <SliderField label="Current Age" value={inputs.personal.currentAge} min={18} max={70}
          tip="Your age today. The projection starts from this age."
          onChange={v => updatePersonal('currentAge', v)} />
        <SliderField label="Retirement Age" value={inputs.personal.retirementAge} min={40} max={80}
          tip="The age you plan to stop working. Income stops and retirement drawdown begins from this age."
          onChange={v => updatePersonal('retirementAge', v)} />
        <SliderField label="Life Expectancy" value={inputs.personal.lifeExpectancy} min={60} max={100}
          tip="How long the projection runs. Singapore's average life expectancy is ~84. Plan conservatively — 90–95 recommended."
          onChange={v => updatePersonal('lifeExpectancy', v)} />
      </Section>

      {/* Income & Expenses */}
      <Section title="Income & Expenses" defaultOpen={false}>
        <NumberField
          label="Annual Take-Home Income"
          value={inputs.income.annualIncome}
          prefix="S$"
          tip="Your annual take-home income after deductions and tax. This is the cash you actually receive to spend and invest."
          onChange={v => updateIncome('annualIncome', v)}
        />

        {/* ── Expense breakdown ── */}
        {inputs.income.expenseItems.length === 0 ? (
          <div>
            <NumberField
              label="Annual Living Expenses"
              value={inputs.income.annualExpenses}
              prefix="S$"
              tip="Your total yearly spend — housing, food, transport, lifestyle. Surplus after expenses is split between investments and cash savings."
              onChange={v => updateIncome('annualExpenses', v)}
            />
            <button onClick={expandExpenses} style={{
              fontSize: 11, color: 'var(--text-4)', marginTop: -6, marginBottom: 10,
              background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block',
            }}>
              ↓ Break down into monthly line items
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: 10 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Expenses</span>
              <button onClick={collapseExpenses} style={{
                fontSize: 10, color: 'var(--text-4)', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              }}>↑ Use single total</button>
            </div>
            {inputs.income.expenseItems.map(item => {
              const annualEquiv = item.frequency === 'monthly' ? item.amount * 12 : item.amount;
              return (
                <div key={item.id} style={{
                  background: 'var(--inset)', borderRadius: 8, padding: '8px 10px', marginBottom: 5,
                  border: '1px solid var(--border-soft)',
                }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                    <input
                      value={item.label}
                      onChange={e => updateExpenseItem(item.id, { label: e.target.value })}
                      style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        color: 'var(--text-1)', fontSize: 12, fontWeight: 600,
                      }}
                    />
                    <button onClick={() => removeExpenseItem(item.id)}
                      style={{ color: 'var(--text-5)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center" style={{
                      flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                      borderRadius: 6, padding: '4px 8px',
                    }}>
                      <span style={{ color: 'var(--text-4)', fontSize: 11, marginRight: 4 }}>S$</span>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={e => updateExpenseItem(item.id, { amount: Number(e.target.value) || 0 })}
                        style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 12, width: '100%' }}
                      />
                    </div>
                    {/* Frequency toggle */}
                    <div className="flex" style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      {(['monthly', 'annual'] as const).map(f => (
                        <button key={f} onClick={() => updateExpenseItem(item.id, { frequency: f })} style={{
                          fontSize: 10, padding: '4px 7px', border: 'none', cursor: 'pointer',
                          background: item.frequency === f ? 'var(--border-mid)' : 'var(--input-bg)',
                          color: item.frequency === f ? 'var(--text-1)' : 'var(--text-4)',
                          fontWeight: item.frequency === f ? 700 : 400,
                        }}>{f === 'monthly' ? '/mo' : '/yr'}</button>
                      ))}
                    </div>
                    {/* Category pill */}
                    <div className="flex" style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      {(['fixed', 'variable'] as const).map(c => (
                        <button key={c} onClick={() => updateExpenseItem(item.id, { category: c })} style={{
                          fontSize: 10, padding: '4px 7px', border: 'none', cursor: 'pointer',
                          background: item.category === c ? (c === 'fixed' ? 'rgba(59,130,246,0.25)' : 'rgba(251,191,36,0.2)') : 'var(--input-bg)',
                          color: item.category === c ? (c === 'fixed' ? '#60a5fa' : '#fbbf24') : 'var(--text-4)',
                          fontWeight: item.category === c ? 700 : 400,
                        }}>{c === 'fixed' ? 'Fixed' : 'Var'}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-5)', marginTop: 4, textAlign: 'right' }}>
                    = S${annualEquiv.toLocaleString()}/yr
                  </div>
                </div>
              );
            })}
            <button onClick={addExpenseItem} style={{
              width: '100%', padding: '5px 0', fontSize: 11, color: '#34d399',
              border: '1px dashed rgba(52,211,153,0.4)', borderRadius: 6,
              background: 'none', cursor: 'pointer', marginBottom: 4,
            }}>+ Add expense</button>
            <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginTop: 4 }}>
              Total: S${inputs.income.expenseItems.reduce((s, e) => s + (e.frequency === 'monthly' ? e.amount * 12 : e.amount), 0).toLocaleString()}/yr
            </div>
          </div>
        )}

        <NumberField
          label="Retirement Expenses / Year"
          value={inputs.income.retirementExpenses}
          prefix="S$"
          tip="Expected annual spending in retirement, in today's dollars. Rule of thumb: 70–80% of current expenses. Inflation will be applied to project the future cost."
          onChange={v => updateIncome('retirementExpenses', v)}
        />
        <SliderField label="Salary Growth Rate" value={inputs.income.salaryGrowthRate} min={0} max={10} step={0.5} unit="%"
          tip="Expected annual salary increase. Singapore median is ~3–4%."
          onChange={v => updateIncome('salaryGrowthRate', v)} />
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-soft)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-4)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FIRE Target Settings</div>
          <SliderField
            label="Inflation Rate"
            value={inputs.income.inflationRate ?? 2.5}
            min={0} max={6} step={0.5} unit="%"
            tip="Annual inflation erodes purchasing power over time. Singapore's MAS core inflation target is ~2%. Historical average CPI is 2–3%. A higher rate increases your FIRE Number by inflating what retirement expenses will cost in future dollars."
            onChange={v => updateIncome('inflationRate', v)}
          />
          <SliderField
            label="Safe Withdrawal Rate"
            value={inputs.income.withdrawalRate}
            min={2} max={5} step={0.5} unit="%"
            tip="The % of your portfolio you withdraw each year in retirement. FIRE Number = Retirement Expenses ÷ SWR. Lower = safer but needs more capital. 3.5% is conservative for Singapore (longer lifespan). 4% is the global Trinity Study standard."
            onChange={v => updateIncome('withdrawalRate', v)}
          />
        </div>
      </Section>

      {/* Assets */}
      <Section title="Assets" defaultOpen={false}>
        <NumberField
          label="Cash Savings"
          value={inputs.assets.cashSavings}
          prefix="S$"
          tip="Current cash in bank accounts, savings accounts, T-bills, SSBs. Earns the Cash Return Rate below."
          onChange={v => updateAssets('cashSavings', v)}
        />
        <SliderField label="Cash Return Rate" value={inputs.assets.cashReturnRate} min={0} max={5} step={0.25} unit="%"
          tip="Expected annual return on cash (e.g. high-yield savings, T-bills, SSBs). Singapore T-bills and SSBs currently yield ~3–3.5%. Default 1% assumes basic savings account."
          onChange={v => updateAssets('cashReturnRate', v)} />

        {/* ── Investment buckets ── */}
        {inputs.assets.investmentBuckets.length === 0 ? (
          <div>
            <NumberField
              label="Investments / Equities"
              value={inputs.assets.investments}
              prefix="S$"
              tip="Current value of your investment portfolio — stocks, ETFs, unit trusts, REITs, etc."
              onChange={v => updateAssets('investments', v)}
            />
            <NumberField
              label="Annual Investment Contribution"
              value={inputs.income.annualInvestmentContribution}
              prefix="S$"
              tip="How much you actively invest each year from your take-home pay. Any remaining surplus goes to cash savings."
              onChange={v => updateIncome('annualInvestmentContribution', v)}
            />
            <SliderField label="Investment Return Rate" value={inputs.assets.investmentReturnRate} min={0} max={20} step={0.5} unit="%"
              tip="Expected annual return on your investment portfolio. Global diversified ETFs have averaged ~7% historically."
              onChange={v => updateAssets('investmentReturnRate', v)} />
            <button onClick={expandBuckets} style={{
              fontSize: 11, color: 'var(--text-4)', marginTop: -6, marginBottom: 10,
              background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block',
            }}>
              ↓ Break into investment buckets
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: 10 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Investment Portfolio</span>
              <button onClick={collapseBuckets} style={{
                fontSize: 10, color: 'var(--text-4)', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              }}>↑ Use single total</button>
            </div>
            {inputs.assets.investmentBuckets.map(bucket => (
              <div key={bucket.id} style={{
                background: 'var(--inset)', borderRadius: 8, padding: '8px 10px', marginBottom: 5,
                border: '1px solid var(--border-soft)',
              }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                  <input
                    value={bucket.label}
                    onChange={e => updateBucket(bucket.id, { label: e.target.value })}
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      color: 'var(--text-1)', fontSize: 12, fontWeight: 600,
                    }}
                  />
                  <button onClick={() => removeBucket(bucket.id)}
                    style={{ color: 'var(--text-5)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text-4)', display: 'block', marginBottom: 3 }}>Current value</label>
                    <div className="flex items-center" style={{
                      background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 6, padding: '4px 8px',
                    }}>
                      <span style={{ color: 'var(--text-4)', fontSize: 10, marginRight: 3 }}>S$</span>
                      <input type="number" value={bucket.currentValue}
                        onChange={e => updateBucket(bucket.id, { currentValue: Number(e.target.value) || 0 })}
                        style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 11, width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text-4)', display: 'block', marginBottom: 3 }}>Monthly add</label>
                    <div className="flex items-center" style={{
                      background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 6, padding: '4px 8px',
                    }}>
                      <span style={{ color: 'var(--text-4)', fontSize: 10, marginRight: 3 }}>S$</span>
                      <input type="number" value={bucket.monthlyContribution}
                        onChange={e => updateBucket(bucket.id, { monthlyContribution: Number(e.target.value) || 0 })}
                        style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 11, width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text-4)', display: 'block', marginBottom: 3 }}>Return % p.a.</label>
                    <div className="flex items-center" style={{
                      background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 6, padding: '4px 8px',
                    }}>
                      <input type="number" value={bucket.annualReturnRate} step={0.5}
                        onChange={e => updateBucket(bucket.id, { annualReturnRate: Number(e.target.value) || 0 })}
                        style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 11, width: '100%' }} />
                      <span style={{ color: 'var(--text-4)', fontSize: 10, marginLeft: 2 }}>%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addBucket} style={{
              width: '100%', padding: '5px 0', fontSize: 11, color: '#34d399',
              border: '1px dashed rgba(52,211,153,0.4)', borderRadius: 6,
              background: 'none', cursor: 'pointer', marginBottom: 6,
            }}>+ Add investment</button>
            {(() => {
              const buckets = inputs.assets.investmentBuckets;
              const totalVal = buckets.reduce((s, b) => s + b.currentValue, 0);
              const blended = totalVal > 0
                ? buckets.reduce((s, b) => s + (b.currentValue / totalVal) * b.annualReturnRate, 0)
                : 0;
              const totalMonthly = buckets.reduce((s, b) => s + b.monthlyContribution, 0);
              return (
                <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right', lineHeight: 1.7 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>S${totalVal.toLocaleString()}</span> total &nbsp;·&nbsp;
                  <span style={{ fontWeight: 700, color: '#34d399' }}>{blended.toFixed(1)}%</span> blended &nbsp;·&nbsp;
                  +S${totalMonthly.toLocaleString()}/mo
                </div>
              );
            })()}
          </div>
        )}
      </Section>

      {/* Insurance Policies */}
      <Section title="Life Insurance Policies" defaultOpen={false}>
        {inputs.policies.map(p => (
          <div key={p.id} className="bg-gray-900/50 rounded-lg p-3 mb-2 relative border border-gray-700/50">
            <button onClick={() => removePolicy(p.id)}
              className="absolute top-2 right-2 text-gray-500 hover:text-red-400 transition-colors"
              style={{ fontSize: 11, lineHeight: 1 }}>✕</button>
            <input value={p.name}
              onChange={e => updatePolicy(p.id, 'name', e.target.value)}
              className="bg-transparent text-white text-sm font-medium w-4/5 outline-none mb-2 border-b border-gray-600 pb-1" />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Cash Value" value={p.cashValue} prefix="S$"
                tip="Current surrender/cash value of the policy. It grows at the Annual Growth Rate below and is shown in the Insurance bar on the chart."
                onChange={v => updatePolicy(p.id, 'cashValue', v)} />
              <SliderField label="Growth Rate" value={p.annualGrowthRate} min={0} max={10} step={0.5} unit="%"
                tip="Expected annual growth rate of the policy's cash value. Whole life and endowment policies typically project 3–5% p.a."
                onChange={v => updatePolicy(p.id, 'annualGrowthRate', v)} />
            </div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sum Assured</div>
              <div className="grid grid-cols-3 gap-2">
                <NumberField label="☠️ Death" value={p.deathSumAssured} prefix="S$"
                  tip="Death benefit paid to beneficiaries. In the Death scenario (What If panel), this lump sum is added to cash."
                  onChange={v => updatePolicy(p.id, 'deathSumAssured', v)} />
                <NumberField label="🦽 TPD" value={p.tpdSumAssured} prefix="S$"
                  tip="Total & Permanent Disability benefit. In the TPD scenario, this replaces future income."
                  onChange={v => updatePolicy(p.id, 'tpdSumAssured', v)} />
                <NumberField label="⚡ ECI" value={p.eciSumAssured} prefix="S$"
                  tip="Early Critical Illness benefit — paid on early/intermediate stage diagnosis."
                  onChange={v => updatePolicy(p.id, 'eciSumAssured', v)} />
                <NumberField label="🏥 Major CI" value={p.ciSumAssured} prefix="S$"
                  tip="Major Critical Illness benefit — paid on advanced/severe stage diagnosis."
                  onChange={v => updatePolicy(p.id, 'ciSumAssured', v)} />
              </div>
            </div>
          </div>
        ))}
        <button onClick={addPolicy}
          className="w-full py-2 mt-1 text-xs font-medium text-emerald-400 border border-dashed border-emerald-500/40 rounded-lg hover:bg-emerald-500/10 transition-colors">
          + Add Policy
        </button>
      </Section>

      {/* Major Life Purchases */}
      <Section title="Major Life Purchases" defaultOpen={false}>
        {inputs.purchases.map(p => (
          <div key={p.id} className="bg-gray-900/50 rounded-lg p-3 mb-2 relative border border-gray-700/50">
            <button onClick={() => removePurchase(p.id)}
              className="absolute top-2 right-2 text-gray-500 hover:text-red-400 transition-colors"
              style={{ fontSize: 11, lineHeight: 1 }}>✕</button>
            <input value={p.name}
              onChange={e => updatePurchase(p.id, 'name', e.target.value)}
              className="bg-transparent text-white text-sm font-medium w-4/5 outline-none mb-2 border-b border-gray-600 pb-1" />
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">Age</label>
                <input type="number" value={p.age}
                  onChange={e => updatePurchase(p.id, 'age', Number(e.target.value) || 0)}
                  className="bg-gray-700 border border-gray-600 text-white text-sm w-full rounded-md px-2.5 py-1.5 outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">
                  Lump Sum
                  <InfoTip text="One-off payment at the specified age. Deducted from investments first, then cash." />
                </label>
                <div className="flex items-center bg-gray-700 border border-gray-600 rounded-md px-2.5 py-1.5 focus-within:border-emerald-500 transition-colors">
                  <span className="text-gray-400 text-xs mr-1.5">S$</span>
                  <input type="number" value={p.lumpSum}
                    onChange={e => updatePurchase(p.id, 'lumpSum', Number(e.target.value) || 0)}
                    className="bg-transparent text-white text-sm w-full outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">
                  Recurring/yr
                  <InfoTip text="Annual cost that recurs for a set number of years. Added to living expenses each year it applies." />
                </label>
                <div className="flex items-center bg-gray-700 border border-gray-600 rounded-md px-2.5 py-1.5 focus-within:border-emerald-500 transition-colors">
                  <span className="text-gray-400 text-xs mr-1.5">S$</span>
                  <input type="number" value={p.recurringCost}
                    onChange={e => updatePurchase(p.id, 'recurringCost', Number(e.target.value) || 0)}
                    className="bg-transparent text-white text-sm w-full outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">
                  For years
                  <InfoTip text="Number of years the recurring cost applies, starting from the age above." />
                </label>
                <input type="number" value={p.recurringYears}
                  onChange={e => updatePurchase(p.id, 'recurringYears', Number(e.target.value) || 0)}
                  className="bg-gray-700 border border-gray-600 text-white text-sm w-full rounded-md px-2.5 py-1.5 outline-none focus:border-emerald-500 transition-colors" />
              </div>
            </div>
            {p.repeatEveryYears > 0 && (
              <div className="mt-2">
                <label className="text-xs text-gray-500 block mb-0.5">
                  Repeat every (years)
                  <InfoTip text="If set, the lump sum repeats every N years from the starting age (e.g. car renewal every 10 years)." />
                </label>
                <input type="number" value={p.repeatEveryYears}
                  onChange={e => updatePurchase(p.id, 'repeatEveryYears', Number(e.target.value) || 0)}
                  className="bg-gray-700 border border-gray-600 text-white text-sm w-full rounded-md px-2.5 py-1.5 outline-none focus:border-emerald-500 transition-colors" />
              </div>
            )}
          </div>
        ))}
        {/* Quick-add presets */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--text-5)', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick add</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {PURCHASE_PRESETS.map(p => (
              <button key={p.name} onClick={() => addPreset(p)} style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 20,
                background: 'var(--inset)', border: '1px solid var(--border)',
                color: 'var(--text-3)', cursor: 'pointer',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#34d399'; (e.currentTarget as HTMLButtonElement).style.color = '#34d399'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}
              >
                {p.icon} {p.name}
              </button>
            ))}
          </div>
        </div>
        <button onClick={addPurchase}
          className="w-full py-2 mt-1 text-xs font-medium text-emerald-400 border border-dashed border-emerald-500/40 rounded-lg hover:bg-emerald-500/10 transition-colors">
          + Add Custom
        </button>
      </Section>
    </>
  );
}

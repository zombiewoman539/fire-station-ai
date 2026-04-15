import React from 'react';
import { FireInputs, InsurancePolicy, MajorPurchase } from '../types';
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
      cashValue: 0, annualGrowthRate: 3, deathSumAssured: 0, tpdSumAssured: 0, ciSumAssured: 0,
      premiumAmount: 0, premiumFrequency: 'monthly' as const,
      premiumDueDay: 1, premiumPaymentTerm: 'whole-life' as const, premiumLimitedYears: 0,
    }]);
  };
  const removePolicy = (id: string) => {
    update('policies', inputs.policies.filter(p => p.id !== id));
  };
  const updatePolicy = (id: string, field: keyof InsurancePolicy, val: string | number) => {
    update('policies', inputs.policies.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

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
          tip="Your annual income after CPF deductions and tax. This is the cash you actually receive to spend and invest."
          onChange={v => updateIncome('annualIncome', v)}
        />
        <NumberField
          label="Annual Living Expenses"
          value={inputs.income.annualExpenses}
          prefix="S$"
          tip="Your total yearly spend — housing, food, transport, lifestyle. Surplus after expenses is split between investments (your contribution below) and cash savings."
          onChange={v => updateIncome('annualExpenses', v)}
        />
        <NumberField
          label="Annual Investment Contribution"
          value={inputs.income.annualInvestmentContribution}
          prefix="S$"
          tip="How much you actively invest each year from your take-home pay. Any remaining surplus goes to cash savings. Set to 0 if the client doesn't invest."
          onChange={v => updateIncome('annualInvestmentContribution', v)}
        />
        <SliderField label="Salary Growth Rate" value={inputs.income.salaryGrowthRate} min={0} max={10} step={0.5} unit="%"
          tip="Expected annual salary increase. Singapore median is ~3–4%."
          onChange={v => updateIncome('salaryGrowthRate', v)} />
        <NumberField
          label="Retirement Expenses / Year"
          value={inputs.income.retirementExpenses}
          prefix="S$"
          tip="Expected annual spending in retirement, in today's dollars. Rule of thumb: 70–80% of current expenses. Inflation will be applied to project the future cost."
          onChange={v => updateIncome('retirementExpenses', v)}
        />
        <NumberField
          label="Expected CPF LIFE Payout / Month"
          value={inputs.income.cpfLifeMonthlyPayout}
          prefix="S$"
          tip="Your estimated CPF LIFE monthly payout from age 65. Check your CPF statement or use the CPF Board calculator at cpf.gov.sg. Set to 0 if unsure — the plan will assume a fully self-funded retirement."
          onChange={v => updateIncome('cpfLifeMonthlyPayout', v)}
        />

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
          {inputs.income.cpfLifeMonthlyPayout > 0 && (
            <div style={{ background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: 8, padding: '8px 10px', marginTop: 4 }}>
              <div style={{ fontSize: 10, color: '#34d399', fontWeight: 600 }}>CPF LIFE offset active</div>
              <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>
                {formatSGD(inputs.income.cpfLifeMonthlyPayout * 12)}/yr from age 65 reduces the portfolio needed.
              </div>
            </div>
          )}
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
        <NumberField
          label="Investments / Equities"
          value={inputs.assets.investments}
          prefix="S$"
          tip="Current value of your investment portfolio — stocks, ETFs, unit trusts, REITs, etc. Earns the Investment Return Rate below."
          onChange={v => updateAssets('investments', v)}
        />
        <SliderField label="Investment Return Rate" value={inputs.assets.investmentReturnRate} min={0} max={15} step={0.5} unit="%"
          tip="Expected annual return on your equity/investment portfolio. Global diversified ETFs have averaged ~7% historically. In retirement, the model applies a 30% haircut (×0.7) for a more conservative drawdown assumption."
          onChange={v => updateAssets('investmentReturnRate', v)} />
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
                <NumberField label="🏥 CI" value={p.ciSumAssured} prefix="S$"
                  tip="Critical Illness benefit paid on diagnosis. In the CI scenario, this offsets treatment costs."
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
        <button onClick={addPurchase}
          className="w-full py-2 mt-1 text-xs font-medium text-emerald-400 border border-dashed border-emerald-500/40 rounded-lg hover:bg-emerald-500/10 transition-colors">
          + Add Purchase
        </button>
      </Section>
    </>
  );
}

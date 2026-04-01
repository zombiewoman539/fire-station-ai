import React from 'react';
import { FireInputs, InsurancePolicy, MajorPurchase } from '../types';

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
      // Try to keep tooltip within viewport
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
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: 8, padding: '8px 10px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.75)',
          fontSize: 11, color: '#94a3b8', lineHeight: 1.55,
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
    update('policies', [...inputs.policies, { id: uid(), name: 'New Policy', cashValue: 0, annualGrowthRate: 3, deathSumAssured: 0, tpdSumAssured: 0, ciSumAssured: 0 }]);
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
          label="Annual Gross Income"
          value={inputs.income.annualIncome}
          prefix="S$"
          tip="Your gross annual salary (before CPF deductions). Employee CPF (20% for age ≤55) is automatically deducted to get take-home pay. CPF contributions are capped at the OW ceiling — S$8,000/month (S$96,000/year) from Jan 2026."
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
          tip="Expected annual salary increase. Singapore median is ~3–4%. Your gross salary compounds at this rate each year, increasing your CPF contributions and investable surplus over time."
          onChange={v => updateIncome('salaryGrowthRate', v)} />
        <NumberField
          label="Retirement Expenses / Year"
          value={inputs.income.retirementExpenses}
          prefix="S$"
          tip="Expected annual spending in retirement. Rule of thumb: 70–80% of current expenses. This drives your FIRE Number — the portfolio size needed to sustain withdrawals indefinitely."
          onChange={v => updateIncome('retirementExpenses', v)}
        />

        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FIRE Target Settings</div>
          <SliderField
            label="Safe Withdrawal Rate"
            value={inputs.income.withdrawalRate}
            min={2} max={5} step={0.5} unit="%"
            tip="The % of your portfolio you withdraw each year in retirement. FIRE Number = Retirement Expenses ÷ SWR. Lower = safer but needs more capital. 3.5% is conservative for Singapore (longer lifespan). 4% is the global Trinity Study standard."
            onChange={v => updateIncome('withdrawalRate', v)}
          />
          <NumberField
            label="CPF LIFE Monthly Payout (est.)"
            value={inputs.income.cpfLifeMonthly}
            prefix="S$"
            tip="Estimated monthly CPF LIFE annuity you'll receive from age 65. This reduces the portfolio drawdown needed — the more CPF LIFE pays, the smaller your FIRE Number. Check your CPF statement for a projection, or estimate: Basic Plan ~S$1,200–1,600/month at Full Retirement Sum."
            onChange={v => updateIncome('cpfLifeMonthly', v)}
          />
        </div>
      </Section>

      {/* Assets */}
      <Section title="Assets" defaultOpen={false}>
        <NumberField
          label="Cash Savings"
          value={inputs.assets.cashSavings}
          prefix="S$"
          tip="Current cash in bank accounts, savings accounts, T-bills, SSBs. Earns the Cash Return Rate below. The model keeps a 6-month expense buffer in cash — surplus beyond that flows to investments."
          onChange={v => updateAssets('cashSavings', v)}
        />
        <SliderField label="Cash Return Rate" value={inputs.assets.cashReturnRate} min={0} max={5} step={0.25} unit="%"
          tip="Expected annual return on cash (e.g. high-yield savings, T-bills, SSBs). Singapore T-bills and SSBs currently yield ~3–3.5%. Default 1% assumes basic savings account."
          onChange={v => updateAssets('cashReturnRate', v)} />
        <NumberField
          label="Investments / Equities"
          value={inputs.assets.investments}
          prefix="S$"
          tip="Current value of your investment portfolio — stocks, ETFs, unit trusts, REITs, etc. Earns the Investment Return Rate below. All income surplus beyond the 6-month cash buffer is added here each year."
          onChange={v => updateAssets('investments', v)}
        />
        <SliderField label="Investment Return Rate" value={inputs.assets.investmentReturnRate} min={0} max={15} step={0.5} unit="%"
          tip="Expected annual return on your equity/investment portfolio. Global diversified ETFs (e.g. MSCI World) have averaged ~7% historically after inflation. In retirement, the model applies a 30% haircut (×0.7) for a more conservative drawdown assumption."
          onChange={v => updateAssets('investmentReturnRate', v)} />

        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CPF Balances</div>
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="OA (2.5%)" value={inputs.assets.cpfOA} prefix="S$"
              tip="Ordinary Account — earns 2.5% p.a. Used for housing, education and investment. Contributions are capped at the OA Withdrawal Limit for housing. Extra 1% interest on first S$20k of OA (part of the S$60k combined cap)."
              onChange={v => updateAssets('cpfOA', v)} />
            <NumberField label="SA (4%)" value={inputs.assets.cpfSA} prefix="S$"
              tip="Special Account — earns 4% p.a. Primarily locked for retirement. Extra 1% interest applies on the combined S$60k cap (first S$20k from OA, rest from SA+MA). Excess MA contributions (above BHS) overflow to SA."
              onChange={v => updateAssets('cpfSA', v)} />
            <NumberField label="MA (4%)" value={inputs.assets.cpfMA} prefix="S$"
              tip="MediSave Account — earns 4% p.a. Used for healthcare expenses and insurance premiums. Capped at the Basic Healthcare Sum (BHS): S$79,000 in 2026, growing ~3.5%/yr until you turn 65, then fixed. Any amount above BHS flows to SA."
              onChange={v => updateAssets('cpfMA', v)} />
          </div>
          <div style={{ fontSize: 9, color: '#4b5563', lineHeight: 1.4, marginTop: 4 }}>
            CPF interest rates are government-set. Extra 1% on first S$60k combined (OA capped at S$20k). All extra OA interest is credited to SA. MA capped at BHS — overflow → SA.
          </div>
        </div>
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
                tip="Current surrender/cash value of the policy. This is the amount accessible if the policy is surrendered. It grows at the Annual Growth Rate below and is shown in the Insurance bar on the chart."
                onChange={v => updatePolicy(p.id, 'cashValue', v)} />
              <SliderField label="Growth Rate" value={p.annualGrowthRate} min={0} max={10} step={0.5} unit="%"
                tip="Expected annual growth rate of the policy's cash value. Whole life and endowment policies typically project 3–5% p.a. (participating fund non-guaranteed returns)."
                onChange={v => updatePolicy(p.id, 'annualGrowthRate', v)} />
            </div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sum Assured</div>
              <div className="grid grid-cols-3 gap-2">
                <NumberField label="☠️ Death" value={p.deathSumAssured} prefix="S$"
                  tip="Death benefit paid to beneficiaries. In the Death scenario (What If panel), this lump sum is added to cash — replacing lost income for dependants."
                  onChange={v => updatePolicy(p.id, 'deathSumAssured', v)} />
                <NumberField label="🦽 TPD" value={p.tpdSumAssured} prefix="S$"
                  tip="Total & Permanent Disability benefit. Paid as a lump sum when the insured is permanently unable to work. In the TPD scenario, this replaces future income."
                  onChange={v => updatePolicy(p.id, 'tpdSumAssured', v)} />
                <NumberField label="🏥 CI" value={p.ciSumAssured} prefix="S$"
                  tip="Critical Illness benefit paid on diagnosis of a covered condition (e.g. cancer, heart attack, stroke). In the CI scenario, this is offset against estimated treatment costs to show your coverage gap."
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
                  <InfoTip text="One-off payment at the specified age. Deducted from investments first, then cash, then CPF OA as a last resort." />
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
                  <InfoTip text="Annual cost that recurs for a set number of years (e.g. school fees, car maintenance). Added to living expenses each year it applies." />
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

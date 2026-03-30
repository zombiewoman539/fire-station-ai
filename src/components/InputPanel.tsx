import React from 'react';
import { FireInputs, InsurancePolicy, MajorPurchase } from '../types';

interface Props {
  inputs: FireInputs;
  onChange: (inputs: FireInputs) => void;
}

let _nextId = 100;
const uid = () => String(++_nextId);

function SliderField({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-400">{label}</span>
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

function NumberField({ label, value, prefix, onChange }: {
  label: string; value: number; prefix?: string; onChange: (v: number) => void;
}) {
  const [displayValue, setDisplayValue] = React.useState(String(value));
  const [focused, setFocused] = React.useState(false);

  // Sync display when value changes externally (not while editing)
  React.useEffect(() => {
    if (!focused) setDisplayValue(String(value));
  }, [value, focused]);

  return (
    <div className="mb-3">
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
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
          <SliderField label="Current Age" value={inputs.personal.currentAge} min={18} max={70} onChange={v => updatePersonal('currentAge', v)} />
          <SliderField label="Retirement Age" value={inputs.personal.retirementAge} min={40} max={80} onChange={v => updatePersonal('retirementAge', v)} />
          <SliderField label="Life Expectancy" value={inputs.personal.lifeExpectancy} min={60} max={100} onChange={v => updatePersonal('lifeExpectancy', v)} />
        </Section>

        {/* Income & Expenses */}
        <Section title="Income & Expenses" defaultOpen={false}>
          <NumberField label="Annual Income" value={inputs.income.annualIncome} prefix="S$" onChange={v => updateIncome('annualIncome', v)} />
          <NumberField label="Annual Expenses" value={inputs.income.annualExpenses} prefix="S$" onChange={v => updateIncome('annualExpenses', v)} />
          <SliderField label="Salary Growth Rate" value={inputs.income.salaryGrowthRate} min={0} max={10} step={0.5} unit="%" onChange={v => updateIncome('salaryGrowthRate', v)} />
          <NumberField label="Retirement Expenses / Year" value={inputs.income.retirementExpenses} prefix="S$" onChange={v => updateIncome('retirementExpenses', v)} />
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FIRE Target Settings</div>
            <SliderField label="Safe Withdrawal Rate" value={inputs.income.withdrawalRate} min={2} max={5} step={0.5} unit="%" onChange={v => updateIncome('withdrawalRate', v)} />
            <div style={{ fontSize: 9, color: '#4b5563', lineHeight: 1.4, marginBottom: 8 }}>
              3.5% = conservative SG (longer lifespan). 4% = global standard (Trinity Study).
            </div>
            <NumberField label="CPF LIFE Monthly Payout (est.)" value={inputs.income.cpfLifeMonthly} prefix="S$" onChange={v => updateIncome('cpfLifeMonthly', v)} />
            <div style={{ fontSize: 9, color: '#4b5563', lineHeight: 1.4 }}>
              Estimated CPF LIFE annuity from age 65. Reduces portfolio drawdown needed. Check your CPF statement for projection.
            </div>
          </div>
        </Section>

        {/* Assets */}
        <Section title="Assets" defaultOpen={false}>
          <NumberField label="Cash Savings" value={inputs.assets.cashSavings} prefix="S$" onChange={v => updateAssets('cashSavings', v)} />
          <SliderField label="Cash Return Rate" value={inputs.assets.cashReturnRate} min={0} max={5} step={0.25} unit="%" onChange={v => updateAssets('cashReturnRate', v)} />
          <NumberField label="Investments / Equities" value={inputs.assets.investments} prefix="S$" onChange={v => updateAssets('investments', v)} />
          <SliderField label="Investment Return Rate" value={inputs.assets.investmentReturnRate} min={0} max={15} step={0.5} unit="%" onChange={v => updateAssets('investmentReturnRate', v)} />
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CPF Balances</div>
            <div className="grid grid-cols-3 gap-2">
              <NumberField label="OA (2.5%)" value={inputs.assets.cpfOA} prefix="S$" onChange={v => updateAssets('cpfOA', v)} />
              <NumberField label="SA (4%)" value={inputs.assets.cpfSA} prefix="S$" onChange={v => updateAssets('cpfSA', v)} />
              <NumberField label="MA (4%)" value={inputs.assets.cpfMA} prefix="S$" onChange={v => updateAssets('cpfMA', v)} />
            </div>
            <div style={{ fontSize: 9, color: '#4b5563', lineHeight: 1.4, marginTop: 4 }}>
              CPF interest rates are government-set. Extra interest applies on first S$60k combined. MA capped at BHS (S$79k in 2026), overflow goes to SA.
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
                  onChange={v => updatePolicy(p.id, 'cashValue', v)} />
                <SliderField label="Growth Rate" value={p.annualGrowthRate} min={0} max={10} step={0.5} unit="%"
                  onChange={v => updatePolicy(p.id, 'annualGrowthRate', v)} />
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sum Assured</div>
                <div className="grid grid-cols-3 gap-2">
                  <NumberField label="☠️ Death" value={p.deathSumAssured} prefix="S$"
                    onChange={v => updatePolicy(p.id, 'deathSumAssured', v)} />
                  <NumberField label="🦽 TPD" value={p.tpdSumAssured} prefix="S$"
                    onChange={v => updatePolicy(p.id, 'tpdSumAssured', v)} />
                  <NumberField label="🏥 CI" value={p.ciSumAssured} prefix="S$"
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
                  <label className="text-xs text-gray-500 block mb-0.5">Lump Sum</label>
                  <div className="flex items-center bg-gray-700 border border-gray-600 rounded-md px-2.5 py-1.5 focus-within:border-emerald-500 transition-colors">
                    <span className="text-gray-400 text-xs mr-1.5">S$</span>
                    <input type="number" value={p.lumpSum}
                      onChange={e => updatePurchase(p.id, 'lumpSum', Number(e.target.value) || 0)}
                      className="bg-transparent text-white text-sm w-full outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Recurring/yr</label>
                  <div className="flex items-center bg-gray-700 border border-gray-600 rounded-md px-2.5 py-1.5 focus-within:border-emerald-500 transition-colors">
                    <span className="text-gray-400 text-xs mr-1.5">S$</span>
                    <input type="number" value={p.recurringCost}
                      onChange={e => updatePurchase(p.id, 'recurringCost', Number(e.target.value) || 0)}
                      className="bg-transparent text-white text-sm w-full outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">For years</label>
                  <input type="number" value={p.recurringYears}
                    onChange={e => updatePurchase(p.id, 'recurringYears', Number(e.target.value) || 0)}
                    className="bg-gray-700 border border-gray-600 text-white text-sm w-full rounded-md px-2.5 py-1.5 outline-none focus:border-emerald-500 transition-colors" />
                </div>
              </div>
              {p.repeatEveryYears > 0 && (
                <div className="mt-2">
                  <label className="text-xs text-gray-500 block mb-0.5">Repeat every (years)</label>
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

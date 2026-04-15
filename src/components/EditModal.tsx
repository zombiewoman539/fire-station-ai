import React from 'react';
import { FireInputs, InsurancePolicy, MajorPurchase } from '../types';
import { formatSGD } from '../calculations';

interface Props {
  open: boolean;
  onClose: () => void;
  inputs: FireInputs;
  onChange: (inputs: FireInputs) => void;
  clientName?: string;
}

type Section = 'personal' | 'income' | 'assets' | 'insurance' | 'purchases';

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
  return (
    <div>
      <SliderField label="Current Age" value={inputs.personal.currentAge} min={18} max={70}
        tip="Your age today. The projection starts from this age."
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
  return (
    <div>
      <NumberField label="Annual Take-Home Income" value={inputs.income.annualIncome} prefix="S$"
        tip="Your annual income after CPF deductions and tax. This is the cash you actually receive."
        onChange={v => upd('annualIncome', v)} />
      <NumberField label="Annual Living Expenses" value={inputs.income.annualExpenses} prefix="S$"
        tip="Total yearly spend — housing, food, transport, lifestyle."
        onChange={v => upd('annualExpenses', v)} />
      <NumberField label="Annual Investment Contribution" value={inputs.income.annualInvestmentContribution} prefix="S$"
        tip="How much you actively invest each year. Remaining surplus goes to cash savings."
        onChange={v => upd('annualInvestmentContribution', v)} />
      <SliderField label="Salary Growth Rate" value={inputs.income.salaryGrowthRate} min={0} max={10} step={0.5} unit="%"
        tip="Expected annual salary increase. Singapore median is ~3–4%."
        onChange={v => upd('salaryGrowthRate', v)} />

      <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 16, marginTop: 8 }}>
        <SectionLabel>Retirement</SectionLabel>
        <NumberField label="Retirement Expenses / Year" value={inputs.income.retirementExpenses} prefix="S$"
          tip="Expected annual spending in retirement, in today's dollars. Inflation will be applied."
          onChange={v => upd('retirementExpenses', v)} />
        <NumberField label="Expected CPF LIFE Payout / Month" value={inputs.income.cpfLifeMonthlyPayout} prefix="S$"
          tip="Estimated CPF LIFE monthly payout from age 65. Check your CPF statement or use cpf.gov.sg calculator."
          onChange={v => upd('cpfLifeMonthlyPayout', v)} />
        {inputs.income.cpfLifeMonthlyPayout > 0 && (
          <div style={{ background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: 8, padding: '8px 10px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>CPF LIFE offset active</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
              {formatSGD(inputs.income.cpfLifeMonthlyPayout * 12)}/yr from age 65 reduces the portfolio needed.
            </div>
          </div>
        )}
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
  const upd = (field: string, v: number) => onChange({ ...inputs, assets: { ...inputs.assets, [field]: v } });
  return (
    <div>
      <NumberField label="Cash Savings" value={inputs.assets.cashSavings} prefix="S$"
        tip="Cash in bank accounts, savings accounts, T-bills, SSBs. Earns the Cash Return Rate."
        onChange={v => upd('cashSavings', v)} />
      <SliderField label="Cash Return Rate" value={inputs.assets.cashReturnRate} min={0} max={5} step={0.25} unit="%"
        tip="Expected annual return on cash (e.g. high-yield savings, T-bills, SSBs). Singapore T-bills ~3–3.5%."
        onChange={v => upd('cashReturnRate', v)} />
      <NumberField label="Investments / Equities" value={inputs.assets.investments} prefix="S$"
        tip="Current value of your investment portfolio — stocks, ETFs, unit trusts, REITs, etc."
        onChange={v => upd('investments', v)} />
      <SliderField label="Investment Return Rate" value={inputs.assets.investmentReturnRate} min={0} max={15} step={0.5} unit="%"
        tip="Expected annual return on equities. Global diversified ETFs average ~7% historically."
        onChange={v => upd('investmentReturnRate', v)} />
    </div>
  );
}

function InsuranceSection({ inputs, onChange }: { inputs: FireInputs; onChange: (i: FireInputs) => void }) {
  const update = (policies: InsurancePolicy[]) => onChange({ ...inputs, policies });
  const upd = (id: string, field: keyof InsurancePolicy, val: string | number) =>
    update(inputs.policies.map(p => p.id === id ? { ...p, [field]: val } : p));

  const addPolicy = () => update([...inputs.policies, {
    id: uid(), name: 'New Policy', policyType: 'whole-life',
    cashValue: 0, annualGrowthRate: 3,
    deathSumAssured: 0, tpdSumAssured: 0, ciSumAssured: 0,
    premiumAmount: 0, premiumFrequency: 'monthly',
    premiumDueDay: 1, premiumPaymentTerm: 'whole-life', premiumLimitedYears: 0,
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

          {/* Premium section */}
          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, marginTop: 4 }}>
            <SectionLabel>Premium</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <NumberField label="Amount" value={p.premiumAmount} prefix="S$" small
                onChange={v => upd(p.id, 'premiumAmount', v)} />
              <SelectField label="Frequency" value={p.premiumFrequency} options={FREQUENCIES} small
                onChange={v => upd(p.id, 'premiumFrequency', v)} />
              <NumberField label="Due Day (1–28)" value={p.premiumDueDay} small
                onChange={v => upd(p.id, 'premiumDueDay', Math.max(1, Math.min(28, v)))} />
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <NumberField label="☠️ Death" value={p.deathSumAssured} prefix="S$" small
                tip="Death benefit paid to beneficiaries. Used in the Death scenario."
                onChange={v => upd(p.id, 'deathSumAssured', v)} />
              <NumberField label="🦽 TPD" value={p.tpdSumAssured} prefix="S$" small
                tip="Total & Permanent Disability benefit."
                onChange={v => upd(p.id, 'tpdSumAssured', v)} />
              <NumberField label="🏥 CI" value={p.ciSumAssured} prefix="S$" small
                tip="Critical Illness benefit paid on diagnosis."
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

      <button onClick={addPurchase}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 10,
          background: 'none', border: '1px dashed rgba(16, 185, 129, 0.4)',
          cursor: 'pointer', color: '#34d399', fontSize: 13, fontWeight: 600,
        }}>
        + Add Purchase
      </button>
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
];

export default function EditModal({ open, onClose, inputs, onChange, clientName }: Props) {
  const [activeSection, setActiveSection] = React.useState<Section>('personal');

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '4vh' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 900, maxWidth: 'calc(100vw - 32px)', maxHeight: '92vh',
        background: 'var(--surface)', borderRadius: 16,
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
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Left nav */}
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

          {/* Right content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            {activeSection === 'personal'  && <PersonalSection inputs={inputs} onChange={onChange} />}
            {activeSection === 'income'    && <IncomeSection inputs={inputs} onChange={onChange} />}
            {activeSection === 'assets'    && <AssetsSection inputs={inputs} onChange={onChange} />}
            {activeSection === 'insurance' && <InsuranceSection inputs={inputs} onChange={onChange} />}
            {activeSection === 'purchases' && <PurchasesSection inputs={inputs} onChange={onChange} />}
          </div>
        </div>
      </div>
    </div>
  );
}

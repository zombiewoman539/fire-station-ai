import React from 'react';
import { FireInputs, ExpenseLineItem } from '../../types';
import { NumberField, SliderField, SectionLabel, DetailToggleButton } from '../FormFields';
import { uid } from '../../utils/uid';

export function IncomeSection({ inputs, onChange }: { inputs: FireInputs; onChange: (i: FireInputs) => void }) {
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

      {items.length === 0 ? (
        <NumberField label="Annual Living Expenses" value={inputs.income.annualExpenses} prefix="S$"
          tip="Total yearly spend — housing, food, transport, lifestyle."
          rightSlot={<DetailToggleButton icon="☰" label="Break into line items" onClick={expandExpenses} />}
          onChange={v => upd('annualExpenses', v)} />
      ) : (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SectionLabel>Monthly Expenses</SectionLabel>
            <DetailToggleButton icon="↑" label="Use single total" onClick={collapseExpenses} />
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

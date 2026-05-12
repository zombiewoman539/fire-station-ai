import React from 'react';
import { FireInputs, MajorPurchase } from '../../types';
import { NumberField } from '../FormFields';
import { uid } from '../../utils/uid';

export function PurchasesSection({ inputs, onChange }: { inputs: FireInputs; onChange: (i: FireInputs) => void }) {
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

          {(() => {
            const isHousing = /hdb|condo|flat|house|home|property|bto|apartment|reno/i.test(p.name);
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <NumberField label="Age" value={p.age} small onChange={v => upd(p.id, 'age', v)} />
                <NumberField label="Lump Sum" value={p.lumpSum} prefix="S$" small
                  tip="One-off payment at the specified age. Deducted from investments first, then cash."
                  onChange={v => upd(p.id, 'lumpSum', v)} />
                <NumberField label={isHousing ? 'Mortgage / yr' : 'Recurring / yr'} value={p.recurringCost} prefix="S$" small
                  tip={isHousing ? 'Annual mortgage repayment for this property.' : 'Annual cost that recurs for a set number of years.'}
                  onChange={v => upd(p.id, 'recurringCost', v)} />
                <NumberField label="For years" value={p.recurringYears} small
                  tip="Number of years the recurring cost applies."
                  onChange={v => upd(p.id, 'recurringYears', v)} />
                <NumberField label="Repeat every (yrs)" value={p.repeatEveryYears} small
                  tip="If set, the lump sum repeats every N years (e.g. car renewal every 10 years). Set 0 for no repeat."
                  onChange={v => upd(p.id, 'repeatEveryYears', v)} />
              </div>
            );
          })()}
        </div>
      ))}

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

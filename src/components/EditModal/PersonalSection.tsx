import React from 'react';
import { FireInputs } from '../../types';
import { SliderField } from '../FormFields';

export function PersonalSection({ inputs, onChange }: { inputs: FireInputs; onChange: (i: FireInputs) => void }) {
  const upd = (field: string, v: number) => onChange({ ...inputs, personal: { ...inputs.personal, [field]: v } });
  const updDob = (dob: string | null) => onChange({ ...inputs, personal: { ...inputs.personal, dateOfBirth: dob || null } });
  const updStr = (field: string, v: string) => onChange({ ...inputs, personal: { ...inputs.personal, [field]: v } });

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6, fontWeight: 600 }}>
            Phone Number
          </label>
          <input
            type="tel"
            value={inputs.personal.phoneNumber ?? ''}
            onChange={e => updStr('phoneNumber', e.target.value)}
            placeholder="+65 9XXX XXXX"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--input-bg)', border: '1px solid var(--input-border)',
              borderRadius: 8, padding: '7px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6, fontWeight: 600 }}>
            Gender
          </label>
          <select
            value={inputs.personal.gender ?? ''}
            onChange={e => updStr('gender', e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--input-bg)', border: '1px solid var(--input-border)',
              borderRadius: 8, padding: '7px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">— Not specified —</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
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

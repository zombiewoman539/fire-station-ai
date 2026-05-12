import React from 'react';
import { FireInputs, HospitalPlan } from '../../types';

const ISP_INSURERS = ['AIA', 'NTUC Income', 'HSBC Life', 'Great Eastern', 'Prudential', 'Raffles Health'];
const WARD_CLASSES: { value: HospitalPlan['ispWardClass']; label: string }[] = [
  { value: 'B1',      label: 'Class B1' },
  { value: 'A',       label: 'Class A' },
  { value: 'Private', label: 'Private' },
];

export function HospitalPlanSection({ inputs, onChange }: { inputs: FireInputs; onChange: (i: FireInputs) => void }) {
  const hp: HospitalPlan = inputs.hospitalPlan ?? {
    hasMediShieldLife: true, hasISP: false, ispInsurer: '', ispWardClass: '',
    hasRider: false, annualPremiumMedisave: 0, annualPremiumCash: 0,
  };
  const upd = (patch: Partial<HospitalPlan>) =>
    onChange({ ...inputs, hospitalPlan: { ...hp, ...patch } });

  const fieldLabel: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 5,
  };
  const fieldInput: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)',
    border: '1px solid var(--input-border)', borderRadius: 8,
    padding: '7px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
  };
  const toggle = (active: boolean, label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 4, border: '2px solid',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderColor: active ? '#10b981' : 'var(--border)',
        background: active ? '#10b981' : 'transparent',
        flexShrink: 0,
      }}>
        {active && <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>✓</span>}
      </span>
      <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
    </button>
  );

  return (
    <div style={{
      background: 'var(--inset)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '18px 18px', marginBottom: 24,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>
        🏥 Hospital Plan
      </div>

      <div style={{ marginBottom: 14 }}>
        {toggle(hp.hasMediShieldLife, 'MediShield Life (mandatory for SC / PR)', () => upd({ hasMediShieldLife: !hp.hasMediShieldLife }))}
        <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 4, marginLeft: 26 }}>
          Government base plan — premiums deducted from Medisave automatically
        </div>
      </div>

      <div style={{ marginBottom: hp.hasISP ? 16 : 0 }}>
        {toggle(hp.hasISP, 'Has Integrated Shield Plan (ISP)', () => upd({ hasISP: !hp.hasISP, ...(hp.hasISP ? { ispInsurer: '', ispWardClass: '', hasRider: false } : {}) }))}
      </div>

      {hp.hasISP && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14, marginLeft: 26 }}>
            <div>
              <label style={fieldLabel}>Insurer</label>
              <select value={hp.ispInsurer} onChange={e => upd({ ispInsurer: e.target.value })} style={fieldInput}>
                <option value="">— Select —</option>
                {ISP_INSURERS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Ward Class</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {WARD_CLASSES.map(w => (
                  <button key={w.value} type="button" onClick={() => upd({ ispWardClass: w.value })} style={{
                    flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', border: '1px solid',
                    background: hp.ispWardClass === w.value ? 'rgba(96,165,250,0.12)' : 'transparent',
                    color: hp.ispWardClass === w.value ? '#60a5fa' : 'var(--text-4)',
                    borderColor: hp.ispWardClass === w.value ? 'rgba(96,165,250,0.4)' : 'var(--border)',
                  }}>{w.label}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16, marginLeft: 26 }}>
            {toggle(hp.hasRider, 'Has Rider (co-payment waiver — eliminates out-of-pocket costs)', () => upd({ hasRider: !hp.hasRider }))}
            <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 4, marginLeft: 26 }}>
              Rider premiums must be paid in cash (not Medisave)
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginLeft: 26 }}>
            <div>
              <label style={fieldLabel}>Annual Medisave Premium (S$)</label>
              <input
                type="number" min={0} value={hp.annualPremiumMedisave > 0 ? hp.annualPremiumMedisave : ''}
                onChange={e => upd({ annualPremiumMedisave: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                style={fieldInput}
              />
              <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 3 }}>ISP base — from MA</div>
            </div>
            <div>
              <label style={fieldLabel}>Annual Cash Premium (S$)</label>
              <input
                type="number" min={0} value={hp.annualPremiumCash > 0 ? hp.annualPremiumCash : ''}
                onChange={e => upd({ annualPremiumCash: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                style={fieldInput}
              />
              <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 3 }}>Rider + excess — out of pocket</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

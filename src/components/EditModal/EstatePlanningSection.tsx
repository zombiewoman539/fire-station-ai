import React from 'react';
import { FireInputs } from '../../types';

export function EstatePlanningSection({ inputs, onChange }: { inputs: FireInputs; onChange: (i: FireInputs) => void }) {
  const ep = inputs.estatePlanning ?? { lpa: false, will: false };
  const upd = (field: 'lpa' | 'will', val: boolean) =>
    onChange({ ...inputs, estatePlanning: { ...ep, [field]: val } });
  const updText = (field: 'lpaDonee1' | 'lpaDonee2' | 'lpaReplacementDonee', val: string) =>
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
        description="Authorises trusted persons to make decisions on the client's behalf if they lose mental capacity. Registered with the Office of the Public Guardian, Singapore."
        icon="⚖️"
      />
      {ep.lpa && (
        <div style={{
          marginTop: -8, marginBottom: 14, padding: '14px 16px',
          background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)',
          borderTop: 'none', borderRadius: '0 0 12px 12px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Donees (up to 2) + Replacement Donee
          </div>
          {(['lpaDonee1', 'lpaDonee2'] as const).map((field, i) => (
            <div key={field} style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>
                Donee {i + 1}{i === 0 ? '' : ' (optional)'}
              </label>
              <input
                value={ep[field] ?? ''}
                onChange={e => updText(field, e.target.value)}
                placeholder={`Donee ${i + 1} full name`}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                  borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                }}
              />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>
              Replacement Donee (optional)
            </label>
            <input
              value={ep.lpaReplacementDonee ?? ''}
              onChange={e => updText('lpaReplacementDonee', e.target.value)}
              placeholder="Replacement donee full name"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
              }}
            />
          </div>
        </div>
      )}
      <ToggleCard
        field="will"
        label="Will"
        description="A legal document specifying how the client's assets should be distributed after death. Without a Will, Singapore intestacy laws apply."
        icon="📜"
      />
    </div>
  );
}

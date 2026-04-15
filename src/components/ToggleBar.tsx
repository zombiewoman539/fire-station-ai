import React from 'react';
import { FireInputs } from '../types';

interface Props {
  inputs: FireInputs;
  excludedIds: Set<string>;
  onToggle: (id: string) => void;
}

interface PillProps {
  label: string;
  included: boolean;
  color: string;
  onToggle: () => void;
}

function Pill({ label, included, color, onToggle }: PillProps) {
  return (
    <button
      onClick={onToggle}
      title={included ? `Exclude "${label}" from projection` : `Include "${label}" in projection`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 9px', borderRadius: 20,
        background: included ? `${color}18` : 'transparent',
        border: `1px solid ${included ? color : 'var(--border)'}`,
        color: included ? color : 'var(--text-4)',
        fontSize: 11, fontWeight: included ? 600 : 400,
        cursor: 'pointer', whiteSpace: 'nowrap',
        textDecoration: included ? 'none' : 'line-through',
        opacity: included ? 1 : 0.55,
        transition: 'all 0.15s',
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: included ? color : 'var(--text-5)',
        flexShrink: 0,
      }} />
      {label}
    </button>
  );
}

export default function ToggleBar({ inputs, excludedIds, onToggle }: Props) {
  const hasPurchases = inputs.purchases.length > 0;
  const hasPolicies = inputs.policies.length > 0;

  if (!hasPurchases && !hasPolicies) return null;

  return (
    <div style={{
      padding: '6px 16px 7px',
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
      flexShrink: 0,
    }}>
      {hasPurchases && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>
            Purchases
          </span>
          {inputs.purchases.map(p => (
            <Pill
              key={p.id}
              label={p.name}
              included={!excludedIds.has(p.id)}
              color="#f87171"
              onToggle={() => onToggle(p.id)}
            />
          ))}
        </div>
      )}

      {hasPurchases && hasPolicies && (
        <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />
      )}

      {hasPolicies && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>
            Policies
          </span>
          {inputs.policies.map(p => (
            <Pill
              key={p.id}
              label={p.name}
              included={!excludedIds.has(p.id)}
              color="#f472b6"
              onToggle={() => onToggle(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

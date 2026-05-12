import React from 'react';

// ── InfoTip ───────────────────────────────────────────────────────────────────
export function InfoTip({ text }: { text: string }) {
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
export function SliderField({ label, value, min, max, step, unit, tip, onChange }: {
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
export function NumberField({ label, value, prefix, tip, small, onChange }: {
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
          onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13, width: '100%' }} />
      </div>
    </div>
  );
}

// ── SelectField ───────────────────────────────────────────────────────────────
export function SelectField({ label, value, options, small, onChange }: {
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

// ── SectionLabel ──────────────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, marginTop: 4 }}>
      {children}
    </div>
  );
}

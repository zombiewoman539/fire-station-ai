import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

const VARIANT_STYLES: Record<Variant, React.CSSProperties> = {
  primary:   { background: '#10b981', color: '#fff', border: 'none' },
  secondary: { background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)' },
  danger:    { background: '#b91c1c', color: '#fff', border: 'none' },
  ghost:     { background: 'none', color: 'var(--text-3)', border: 'none' },
};

const SIZE_STYLES: Record<Size, React.CSSProperties> = {
  sm: { padding: '5px 12px', fontSize: 12, borderRadius: 7 },
  md: { padding: '7px 14px', fontSize: 13, borderRadius: 8 },
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({ variant = 'secondary', size = 'md', loading, disabled, children, style, ...rest }: ButtonProps) {
  return (
    <button
      disabled={loading || disabled}
      style={{
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        fontWeight: 600, cursor: (loading || disabled) ? 'not-allowed' : 'pointer',
        opacity: (loading || disabled) ? 0.7 : 1,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        ...style,
      }}
      {...rest}
    >
      {loading ? 'Loading…' : children}
    </button>
  );
}

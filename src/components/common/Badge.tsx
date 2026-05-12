import React from 'react';

type BadgeColor = 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray';

const COLOR_STYLES: Record<BadgeColor, React.CSSProperties> = {
  green:  { background: 'rgba(52,211,153,0.15)',  color: '#34d399',  border: '1px solid rgba(52,211,153,0.3)' },
  red:    { background: 'rgba(248,113,113,0.15)', color: '#f87171',  border: '1px solid rgba(248,113,113,0.3)' },
  yellow: { background: 'rgba(251,191,36,0.15)',  color: '#fbbf24',  border: '1px solid rgba(251,191,36,0.3)' },
  blue:   { background: 'rgba(96,165,250,0.15)',  color: '#60a5fa',  border: '1px solid rgba(96,165,250,0.3)' },
  purple: { background: 'rgba(129,140,248,0.15)', color: '#818cf8',  border: '1px solid rgba(129,140,248,0.3)' },
  gray:   { background: 'var(--card)',             color: 'var(--text-3)', border: '1px solid var(--border)' },
};

interface BadgeProps {
  color?: BadgeColor;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Badge({ color = 'gray', children, style }: BadgeProps) {
  return (
    <span style={{
      ...COLOR_STYLES[color],
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
      ...style,
    }}>
      {children}
    </span>
  );
}

import React from 'react';

type Status = 'idle' | 'saving' | 'saved' | 'error' | 'loading';

const STATUS_CONFIG: Record<Exclude<Status, 'idle'>, { label: string; color: string; dot: string }> = {
  saving:  { label: 'Saving…',          color: 'var(--text-4)', dot: '#fbbf24' },
  saved:   { label: 'All changes saved', color: '#34d399',       dot: '#34d399' },
  error:   { label: 'Save failed',       color: '#f87171',       dot: '#f87171' },
  loading: { label: 'Loading…',          color: 'var(--text-4)', dot: '#60a5fa' },
};

export function StatusPill({ status }: { status: Status }) {
  if (status === 'idle') return null;
  const { label, color, dot } = STATUS_CONFIG[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color, fontWeight: 500 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

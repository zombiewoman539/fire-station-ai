import React from 'react';
import { useToast } from '../contexts/ToastContext';

const ACCENT: Record<string, string> = {
  error:   '#f87171',
  info:    '#60a5fa',
  success: '#34d399',
};

export default function Toast() {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 9999, maxWidth: 380, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderLeft: `4px solid ${ACCENT[t.type]}`,
          borderRadius: 10,
          padding: '11px 14px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          pointerEvents: 'auto',
          animation: 'toast-in 0.18s ease-out',
        }}>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
            {t.message}
          </span>
          <button
            onClick={() => dismiss(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-4)', fontSize: 18, lineHeight: 1,
              padding: '0 2px', flexShrink: 0, marginTop: -1,
            }}
            aria-label="Dismiss"
          >×</button>
        </div>
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

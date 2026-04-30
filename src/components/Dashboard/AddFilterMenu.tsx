import React from 'react';
import { FilterChip } from '../../savedViewsTypes';
import { FILTER_FIELDS, FilterFieldMeta } from './filterMeta';

function newChipId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `chip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface Props {
  dashboardKind: 'advisor' | 'manager';
  onPick: (chip: FilterChip) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
}

export default function AddFilterMenu({ dashboardKind, onPick, onClose, anchorRect }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [onClose]);

  const fields = FILTER_FIELDS.filter(f => dashboardKind === 'manager' ? true : !f.managerOnly);
  const groups: Record<string, FilterFieldMeta[]> = {};
  for (const f of fields) {
    if (!groups[f.group]) groups[f.group] = [];
    groups[f.group].push(f);
  }

  const top = anchorRect ? anchorRect.bottom + 6 : 80;
  const left = anchorRect ? anchorRect.left : 80;

  const handlePick = (meta: FilterFieldMeta) => {
    const def = meta.defaultChip();
    onPick({ id: newChipId(), ...def });
    onClose();
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', top, left, zIndex: 200,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
        padding: 6, minWidth: 220, maxHeight: '70vh', overflowY: 'auto',
      }}
    >
      {Object.entries(groups).map(([group, items]) => (
        <div key={group} style={{ padding: '4px 0' }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--text-4)',
            padding: '6px 10px',
          }}>
            {group}
          </div>
          {items.map(meta => (
            <button
              key={meta.field}
              type="button"
              onClick={() => handlePick(meta)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '7px 10px', borderRadius: 6,
                fontSize: 13, color: 'var(--text-1)',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--inset)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
            >
              {meta.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

import React from 'react';
import { ColumnSet } from '../../savedViewsTypes';
import { COLUMNS_BY_SET } from './ClientTable';

interface Props {
  columnSet: ColumnSet;
  /** Current visible columns for this view. undefined = all columns shown (default). */
  visibleColumns: string[] | undefined;
  onChange: (next: string[] | undefined) => void;
}

export default function ColumnPicker({ columnSet, visibleColumns, onChange }: Props) {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = React.useState<{ top: number; left: number } | null>(null);

  const cols = COLUMNS_BY_SET[columnSet];

  const visibleSet = React.useMemo(() => {
    // undefined visibleColumns means "all visible". Materialize that for checkbox state.
    return new Set(visibleColumns ?? cols.map(c => c.id));
  }, [visibleColumns, cols]);

  const openPopover = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPos({ top: rect.bottom + 6, left: Math.max(8, rect.right - 220) });
    }
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const toggle = (id: string) => {
    const def = cols.find(c => c.id === id);
    if (def?.required) return; // can't hide required columns

    const current = new Set(visibleColumns ?? cols.map(c => c.id));
    if (current.has(id)) current.delete(id);
    else current.add(id);

    // If user is now showing every column → store undefined (cleaner than an explicit full list)
    const allIds = cols.map(c => c.id);
    if (allIds.every(x => current.has(x))) {
      onChange(undefined);
      return;
    }
    onChange(allIds.filter(x => current.has(x)));
  };

  const reset = () => onChange(undefined);

  const isModified = visibleColumns !== undefined && visibleColumns.length !== cols.length;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={openPopover}
        style={{
          padding: '5px 10px', borderRadius: 7,
          border: '1px solid var(--border)',
          background: isModified ? 'rgba(96,165,250,0.08)' : 'transparent',
          color: isModified ? '#60a5fa' : 'var(--text-2)',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}
      >
        Columns {isModified ? `(${visibleSet.size}/${cols.length})` : ''} ▾
      </button>

      {open && popoverPos && (
        <div
          ref={popoverRef}
          style={{
            position: 'fixed', top: popoverPos.top, left: popoverPos.left, zIndex: 200,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
            padding: 8, minWidth: 220, maxHeight: '60vh', overflowY: 'auto',
          }}
        >
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--text-4)',
            padding: '6px 8px',
          }}>
            Columns
          </div>

          {cols.map(col => (
            <label
              key={col.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 6,
                cursor: col.required ? 'not-allowed' : 'pointer',
                opacity: col.required ? 0.55 : 1,
                fontSize: 13, color: 'var(--text-1)',
                userSelect: 'none',
              }}
              onMouseEnter={e => { if (!col.required) (e.currentTarget as HTMLLabelElement).style.background = 'var(--inset)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.background = 'transparent'; }}
            >
              <input
                type="checkbox"
                checked={visibleSet.has(col.id)}
                disabled={col.required}
                onChange={() => toggle(col.id)}
                style={{ cursor: col.required ? 'not-allowed' : 'pointer' }}
              />
              <span style={{ flex: 1 }}>{col.label}</span>
              {col.required && (
                <span style={{ fontSize: 10, color: 'var(--text-4)' }}>required</span>
              )}
            </label>
          ))}

          {isModified && (
            <button
              type="button"
              onClick={reset}
              style={{
                margin: '6px 8px 4px', padding: '4px 10px',
                fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              Reset to all
            </button>
          )}
        </div>
      )}
    </>
  );
}

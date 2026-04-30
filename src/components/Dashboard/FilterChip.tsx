import React from 'react';
import { FilterChip as FilterChipType, FilterOp } from '../../savedViewsTypes';
import { metaFor, chipLabel } from './filterMeta';

interface Props {
  chip: FilterChipType;
  onChange: (next: FilterChipType) => void;
  onRemove: () => void;
}

export default function FilterChip({ chip, onChange, onRemove }: Props) {
  const [editing, setEditing] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = React.useState<{ top: number; left: number } | null>(null);
  const meta = metaFor(chip.field);

  const open = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPopoverPos({ top: rect.bottom + 6, left: rect.left });
    setEditing(true);
  };

  React.useEffect(() => {
    if (!editing) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      const popover = document.getElementById(`chip-popover-${chip.id}`);
      if (popover?.contains(target)) return;
      setEditing(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [editing, chip.id]);

  return (
    <>
      <div
        ref={ref}
        onClick={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(16,185,129,0.10)',
          border: '1px solid rgba(16,185,129,0.30)',
          color: '#34d399',
          borderRadius: 6, padding: '4px 8px 4px 10px',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}
      >
        <span>{chipLabel(chip)}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Remove filter"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#34d399', padding: '0 2px', fontSize: 14, lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {editing && popoverPos && meta && (
        <div
          id={`chip-popover-${chip.id}`}
          style={{
            position: 'fixed', top: popoverPos.top, left: popoverPos.left, zIndex: 200,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
            padding: 12, minWidth: 240,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', marginBottom: 8 }}>
            {meta.label}
          </div>
          <ChipEditor chip={chip} ops={meta.ops} valueKind={meta.valueKind} onChange={onChange} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setEditing(false)}
              style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface EditorProps {
  chip: FilterChipType;
  ops: FilterOp[];
  valueKind: 'numberRange' | 'numberSingle' | 'boolean' | 'days' | 'overdue' | 'string';
  onChange: (next: FilterChipType) => void;
}

function ChipEditor({ chip, ops, valueKind, onChange }: EditorProps) {
  const setOp = (op: FilterOp) => {
    let value: FilterChipType['value'] = chip.value;
    // When switching between range and scalar ops, coerce value
    if (op === 'between' && !Array.isArray(chip.value)) {
      const v = typeof chip.value === 'number' ? chip.value : 0;
      value = [Math.max(0, v - 10), v + 10];
    }
    if (op !== 'between' && Array.isArray(chip.value)) {
      value = chip.value[0];
    }
    if ((op === 'is' || op === 'isNot') && typeof chip.value !== 'boolean') {
      value = true;
    }
    if (op === 'overdue') value = 0;
    onChange({ ...chip, op, value });
  };

  const setValue = (value: FilterChipType['value']) => onChange({ ...chip, value });

  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 6, padding: '5px 8px', color: 'var(--text-1)', fontSize: 13,
    outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Operator picker */}
      {ops.length > 1 && (
        <select
          value={chip.op}
          onChange={(e) => setOp(e.target.value as FilterOp)}
          style={inputStyle}
        >
          {ops.map(op => <option key={op} value={op}>{opLabel(op)}</option>)}
        </select>
      )}

      {/* Value editor */}
      {chip.op === 'between' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="number"
            value={Array.isArray(chip.value) ? chip.value[0] : 0}
            onChange={e => {
              const lo = Number(e.target.value) || 0;
              const hi = Array.isArray(chip.value) ? chip.value[1] : lo;
              setValue([lo, hi]);
            }}
            style={{ ...inputStyle, flex: 1 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>to</span>
          <input
            type="number"
            value={Array.isArray(chip.value) ? chip.value[1] : 0}
            onChange={e => {
              const hi = Number(e.target.value) || 0;
              const lo = Array.isArray(chip.value) ? chip.value[0] : hi;
              setValue([lo, hi]);
            }}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      )}

      {(chip.op === 'gt' || chip.op === 'lt' || chip.op === 'olderThan' || chip.op === 'within') && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="number"
            value={typeof chip.value === 'number' ? chip.value : 0}
            onChange={e => setValue(Number(e.target.value) || 0)}
            style={{ ...inputStyle, flex: 1 }}
          />
          {(chip.op === 'olderThan' || chip.op === 'within') && (
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>days</span>
          )}
        </div>
      )}

      {valueKind === 'boolean' && (chip.op === 'is' || chip.op === 'isNot') && (
        <select
          value={chip.value === true ? 'true' : chip.value === false ? 'false' : 'true'}
          onChange={e => setValue(e.target.value === 'true')}
          style={inputStyle}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      )}

      {chip.op === 'overdue' && (
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>No value needed — matches any past-due date.</div>
      )}
    </div>
  );
}

function opLabel(op: FilterOp): string {
  switch (op) {
    case 'between':   return 'between';
    case 'gt':        return 'greater than';
    case 'lt':        return 'less than';
    case 'eq':        return 'equals';
    case 'is':        return 'is';
    case 'isNot':     return 'is not';
    case 'olderThan': return 'older than';
    case 'within':    return 'within';
    case 'overdue':   return 'overdue';
  }
}

import React from 'react';
import { FilterChip as FilterChipType } from '../../savedViewsTypes';
import FilterChipPill from './FilterChip';
import AddFilterMenu from './AddFilterMenu';

interface Props {
  dashboardKind: 'advisor' | 'manager';
  chips: FilterChipType[];
  onChipsChange: (chips: FilterChipType[]) => void;
  search: string;
  onSearchChange: (q: string) => void;
  /** Right-side action area (Save, Save as, …). Provided by DashboardShell. */
  actions?: React.ReactNode;
}

export default function FilterBar({
  dashboardKind, chips, onChipsChange, search, onSearchChange, actions,
}: Props) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuAnchor, setMenuAnchor] = React.useState<DOMRect | null>(null);
  const addBtnRef = React.useRef<HTMLButtonElement>(null);

  const openMenu = () => {
    if (addBtnRef.current) setMenuAnchor(addBtnRef.current.getBoundingClientRect());
    setMenuOpen(true);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      flexWrap: 'wrap', marginBottom: 14,
    }}>
      {chips.map(chip => (
        <FilterChipPill
          key={chip.id}
          chip={chip}
          onChange={(next) => onChipsChange(chips.map(c => c.id === chip.id ? next : c))}
          onRemove={() => onChipsChange(chips.filter(c => c.id !== chip.id))}
        />
      ))}

      <button
        ref={addBtnRef}
        type="button"
        onClick={openMenu}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'transparent',
          border: '1px dashed var(--border)',
          borderRadius: 6, padding: '4px 10px',
          fontSize: 12, fontWeight: 600, color: 'var(--text-3)',
          cursor: 'pointer',
        }}
      >
        + Add filter
      </button>

      {menuOpen && (
        <AddFilterMenu
          dashboardKind={dashboardKind}
          anchorRect={menuAnchor}
          onPick={(chip) => onChipsChange([...chips, chip])}
          onClose={() => setMenuOpen(false)}
        />
      )}

      <input
        type="text"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search…"
        style={{
          width: 200, padding: '5px 10px', borderRadius: 7,
          border: '1px solid var(--border)',
          background: 'var(--input-bg)', color: 'var(--text-1)',
          fontSize: 13, outline: 'none', marginLeft: 'auto',
        }}
      />

      {actions}
    </div>
  );
}

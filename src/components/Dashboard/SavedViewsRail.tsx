import React from 'react';
import { ResolvedView } from '../../savedViewsTypes';

interface Props {
  views: { builtIn: ResolvedView[]; personal: ResolvedView[]; team: ResolvedView[] };
  counts: Record<string, number>;
  activeViewId: string;
  onSelect: (viewId: string) => void;
  onNewView: () => void;
  onDelete?: (view: ResolvedView) => void;
}

interface RailItemProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  badge?: string;
  deletable?: boolean;
  onDelete?: () => void;
}

function RailItem({ label, count, active, onClick, badge, deletable, onDelete }: RailItemProps) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          width: '100%', padding: '7px 10px',
          background: active ? 'var(--border)' : 'transparent',
          border: 'none', borderRadius: 7, cursor: 'pointer',
          color: active ? 'var(--text-1)' : 'var(--text-2)',
          fontSize: 13, fontWeight: active ? 600 : 500,
          textAlign: 'left',
        }}
      >
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, paddingRight: 8,
        }}>
          {label}
          {badge && (
            <span style={{
              fontSize: 9, fontWeight: 700, marginLeft: 6,
              padding: '1px 5px', borderRadius: 4,
              background: 'rgba(99,102,241,0.15)', color: '#818cf8',
            }}>
              {badge}
            </span>
          )}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
          padding: '0 6px', minWidth: 18, textAlign: 'right',
        }}>
          {count}
        </span>
      </button>
      {deletable && hovered && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
          title="Delete view"
          style={{
            position: 'absolute', top: 6, right: 30,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 4, color: 'var(--text-3)', cursor: 'pointer',
            fontSize: 11, lineHeight: 1, padding: '2px 5px',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function GroupHeader({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--text-4)',
      padding: '14px 10px 6px',
    }}>
      {label}
    </div>
  );
}

export default function SavedViewsRail({ views, counts, activeViewId, onSelect, onNewView, onDelete }: Props) {
  return (
    <aside style={{
      width: 220, flexShrink: 0,
      position: 'sticky', top: 24, alignSelf: 'flex-start',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{
          margin: 0, fontSize: 14, fontWeight: 700,
          color: 'var(--text-1)', letterSpacing: '-0.01em',
        }}>
          Views
        </h2>
        <button
          type="button"
          onClick={onNewView}
          title="New view"
          style={{
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 6, padding: '3px 8px',
            color: 'var(--text-2)', cursor: 'pointer',
            fontSize: 11, fontWeight: 600,
          }}
        >
          + New
        </button>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <GroupHeader label="Built-in" />
        {views.builtIn.map(v => (
          <RailItem
            key={v.id}
            label={v.name}
            count={counts[v.id] ?? 0}
            active={activeViewId === v.id}
            onClick={() => onSelect(v.id)}
          />
        ))}

        {views.personal.length > 0 && (
          <>
            <GroupHeader label="My views" />
            {views.personal.map(v => (
              <RailItem
                key={v.id}
                label={v.name}
                count={counts[v.id] ?? 0}
                active={activeViewId === v.id}
                onClick={() => onSelect(v.id)}
                deletable
                onDelete={onDelete ? () => onDelete(v) : undefined}
              />
            ))}
          </>
        )}

        {views.team.length > 0 && (
          <>
            <GroupHeader label="Team views" />
            {views.team.map(v => (
              <RailItem
                key={v.id}
                label={v.name}
                count={counts[v.id] ?? 0}
                active={activeViewId === v.id}
                onClick={() => onSelect(v.id)}
                badge="🌐"
                deletable
                onDelete={onDelete ? () => onDelete(v) : undefined}
              />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}

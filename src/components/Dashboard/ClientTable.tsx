import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { EnrichedProfile } from '../../enrichProfile';
import { ColumnSet } from '../../savedViewsTypes';
import { formatSGD } from '../../calculations';
import { INSURANCE_BENCHMARK } from '../../insuranceCompute';

/** Column metadata per column set. Drives the ColumnPicker UI and the table's visible() check.
 *  Note: the per-row "+ Task" button is rendered separately when onTaskClick is set — it's not
 *  user-toggleable in v1 since hiding it would break the manager workflow. */
export interface ColumnDef {
  id: string;
  label: string;
  /** Sort key used by ClientTable's onSortChange callback. Omitted for non-sortable columns. */
  sortKey?: string;
  /** Always shown when columnSet is active (e.g. client name) — picker renders but disables toggle. */
  required?: boolean;
}

export const COLUMNS_BY_SET: Record<ColumnSet, ColumnDef[]> = {
  advisor: [
    { id: 'name',          label: 'Name',                sortKey: 'name', required: true },
    { id: 'age',           label: 'Age',                 sortKey: 'age' },
    { id: 'retirementAge', label: 'Retire',              sortKey: 'retirementAge' },
    { id: 'status',        label: 'Status',              sortKey: 'fireOnTrack' },
    { id: 'wealth',        label: 'Wealth at Retirement', sortKey: 'wealth' },
    { id: 'coverage',      label: 'Death Coverage',      sortKey: 'coverage' },
    { id: 'lpa',           label: 'LPA' },
    { id: 'will',          label: 'Will' },
    { id: 'lastSeen',      label: 'Last Met',            sortKey: 'lastSeen' },
  ],
  fire: [
    { id: 'name',        label: 'Client',     sortKey: 'name', required: true },
    { id: 'advisor',     label: 'Advisor' },
    { id: 'age',         label: 'Age',        sortKey: 'age' },
    { id: 'income',      label: 'Income',     sortKey: 'income' },
    { id: 'fireStatus',  label: 'FIRE Status', sortKey: 'fireOnTrack' },
    { id: 'fireGap',     label: 'Gap / Surplus', sortKey: 'fireGap' },
    { id: 'lastUpdated', label: 'Last seen',  sortKey: 'lastUpdated' },
  ],
  insurance: [
    { id: 'name',         label: 'Client',     sortKey: 'name', required: true },
    { id: 'advisor',      label: 'Advisor' },
    { id: 'age',          label: 'Age',        sortKey: 'age' },
    { id: 'income',       label: 'Income',     sortKey: 'income' },
    { id: 'deathGap',     label: 'Death Gap',  sortKey: 'deathGap' },
    { id: 'ciGap',        label: 'CI Gap',     sortKey: 'ciGap' },
    { id: 'eciGap',       label: 'ECI Gap',    sortKey: 'eciGap' },
    { id: 'hospitalPlan', label: 'Hospital Plan' },
    { id: 'signalScore',  label: 'Signal',     sortKey: 'signalScore' },
  ],
};

interface Props {
  rows: EnrichedProfile[];
  columnSet: ColumnSet;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSortChange: (sortBy: string, sortDir: 'asc' | 'desc') => void;
  /** When provided, only these column ids render; missing → all columns for the set. */
  visibleColumns?: string[];
  /** Optional callback for the per-row "+ Task" button (manager dashboard). */
  onTaskClick?: (row: EnrichedProfile) => void;
  /** Auth user id of the current viewer. Used to render a "you" indicator on rows the user owns. */
  currentUserId?: string | null;
}

function formatSGDK(n: number) {
  if (Math.abs(n) >= 1_000_000) return `S$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `S$${Math.round(n / 1_000)}K`;
  return `S$${Math.round(n)}`;
}

function GapCell({ gap, rec }: { gap: number; rec: number }) {
  if (rec === 0) return <span style={{ color: 'var(--text-5)', fontSize: 12 }}>—</span>;
  if (gap <= 0) return (
    <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399',
      background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: 20 }}>
      Covered
    </span>
  );
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>-{formatSGD(gap)}</div>
      <div style={{ fontSize: 10, color: 'var(--text-5)' }}>rec. {formatSGD(rec)}</div>
    </div>
  );
}

function SignalBadge({ score }: { score: number }) {
  const color = score >= 70 ? '#f87171' : score >= 40 ? '#fbbf24' : '#34d399';
  const label = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 36, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
    </div>
  );
}

export default function ClientTable({ rows, columnSet, sortBy, sortDir, onSortChange, visibleColumns, onTaskClick, currentUserId }: Props) {
  const navigate = useNavigate();
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 54,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  const handleSort = (key: string) => {
    if (sortBy === key) onSortChange(key, sortDir === 'asc' ? 'desc' : 'asc');
    else onSortChange(key, columnSet === 'advisor' ? 'asc' : 'desc');
  };

  const handleViewClient = (id: string) => {
    localStorage.setItem('fire-active-profile', id);
    navigate('/');
  };

  // Memoised so ClientRow's custom comparator can rely on reference equality
  const stableVisibleColumns = React.useMemo(() => visibleColumns, [visibleColumns]); // eslint-disable-line react-hooks/exhaustive-deps

  const stickyTh: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 1 };

  const colHd = (key: string, align: 'left' | 'center' | 'right' = 'left'): React.CSSProperties => ({
    fontSize: 10, fontWeight: 700, color: sortBy === key ? 'var(--text-2)' : 'var(--text-5)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    padding: '8px 14px', textAlign: align, whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border)', cursor: 'pointer', userSelect: 'none',
    background: sortBy === key ? 'var(--surface)' : 'var(--card)',
    ...stickyTh,
  });
  const colHdPlain = (align: 'left' | 'center' | 'right' = 'left'): React.CSSProperties => ({
    fontSize: 10, fontWeight: 700, color: 'var(--text-5)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    padding: '8px 14px', textAlign: align, whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border)',
    background: 'var(--card)',
    ...stickyTh,
  });

  const SortArrow = ({ k }: { k: string }) =>
    sortBy === k ? <span style={{ fontSize: 9, marginLeft: 3 }}>{sortDir === 'desc' ? '▼' : '▲'}</span> : null;

  if (rows.length === 0) {
    return (
      <div style={{
        border: '1px dashed var(--border)', borderRadius: 14,
        padding: '40px 24px', textAlign: 'center',
        color: 'var(--text-4)', fontSize: 13,
      }}>
        No clients match this view.
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div ref={parentRef} style={{ overflow: 'auto', maxHeight: '68vh' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: columnSet === 'advisor' ? 760 : 820 }}>
          <thead>
            {columnSet === 'advisor' && (
              <tr>
                {visible('name', columnSet, stableVisibleColumns)          && <th style={colHd('name')}             onClick={() => handleSort('name')}>Name <SortArrow k="name" /></th>}
                {visible('age', columnSet, stableVisibleColumns)           && <th style={colHd('age', 'center')}    onClick={() => handleSort('age')}>Age <SortArrow k="age" /></th>}
                {visible('retirementAge', columnSet, stableVisibleColumns) && <th style={colHd('retirementAge', 'center')} onClick={() => handleSort('retirementAge')}>Retire <SortArrow k="retirementAge" /></th>}
                {visible('status', columnSet, stableVisibleColumns)        && <th style={colHd('fireOnTrack', 'center')} onClick={() => handleSort('fireOnTrack')}>Status <SortArrow k="fireOnTrack" /></th>}
                {visible('wealth', columnSet, stableVisibleColumns)        && <th style={colHd('wealth', 'right')}  onClick={() => handleSort('wealth')}>Wealth at Retirement <SortArrow k="wealth" /></th>}
                {visible('coverage', columnSet, stableVisibleColumns)      && <th style={colHd('coverage', 'right')} onClick={() => handleSort('coverage')}>Death Coverage <SortArrow k="coverage" /></th>}
                {visible('lpa', columnSet, stableVisibleColumns)           && <th style={colHdPlain('center')}>LPA</th>}
                {visible('will', columnSet, stableVisibleColumns)          && <th style={colHdPlain('center')}>Will</th>}
                {visible('lastSeen', columnSet, stableVisibleColumns)      && <th style={colHd('lastSeen', 'center')} onClick={() => handleSort('lastSeen')}>Last Met <SortArrow k="lastSeen" /></th>}
                <th style={colHdPlain('right')}></th>
              </tr>
            )}
            {columnSet === 'fire' && (
              <tr>
                {visible('name', columnSet, stableVisibleColumns)        && <th style={colHd('name')}            onClick={() => handleSort('name')}>Client <SortArrow k="name" /></th>}
                {visible('advisor', columnSet, stableVisibleColumns)     && <th style={colHdPlain()}>Advisor</th>}
                {visible('age', columnSet, stableVisibleColumns)         && <th style={colHd('age', 'center')}   onClick={() => handleSort('age')}>Age <SortArrow k="age" /></th>}
                {visible('income', columnSet, stableVisibleColumns)      && <th style={colHd('income', 'right')} onClick={() => handleSort('income')}>Income <SortArrow k="income" /></th>}
                {visible('fireStatus', columnSet, stableVisibleColumns)  && <th style={colHd('fireOnTrack', 'center')} onClick={() => handleSort('fireOnTrack')}>FIRE Status <SortArrow k="fireOnTrack" /></th>}
                {visible('fireGap', columnSet, stableVisibleColumns)     && <th style={colHd('fireGap', 'right')} onClick={() => handleSort('fireGap')}>Gap / Surplus <SortArrow k="fireGap" /></th>}
                {visible('lastUpdated', columnSet, stableVisibleColumns) && <th style={colHd('lastUpdated', 'center')} onClick={() => handleSort('lastUpdated')}>Last seen <SortArrow k="lastUpdated" /></th>}
                {onTaskClick && <th style={colHdPlain('right')}></th>}
              </tr>
            )}
            {columnSet === 'insurance' && (
              <tr>
                {visible('name', columnSet, stableVisibleColumns)         && <th style={colHd('name')}            onClick={() => handleSort('name')}>Client <SortArrow k="name" /></th>}
                {visible('advisor', columnSet, stableVisibleColumns)      && <th style={colHdPlain()}>Advisor</th>}
                {visible('age', columnSet, stableVisibleColumns)          && <th style={colHd('age', 'center')}   onClick={() => handleSort('age')}>Age <SortArrow k="age" /></th>}
                {visible('income', columnSet, stableVisibleColumns)       && <th style={colHd('income', 'right')} onClick={() => handleSort('income')}>Income <SortArrow k="income" /></th>}
                {visible('deathGap', columnSet, stableVisibleColumns)     && <th style={colHd('deathGap', 'center')} onClick={() => handleSort('deathGap')}>Death Gap <SortArrow k="deathGap" /></th>}
                {visible('ciGap', columnSet, stableVisibleColumns)        && <th style={colHd('ciGap', 'center')}   onClick={() => handleSort('ciGap')}>CI Gap <SortArrow k="ciGap" /></th>}
                {visible('eciGap', columnSet, stableVisibleColumns)       && <th style={colHd('eciGap', 'center')}  onClick={() => handleSort('eciGap')}>ECI Gap <SortArrow k="eciGap" /></th>}
                {visible('hospitalPlan', columnSet, stableVisibleColumns) && <th style={colHdPlain('center')}>Hospital Plan</th>}
                {visible('signalScore', columnSet, stableVisibleColumns)  && <th style={colHd('signalScore', 'center')} onClick={() => handleSort('signalScore')}>Signal <SortArrow k="signalScore" /></th>}
                {onTaskClick && <th style={colHdPlain('right')}></th>}
              </tr>
            )}
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr><td colSpan={20} style={{ height: paddingTop, padding: 0 }} /></tr>
            )}
            {virtualItems.map(virtualRow => {
              const row = rows[virtualRow.index];
              return (
                <ClientRow
                  key={row.profile.id}
                  row={row}
                  columnSet={columnSet}
                  visibleColumns={stableVisibleColumns}
                  first={virtualRow.index === 0}
                  onView={() => handleViewClient(row.profile.id)}
                  onTaskClick={onTaskClick}
                  isOwn={!!currentUserId && (row.profile.userId === currentUserId)}
                />
              );
            })}
            {paddingBottom > 0 && (
              <tr><td colSpan={20} style={{ height: paddingBottom, padding: 0 }} /></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Pure visibility check — extracted so ClientRow can use it without a function prop. */
function visible(id: string, columnSet: ColumnSet, visibleColumns?: string[]): boolean {
  const def = COLUMNS_BY_SET[columnSet].find(c => c.id === id);
  if (def?.required) return true;
  if (!visibleColumns) return true;
  return visibleColumns.includes(id);
}

interface RowProps {
  row: EnrichedProfile;
  columnSet: ColumnSet;
  visibleColumns?: string[];
  first: boolean;
  onView: () => void;
  onTaskClick?: (row: EnrichedProfile) => void;
  /** True when the current viewer is the owner (advisor) of this row's profile. */
  isOwn: boolean;
}

function rowPropsEqual(prev: RowProps, next: RowProps): boolean {
  return (
    prev.row.profile.id === next.row.profile.id &&
    prev.row.profile.updatedAt === next.row.profile.updatedAt &&
    prev.columnSet === next.columnSet &&
    prev.visibleColumns === next.visibleColumns &&
    prev.first === next.first &&
    prev.isOwn === next.isOwn
    // onView and onTaskClick excluded — functionally equivalent even when reference changes
  );
}

const ClientRow = React.memo(function ClientRow({ row, columnSet, visibleColumns, first, onView, onTaskClick, isOwn }: RowProps) {
  const td: React.CSSProperties = { padding: '11px 14px', fontSize: 13, color: 'var(--text-2)', verticalAlign: 'middle' };
  const profile = row.profile;
  const advisorEmail = row.advisorEmail;
  const phoneNumber = profile.inputs.personal?.phoneNumber;

  const vis = (id: string) => visible(id, columnSet, visibleColumns);

  if (columnSet === 'advisor') {
    const ep = profile.inputs.estatePlanning;
    const lpa = ep?.lpa ?? false;
    const will = ep?.will ?? false;
    const retAge = profile.inputs.personal?.retirementAge;
    return (
      <tr
        style={{ borderTop: first ? 'none' : '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
        onClick={onView}
        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface)'}
        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
      >
        {vis('name') && (
          <td style={{ ...td }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'var(--inset)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: 'var(--text-3)',
              }}>{profile.name.charAt(0).toUpperCase()}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{profile.name}</span>
            </div>
          </td>
        )}
        {vis('age') && (
          <td style={{ ...td, textAlign: 'center' }}>
            {row.liveAge}
            {profile.inputs.personal?.dateOfBirth && (
              <span style={{ fontSize: 10, color: 'var(--text-5)', marginLeft: 4 }}>live</span>
            )}
          </td>
        )}
        {vis('retirementAge') && (
          <td style={{ ...td, textAlign: 'center' }}>{retAge ?? '—'}</td>
        )}
        {vis('status') && (
          <td style={{ ...td, textAlign: 'center' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
              background: row.fireOnTrack ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: row.fireOnTrack ? '#34d399' : '#f87171',
              border: `1px solid ${row.fireOnTrack ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              {row.fireOnTrack ? '✓ On Track' : '⚠ Shortfall'}
            </span>
          </td>
        )}
        {vis('wealth') && (
          <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatSGDK(row.wealthAtRetirement)}</td>
        )}
        {vis('coverage') && (
          <td style={{ ...td, textAlign: 'right', color: row.hasMissingInsurance ? '#fbbf24' : 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
            {row.hasMissingInsurance ? '— No coverage' : formatSGDK(row.totalDeathSA)}
          </td>
        )}
        {vis('lpa') && (
          <td style={{ ...td, textAlign: 'center' }}>
            <span style={badgeStyle(lpa, '#818cf8')}>{lpa ? '✓' : '—'}</span>
          </td>
        )}
        {vis('will') && (
          <td style={{ ...td, textAlign: 'center' }}>
            <span style={badgeStyle(will, '#818cf8')}>{will ? '✓' : '—'}</span>
          </td>
        )}
        {vis('lastSeen') && (
          <td style={{ ...td, textAlign: 'center' }}>
            {row.daysSinceMeeting === null ? (
              <span style={{ fontSize: 11, color: 'var(--text-5)' }}>Never</span>
            ) : (
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: row.daysSinceMeeting > 365 ? '#f87171' : row.daysSinceMeeting > 180 ? '#fbbf24' : 'var(--text-3)',
              }}>
                {row.daysSinceMeeting === 0 ? 'Today' : `${row.daysSinceMeeting}d ago`}
              </span>
            )}
          </td>
        )}
        <td style={{ ...td, textAlign: 'right' }}>
          <button
            onClick={e => { e.stopPropagation(); onView(); }}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              padding: '4px 10px', fontSize: 11, fontWeight: 600,
              color: 'var(--text-3)', cursor: 'pointer',
            }}
          >View →</button>
        </td>
      </tr>
    );
  }

  // Manager dashboards (fire | insurance) — table-style row
  const ageCell = row.profile.inputs.personal?.currentAge ?? null;
  const retCell = row.profile.inputs.personal?.retirementAge ?? null;
  const gender = row.profile.inputs.personal?.gender ?? '';
  return (
    <tr style={{ borderTop: first ? 'none' : '1px solid var(--border)' }}>
      {vis('name') && (
        <td style={td}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{profile.name}</div>
          {phoneNumber && <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{phoneNumber}</div>}
        </td>
      )}
      {vis('advisor') && (
        <td style={td}>
          {advisorEmail ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: isOwn ? 'var(--text-1)' : 'var(--text-3)', fontWeight: isOwn ? 600 : 500 }}>
                {advisorEmail.split('@')[0]}
              </span>
              {isOwn && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                  background: 'rgba(52,211,153,0.15)', color: '#34d399',
                  border: '1px solid rgba(52,211,153,0.3)', letterSpacing: '0.04em',
                }}>YOU</span>
              )}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-5)', fontStyle: 'italic' }}>Advisor removed</span>
          )}
        </td>
      )}
      {vis('age') && (
        <td style={{ ...td, textAlign: 'center' }}>
          {ageCell !== null ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                {ageCell}{gender && <span style={{ fontSize: 10, color: 'var(--text-5)', marginLeft: 4 }}>({gender})</span>}
              </div>
              {retCell !== null && <div style={{ fontSize: 10, color: 'var(--text-5)' }}>ret. {retCell}</div>}
            </div>
          ) : <span style={{ color: 'var(--text-5)', fontSize: 12 }}>—</span>}
        </td>
      )}
      {vis('income') && (
        <td style={{ ...td, textAlign: 'right' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
            {row.annualIncome ? formatSGD(row.annualIncome) : '—'}
          </span>
        </td>
      )}

      {columnSet === 'fire' && (
        <>
          {vis('fireStatus') && (
            <td style={{ ...td, textAlign: 'center' }}>
              {row.fireOnTrack ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399',
                  background: 'rgba(52,211,153,0.1)', padding: '2px 9px', borderRadius: 20 }}>On track</span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171',
                  background: 'rgba(248,113,113,0.1)', padding: '2px 9px', borderRadius: 20 }}>
                  Gap{row.results.moneyRunsOutAge ? ` · age ${row.results.moneyRunsOutAge}` : ''}
                </span>
              )}
            </td>
          )}
          {vis('fireGap') && (
            <td style={{ ...td, textAlign: 'right' }}>
              {row.fireGap !== null ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>-{formatSGD(row.fireGap)}</span>
              ) : row.fireSurplus !== null ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>+{formatSGD(row.fireSurplus)}</span>
              ) : <span style={{ fontSize: 12, color: 'var(--text-5)' }}>—</span>}
            </td>
          )}
          {vis('lastUpdated') && (
            <td style={{ ...td, textAlign: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: lastUpdatedColor(row.daysSinceUpdate) }}>
                {row.daysSinceUpdate === 0 ? 'Today' : row.daysSinceUpdate === 1 ? 'Yesterday' : `${row.daysSinceUpdate}d ago`}
              </span>
            </td>
          )}
        </>
      )}

      {columnSet === 'insurance' && (
        <>
          {vis('deathGap') && (
            <td style={{ ...td, textAlign: 'center' }}>
              <GapCell gap={row.insurance.deathGap} rec={(row.annualIncome ?? 0) * INSURANCE_BENCHMARK.death} />
            </td>
          )}
          {vis('ciGap') && (
            <td style={{ ...td, textAlign: 'center' }}>
              <GapCell gap={row.insurance.ciGap} rec={(row.annualIncome ?? 0) * INSURANCE_BENCHMARK.ci} />
            </td>
          )}
          {vis('eciGap') && (
            <td style={{ ...td, textAlign: 'center' }}>
              <GapCell gap={row.insurance.eciGap} rec={(row.annualIncome ?? 0) * INSURANCE_BENCHMARK.eci} />
            </td>
          )}
          {vis('hospitalPlan') && (
            <td style={{ ...td, textAlign: 'center' }}>
              {row.insurance.hasISP === null ? (
                <span style={{ fontSize: 11, color: 'var(--text-5)' }}>—</span>
              ) : row.insurance.hasISP === false ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 8px', borderRadius: 20 }}>No ISP</span>
              ) : row.insurance.hasRider === false ? (
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '2px 8px', borderRadius: 20 }}>No rider</span>
                  {row.insurance.ispWardClass && <div style={{ fontSize: 10, color: 'var(--text-5)', marginTop: 2 }}>Class {row.insurance.ispWardClass}</div>}
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: 20 }}>ISP + Rider</span>
                  {row.insurance.ispWardClass && <div style={{ fontSize: 10, color: 'var(--text-5)', marginTop: 2 }}>Class {row.insurance.ispWardClass}</div>}
                </div>
              )}
            </td>
          )}
          {vis('signalScore') && (
            <td style={{ ...td, textAlign: 'center' }}>
              <SignalBadge score={row.insurance.signalScore} />
            </td>
          )}
        </>
      )}

      {onTaskClick && (
        <td style={{ ...td, textAlign: 'right' }}>
          <button
            onClick={() => onTaskClick(row)}
            style={{
              fontSize: 11, padding: '4px 11px', borderRadius: 6, fontWeight: 700,
              cursor: 'pointer', border: '1px solid rgba(96,165,250,0.3)',
              background: 'rgba(96,165,250,0.08)', color: '#60a5fa',
            }}
          >
            + Task
          </button>
        </td>
      )}
    </tr>
  );
}, rowPropsEqual);

function badgeStyle(active: boolean, accent: string): React.CSSProperties {
  return {
    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
    background: active ? `${accent}33` : 'rgba(100,116,139,0.1)',
    color: active ? accent : 'var(--text-4)',
    border: `1px solid ${active ? `${accent}66` : 'var(--border)'}`,
  };
}

function lastUpdatedColor(d: number): string {
  if (d <= 7) return '#34d399';
  if (d <= 30) return '#fbbf24';
  return '#f87171';
}

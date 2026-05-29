import React, { useMemo, useState } from 'react';
import { InvestmentTransaction, TrackingAccount } from '../../types';

type SortKey = 'date' | 'ticker' | 'type' | 'total';

export default function TransactionsLog({
  transactions, accounts, onAddClick, onEdit, onDelete,
}: {
  transactions: InvestmentTransaction[];
  accounts: TrackingAccount[];
  onAddClick: () => void;
  onEdit: (tx: InvestmentTransaction) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(transactions.length === 0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const accountName = (id: string) => accounts.find(a => a.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? transactions.filter(t => `${t.ticker} ${t.notes}`.toLowerCase().includes(q))
      : transactions;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') cmp = a.date < b.date ? -1 : 1;
      else if (sortBy === 'ticker') cmp = a.ticker.localeCompare(b.ticker);
      else if (sortBy === 'type') cmp = a.type.localeCompare(b.type);
      else if (sortBy === 'total') cmp = (a.quantity * a.amountPerUnit) - (b.quantity * b.amountPerUnit);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [transactions, search, sortBy, sortDir]);

  const setSort = (k: SortKey) => {
    if (k === sortBy) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(k); setSortDir(k === 'date' ? 'desc' : 'asc'); }
  };

  const sortIndicator = (k: SortKey) => sortBy === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: expanded ? '1px solid var(--border)' : 'none' }}>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-2)', fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6, padding: 0,
          }}
        >
          <span style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
          Transactions ({transactions.length})
        </button>
        <div style={{ flex: 1 }} />
        {expanded && (
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search ticker or notes…"
            style={{
              background: 'var(--input-bg)', border: '1px solid var(--input-border)',
              borderRadius: 7, padding: '5px 10px', fontSize: 12, color: 'var(--text-1)',
              outline: 'none', width: 220,
            }}
          />
        )}
        <button onClick={onAddClick} style={primaryBtn}>+ Add transaction</button>
      </div>

      {expanded && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--inset)', color: 'var(--text-3)', textAlign: 'left' }}>
                <th style={thStyle} onClick={() => setSort('date')}>Date{sortIndicator('date')}</th>
                <th style={thStyle} onClick={() => setSort('type')}>Type{sortIndicator('type')}</th>
                <th style={thStyle} onClick={() => setSort('ticker')}>Ticker{sortIndicator('ticker')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Per unit</th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => setSort('total')}>Total{sortIndicator('total')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Fees</th>
                <th style={thStyle}>Account</th>
                <th style={thStyle}>Notes</th>
                <th style={{ ...thStyle, width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-4)' }}>
                  {transactions.length === 0 ? 'No transactions yet. Click "+ Add transaction" to start.' : 'No matches.'}
                </td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
                  <td style={tdStyle}>{t.date}</td>
                  <td style={tdStyle}>
                    <TypePill type={t.type} />
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{t.ticker}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{t.quantity.toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {t.currency === 'SGD' ? 'S$' : '$'}{t.amountPerUnit.toFixed(2)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {t.currency === 'SGD' ? 'S$' : '$'}{(t.quantity * t.amountPerUnit).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-3)' }}>
                    {t.tradingFees > 0 ? `${t.currency === 'SGD' ? 'S$' : '$'}${t.tradingFees.toFixed(2)}` : '—'}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-3)' }}>{accountName(t.accountId)}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-3)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.notes || '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <button onClick={() => onEdit(t)} style={iconBtn} title="Edit">✎</button>
                    <button onClick={() => onDelete(t.id)} style={{ ...iconBtn, color: '#f87171' }} title="Delete">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TypePill({ type }: { type: 'buy' | 'sell' | 'dividend' }) {
  const c = type === 'buy' ? '#34d399' : type === 'sell' ? '#f87171' : '#fbbf24';
  const bg = type === 'buy' ? 'rgba(16,185,129,0.15)' : type === 'sell' ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)';
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: bg, color: c, border: `1px solid ${c}30`, textTransform: 'uppercase' }}>
      {type}
    </span>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
};
const thStyle: React.CSSProperties = {
  padding: '8px 12px', fontWeight: 700, fontSize: 11, letterSpacing: '0.04em',
  textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none',
};
const tdStyle: React.CSSProperties = { padding: '8px 12px', color: 'var(--text-1)' };
const primaryBtn: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 7, border: 'none', background: '#10b981',
  color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
};
const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer',
  padding: '2px 6px', fontSize: 14,
};

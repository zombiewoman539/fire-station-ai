import React, { useState, useMemo } from 'react';
import { HoldingWithMarketData, TrackingAccount, SupportedCurrency } from '../../types';
import { QuoteResult } from '../../services/marketDataService';

type SortKey = 'ticker' | 'value' | 'gain' | 'gainPct';

export default function HoldingsTable({
  holdings, accounts, quotes, baseCurrency, onSetCategory,
}: {
  holdings: HoldingWithMarketData[];
  accounts: TrackingAccount[];
  quotes: Record<string, QuoteResult>;
  baseCurrency: SupportedCurrency;
  onSetCategory: (ticker: string, category: string) => void;
}) {
  const [sortBy, setSortBy] = useState<SortKey>('value');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editingCategoryFor, setEditingCategoryFor] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState('');

  const accountName = (id: string) => accounts.find(a => a.id === id)?.name ?? id;
  const knownCategories = useMemo(() => Array.from(new Set(holdings.map(h => h.category).filter(c => c !== 'Uncategorised'))), [holdings]);

  const sorted = useMemo(() => {
    return [...holdings].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'ticker') cmp = a.ticker.localeCompare(b.ticker);
      else if (sortBy === 'value') cmp = (a.marketValueBase ?? 0) - (b.marketValueBase ?? 0);
      else if (sortBy === 'gain') cmp = (a.unrealizedGain ?? 0) - (b.unrealizedGain ?? 0);
      else if (sortBy === 'gainPct') cmp = (a.unrealizedGainPct ?? 0) - (b.unrealizedGainPct ?? 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [holdings, sortBy, sortDir]);

  const setSort = (k: SortKey) => {
    if (k === sortBy) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(k); setSortDir('desc'); }
  };
  const sortInd = (k: SortKey) => sortBy === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const startEditCategory = (ticker: string, current: string) => {
    setEditingCategoryFor(ticker);
    setCategoryDraft(current === 'Uncategorised' ? '' : current);
  };
  const commitCategory = (ticker: string) => {
    const next = categoryDraft.trim() || 'Uncategorised';
    onSetCategory(ticker, next);
    setEditingCategoryFor(null);
  };

  return (
    <div style={cardStyle}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          Holdings · {holdings.length}
        </h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--inset)', color: 'var(--text-3)', textAlign: 'left' }}>
              <th style={thStyle} onClick={() => setSort('ticker')}>Ticker{sortInd('ticker')}</th>
              <th style={thStyle}>Account</th>
              <th style={thStyle}>Category</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Avg cost</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Price</th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => setSort('value')}>Value ({baseCurrency}){sortInd('value')}</th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => setSort('gain')}>Gain{sortInd('gain')}</th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => setSort('gainPct')}>Gain %{sortInd('gainPct')}</th>
              <th style={{ ...thStyle, width: 100 }}>90-day</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(h => {
              const q = quotes[h.ticker];
              const gainColor = (h.unrealizedGain ?? 0) >= 0 ? '#34d399' : '#f87171';
              const cur = h.currency === 'SGD' ? 'S$' : '$';
              return (
                <tr key={`${h.ticker}::${h.accountId}`} style={{ borderTop: '1px solid var(--border-soft)' }}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>
                    {h.ticker} <span style={{ fontSize: 10, color: 'var(--text-4)', fontWeight: 500 }}>{h.currency}</span>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-3)' }}>{accountName(h.accountId)}</td>
                  <td style={tdStyle}>
                    {editingCategoryFor === h.ticker ? (
                      <input
                        autoFocus
                        list={`cat-options`}
                        value={categoryDraft}
                        onChange={e => setCategoryDraft(e.target.value)}
                        onBlur={() => commitCategory(h.ticker)}
                        onKeyDown={e => { if (e.key === 'Enter') commitCategory(h.ticker); if (e.key === 'Escape') setEditingCategoryFor(null); }}
                        placeholder="e.g. Tech"
                        style={{
                          background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                          borderRadius: 6, padding: '3px 6px', fontSize: 11, color: 'var(--text-1)',
                          outline: 'none', width: 100,
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => startEditCategory(h.ticker, h.category)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: h.category === 'Uncategorised' ? 'var(--text-4)' : 'var(--text-2)',
                          fontSize: 12, padding: 0, fontStyle: h.category === 'Uncategorised' ? 'italic' : 'normal',
                        }}
                      >{h.category}</button>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{h.quantity.toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{cur}{h.averageCost.toFixed(2)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {h.marketPricePerUnit !== null ? `${cur}${h.marketPricePerUnit.toFixed(2)}` : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                    {h.marketValueBase !== null
                      ? `${baseCurrency === 'SGD' ? 'S$' : '$'}${h.marketValueBase.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: gainColor }}>
                    {h.unrealizedGain !== null
                      ? `${h.unrealizedGain >= 0 ? '+' : ''}${cur}${Math.abs(h.unrealizedGain).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: gainColor, fontWeight: 600 }}>
                    {h.unrealizedGainPct !== null
                      ? `${h.unrealizedGainPct >= 0 ? '+' : ''}${h.unrealizedGainPct.toFixed(1)}%`
                      : '—'}
                  </td>
                  <td style={{ ...tdStyle }}>
                    <Sparkline data={q?.history ?? []} positive={(h.unrealizedGain ?? 0) >= 0} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <datalist id="cat-options">
        {knownCategories.map(c => <option key={c} value={c} />)}
      </datalist>
    </div>
  );
}

function Sparkline({ data, positive }: { data: Array<{ date: string; close: number }>; positive: boolean }) {
  if (data.length < 2) return <span style={{ color: 'var(--text-4)', fontSize: 10 }}>—</span>;
  const w = 80, h = 24;
  const closes = data.map(p => p.close);
  const min = Math.min(...closes), max = Math.max(...closes);
  const range = max - min || 1;
  const points = closes.map((c, i) => {
    const x = (i / (closes.length - 1)) * w;
    const y = h - ((c - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polyline fill="none" stroke={positive ? '#34d399' : '#f87171'} strokeWidth="1.5" points={points} />
    </svg>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
};
const thStyle: React.CSSProperties = {
  padding: '8px 12px', fontWeight: 700, fontSize: 11, letterSpacing: '0.04em',
  textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none',
};
const tdStyle: React.CSSProperties = { padding: '8px 12px', color: 'var(--text-1)' };

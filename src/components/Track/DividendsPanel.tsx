import React, { useMemo } from 'react';
import { InvestmentTransaction, SupportedCurrency } from '../../types';

export default function DividendsPanel({
  transactions, baseCurrency, fxRate,
}: {
  transactions: InvestmentTransaction[];
  baseCurrency: SupportedCurrency;
  fxRate: number;  // USD → base
}) {
  const divs = useMemo(() => transactions.filter(t => t.type === 'dividend'), [transactions]);

  const byTicker = useMemo(() => {
    const map = new Map<string, { ticker: string; total: number; currency: SupportedCurrency; count: number }>();
    for (const d of divs) {
      const amount = d.quantity * d.amountPerUnit - d.tradingFees;
      const k = d.ticker;
      const cur = map.get(k);
      if (cur) { cur.total += amount; cur.count++; }
      else { map.set(k, { ticker: d.ticker, total: amount, currency: d.currency, count: 1 }); }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [divs]);

  // Convert each ticker's total to base currency for the summary
  const totalBase = byTicker.reduce((s, b) => {
    const factor = b.currency === baseCurrency ? 1 : fxRate;
    return s + b.total * factor;
  }, 0);

  // Monthly cumulative (base currency)
  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of divs) {
      const month = d.date.slice(0, 7);
      const factor = d.currency === baseCurrency ? 1 : fxRate;
      const amount = (d.quantity * d.amountPerUnit - d.tradingFees) * factor;
      map.set(month, (map.get(month) ?? 0) + amount);
    }
    const sorted = Array.from(map.entries()).sort(([a], [b]) => a < b ? -1 : 1);
    let cum = 0;
    return sorted.map(([month, amount]) => { cum += amount; return { month, amount, cum }; });
  }, [divs, baseCurrency, fxRate]);

  const maxCum = Math.max(0.001, ...monthly.map(m => m.cum));

  if (divs.length === 0) return null;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          Dividends · {divs.length} entries
        </h3>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>
          Total: {baseCurrency === 'SGD' ? 'S$' : '$'}{totalBase.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>

      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Cumulative chart */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 8 }}>
            Cumulative ({baseCurrency})
          </div>
          <div style={{ position: 'relative', height: 120, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            {monthly.map(m => (
              <div key={m.month} title={`${m.month}: +${baseCurrency === 'SGD' ? 'S$' : '$'}${m.amount.toFixed(0)} (cum ${baseCurrency === 'SGD' ? 'S$' : '$'}${m.cum.toFixed(0)})`}
                   style={{
                     flex: 1, minWidth: 4,
                     height: `${(m.cum / maxCum) * 100}%`,
                     background: '#34d399',
                     borderRadius: '2px 2px 0 0',
                     opacity: 0.85,
                   }} />
            ))}
          </div>
          {monthly.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text-4)' }}>
              <span>{monthly[0].month}</span>
              <span>{monthly[monthly.length - 1].month}</span>
            </div>
          )}
        </div>

        {/* By ticker */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 8 }}>
            By ticker
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
            {byTicker.map(b => {
              const cur = b.currency === 'SGD' ? 'S$' : '$';
              return (
                <div key={b.ticker} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '3px 0' }}>
                  <span style={{ fontWeight: 600 }}>{b.ticker}</span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>
                    {cur}{b.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    <span style={{ color: 'var(--text-4)', fontWeight: 400, marginLeft: 6 }}>· {b.count} payments</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
};

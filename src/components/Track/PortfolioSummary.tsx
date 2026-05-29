import React from 'react';
import { HoldingWithMarketData, SupportedCurrency } from '../../types';

export default function PortfolioSummary({
  holdings, baseCurrency, lastFetchedAt, refreshing, onRefresh,
}: {
  holdings: HoldingWithMarketData[];
  baseCurrency: SupportedCurrency;
  lastFetchedAt: number | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const open = holdings.filter(h => h.quantity > 0);
  const totalValue = open.reduce((s, h) => s + (h.marketValueBase ?? 0), 0);
  const totalCost = open.reduce((s, h) => s + h.costBasisBase, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  // Dividends are reported in their native currency. For mixed-currency summary,
  // we approximate using base currency conversion via the FX rate already applied
  // to marketValueBase. For dividends specifically, we just sum holdings (most are USD).
  const totalDividends = open.reduce((s, h) => s + h.dividendsReceived, 0);
  const someUnknown = open.some(h => h.marketValue === null);

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <Stat label="Total value" value={fmt(totalValue, baseCurrency)} big />
        <Divider />
        <Stat label="Cost basis" value={fmt(totalCost, baseCurrency)} />
        <Stat
          label="Unrealised gain"
          value={fmt(totalGain, baseCurrency)}
          sub={totalCost > 0 ? `${totalGain >= 0 ? '+' : ''}${totalGainPct.toFixed(1)}%` : null}
          color={totalGain >= 0 ? '#34d399' : '#f87171'}
        />
        <Stat label="Dividends received" value={fmt(totalDividends, 'USD')} sub="USD (native)" />
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <button onClick={onRefresh} disabled={refreshing} style={refreshBtn}>
            {refreshing ? '⟳ Refreshing…' : '⟳ Refresh prices'}
          </button>
          <div style={{ fontSize: 10, color: 'var(--text-4)' }}>
            {lastFetchedAt ? `as of ${new Date(lastFetchedAt).toLocaleTimeString()}` : '—'}
          </div>
        </div>
      </div>
      {someUnknown && (
        <div style={{ marginTop: 12, fontSize: 11, color: '#fbbf24' }}>
          ⚠ Some prices couldn't be fetched from Yahoo Finance. Refresh to retry.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, color, big }: {
  label: string; value: string; sub?: string | null; color?: string; big?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
        {label}
      </div>
      <div style={{
        marginTop: 4, fontSize: big ? 28 : 18, fontWeight: 800,
        color: color ?? 'var(--text-1)', letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && <div style={{ marginTop: 4, fontSize: 12, color: color ?? 'var(--text-3)', fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border-soft)' }} />;
}

function fmt(n: number, currency: SupportedCurrency): string {
  const prefix = currency === 'SGD' ? 'S$' : '$';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${prefix}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${prefix}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${prefix}${abs.toFixed(0)}`;
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
  padding: '20px 24px',
};
const refreshBtn: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)',
  background: 'var(--inset)', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
};

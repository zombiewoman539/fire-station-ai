import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { HoldingWithMarketData, TrackingAccount, SupportedCurrency } from '../../types';

ChartJS.register(ArcElement, Tooltip, Legend);

// Reusable pleasant palette
const PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4',
  '#8b5cf6', '#ef4444', '#84cc16', '#0ea5e9', '#f97316',
  '#14b8a6', '#a855f7', '#22c55e', '#3b82f6', '#eab308',
];

export default function PortfolioPieCharts({
  holdings, accounts, baseCurrency,
}: {
  holdings: HoldingWithMarketData[];
  accounts: TrackingAccount[];
  baseCurrency: SupportedCurrency;
}) {
  const open = useMemo(() => holdings.filter(h => h.quantity > 0 && (h.marketValueBase ?? 0) > 0), [holdings]);

  const byHolding = useMemo(() => groupBy(open, h => h.ticker), [open]);
  const byCategory = useMemo(() => groupBy(open, h => h.category), [open]);
  const byAccount = useMemo(() => groupBy(open, h => accounts.find(a => a.id === h.accountId)?.name ?? h.accountId), [open, accounts]);
  const byCurrency = useMemo(() => groupBy(open, h => h.currency), [open]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
      <ChartCard title="By holding" buckets={byHolding} baseCurrency={baseCurrency} />
      <ChartCard title="By category" buckets={byCategory} baseCurrency={baseCurrency} />
      <ChartCard title="By account" buckets={byAccount} baseCurrency={baseCurrency} />
      <ChartCard title="By currency" buckets={byCurrency} baseCurrency={baseCurrency} />
    </div>
  );
}

function groupBy(items: HoldingWithMarketData[], keyFn: (h: HoldingWithMarketData) => string): Array<{ label: string; value: number }> {
  const map = new Map<string, number>();
  for (const h of items) {
    const k = keyFn(h);
    map.set(k, (map.get(k) ?? 0) + (h.marketValueBase ?? 0));
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function ChartCard({ title, buckets, baseCurrency }: { title: string; buckets: Array<{ label: string; value: number }>; baseCurrency: SupportedCurrency }) {
  const total = buckets.reduce((s, b) => s + b.value, 0);
  const data = {
    labels: buckets.map(b => b.label),
    datasets: [{
      data: buckets.map(b => b.value),
      backgroundColor: buckets.map((_, i) => PALETTE[i % PALETTE.length]),
      borderColor: 'var(--bg)',
      borderWidth: 2,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0';
            return `${ctx.label}: ${baseCurrency === 'SGD' ? 'S$' : '$'}${Math.round(ctx.parsed).toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ position: 'relative', height: 140 }}>
        <Doughnut data={data} options={options as any} />
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {buckets.slice(0, 5).map((b, i) => (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
              <span style={{ color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</span>
            </div>
            <span style={{ color: 'var(--text-3)', fontWeight: 600, marginLeft: 8 }}>
              {total > 0 ? `${((b.value / total) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        ))}
        {buckets.length > 5 && (
          <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>
            + {buckets.length - 5} more
          </div>
        )}
      </div>
    </div>
  );
}

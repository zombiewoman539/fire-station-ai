import React, { useEffect, useMemo, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { InvestmentTransaction, SupportedCurrency } from '../../types';
import { QuoteResult } from '../../services/marketDataService';
import { buildPerformanceHistory, calculateMWR } from '../../lib/portfolioPerformance';

Chart.register(...registerables);

function fmtSGD(n: number, currency: SupportedCurrency) {
  return (currency === 'SGD' ? 'S$' : 'US$') + Math.round(n).toLocaleString('en-SG');
}

interface Props {
  transactions: InvestmentTransaction[];
  priceHistory: Record<string, QuoteResult>;
  fxHistory: QuoteResult | null;
  baseCurrency: SupportedCurrency;
  fxRate: number;
  loading: boolean;
}

export default function PerformanceChart({ transactions, priceHistory, fxHistory, baseCurrency, fxRate, loading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const snapshots = useMemo(
    () => buildPerformanceHistory(transactions, priceHistory, fxHistory, baseCurrency),
    [transactions, priceHistory, fxHistory, baseCurrency],
  );

  const mwr = useMemo(() => {
    if (snapshots.length === 0) return null;
    const currentValue = snapshots[snapshots.length - 1].portfolioValue;
    return calculateMWR(transactions, currentValue, baseCurrency, fxRate);
  }, [snapshots, transactions, baseCurrency, fxRate]);

  // S&P 500 benchmark (^GSPC) normalized to match portfolio start value
  const spData = useMemo(() => {
    const spHistory = priceHistory['^GSPC']?.history ?? [];
    if (spHistory.length === 0 || snapshots.length === 0) return [];
    const startDate = snapshots[0].date;
    const startEntry = spHistory.find(p => p.date >= startDate);
    if (!startEntry || startEntry.close <= 0) return [];
    const startPortValue = snapshots[0].portfolioValue;
    const scale = startPortValue / startEntry.close;
    return spHistory
      .filter(p => p.date >= startDate)
      .map(p => ({ date: p.date, value: Math.round(p.close * scale) }));
  }, [priceHistory, snapshots]);

  useEffect(() => {
    if (!canvasRef.current || snapshots.length === 0) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const labels = snapshots.map(s => s.date);
    const datasets: any[] = [
      {
        label: 'Portfolio Value',
        data: snapshots.map(s => s.portfolioValue),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79,70,229,0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'Amount Invested',
        data: snapshots.map(s => s.invested),
        borderColor: '#94a3b8',
        backgroundColor: 'transparent',
        borderDash: [5, 3],
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1.5,
      },
    ];

    if (spData.length > 0) {
      // Align S&P data to same labels
      const spByDate: Record<string, number> = {};
      for (const { date, value } of spData) spByDate[date] = value;
      datasets.push({
        label: 'S&P 500 (normalised)',
        data: labels.map(d => spByDate[d] ?? null),
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1.5,
        spanGaps: true,
      });
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: 'var(--text-2, #64748b)', font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${fmtSGD(ctx.parsed.y ?? 0, baseCurrency)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: 'var(--text-3, #94a3b8)',
              maxTicksLimit: 8,
              font: { size: 10 },
            },
            grid: { color: 'rgba(148,163,184,0.1)' },
          },
          y: {
            ticks: {
              color: 'var(--text-3, #94a3b8)',
              font: { size: 10 },
              callback: (v) => fmtSGD(Number(v), baseCurrency),
            },
            grid: { color: 'rgba(148,163,184,0.1)' },
          },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [snapshots, spData, baseCurrency]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
        Loading 1-year price history…
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
        Add transactions to see portfolio performance over time.
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
        Could not compute performance — market data unavailable for these tickers.
      </div>
    );
  }

  const latest = snapshots[snapshots.length - 1];
  const gain = latest.portfolioValue - latest.invested;
  const gainPct = latest.invested > 0 ? (gain / latest.invested) * 100 : 0;

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <KPICard label="Portfolio Value" value={fmtSGD(latest.portfolioValue, baseCurrency)} />
        <KPICard label="Total Invested" value={fmtSGD(latest.invested, baseCurrency)} />
        <KPICard
          label="Unrealized Gain"
          value={`${gain >= 0 ? '+' : ''}${fmtSGD(gain, baseCurrency)} (${gainPct.toFixed(1)}%)`}
          positive={gain >= 0}
        />
        <KPICard
          label="Cumulative Dividends"
          value={fmtSGD(latest.dividends, baseCurrency)}
        />
        {mwr !== null && (
          <KPICard
            label="Money-Weighted Return"
            value={`${mwr >= 0 ? '+' : ''}${(mwr * 100).toFixed(1)}% p.a.`}
            positive={mwr >= 0}
          />
        )}
      </div>

      {/* Chart */}
      <div style={{ position: 'relative', height: 300, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 12px' }}>
        <canvas ref={canvasRef} />
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-4, #bbb)', marginTop: 6 }}>
        S&P 500 normalised to portfolio starting value. Benchmark uses ^GSPC from Yahoo Finance.
      </p>
    </div>
  );
}

function KPICard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div style={{ background: 'var(--card-bg, var(--input-bg))', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', minWidth: 160 }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: positive === undefined ? 'var(--text-1)' : positive ? 'var(--green, #16a34a)' : 'var(--red, #dc2626)' }}>
        {value}
      </div>
    </div>
  );
}

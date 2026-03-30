import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Chart } from 'react-chartjs-2';
import { FireResults } from '../types';
import { formatSGD } from '../calculations';

ChartJS.register(
  CategoryScale, LinearScale, BarController, LineController,
  BarElement, LineElement, PointElement,
  Tooltip, Legend, Filler, annotationPlugin,
);

interface Props {
  results: FireResults;
  retirementAge: number;
  toolbar?: React.ReactNode;
  scenarioResults?: FireResults | null;
}

function FireRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#94a3b8', fontSize: 10 }}>{label}</span>
      <span style={{ color: color || '#e2e8f0', fontSize: 10, fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700" style={{ padding: '8px 12px' }}>
      <div className="text-gray-500 uppercase tracking-wider font-medium" style={{ fontSize: 9, marginBottom: 1, lineHeight: 1.2 }}>{label}</div>
      <div className="font-bold" style={{ color, fontSize: 18 }}>{value}</div>
    </div>
  );
}

export default function ChartPanel({ results, retirementAge, toolbar, scenarioResults }: Props) {
  const { yearlyData, wealthAtRetirement, fireNumber, fireNumberBreakdown, yearsToBuild, onTrack } = results;

  const labels = yearlyData.map(d => String(d.age));

  const purchaseAnnotations: Record<string, any> = {};
  yearlyData.forEach((d, i) => {
    if (d.purchaseLabels.length > 0) {
      purchaseAnnotations[`purchase_${i}`] = {
        type: 'label' as const,
        xValue: String(d.age),
        yValue: d.totalNetWorth,
        content: d.purchaseLabels.map(l => l.length > 14 ? l.slice(0, 14) + '...' : l),
        color: '#f87171',
        font: { size: 9, weight: 'bold' as const },
        position: 'start' as const,
        yAdjust: -18,
        backgroundColor: 'rgba(248,113,113,0.12)',
        borderRadius: 3,
        padding: { top: 2, bottom: 2, left: 4, right: 4 },
      };
    }
  });

  const data = {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Investments',
        data: yearlyData.map(d => d.investments),
        backgroundColor: 'rgba(52, 211, 153, 0.75)',
        borderRadius: 2,
        stack: 'stack',
        order: 2,
      },
      {
        type: 'bar' as const,
        label: 'Cash Savings',
        data: yearlyData.map(d => d.cash),
        backgroundColor: 'rgba(148, 163, 184, 0.65)',
        borderRadius: 2,
        stack: 'stack',
        order: 2,
      },
      {
        type: 'bar' as const,
        label: 'CPF OA + SA',
        data: yearlyData.map(d => d.cpfOaSa),
        backgroundColor: 'rgba(96, 165, 250, 0.75)',
        borderRadius: 2,
        stack: 'stack',
        order: 2,
      },
      {
        type: 'bar' as const,
        label: 'Insurance Cash Value',
        data: yearlyData.map(d => d.insuranceValue),
        backgroundColor: 'rgba(251, 191, 36, 0.75)',
        borderRadius: 2,
        stack: 'stack',
        order: 2,
      },
      {
        type: 'line' as const,
        label: 'Total Net Worth',
        data: yearlyData.map(d => d.totalNetWorth),
        borderColor: '#f472b6',
        backgroundColor: 'rgba(244, 114, 182, 0.08)',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.3,
        fill: false,
        order: 1,
      },
      // Scenario overlay line
      ...(scenarioResults ? [{
        type: 'line' as const,
        label: 'Scenario Net Worth',
        data: scenarioResults.yearlyData.map(d => d.totalNetWorth),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.06)',
        borderWidth: 2.5,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.3,
        fill: false,
        order: 0,
      }] : []),
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          color: '#6b7280',
          maxRotation: 0,
          font: { size: 11 },
          callback: function (_: any, index: number) {
            const age = yearlyData[index]?.age;
            return age !== undefined && age % 5 === 0 ? String(age) : '';
          },
        },
      },
      y: {
        min: 0,
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
          callback: (val: number) => formatSGD(val),
        },
        stacked: true,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.95)',
        titleColor: '#fff',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 },
        callbacks: {
          title: (ctx: any[]) => `Age ${ctx[0].label}`,
          label: (ctx: any) => `  ${ctx.dataset.label}: ${formatSGD(ctx.parsed.y)}`,
          afterBody: (ctx: any[]) => {
            const idx = ctx[0].dataIndex;
            const d = yearlyData[idx];
            if (d.purchaseLabels.length > 0) {
              return ['', '  ' + d.purchaseLabels.join(', ')];
            }
            return [];
          },
        },
      },
      annotation: {
        annotations: {
          retirementLine: {
            type: 'line' as const,
            xMin: String(retirementAge),
            xMax: String(retirementAge),
            borderColor: 'rgba(251, 146, 60, 0.6)',
            borderWidth: 2,
            borderDash: [6, 4],
            label: {
              display: true,
              content: 'Retirement',
              position: 'start' as const,
              backgroundColor: 'rgba(251, 146, 60, 0.85)',
              color: '#fff',
              font: { size: 11, weight: 'bold' as const },
              padding: { top: 4, bottom: 4, left: 8, right: 8 },
              borderRadius: 4,
            },
          },
          fireLine: {
            type: 'line' as const,
            yMin: fireNumber,
            yMax: fireNumber,
            borderColor: 'rgba(239, 68, 68, 0.4)',
            borderWidth: 1.5,
            borderDash: [4, 4],
            label: {
              display: true,
              content: `FIRE Target: ${formatSGD(fireNumber)}`,
              position: 'end' as const,
              backgroundColor: 'rgba(239, 68, 68, 0.75)',
              color: '#fff',
              font: { size: 10 },
              padding: { top: 3, bottom: 3, left: 6, right: 6 },
              borderRadius: 3,
            },
          },
          ...purchaseAnnotations,
        },
      },
    },
  };

  const legendItems = [
    { color: 'rgba(52, 211, 153, 0.75)', label: 'Investments', type: 'box' },
    { color: 'rgba(148, 163, 184, 0.65)', label: 'Cash', type: 'box' },
    { color: 'rgba(96, 165, 250, 0.75)', label: 'CPF OA+SA', type: 'box' },
    { color: 'rgba(251, 191, 36, 0.75)', label: 'Insurance', type: 'box' },
    { color: '#f472b6', label: 'Net Worth', type: 'line' },
    { color: 'rgba(251, 146, 60, 0.8)', label: 'Retirement', type: 'dash' },
    ...(scenarioResults ? [{ color: '#ef4444', label: 'Scenario', type: 'dash' as const }] : []),
  ];

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '10px 16px 12px', background: '#111827', height: '100%', overflow: 'hidden' }}>
      {/* Top row: metrics + toolbar */}
      <div className="flex items-start gap-2" style={{ marginBottom: 6, flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, flex: 1 }}>
          <MetricCard label="Wealth at Retirement" value={formatSGD(wealthAtRetirement)} color="#34d399" />
          {/* FIRE Number card with breakdown tooltip */}
          <div
            className="bg-gray-800 rounded-lg border border-gray-700 relative group"
            style={{ padding: '8px 12px', cursor: 'help' }}
          >
            <div className="text-gray-500 uppercase tracking-wider font-medium" style={{ fontSize: 9, marginBottom: 1, lineHeight: 1.2 }}>FIRE Number</div>
            <div className="font-bold" style={{ color: '#60a5fa', fontSize: 18 }}>{formatSGD(fireNumber)}</div>
            <div style={{ fontSize: 9, color: '#4b5563', marginTop: 1 }}>{fireNumberBreakdown.withdrawalRate}% SWR</div>
            {/* Tooltip */}
            <div className="absolute z-50 hidden group-hover:block" style={{
              bottom: '110%', left: 0, width: 240,
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: 10, padding: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}>
              <div style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>How is this calculated?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <FireRow label="Retirement expenses/yr" value={formatSGD(fireNumberBreakdown.grossRetirementExpenses)} />
                <FireRow label="− CPF LIFE payout/yr" value={`− ${formatSGD(fireNumberBreakdown.cpfLifeAnnual)}`} color="#34d399" />
                <FireRow label="= Net portfolio drawdown/yr" value={formatSGD(fireNumberBreakdown.netDrawdownNeeded)} />
                <div style={{ borderTop: '1px solid #334155', margin: '4px 0' }} />
                <FireRow label={`÷ ${fireNumberBreakdown.withdrawalRate}% SWR`} value={`= ${formatSGD(Math.round(fireNumberBreakdown.netDrawdownNeeded / (fireNumberBreakdown.withdrawalRate / 100)))}`} />
                <FireRow label={`+ ${fireNumberBreakdown.inflationBuffer}% inflation buffer`} value={formatSGD(fireNumber)} color="#60a5fa" bold />
              </div>
              <div style={{ color: '#475569', fontSize: 9, marginTop: 8, lineHeight: 1.4 }}>
                SWR = Safe Withdrawal Rate. Portfolio sustains indefinite withdrawals at this rate based on historical returns.
              </div>
            </div>
          </div>
          <MetricCard label="Years to Build" value={`${yearsToBuild} yrs`} color="#fbbf24" />
          {/* Status card */}
          <div
            className="rounded-lg flex items-center gap-2"
            style={{
              padding: '8px 12px',
              background: onTrack ? 'rgba(6, 78, 59, 0.4)' : 'rgba(127, 29, 29, 0.4)',
              border: `1px solid ${onTrack ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}
          >
            <span style={{ fontSize: 14, flexShrink: 0 }}>{onTrack ? '\u2705' : '\u26A0\uFE0F'}</span>
            <div>
              <div className="font-bold" style={{ color: onTrack ? '#34d399' : '#f87171', fontSize: 12, lineHeight: 1.2 }}>
                {onTrack ? 'On Track!' : 'Shortfall'}
              </div>
              <div className="text-gray-400" style={{ fontSize: 10, lineHeight: 1.2 }}>
                {onTrack
                  ? `+${formatSGD(wealthAtRetirement - fireNumber)}`
                  : `Need ${formatSGD(fireNumber - wealthAtRetirement)}`}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar slot */}
        {toolbar && (
          <div className="flex items-center gap-2" style={{ flexShrink: 0, marginTop: 4 }}>
            {toolbar}
          </div>
        )}
      </div>

      {/* Legend row */}
      <div className="flex items-center gap-4" style={{ marginBottom: 6, paddingLeft: 2, flexShrink: 0 }}>
        {legendItems.map(item => (
          <span key={item.label} className="flex items-center gap-1 text-gray-400" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
            {item.type === 'box' && (
              <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: 'inline-block' }} />
            )}
            {item.type === 'line' && (
              <span style={{ width: 14, height: 3, borderRadius: 2, background: item.color, display: 'inline-block' }} />
            )}
            {item.type === 'dash' && (
              <span style={{ width: 14, height: 0, borderTop: `2px dashed ${item.color}`, display: 'inline-block' }} />
            )}
            {item.label}
          </span>
        ))}
      </div>

      {/* Chart */}
      <div
        className="bg-gray-800 rounded-xl border border-gray-700"
        style={{ flex: 1, minHeight: 350, padding: 16, position: 'relative' }}
      >
        <div style={{ position: 'absolute', top: 16, left: 16, right: 16, bottom: 16 }}>
          <Chart type="bar" data={data} options={options} />
        </div>
      </div>
    </div>
  );
}

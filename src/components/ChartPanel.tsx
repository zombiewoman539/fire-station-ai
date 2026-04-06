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
  cpfLifeMonthlyPayout?: number;
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

export default function ChartPanel({ results, retirementAge, cpfLifeMonthlyPayout = 0, toolbar, scenarioResults }: Props) {
  const { yearlyData, wealthAtRetirement, fireNumber, fireNumberBreakdown, yearsToBuild, onTrack, moneyRunsOutAge } = results;
  const [showFireBreakdown, setShowFireBreakdown] = React.useState(false);
  const [popupPos, setPopupPos] = React.useState({ top: 0, left: 0 });
  const [hideCash, setHideCash] = React.useState(true);
  const [hideInsurance, setHideInsurance] = React.useState(false);
  const fireCardRef = React.useRef<HTMLDivElement>(null);

  // Close breakdown on click outside
  React.useEffect(() => {
    if (!showFireBreakdown) return;
    const handler = () => setShowFireBreakdown(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showFireBreakdown]);

  const handleFireCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showFireBreakdown && fireCardRef.current) {
      const rect = fireCardRef.current.getBoundingClientRect();
      const popupWidth = 280;
      let left = rect.right - popupWidth;
      if (left < 8) left = 8;
      if (left + popupWidth > window.innerWidth - 8) left = window.innerWidth - popupWidth - 8;
      setPopupPos({ top: rect.bottom + 8, left });
    }
    setShowFireBreakdown(v => !v);
  };

  const labels = yearlyData.map(d => String(d.age));

  const visibleTotal = (d: { investments: number; cash: number; insuranceValue: number }) => {
    let t = d.investments;
    if (!hideCash) t += d.cash;
    if (!hideInsurance) t += d.insuranceValue;
    return t;
  };

  // Bars show scenario data when active; baseline line stays on results
  const activeYearlyData = scenarioResults ? scenarioResults.yearlyData : yearlyData;

  // Bar datasets: Investments, Cash, Insurance = 3 bars
  // Baseline net worth line is dataset index 3
  const BASELINE_LINE_IDX = 3;

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
        data: activeYearlyData.map(d => d.investments),
        backgroundColor: 'rgba(52, 211, 153, 0.80)',
        borderRadius: 2,
        stack: 'stack',
        order: 2,
      },
      {
        type: 'bar' as const,
        label: 'Cash Savings',
        data: hideCash ? activeYearlyData.map(() => 0) : activeYearlyData.map(d => d.cash),
        backgroundColor: 'rgba(251, 191, 36, 0.75)',
        borderRadius: 2,
        stack: 'stack',
        order: 2,
      },
      {
        type: 'bar' as const,
        label: 'Insurance Cash Value',
        data: hideInsurance ? activeYearlyData.map(() => 0) : activeYearlyData.map(d => d.insuranceValue),
        backgroundColor: 'rgba(244, 114, 182, 0.70)',
        borderRadius: 2,
        stack: 'stack',
        order: 2,
      },
      {
        type: 'line' as const,
        label: scenarioResults ? 'Baseline (No Event)' : 'Total Net Worth',
        data: yearlyData.map(d => visibleTotal(d)),
        borderColor: '#f472b6',
        backgroundColor: 'rgba(244, 114, 182, 0.08)',
        borderWidth: scenarioResults ? 1.5 : 2.5,
        borderDash: scenarioResults ? [4, 3] : [],
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.3,
        fill: false,
        order: 1,
      },
      ...(scenarioResults ? [{
        type: 'line' as const,
        label: 'With Event',
        data: scenarioResults.yearlyData.map(d => visibleTotal(d)),
        borderColor: '#ef4444',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.3,
        fill: {
          target: BASELINE_LINE_IDX,
          above: 'rgba(239, 68, 68, 0.0)',
          below: 'rgba(239, 68, 68, 0.18)',
        },
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
          label: (ctx: any) => {
            if (ctx.parsed.y === 0) return null;
            return `  ${ctx.dataset.label}: ${formatSGD(ctx.parsed.y)}`;
          },
          afterBody: (ctx: any[]) => {
            const idx = ctx[0].dataIndex;
            const d = yearlyData[idx];
            const lines: string[] = [];
            if (d.age >= 65 && cpfLifeMonthlyPayout > 0) {
              lines.push('', `  CPF LIFE income: +${formatSGD(cpfLifeMonthlyPayout)}/month`);
            }
            if (d.purchaseLabels.length > 0) {
              lines.push('', '  ' + d.purchaseLabels.join(', '));
            }
            return lines;
          },
        },
      },
      annotation: {
        annotations: {
          ...(scenarioResults ? {
            shortfallBracket: {
              type: 'line' as const,
              xMin: String(retirementAge),
              xMax: String(retirementAge),
              yMin: Math.min(results.wealthAtRetirement, scenarioResults.wealthAtRetirement),
              yMax: Math.max(results.wealthAtRetirement, scenarioResults.wealthAtRetirement),
              borderColor: 'rgba(239, 68, 68, 0.9)',
              borderWidth: 3,
              label: {
                display: true,
                content: `Gap: −${formatSGD(Math.abs(results.wealthAtRetirement - scenarioResults.wealthAtRetirement))}`,
                position: 'center' as const,
                backgroundColor: 'rgba(185, 28, 28, 0.92)',
                color: '#fff',
                font: { size: 11, weight: 'bold' as const },
                padding: { top: 4, bottom: 4, left: 8, right: 8 },
                borderRadius: 4,
              },
            },
          } : {}),
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
          ...(moneyRunsOutAge ? {
            depletionLine: {
              type: 'line' as const,
              xMin: String(moneyRunsOutAge),
              xMax: String(moneyRunsOutAge),
              borderColor: 'rgba(239, 68, 68, 0.9)',
              borderWidth: 2,
              borderDash: [4, 3],
              label: {
                display: true,
                content: `Funds depleted (age ${moneyRunsOutAge})`,
                position: 'end' as const,
                backgroundColor: 'rgba(185, 28, 28, 0.92)',
                color: '#fff',
                font: { size: 10, weight: 'bold' as const },
                padding: { top: 3, bottom: 3, left: 6, right: 6 },
                borderRadius: 3,
              },
            },
          } : {}),
          ...purchaseAnnotations,
        },
      },
    },
  };

  const legendItems = [
    { color: 'rgba(52, 211, 153, 0.80)',  label: 'Investments', type: 'box' },
    { color: 'rgba(251, 191, 36, 0.75)',  label: 'Cash', type: 'box' },
    { color: 'rgba(244, 114, 182, 0.70)', label: 'Insurance', type: 'box' },
    { color: '#f472b6', label: scenarioResults ? 'Baseline (No Event)' : 'Net Worth', type: scenarioResults ? 'dash' as const : 'line' as const },
    { color: 'rgba(251, 146, 60, 0.8)', label: 'Retirement', type: 'dash' as const },
    ...(scenarioResults ? [{ color: '#ef4444', label: 'With Event', type: 'line' as const }] : []),
  ];

  const numMetricCols = cpfLifeMonthlyPayout > 0 ? 5 : 4;

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '10px 16px 12px', background: '#111827', height: '100%', overflow: 'visible' }}>
      {/* Top row: metrics + toolbar */}
      <div className="flex items-start gap-2" style={{ marginBottom: 6, flexShrink: 0, overflow: 'visible' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${numMetricCols}, 1fr)`, gap: 8, flex: 1, overflow: 'visible' }}>
          <MetricCard label="Wealth at Retirement" value={formatSGD(wealthAtRetirement)} color="#34d399" />
          {cpfLifeMonthlyPayout > 0 && (
            <MetricCard label="CPF LIFE / month" value={formatSGD(cpfLifeMonthlyPayout)} color="#34d399" />
          )}
          {/* FIRE Number card with breakdown popup */}
          <div
            ref={fireCardRef}
            className="bg-gray-800 rounded-lg"
            style={{
              padding: '8px 12px', cursor: 'pointer',
              border: showFireBreakdown ? '1px solid rgba(96,165,250,0.5)' : '1px solid #374151',
              position: 'relative',
            }}
            onClick={handleFireCardClick}
          >
            <div className="text-gray-500 uppercase tracking-wider font-medium" style={{ fontSize: 9, marginBottom: 1, lineHeight: 1.2 }}>
              FIRE Number
            </div>
            <div className="font-bold" style={{ color: '#60a5fa', fontSize: 18 }}>{formatSGD(fireNumber)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <span style={{ fontSize: 9, color: '#4b5563' }}>{fireNumberBreakdown.withdrawalRate}% SWR</span>
              <span style={{ fontSize: 9, color: '#3b82f6' }}>ⓘ click</span>
            </div>
            {showFireBreakdown && (
              <div
                style={{
                  position: 'fixed', top: popupPos.top, left: popupPos.left, width: 280, zIndex: 9999,
                  background: '#1e293b', border: '1px solid #3b82f6',
                  borderRadius: 12, padding: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700 }}>How is FIRE Number calculated?</span>
                  <button onClick={() => setShowFireBreakdown(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <FireRow label="Retirement expenses today" value={formatSGD(fireNumberBreakdown.grossRetirementExpenses)} />
                  <FireRow
                    label={`+ ${fireNumberBreakdown.inflationRate}% inflation × ${fireNumberBreakdown.yearsToRetirement} yrs`}
                    value={formatSGD(fireNumberBreakdown.inflatedRetirementExpenses)}
                    color="#fbbf24"
                    bold
                  />
                  {fireNumberBreakdown.cpfLifeAnnual > 0 && (
                    <FireRow label="− CPF LIFE payout / yr" value={`− ${formatSGD(fireNumberBreakdown.cpfLifeAnnual)}`} color="#34d399" />
                  )}
                  <FireRow label="= Net drawdown needed / yr" value={formatSGD(fireNumberBreakdown.netDrawdownNeeded)} bold />
                  <div style={{ borderTop: '1px solid #334155', margin: '2px 0' }} />
                  <FireRow
                    label={`÷ ${fireNumberBreakdown.withdrawalRate}% Safe Withdrawal Rate`}
                    value={formatSGD(Math.round(fireNumberBreakdown.netDrawdownNeeded / (fireNumberBreakdown.withdrawalRate / 100)))}
                  />
                  <FireRow
                    label={`+ ${fireNumberBreakdown.inflationBuffer}% inflation buffer`}
                    value={formatSGD(fireNumber)}
                    color="#60a5fa"
                    bold
                  />
                </div>
                <div style={{ color: '#475569', fontSize: 10, marginTop: 10, lineHeight: 1.5, borderTop: '1px solid #334155', paddingTop: 8 }}>
                  The <strong style={{ color: '#94a3b8' }}>SWR method</strong> means you only withdraw {fireNumberBreakdown.withdrawalRate}% per year — the rest keeps compounding.{cpfLifeMonthlyPayout > 0 ? ' CPF LIFE reduces what the portfolio must cover from age 65.' : ''}
                </div>
              </div>
            )}
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
                {onTrack ? 'On Track!' : moneyRunsOutAge ? `Depleted at ${moneyRunsOutAge}` : 'Shortfall'}
              </div>
              <div className="text-gray-400" style={{ fontSize: 10, lineHeight: 1.2 }}>
                {onTrack
                  ? `+${formatSGD(wealthAtRetirement - fireNumber)}`
                  : moneyRunsOutAge
                    ? `${moneyRunsOutAge - retirementAge} yrs short of life expectancy`
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
      <div className="flex items-center gap-4" style={{ marginBottom: 6, paddingLeft: 2, flexShrink: 0, flexWrap: 'wrap' }}>
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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button
            onClick={() => setHideCash(v => !v)}
            style={{
              background: hideCash ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
              border: `1px solid ${hideCash ? 'rgba(251, 191, 36, 0.4)' : '#374151'}`,
              borderRadius: 6,
              color: hideCash ? '#fcd34d' : '#6b7280',
              padding: '3px 8px',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {hideCash ? '+ Cash' : '− Cash'}
          </button>
          <button
            onClick={() => setHideInsurance(v => !v)}
            style={{
              background: hideInsurance ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
              border: `1px solid ${hideInsurance ? 'rgba(251, 191, 36, 0.4)' : '#374151'}`,
              borderRadius: 6,
              color: hideInsurance ? '#fcd34d' : '#6b7280',
              padding: '3px 8px',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {hideInsurance ? '+ Insurance' : '− Insurance'}
          </button>
        </div>
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

import React from 'react';
import { FireInputs, FireResults } from '../types';
import { formatSGD } from '../calculations';
import ChartPanel from './ChartPanel';

interface Props {
  inputs: FireInputs;
  results: FireResults;
  clientName: string;
  onExit: () => void;
}

export default function PresentationMode({ inputs, results, clientName, onExit }: Props) {
  const { wealthAtRetirement, fireNumber, yearsToBuild, onTrack } = results;
  const { personal, income } = inputs;
  const yearsInRetirement = personal.lifeExpectancy - personal.retirementAge;
  const gap = fireNumber - wealthAtRetirement;
  const savingsRate = income.annualIncome > 0
    ? ((income.annualIncome - income.annualExpenses) / income.annualIncome * 100) : 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#0f172a', color: '#fff',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div className="flex items-center justify-between" style={{
        padding: '12px 24px',
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid #1e293b',
        flexShrink: 0,
      }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #f97316, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🔥</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{clientName}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>FIRE Projection Report</div>
          </div>
        </div>
        <button
          onClick={onExit}
          style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
            color: '#94a3b8', padding: '6px 16px', fontSize: 12, cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ✕ Exit Presentation
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Key stats */}
        <div style={{
          width: 320, flexShrink: 0, padding: '20px 24px',
          borderRight: '1px solid #1e293b', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {/* Client snapshot */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Client Snapshot
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Age', value: String(personal.currentAge) },
                { label: 'Retire At', value: String(personal.retirementAge) },
                { label: 'Income', value: formatSGD(income.annualIncome) },
                { label: 'Savings Rate', value: `${savingsRate.toFixed(0)}%` },
              ].map(item => (
                <div key={item.label} style={{
                  background: '#1e293b', borderRadius: 8, padding: '8px 10px',
                }}>
                  <div style={{ color: '#64748b', fontSize: 9, textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* FIRE Status - big card */}
          <div style={{
            background: onTrack
              ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.4), rgba(6, 95, 70, 0.2))'
              : 'linear-gradient(135deg, rgba(127, 29, 29, 0.4), rgba(153, 27, 27, 0.2))',
            border: `1px solid ${onTrack ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: 12, padding: '16px',
          }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{onTrack ? '✅' : '🚨'}</div>
            <div style={{
              color: onTrack ? '#34d399' : '#f87171',
              fontSize: 18, fontWeight: 800, marginBottom: 4,
            }}>
              {onTrack ? 'On Track for FIRE' : 'Action Required'}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>
              {onTrack
                ? `Projected surplus of ${formatSGD(wealthAtRetirement - fireNumber)} at retirement. Current plan supports ${yearsInRetirement} years of retirement.`
                : `${formatSGD(Math.abs(gap))} gap needs to be addressed. Without changes, funds may not last through retirement.`
              }
            </div>
          </div>

          {/* Key numbers */}
          <div>
            <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Key Numbers
            </div>
            {[
              { label: 'Wealth at Retirement', value: formatSGD(wealthAtRetirement), color: '#34d399' },
              { label: 'FIRE Number Needed', value: formatSGD(fireNumber), color: '#60a5fa' },
              { label: 'Years to FIRE', value: `${yearsToBuild} years`, color: '#fbbf24' },
              { label: onTrack ? 'Surplus' : 'Shortfall', value: formatSGD(Math.abs(gap)), color: onTrack ? '#34d399' : '#f87171' },
              { label: 'Retirement Duration', value: `${yearsInRetirement} years`, color: '#a78bfa' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between" style={{
                padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{item.label}</span>
                <span style={{ color: item.color, fontSize: 14, fontWeight: 700 }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* If shortfall - urgency call to action */}
          {!onTrack && (
            <div style={{
              background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)',
              borderRadius: 10, padding: 14,
            }}>
              <div style={{ color: '#fbbf24', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                📋 Recommended Next Steps
              </div>
              <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.6 }}>
                1. Review current expense allocations<br />
                2. Explore higher-return investment options<br />
                3. Consider additional insurance coverage<br />
                4. Evaluate retirement age flexibility<br />
                5. Set up a recurring wealth review
              </div>
            </div>
          )}
        </div>

        {/* Right: Chart */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ChartPanel results={results} retirementAge={personal.retirementAge} cpfLifeMonthlyPayout={inputs.income.cpfLifeMonthlyPayout} />
        </div>
      </div>
    </div>
  );
}

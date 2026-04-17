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

const FREQ_LABEL: Record<string, string> = {
  monthly: '/mth', quarterly: '/qtr', 'semi-annual': '/half-yr', annual: '/yr',
};

const STATUS_COLOR: Record<string, string> = {
  'in-force': '#34d399',
  'lapsed': '#f87171',
  'surrendered': '#94a3b8',
  'claimed': '#60a5fa',
  'matured': '#a78bfa',
};

const ANNUAL_MULTIPLIER: Record<string, number> = {
  monthly: 12, quarterly: 4, 'semi-annual': 2, annual: 1,
};

function annualPremium(p: { premiumAmount: number; premiumFrequency: string }): number {
  return p.premiumAmount * (ANNUAL_MULTIPLIER[p.premiumFrequency] ?? 12);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function PresentationMode({ inputs, results, clientName, onExit }: Props) {
  const { wealthAtRetirement, fireNumber, yearsToBuild, onTrack } = results;
  const { personal, income, policies, purchases, estatePlanning } = inputs;
  const yearsInRetirement = personal.lifeExpectancy - personal.retirementAge;
  const gap = fireNumber - wealthAtRetirement;
  const savingsRate = income.annualIncome > 0
    ? ((income.annualIncome - income.annualExpenses) / income.annualIncome * 100) : 0;

  // Insurance totals (in-force policies only)
  const inForcePolicies = policies.filter(p => p.policyStatus === 'in-force');
  const totalDeath = inForcePolicies.reduce((s, p) => s + (p.deathSumAssured || 0), 0);
  const totalTPD   = inForcePolicies.reduce((s, p) => s + (p.tpdSumAssured || 0), 0);
  const totalCI    = inForcePolicies.reduce((s, p) => s + (p.ciSumAssured || 0), 0);

  // Upcoming purchases (age >= currentAge), sorted by age
  const upcomingPurchases = [...purchases]
    .filter(p => p.age >= personal.currentAge)
    .sort((a, b) => a.age - b.age);

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
      {children}
    </div>
  );

  return (
    <div className="presentation-overlay" style={{
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
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {/* Client snapshot */}
          <div>
            <SectionLabel>Client Snapshot</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Age', value: String(personal.currentAge) },
                { label: 'Retire At', value: String(personal.retirementAge) },
                { label: 'Income', value: formatSGD(income.annualIncome) },
                { label: 'Savings Rate', value: `${savingsRate.toFixed(0)}%` },
              ].map(item => (
                <div key={item.label} style={{ background: '#1e293b', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ color: '#64748b', fontSize: 9, textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* FIRE Status */}
          <div style={{
            background: onTrack
              ? 'linear-gradient(135deg, rgba(6,78,59,0.4), rgba(6,95,70,0.2))'
              : 'linear-gradient(135deg, rgba(127,29,29,0.4), rgba(153,27,27,0.2))',
            border: `1px solid ${onTrack ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 12, padding: '16px',
          }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{onTrack ? '✅' : '🚨'}</div>
            <div style={{ color: onTrack ? '#34d399' : '#f87171', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
              {onTrack ? 'On Track for FIRE' : 'Action Required'}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>
              {onTrack
                ? `Projected surplus of ${formatSGD(wealthAtRetirement - fireNumber)} at retirement. Supports ${yearsInRetirement} years of retirement.`
                : `${formatSGD(Math.abs(gap))} gap needs to be addressed.`}
            </div>
          </div>

          {/* Key numbers */}
          <div>
            <SectionLabel>Key Numbers</SectionLabel>
            {[
              { label: 'Wealth at Retirement', value: formatSGD(wealthAtRetirement), color: '#34d399' },
              { label: 'FIRE Number Needed',   value: formatSGD(fireNumber),          color: '#60a5fa' },
              { label: 'Years to FIRE',        value: `${yearsToBuild} years`,         color: '#fbbf24' },
              { label: onTrack ? 'Surplus' : 'Shortfall', value: formatSGD(Math.abs(gap)), color: onTrack ? '#34d399' : '#f87171' },
              { label: 'Retirement Duration',  value: `${yearsInRetirement} years`,    color: '#a78bfa' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between" style={{ padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{item.label}</span>
                <span style={{ color: item.color, fontSize: 13, fontWeight: 700 }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Protection coverage */}
          {policies.length > 0 && (
            <div>
              <SectionLabel>Protection Coverage</SectionLabel>

              {/* Coverage totals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
                {[
                  { label: '☠️ Death', value: totalDeath },
                  { label: '🦽 TPD',   value: totalTPD },
                  { label: '🏥 CI',    value: totalCI },
                ].map(item => (
                  <div key={item.label} style={{ background: '#1e293b', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ color: '#64748b', fontSize: 9, marginBottom: 3 }}>{item.label}</div>
                    <div style={{ color: item.value > 0 ? '#e2e8f0' : '#475569', fontSize: 11, fontWeight: 700 }}>
                      {item.value > 0 ? formatSGD(item.value) : '—'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Per-policy list */}
              {policies.map(p => (
                <div key={p.id} style={{
                  background: '#1e293b', borderRadius: 8, padding: '10px 12px', marginBottom: 6,
                  borderLeft: `3px solid ${STATUS_COLOR[p.policyStatus] ?? '#64748b'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.3 }}>
                      {p.name}
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                      background: `${STATUS_COLOR[p.policyStatus] ?? '#64748b'}22`,
                      color: STATUS_COLOR[p.policyStatus] ?? '#64748b',
                      border: `1px solid ${STATUS_COLOR[p.policyStatus] ?? '#64748b'}44`,
                      whiteSpace: 'nowrap', marginLeft: 6,
                    }}>
                      {p.policyStatus.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  </div>
                  {p.insurer && (
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{p.insurer}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {p.deathSumAssured > 0 && (
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>☠️ {formatSGD(p.deathSumAssured)}</span>
                    )}
                    {p.tpdSumAssured > 0 && (
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>🦽 {formatSGD(p.tpdSumAssured)}</span>
                    )}
                    {p.ciSumAssured > 0 && (
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>🏥 {formatSGD(p.ciSumAssured)}</span>
                    )}
                    {p.premiumAmount > 0 && (
                      <span style={{ fontSize: 10, color: '#475569' }}>
                        {formatSGD(p.premiumAmount)}{FREQ_LABEL[p.premiumFrequency] ?? ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Premium Schedule */}
          {inForcePolicies.length > 0 && (
            <div>
              <SectionLabel>Premium Schedule</SectionLabel>

              {/* Total annual cost */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#1e293b', borderRadius: 8, padding: '8px 12px', marginBottom: 10,
              }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Total Annual Premium</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#fbbf24' }}>
                  {formatSGD(inForcePolicies.reduce((s, p) => s + annualPremium(p), 0))}/yr
                </span>
              </div>

              {/* Per-policy rows */}
              {inForcePolicies.map(p => {
                const days = daysUntil(p.premiumNextDueDate);
                const isUrgent = days !== null && days >= 0 && days <= 30;
                const isSoon   = days !== null && days > 30 && days <= 90;
                const isOverdue = days !== null && days < 0;
                const dateColor = isOverdue ? '#f87171' : isUrgent ? '#fb923c' : isSoon ? '#fbbf24' : '#64748b';
                return (
                  <div key={p.id} style={{
                    background: '#1e293b', borderRadius: 8, padding: '9px 12px', marginBottom: 5,
                    borderLeft: `3px solid ${isOverdue ? '#f87171' : isUrgent ? '#fb923c' : isSoon ? '#fbbf24' : '#334155'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{p.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
                        {formatSGD(p.premiumAmount)}{FREQ_LABEL[p.premiumFrequency] ?? ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: '#475569' }}>
                        {formatSGD(annualPremium(p))}/yr
                      </span>
                      <span style={{ fontSize: 10, color: dateColor }}>
                        {isOverdue && '⚠ Overdue · '}
                        {isUrgent && '🔴 Due soon · '}
                        {isSoon && '🟡 '}
                        Next: {formatDate(p.premiumNextDueDate)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upcoming life goals */}
          {upcomingPurchases.length > 0 && (
            <div>
              <SectionLabel>Life Goals</SectionLabel>
              {upcomingPurchases.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: '#475569' }}>Age {p.age}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {p.lumpSum > 0 && (
                      <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>{formatSGD(p.lumpSum)}</div>
                    )}
                    {p.recurringCost > 0 && (
                      <div style={{ fontSize: 10, color: '#64748b' }}>{formatSGD(p.recurringCost)}/yr × {p.recurringYears}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Estate planning */}
          {(estatePlanning?.lpa !== undefined || estatePlanning?.will !== undefined) && (
            <div>
              <SectionLabel>Estate Planning</SectionLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'LPA', done: estatePlanning?.lpa ?? false },
                  { label: 'Will', done: estatePlanning?.will ?? false },
                ].map(item => (
                  <div key={item.label} style={{
                    flex: 1, background: item.done ? 'rgba(99,102,241,0.15)' : '#1e293b',
                    border: `1px solid ${item.done ? 'rgba(99,102,241,0.4)' : '#334155'}`,
                    borderRadius: 8, padding: '8px 10px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: item.done ? '#818cf8' : '#475569' }}>
                      {item.done ? '✓ ' : ''}{item.label}
                    </div>
                    <div style={{ fontSize: 9, color: item.done ? '#818cf8' : '#334155', marginTop: 2 }}>
                      {item.done ? 'Done' : 'Pending'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shortfall actions */}
          {!onTrack && (
            <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: 14 }}>
              <div style={{ color: '#fbbf24', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📋 Recommended Next Steps</div>
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
          <ChartPanel results={results} retirementAge={personal.retirementAge} cpfLifeMonthlyPayout={inputs.income.cpfLifeMonthlyPayout} isDark={true} />
        </div>
      </div>
    </div>
  );
}

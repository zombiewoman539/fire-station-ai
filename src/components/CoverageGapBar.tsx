import React from 'react';
import { FireInputs } from '../types';
import { formatSGD } from '../calculations';

interface Props {
  inputs: FireInputs;
  compact?: boolean;
}

function coverageColor(pct: number): string {
  if (pct >= 80) return '#34d399';
  if (pct >= 40) return '#fbbf24';
  return '#f87171';
}

function coverageBg(pct: number): string {
  if (pct >= 80) return 'rgba(52,211,153,0.07)';
  if (pct >= 40) return 'rgba(251,191,36,0.07)';
  return 'rgba(248,113,113,0.07)';
}

function coverageBorder(pct: number): string {
  if (pct >= 80) return 'rgba(52,211,153,0.22)';
  if (pct >= 40) return 'rgba(251,191,36,0.22)';
  return 'rgba(248,113,113,0.22)';
}

export default function CoverageGapBar({ inputs, compact = false }: Props) {
  const { policies, income } = inputs;
  const annualIncome = income.annualIncome;

  if (annualIncome === 0) return null;

  // Only in-force policies contribute to protection
  const inForce = policies.filter(p => p.policyStatus === 'in-force');
  const currentDeath = inForce.reduce((s, p) => s + (p.deathSumAssured || 0), 0);
  const currentTPD   = inForce.reduce((s, p) => s + (p.tpdSumAssured   || 0), 0);
  const currentECI   = inForce.reduce((s, p) => s + (p.eciSumAssured   || 0), 0);
  const currentCI    = inForce.reduce((s, p) => s + (p.ciSumAssured    || 0), 0);

  // Singapore industry benchmarks
  const neededDeath = annualIncome * 10;
  const neededTPD   = annualIncome * 10;
  const neededECI   = annualIncome * 5;
  const neededCI    = annualIncome * 5;

  const items = [
    {
      key: 'death',
      icon: '☠️',
      label: 'Death',
      current: currentDeath,
      needed: neededDeath,
      pct: Math.min(100, Math.round((currentDeath / neededDeath) * 100)),
      gap: Math.max(0, neededDeath - currentDeath),
    },
    {
      key: 'tpd',
      icon: '🦽',
      label: 'TPD',
      current: currentTPD,
      needed: neededTPD,
      pct: Math.min(100, Math.round((currentTPD / neededTPD) * 100)),
      gap: Math.max(0, neededTPD - currentTPD),
    },
    {
      key: 'eci',
      icon: '⚡',
      label: 'ECI',
      current: currentECI,
      needed: neededECI,
      pct: Math.min(100, Math.round((currentECI / neededECI) * 100)),
      gap: Math.max(0, neededECI - currentECI),
    },
    {
      key: 'ci',
      icon: '🏥',
      label: 'Major CI',
      current: currentCI,
      needed: neededCI,
      pct: Math.min(100, Math.round((currentCI / neededCI) * 100)),
      gap: Math.max(0, neededCI - currentCI),
    },
  ];

  const criticalCount = items.filter(i => i.pct < 40).length;
  const totalGap = items.reduce((s, i) => s + i.gap, 0);

  // ── Compact strip (used inside drawer) ────────────────────────────────────
  if (compact) {
    return (
      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
          Coverage
        </span>
        <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 0 }}>
          {items.map(item => {
            const color = coverageColor(item.pct);
            return (
              <div key={item.key} style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-4)', fontWeight: 600 }}>
                    {item.icon} {item.label}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color }}>{item.pct}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${item.pct}%`,
                    background: item.pct < 40
                      ? 'linear-gradient(90deg, #ef4444, #f87171)'
                      : item.pct < 80
                        ? 'linear-gradient(90deg, #d97706, #fbbf24)'
                        : 'linear-gradient(90deg, #059669, #34d399)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
        {criticalCount > 0 && (
          <span style={{
            flexShrink: 0,
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171', fontSize: 9, fontWeight: 700,
            padding: '2px 7px', borderRadius: 8,
          }}>
            {criticalCount} gap{criticalCount > 1 ? 's' : ''}
          </span>
        )}
        {criticalCount === 0 && totalGap === 0 && (
          <span style={{
            flexShrink: 0,
            background: 'rgba(52,211,153,0.15)',
            border: '1px solid rgba(52,211,153,0.3)',
            color: '#34d399', fontSize: 9, fontWeight: 700,
            padding: '2px 7px', borderRadius: 8,
          }}>
            ✓ Covered
          </span>
        )}
      </div>
    );
  }

  // ── Full cards (used standalone above chart) ──────────────────────────────
  return (
    <div style={{
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      padding: '10px 16px 12px',
      flexShrink: 0,
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
            textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            Protection Coverage
          </span>
          {criticalCount > 0 && (
            <span style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: 10, fontWeight: 700,
              padding: '1px 8px', borderRadius: 10,
            }}>
              {criticalCount} critical gap{criticalCount > 1 ? 's' : ''}
            </span>
          )}
          {criticalCount === 0 && totalGap === 0 && (
            <span style={{
              background: 'rgba(52,211,153,0.15)',
              border: '1px solid rgba(52,211,153,0.3)',
              color: '#34d399', fontSize: 10, fontWeight: 700,
              padding: '1px 8px', borderRadius: 10,
            }}>
              ✓ Fully covered
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-5)', fontStyle: 'italic' }}>
          Recommended: 10× income for Death &amp; TPD · 5× income for CI
        </span>
      </div>

      {/* Three coverage cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {items.map(item => {
          const color  = coverageColor(item.pct);
          const bg     = coverageBg(item.pct);
          const border = coverageBorder(item.pct);
          const fully  = item.gap === 0;

          return (
            <div key={item.key} style={{
              background: bg, border: `1px solid ${border}`,
              borderRadius: 10, padding: '10px 12px',
            }}>
              {/* Label + percentage */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
                    {item.label}
                  </span>
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 800, color,
                  minWidth: 36, textAlign: 'right',
                }}>
                  {item.pct}%
                </span>
              </div>

              {/* Progress bar */}
              <div style={{
                height: 6, borderRadius: 3,
                background: 'var(--border)', marginBottom: 8,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${item.pct}%`,
                  background: item.pct === 0
                    ? '#ef4444'
                    : item.pct < 40
                      ? 'linear-gradient(90deg, #ef4444, #f87171)'
                      : item.pct < 80
                        ? 'linear-gradient(90deg, #d97706, #fbbf24)'
                        : 'linear-gradient(90deg, #059669, #34d399)',
                  transition: 'width 0.5s ease',
                }} />
              </div>

              {/* Amounts */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-end',
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', lineHeight: 1.3 }}>
                    {item.current > 0 ? formatSGD(item.current) : 'None'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-5)' }}>
                    of {formatSGD(item.needed)}
                  </div>
                </div>

                {fully ? (
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#34d399',
                  }}>
                    ✓ Covered
                  </span>
                ) : (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 12, fontWeight: 800, color,
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                      {item.pct === 0 ? '🚨' : '⚠️'}
                      <span>{formatSGD(item.gap)}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-5)' }}>
                      gap
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Urgency footer when there are critical gaps */}
      {criticalCount > 0 && (
        <div style={{
          marginTop: 10,
          padding: '8px 12px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>
            🚨 Total protection gap: {formatSGD(totalGap)} — every year without cover is a risk the client carries unprotected.
          </div>
          <div style={{
            fontSize: 10, color: '#fca5a5', whiteSpace: 'nowrap', marginLeft: 12,
            fontStyle: 'italic',
          }}>
            Use the What If tab to model the impact →
          </div>
        </div>
      )}
    </div>
  );
}

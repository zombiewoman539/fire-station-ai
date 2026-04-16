import React from 'react';
import { FireInputs, FireResults } from '../types';
import { formatSGD } from '../calculations';

interface Props {
  inputs: FireInputs;
  results: FireResults;
}

interface Milestone {
  label: string;
  target: number;
  age: number | null; // age when reached, or null if never
  reached: boolean;
  icon: string;
}

export default function MilestoneTracker({ inputs, results }: Props) {
  const { yearlyData, fireNumber } = results;
  const { currentAge } = inputs.personal;

  // Define milestones
  const milestoneTargets = [
    { label: 'Emergency Fund (6 months)', target: inputs.income.annualExpenses / 2, icon: '🏥' },
    { label: 'First S$100k', target: 100000, icon: '💯' },
    { label: 'Quarter Million', target: 250000, icon: '📈' },
    { label: 'Half Million', target: 500000, icon: '⭐' },
    { label: 'Millionaire', target: 1000000, icon: '🎉' },
    { label: 'FIRE Number', target: fireNumber, icon: '🔥' },
  ].filter(m => m.target > 0);

  const milestones: Milestone[] = milestoneTargets.map(m => {
    const yearIdx = yearlyData.findIndex(d => d.totalNetWorth >= m.target);
    return {
      ...m,
      age: yearIdx >= 0 ? yearlyData[yearIdx].age : null,
      reached: yearIdx >= 0 && yearlyData[yearIdx].age <= currentAge,
    };
  });

  // Current progress
  const currentNetWorth = yearlyData.length > 0 ? yearlyData[0].totalNetWorth : 0;
  const nextMilestone = milestones.find(m => currentNetWorth < m.target);
  const progressToNext = nextMilestone
    ? Math.min(100, (currentNetWorth / nextMilestone.target) * 100)
    : 100;

  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>🏁</span>
        <span style={{ color: 'var(--text-1)', fontSize: 13, fontWeight: 700 }}>Wealth Milestones</span>
      </div>

      {/* Progress to next milestone */}
      {nextMilestone && (
        <div style={{
          background: 'rgba(96, 165, 250, 0.1)', border: '1px solid rgba(96, 165, 250, 0.2)',
          borderRadius: 10, padding: '10px 12px', marginBottom: 10,
        }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span style={{ color: '#93c5fd', fontSize: 11, fontWeight: 600 }}>
              Next: {nextMilestone.label}
            </span>
            <span style={{ color: '#60a5fa', fontSize: 11, fontWeight: 700 }}>
              {progressToNext.toFixed(0)}%
            </span>
          </div>
          <div style={{
            height: 6, borderRadius: 3, background: 'rgba(96, 165, 250, 0.15)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 3, width: `${progressToNext}%`,
              background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ color: '#6b7280', fontSize: 10, marginTop: 4 }}>
            {formatSGD(currentNetWorth)} of {formatSGD(nextMilestone.target)}
            {nextMilestone.age && ` — projected by age ${nextMilestone.age}`}
          </div>
        </div>
      )}

      {/* Milestone list */}
      <div style={{ maxHeight: 160, overflowY: 'auto' }}>
        {milestones.map((m, i) => {
          const isPast = m.reached;
          const isFuture = m.age !== null && !m.reached;
          const isUnreachable = m.age === null;

          return (
            <div key={i} className="flex items-center gap-2" style={{
              padding: '6px 4px',
              borderBottom: i < milestones.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              opacity: isUnreachable ? 0.5 : 1,
            }}>
              <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>{m.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: isPast ? '#34d399' : isFuture ? 'var(--text-1)' : 'var(--text-4)',
                  fontSize: 11, fontWeight: 600,
                  textDecoration: isPast ? 'none' : 'none',
                }}>
                  {m.label}
                </div>
                <div style={{ color: 'var(--text-5)', fontSize: 10 }}>
                  {formatSGD(m.target)}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {isPast && (
                  <span style={{ color: '#34d399', fontSize: 10, fontWeight: 700 }}>
                    ✓ Done
                  </span>
                )}
                {isFuture && (
                  <span style={{ color: '#9ca3af', fontSize: 10 }}>
                    Age {m.age}
                  </span>
                )}
                {isUnreachable && (
                  <span style={{ color: '#f87171', fontSize: 10, fontWeight: 600 }}>
                    Not reached
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { FireInputs } from '../types';

interface Props {
  inputs: FireInputs;
}

// Singapore premium inflection points (industry-wide)
const RISK_AGE     = 40; // CI & life premiums rise ~20–30%
const CRITICAL_AGE = 45; // further ~50% increase
const CUTOFF_AGE   = 55; // beyond here, many products unavailable

export default function UrgencyTimeline({ inputs }: Props) {
  const { personal, income, policies } = inputs;
  const age = personal.currentAge;
  const retirementAge = personal.retirementAge;

  // Only show if there are protection gaps
  const inForce = policies.filter(p => p.policyStatus === 'in-force');
  const totalDeath = inForce.reduce((s, p) => s + (p.deathSumAssured || 0), 0);
  const totalTPD   = inForce.reduce((s, p) => s + (p.tpdSumAssured   || 0), 0);
  const totalCI    = inForce.reduce((s, p) => s + (p.ciSumAssured    || 0), 0);

  const neededDeath = income.annualIncome * 10;
  const neededTPD   = income.annualIncome * 10;
  const neededCI    = income.annualIncome * 5;

  const hasDeathGap = totalDeath < neededDeath;
  const hasTPDGap   = totalTPD   < neededTPD;
  const hasCIGap    = totalCI    < neededCI;
  const hasAnyGap   = hasDeathGap || hasTPDGap || hasCIGap;

  // Don't show if no gaps or already past cutoff
  if (!hasAnyGap || income.annualIncome === 0) return null;

  // ── Message based on where they sit on the timeline ──────────────────────
  const yearsToRisk     = Math.max(0, RISK_AGE     - age);
  const yearsToCritical = Math.max(0, CRITICAL_AGE - age);

  let urgencyLevel: 'green' | 'amber' | 'red' | 'critical';
  let headline: string;
  let subtext: string;

  if (age < RISK_AGE) {
    urgencyLevel = 'green';
    headline = `Act within ${yearsToRisk} year${yearsToRisk !== 1 ? 's' : ''} — lock in today's lower premiums`;
    subtext = `After age ${RISK_AGE}, CI and life insurance premiums typically rise 20–30%. Every year you wait costs more to get the same coverage.`;
  } else if (age < CRITICAL_AGE) {
    urgencyLevel = 'amber';
    headline = `Premiums have already risen — ${yearsToCritical} year${yearsToCritical !== 1 ? 's' : ''} before the next major increase`;
    subtext = `You're in the rising-cost zone. After age ${CRITICAL_AGE}, premiums increase significantly again and some products become harder to qualify for.`;
  } else if (age < CUTOFF_AGE) {
    urgencyLevel = 'red';
    headline = `High-cost window — some products may no longer be available`;
    subtext = `After age ${CUTOFF_AGE}, comprehensive CI and life coverage becomes substantially more expensive. Closing gaps now is critical.`;
  } else {
    urgencyLevel = 'critical';
    headline = `Coverage is most expensive at this age — gaps are urgent`;
    subtext = `Options narrow significantly after ${CUTOFF_AGE}. Focus on whatever coverage is still available to protect your family.`;
  }

  // ── Timeline geometry ─────────────────────────────────────────────────────
  const timelineEnd = Math.max(retirementAge, CUTOFF_AGE + 5);
  const totalSpan   = timelineEnd - age;

  const pct = (a: number) => Math.min(100, Math.max(0, ((a - age) / totalSpan) * 100));

  const riskPct     = pct(RISK_AGE);
  const criticalPct = pct(CRITICAL_AGE);
  const cutoffPct   = pct(CUTOFF_AGE);
  const retirePct   = pct(retirementAge);

  // ── Color scheme per urgency ──────────────────────────────────────────────
  const scheme = {
    green:    { accent: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)'  },
    amber:    { accent: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)'  },
    red:      { accent: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)'  },
    critical: { accent: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)'   },
  }[urgencyLevel];

  // Gap labels for the callout
  const gapLabels = [
    hasDeathGap && 'Death',
    hasTPDGap   && 'TPD',
    hasCIGap    && 'CI',
  ].filter(Boolean).join(' · ');

  return (
    <div style={{
      margin: '0 0 12px',
      background: scheme.bg,
      border: `1px solid ${scheme.border}`,
      borderRadius: 12,
      padding: '12px 14px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⏰</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: scheme.accent, marginBottom: 2, lineHeight: 1.3 }}>
            {headline}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.5 }}>
            {subtext}
          </div>
        </div>
        <div style={{
          flexShrink: 0, background: scheme.border,
          borderRadius: 6, padding: '3px 8px',
          fontSize: 10, fontWeight: 700, color: scheme.accent,
          whiteSpace: 'nowrap',
        }}>
          Gaps: {gapLabels}
        </div>
      </div>

      {/* Timeline bar */}
      <div style={{ position: 'relative', height: 28, userSelect: 'none' }}>
        {/* Background track */}
        <div style={{
          position: 'absolute', top: 10, left: 0, right: 0, height: 8, borderRadius: 4,
          background: 'var(--border)', overflow: 'hidden',
        }}>
          {/* Green zone: today → risk age */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: `${Math.min(riskPct, 100)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #059669, #34d399)',
          }} />
          {/* Amber zone: risk → critical */}
          <div style={{
            position: 'absolute', top: 0,
            left: `${riskPct}%`,
            width: `${Math.max(0, criticalPct - riskPct)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #d97706, #fbbf24)',
          }} />
          {/* Red zone: critical → cutoff */}
          <div style={{
            position: 'absolute', top: 0,
            left: `${criticalPct}%`,
            width: `${Math.max(0, cutoffPct - criticalPct)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #ea580c, #f97316)',
          }} />
          {/* Dark red zone: cutoff → end */}
          <div style={{
            position: 'absolute', top: 0,
            left: `${cutoffPct}%`,
            width: `${Math.max(0, 100 - cutoffPct)}%`,
            height: '100%',
            background: '#b91c1c',
          }} />
        </div>

        {/* TODAY marker */}
        <div style={{
          position: 'absolute', left: 0, top: 6,
          width: 16, height: 16, borderRadius: '50%',
          background: scheme.accent,
          border: '2px solid var(--deep)',
          transform: 'translateX(-50%)',
          zIndex: 2,
        }} />

        {/* Milestone ticks */}
        {[
          { pct: riskPct,     label: `${RISK_AGE}`,     sub: 'Premiums rise',  color: '#fbbf24' },
          { pct: criticalPct, label: `${CRITICAL_AGE}`, sub: '+50% more',      color: '#f97316' },
          { pct: cutoffPct,   label: `${CUTOFF_AGE}`,   sub: 'Limited options',color: '#f87171' },
          { pct: retirePct,   label: `${retirementAge}`,sub: 'Retirement',     color: 'var(--text-4)' },
        ].filter(m => m.pct > 2 && m.pct < 99).map(m => (
          <div key={m.label} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, transform: 'translateX(-50%)' }}>
            <div style={{
              position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
              width: 2, height: 10, background: 'var(--surface)', borderRadius: 1, zIndex: 1,
            }} />
          </div>
        ))}

        {/* Labels below bar */}
        <div style={{ position: 'absolute', top: 22, left: 0, right: 0, fontSize: 9, color: 'var(--text-5)' }}>
          <span style={{ position: 'absolute', left: 0, color: scheme.accent, fontWeight: 700 }}>
            Age {age}
          </span>
          {riskPct > 10 && riskPct < 90 && (
            <span style={{ position: 'absolute', left: `${riskPct}%`, transform: 'translateX(-50%)', color: '#fbbf24', whiteSpace: 'nowrap' }}>
              {RISK_AGE}
            </span>
          )}
          {criticalPct > 15 && criticalPct < 90 && (
            <span style={{ position: 'absolute', left: `${criticalPct}%`, transform: 'translateX(-50%)', color: '#f97316', whiteSpace: 'nowrap' }}>
              {CRITICAL_AGE}
            </span>
          )}
          {retirePct > 10 && retirePct < 98 && (
            <span style={{ position: 'absolute', left: `${retirePct}%`, transform: 'translateX(-50%)', color: 'var(--text-4)', whiteSpace: 'nowrap' }}>
              {retirementAge}
            </span>
          )}
          <span style={{ position: 'absolute', right: 0, color: 'var(--text-5)' }}>
            Age {timelineEnd}
          </span>
        </div>
      </div>

      {/* Zone legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        {[
          { color: '#34d399', label: 'Best rates now' },
          { color: '#fbbf24', label: `+20–30% after ${RISK_AGE}` },
          { color: '#f97316', label: `+50% after ${CRITICAL_AGE}` },
          { color: '#b91c1c', label: `Limited after ${CUTOFF_AGE}` },
        ].map(z => (
          <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 6, borderRadius: 2, background: z.color, flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: 'var(--text-5)' }}>{z.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

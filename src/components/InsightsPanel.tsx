import React from 'react';
import { FireInputs, FireResults } from '../types';
import { formatSGD } from '../calculations';
import UrgencyTimeline from './UrgencyTimeline';
import { useIsDark } from '../useIsDark';
import { INSURANCE_BENCHMARK } from '../insuranceCompute';

interface Props {
  inputs: FireInputs;
  results: FireResults;
  proposedResults?: FireResults | null;
  hasProposed?: boolean;
  proposedMonthlyPremium?: number;
  extraInvestmentTiers?: Array<{
    extra: number;
    yearsToBuild: number | null;
    onTrack: boolean;
    wealthAtRetirement: number;
  }>;
}

interface Insight {
  type: 'danger' | 'warning' | 'success' | 'info';
  icon: string;
  title: string;
  detail: string;
  action?: string;
}

function generateInsights(
  inputs: FireInputs,
  results: FireResults,
  extraTiers: Props['extraInvestmentTiers'],
  proposedResults: FireResults | null | undefined,
  hasProposed: boolean,
  proposedMonthlyPremium: number,
): Insight[] {
  const insights: Insight[] = [];
  const { personal, income, policies, purchases } = inputs;
  const { wealthAtRetirement, fireNumber, onTrack, yearlyData, yearsToBuild } = results;

  const yearsToRetirement = personal.retirementAge - personal.currentAge;
  const yearsInRetirement = personal.lifeExpectancy - personal.retirementAge;
  const savingsRate = income.annualIncome > 0
    ? ((income.annualIncome - income.annualExpenses) / income.annualIncome * 100)
    : 0;
  const fireAge = yearsToBuild != null ? personal.currentAge + Math.round(yearsToBuild) : null;

  // 1. FIRE status
  if (!onTrack) {
    const gap = fireNumber - wealthAtRetirement;
    const monthlyExtra = gap / (yearsToRetirement * 12);
    insights.push({
      type: 'danger',
      icon: '🚨',
      title: `${formatSGD(gap)} short of FIRE at retirement`,
      detail: `At retirement you'll have ${formatSGD(wealthAtRetirement)} — ${formatSGD(gap)} below the ${formatSGD(fireNumber)} needed to sustain ${yearsInRetirement} years at ${formatSGD(income.retirementExpenses)}/yr.`,
      action: `An extra ${formatSGD(monthlyExtra)}/month invested, or a 1–2% return improvement, would close this gap.`,
    });
  } else {
    const surplus = wealthAtRetirement - fireNumber;
    const fireLabel = fireAge != null && fireAge < personal.retirementAge
      ? `Hits FIRE number at age ${fireAge} — ${personal.retirementAge - fireAge} years early.`
      : `On track to retire at ${personal.retirementAge}.`;
    insights.push({
      type: 'success',
      icon: '🎯',
      title: `${formatSGD(wealthAtRetirement)} at retirement — on track`,
      detail: `${fireLabel} That's ${formatSGD(surplus)} above the FIRE number, covering an extra ${Math.round(surplus / income.retirementExpenses)} years of expenses.`,
    });
  }

  // 2. +$X/month investment impact
  if (extraTiers && extraTiers.length > 0) {
    const baseline = yearsToBuild;
    const hit = extraTiers.find(t => {
      if (!onTrack && t.onTrack) return true;
      if (baseline != null && t.yearsToBuild != null && baseline - t.yearsToBuild >= 1) return true;
      return false;
    });
    if (hit) {
      const yearDiff = baseline != null && hit.yearsToBuild != null
        ? Math.round(baseline - hit.yearsToBuild)
        : null;
      const flipText = !onTrack && hit.onTrack
        ? `puts you back on track for retirement`
        : yearDiff != null
          ? `moves your FIRE date ${yearDiff} year${yearDiff !== 1 ? 's' : ''} earlier`
          : `improves your retirement position`;
      insights.push({
        type: 'info',
        icon: '💰',
        title: `Invest ${formatSGD(hit.extra)}/mo more → retire earlier`,
        detail: `Adding just ${formatSGD(hit.extra)}/month to investments ${flipText} — retirement wealth rises to ${formatSGD(hit.wealthAtRetirement)}.`,
        action: 'Automating a standing instruction on paydays is the most frictionless way to do this.',
      });
    }
  }

  // 3. Proposed coverage summary
  if (hasProposed && proposedResults) {
    const proposedPolicies = policies.filter(p => p.policyStatus === 'proposed');
    const totalDeathSA = proposedPolicies.reduce((s, p) => s + p.deathSumAssured, 0);
    const totalCiSA = proposedPolicies.reduce((s, p) => s + p.ciSumAssured + p.eciSumAssured, 0);
    const wealthDelta = proposedResults.wealthAtRetirement - wealthAtRetirement;
    const coverageParts = [
      totalDeathSA > 0 && `Death: ${formatSGD(totalDeathSA)}`,
      totalCiSA > 0 && `CI: ${formatSGD(totalCiSA)}`,
    ].filter(Boolean).join(' · ');
    insights.push({
      type: 'info',
      icon: '📋',
      title: `${proposedPolicies.length} proposed polic${proposedPolicies.length === 1 ? 'y' : 'ies'} — ${formatSGD(proposedMonthlyPremium)}/mo`,
      detail: `${coverageParts ? `Coverage added: ${coverageParts}. ` : ''}With these policies, retirement wealth is ${formatSGD(proposedResults.wealthAtRetirement)} (${wealthDelta >= 0 ? '+' : ''}${formatSGD(wealthDelta)} vs current).`,
      action: `Toggle "Proposed" on the chart above to show the client the before/after impact.`,
    });
  }

  // 4. Savings rate
  if (savingsRate < 20) {
    insights.push({
      type: 'danger',
      icon: '💸',
      title: `Saving only ${savingsRate.toFixed(0)}% of income`,
      detail: `${formatSGD(income.annualExpenses)} in annual spending leaves little to invest. FIRE typically requires 40–60% savings rate.`,
      action: 'Even a 5% cut in lifestyle spending frees up meaningful capital over 20 years.',
    });
  } else if (savingsRate < 40) {
    insights.push({
      type: 'warning',
      icon: '📊',
      title: `${savingsRate.toFixed(0)}% savings rate — room to grow`,
      detail: `Decent base, but 40%+ is the sweet spot for hitting FIRE before 60. Bump by 5% and watch the timeline compress.`,
      action: 'Try automating an extra 5–10% of each paycheck directly to investments.',
    });
  } else {
    insights.push({
      type: 'success',
      icon: '🏆',
      title: `${savingsRate.toFixed(0)}% savings rate — exceptional`,
      detail: `Top-percentile savings discipline. Compound interest is doing heavy lifting on your behalf.`,
    });
  }

  // 5. Insurance coverage analysis (sum assured vs benchmark)
  const inForce = policies.filter(p => p.policyStatus === 'in-force');
  const totalDeathSA  = inForce.reduce((s, p) => s + p.deathSumAssured, 0);
  const totalCiSA     = inForce.reduce((s, p) => s + p.ciSumAssured, 0);
  const targetDeath   = income.annualIncome * INSURANCE_BENCHMARK.death;
  const targetCi      = income.annualIncome * INSURANCE_BENCHMARK.ci;
  const deathCoverage = targetDeath > 0 ? totalDeathSA / targetDeath : 0;
  const ciCoverage    = targetCi > 0 ? totalCiSA / targetCi : 0;

  if (inForce.length === 0) {
    insights.push({
      type: 'danger',
      icon: '🛡️',
      title: 'No active insurance coverage',
      detail: `Dependents have zero protection. A CI event or premature death would wipe out savings and derail FIRE entirely.`,
      action: `Minimum: term life at ${formatSGD(targetDeath)} death coverage + ${formatSGD(targetCi)} CI. Start with term — it's cheap.`,
    });
  } else if (ciCoverage < 0.5) {
    insights.push({
      type: 'warning',
      icon: '🛡️',
      title: `CI coverage at ${(ciCoverage * 100).toFixed(0)}% of recommended`,
      detail: `Current CI sum assured: ${formatSGD(totalCiSA)}. Benchmark for this income level is ${formatSGD(targetCi)} (5× annual income). Cancer alone costs $200–400k in SG.`,
      action: `A top-up CI rider or standalone CI plan could close the ${formatSGD(targetCi - totalCiSA)} gap.`,
    });
  } else if (deathCoverage >= 0.8 && ciCoverage >= 0.8) {
    insights.push({
      type: 'success',
      icon: '🛡️',
      title: `Well-covered — ${(deathCoverage * 100).toFixed(0)}% death, ${(ciCoverage * 100).toFixed(0)}% CI`,
      detail: `Death coverage: ${formatSGD(totalDeathSA)} · CI coverage: ${formatSGD(totalCiSA)}. Both comfortably above Singapore benchmarks.`,
    });
  }

  // 6. Major purchase impact
  const totalPurchaseCost = purchases.reduce((s, p) => s + p.lumpSum + p.recurringCost * p.recurringYears, 0);
  if (totalPurchaseCost > income.annualIncome * 15) {
    insights.push({
      type: 'warning',
      icon: '🏠',
      title: `${formatSGD(totalPurchaseCost)} in major life purchases`,
      detail: `${(totalPurchaseCost / income.annualIncome).toFixed(0)}× annual income committed to purchases — these create significant compound-interest drag.`,
      action: 'Spacing out major purchases reduces the dips in wealth accumulation.',
    });
  }

  // 7. Investment return rate check
  if (inputs.assets.investmentReturnRate < 4) {
    insights.push({
      type: 'warning',
      icon: '📈',
      title: `${inputs.assets.investmentReturnRate}% return — very conservative`,
      detail: `At this rate wealth grows slowly. Historically the S&P 500 averages 7–10% nominal, and a global index ETF (VWRA, CSPX) tracks that.`,
      action: 'Consider shifting accumulation-phase investments equity-heavy. Review in retirement.',
    });
  }

  // 8. Wealth depletion warning
  const lastYear = yearlyData[yearlyData.length - 1];
  if (lastYear && lastYear.totalNetWorth < income.retirementExpenses) {
    const depleteAge = yearlyData.find((d, i) =>
      i > 0 && d.totalNetWorth < income.retirementExpenses && d.age >= personal.retirementAge
    );
    if (depleteAge) {
      insights.push({
        type: 'danger',
        icon: '⏰',
        title: `Funds run out at age ${depleteAge.age}`,
        detail: `At current drawdown, savings are depleted ${personal.lifeExpectancy - depleteAge.age} years before life expectancy. The last years have no financial buffer.`,
        action: 'Reduce retirement expenses, delay retirement, or add income streams (annuity, rental) to fix this.',
      });
    }
  }

  // 9. Short runway urgent action
  if (yearsToRetirement < 10 && !onTrack) {
    insights.push({
      type: 'danger',
      icon: '⚡',
      title: `${yearsToRetirement} years left — urgent gap of ${formatSGD(fireNumber - wealthAtRetirement)}`,
      detail: `Limited runway means aggressive action is needed now. Every year of delay costs compounding power.`,
      action: `Delaying retirement by 3–5 years or doubling investment contributions are the fastest levers.`,
    });
  }

  return insights;
}

const darkTypeStyles: Record<string, { bg: string; border: string; titleColor: string; accent: string }> = {
  danger: { bg: 'rgba(127, 29, 29, 0.25)', border: 'rgba(239, 68, 68, 0.3)',   titleColor: '#f87171', accent: 'rgba(239, 68, 68, 0.6)'   },
  warning:{ bg: 'rgba(120, 53, 15, 0.25)', border: 'rgba(251, 191, 36, 0.3)',  titleColor: '#fbbf24', accent: 'rgba(251, 191, 36, 0.6)'  },
  success:{ bg: 'rgba(6, 78, 59, 0.25)',   border: 'rgba(16, 185, 129, 0.3)',  titleColor: '#34d399', accent: 'rgba(16, 185, 129, 0.6)'  },
  info:   { bg: 'rgba(30, 58, 138, 0.25)', border: 'rgba(96, 165, 250, 0.3)',  titleColor: '#60a5fa', accent: 'rgba(96, 165, 250, 0.6)'  },
};

const lightTypeStyles: Record<string, { bg: string; border: string; titleColor: string; accent: string }> = {
  danger: { bg: 'rgba(220, 38, 38, 0.09)',  border: 'rgba(220, 38, 38, 0.35)', titleColor: '#b91c1c', accent: 'rgba(220, 38, 38, 0.65)'  },
  warning:{ bg: 'rgba(180, 83, 9, 0.09)',   border: 'rgba(217, 119, 6, 0.38)', titleColor: '#b45309', accent: 'rgba(217, 119, 6, 0.65)'  },
  success:{ bg: 'rgba(5, 150, 105, 0.09)',  border: 'rgba(5, 150, 105, 0.35)', titleColor: '#047857', accent: 'rgba(5, 150, 105, 0.65)' },
  info:   { bg: 'rgba(37, 99, 235, 0.09)',  border: 'rgba(37, 99, 235, 0.35)', titleColor: '#1d4ed8', accent: 'rgba(37, 99, 235, 0.65)'  },
};

export default function InsightsPanel({
  inputs,
  results,
  proposedResults,
  hasProposed = false,
  proposedMonthlyPremium = 0,
  extraInvestmentTiers,
}: Props) {
  const isDark = useIsDark();
  const typeStyles = isDark ? darkTypeStyles : lightTypeStyles;

  const insights = generateInsights(
    inputs, results, extraInvestmentTiers,
    proposedResults, hasProposed, proposedMonthlyPremium,
  );

  const dangerCount = insights.filter(i => i.type === 'danger').length;
  const warningCount = insights.filter(i => i.type === 'warning').length;

  return (
    <div style={{ padding: '16px 16px 8px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
      {/* Urgency timeline — shown when protection gaps exist */}
      <UrgencyTimeline inputs={inputs} />

      {/* Header with alert counts */}
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14 }}>💡</span>
          <span style={{ color: 'var(--text-1)', fontSize: 13, fontWeight: 700 }}>Smart Insights</span>
        </div>
        <div className="flex items-center gap-2">
          {dangerCount > 0 && (
            <span style={{
              background: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(220, 38, 38, 0.12)',
              color: isDark ? '#f87171' : '#b91c1c',
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
            }}>
              {dangerCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span style={{
              background: isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(217, 119, 6, 0.12)',
              color: isDark ? '#fbbf24' : '#b45309',
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
            }}>
              {warningCount} warning{warningCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable insights */}
      <div style={{ maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
        {insights.map((insight, i) => {
          const style = typeStyles[insight.type];
          return (
            <div key={i} style={{
              background: style.bg,
              border: `1px solid ${style.border}`,
              borderLeft: `3px solid ${style.accent}`,
              borderRadius: 10, padding: '10px 12px', marginBottom: 6,
            }}>
              <div className="flex items-start gap-2">
                <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{insight.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: style.titleColor, fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
                    {insight.title}
                  </div>
                  <div style={{ color: 'var(--text-4)', fontSize: 11, lineHeight: 1.5 }}>
                    {insight.detail}
                  </div>
                  {insight.action && (
                    <div style={{
                      color: 'var(--text-2)', fontSize: 11, lineHeight: 1.5,
                      marginTop: 5, paddingTop: 5, borderTop: '1px solid var(--border-soft)',
                      fontStyle: 'italic',
                    }}>
                      → {insight.action}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

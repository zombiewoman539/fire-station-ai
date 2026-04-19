import React from 'react';
import { FireInputs, FireResults } from '../types';
import { formatSGD } from '../calculations';
import UrgencyTimeline from './UrgencyTimeline';
import { useIsDark } from '../useIsDark';

interface Props {
  inputs: FireInputs;
  results: FireResults;
}

interface Insight {
  type: 'danger' | 'warning' | 'success' | 'info';
  icon: string;
  title: string;
  detail: string;
  action?: string;
}

function generateInsights(inputs: FireInputs, results: FireResults): Insight[] {
  const insights: Insight[] = [];
  const { personal, income, policies, purchases } = inputs;
  const { wealthAtRetirement, fireNumber, onTrack, yearlyData } = results;

  const yearsToRetirement = personal.retirementAge - personal.currentAge;
  const yearsInRetirement = personal.lifeExpectancy - personal.retirementAge;
  const savingsRate = income.annualIncome > 0
    ? ((income.annualIncome - income.annualExpenses) / income.annualIncome * 100)
    : 0;

  // 1. FIRE shortfall urgency
  if (!onTrack) {
    const gap = fireNumber - wealthAtRetirement;
    const monthlyExtra = gap / (yearsToRetirement * 12);
    insights.push({
      type: 'danger',
      icon: '🚨',
      title: `${formatSGD(gap)} shortfall at retirement`,
      detail: `At current trajectory, there won't be enough to sustain ${yearsInRetirement} years in retirement. ${formatSGD(income.retirementExpenses)}/yr burn rate will deplete savings.`,
      action: `Saving an extra ${formatSGD(monthlyExtra)}/month or increasing investment returns by 1-2% could close this gap.`,
    });
  } else {
    const surplus = wealthAtRetirement - fireNumber;
    insights.push({
      type: 'success',
      icon: '🎯',
      title: 'FIRE target achievable!',
      detail: `Projected ${formatSGD(surplus)} surplus at retirement — enough for an additional ${Math.round(surplus / income.retirementExpenses)} years of expenses.`,
    });
  }

  // 2. Savings rate check
  if (savingsRate < 20) {
    insights.push({
      type: 'danger',
      icon: '💸',
      title: `Savings rate is only ${savingsRate.toFixed(0)}%`,
      detail: `Spending ${formatSGD(income.annualExpenses)} of ${formatSGD(income.annualIncome)} annual income. FIRE typically requires 40-60% savings rate.`,
      action: 'Identify expense categories to optimize. Even 5% improvement compounds significantly over decades.',
    });
  } else if (savingsRate < 40) {
    insights.push({
      type: 'warning',
      icon: '📊',
      title: `Savings rate at ${savingsRate.toFixed(0)}%`,
      detail: `Decent but below the 40%+ sweet spot for aggressive FIRE timelines.`,
      action: 'Consider automating an extra 5-10% into index fund investments each month.',
    });
  } else {
    insights.push({
      type: 'success',
      icon: '🏆',
      title: `Strong ${savingsRate.toFixed(0)}% savings rate`,
      detail: `Well above average — this discipline is the #1 driver of reaching FIRE.`,
    });
  }

  // 3. Insurance coverage analysis
  const totalInsuranceCashValue = policies.filter(p => p.policyStatus === 'in-force').reduce((s, p) => s + p.cashValue, 0);
  const incomeMultiple = income.annualIncome > 0 ? totalInsuranceCashValue / income.annualIncome : 0;

  if (policies.length === 0) {
    insights.push({
      type: 'danger',
      icon: '🛡️',
      title: 'No life insurance coverage',
      detail: `With ${formatSGD(income.annualIncome)} annual income and major commitments ahead, there's zero safety net for dependents.`,
      action: 'A term life policy covering 10x annual income is the minimum recommended protection.',
    });
  } else if (incomeMultiple < 3) {
    insights.push({
      type: 'warning',
      icon: '🛡️',
      title: `Insurance covers only ${incomeMultiple.toFixed(1)}x annual income`,
      detail: `Current cash value of ${formatSGD(totalInsuranceCashValue)} provides less than 3 years of income replacement.`,
      action: `Consider increasing coverage to 5-10x income (${formatSGD(income.annualIncome * 5)} - ${formatSGD(income.annualIncome * 10)}).`,
    });
  }

  // 4. Major purchase impact
  const totalPurchaseCost = purchases.reduce((s, p) => {
    let cost = p.lumpSum;
    cost += p.recurringCost * p.recurringYears;
    return s + cost;
  }, 0);

  if (totalPurchaseCost > income.annualIncome * 15) {
    insights.push({
      type: 'warning',
      icon: '🏠',
      title: `Major purchases total ${formatSGD(totalPurchaseCost)}`,
      detail: `That's ${(totalPurchaseCost / income.annualIncome).toFixed(0)}x annual income committed to life purchases. These create significant dips in wealth accumulation.`,
      action: 'Review timing of major purchases. Spacing them out reduces compound interest lost.',
    });
  }

  // 6. Investment return rate check
  if (inputs.assets.investmentReturnRate < 4) {
    insights.push({
      type: 'warning',
      icon: '📈',
      title: `Conservative ${inputs.assets.investmentReturnRate}% return assumption`,
      detail: `At this rate, investments grow slowly. The historical S&P 500 averages 7-10% nominal.`,
      action: 'Consider a diversified equity-heavy portfolio for the accumulation phase.',
    });
  }

  // 7. Wealth depletion warning
  const lastYear = yearlyData[yearlyData.length - 1];
  if (lastYear && lastYear.totalNetWorth < income.retirementExpenses) {
    // Find the age where money runs out
    const depleteAge = yearlyData.find((d, i) =>
      i > 0 && d.totalNetWorth < income.retirementExpenses && d.age >= personal.retirementAge
    );
    if (depleteAge) {
      insights.push({
        type: 'danger',
        icon: '⏰',
        title: `Funds may run out by age ${depleteAge.age}`,
        detail: `At current drawdown rate, savings could be depleted ${personal.lifeExpectancy - depleteAge.age} years before life expectancy.`,
        action: 'This is the most critical risk. Consider reducing retirement expenses or extending working years.',
      });
    }
  }

  // 8. Retirement age insight
  if (yearsToRetirement < 10 && !onTrack) {
    insights.push({
      type: 'danger',
      icon: '⚡',
      title: `Only ${yearsToRetirement} years to retirement`,
      detail: `With a ${formatSGD(fireNumber - wealthAtRetirement)} gap and limited runway, aggressive action is needed now.`,
      action: 'Delaying retirement by even 3-5 years can dramatically improve the outcome through continued compounding.',
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

export default function InsightsPanel({ inputs, results }: Props) {
  const isDark = useIsDark();
  const typeStyles = isDark ? darkTypeStyles : lightTypeStyles;

  const insights = generateInsights(inputs, results);

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

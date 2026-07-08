import { RetirementIncomeStream } from './types';

/** Sum of all retirement income streams active at a given age, with inflation applied
 *  per stream's `inflate` flag (nominal streams like CPF LIFE stay flat). */
export function getActiveStreamIncome(
  age: number,
  yearsFromNow: number,
  streams: RetirementIncomeStream[] | undefined,
  inflationRate: number,
): number {
  if (!streams || streams.length === 0) return 0;
  let total = 0;
  for (const s of streams) {
    if (age < s.startAge) continue;
    if (s.durationYears != null && age >= s.startAge + s.durationYears) continue;
    const inflateFactor = s.inflate ? Math.pow(1 + inflationRate, yearsFromNow) : 1;
    total += s.annualAmount * inflateFactor;
  }
  return total;
}

export function formatSGD(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}S$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}S$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}S$${abs.toFixed(0)}`;
}

// Singapore healthcare cost benchmarks used in the scenario UI
export const CI_COST_DATA = {
  cancer: {
    label: 'Cancer',
    icon: '🎗️',
    initialTreatment: 200000,
    annualOngoing: 40000,
    ongoingYears: 5,
    incomeImpactMonths: 12,
    recoveryMonths: 18,
    description: 'Surgery, chemotherapy, radiation therapy, targeted therapy, and ongoing monitoring',
  },
  heart: {
    label: 'Heart Disease',
    icon: '❤️‍🩹',
    initialTreatment: 80000,
    annualOngoing: 10000,
    ongoingYears: 10,
    incomeImpactMonths: 4,
    recoveryMonths: 6,
    description: 'Bypass surgery or angioplasty, cardiac rehabilitation, lifelong medication',
  },
  stroke: {
    label: 'Stroke',
    icon: '🧠',
    initialTreatment: 60000,
    annualOngoing: 40000,
    ongoingYears: 5,
    incomeImpactMonths: 18,
    recoveryMonths: 24,
    description: 'ICU care, physiotherapy, occupational therapy, speech therapy, ongoing rehabilitation',
  },
  kidney: {
    label: 'Kidney Failure',
    icon: '🫘',
    initialTreatment: 30000,
    annualOngoing: 50000,
    ongoingYears: 10,
    incomeImpactMonths: 6,
    recoveryMonths: 12,
    description: 'Dialysis access surgery, ongoing haemodialysis 3x/week, medication',
  },
};

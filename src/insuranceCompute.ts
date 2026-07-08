import { CoverageType, FireInputs } from './types';

// Singapore benchmarks: Death/TPD = 10× income, CI = 5×, ECI = 2×
export const INSURANCE_BENCHMARK: Record<CoverageType, number> = { death: 10, tpd: 10, ci: 5, eci: 2 };

export interface InsuranceSummary {
  totalDeath: number;
  totalTPD: number;
  totalCI: number;
  totalECI: number;
  deathGap: number;
  tpdGap: number;
  ciGap: number;
  eciGap: number;
  coverageTargetSource: Record<CoverageType, 'target' | 'benchmark'>;
  recommended: Record<CoverageType, number>;
  annualPremium: number;
  signalScore: number;
  hasMSL: boolean | null;
  hasISP: boolean | null;
  hasRider: boolean | null;
  ispWardClass: string;
}

/** Resolve the recommended coverage amount for a given type — advisor target wins, else income×benchmark. */
export function resolveRecommended(
  type: CoverageType,
  annualIncome: number,
  targets: FireInputs['coverageTargets'],
): { amount: number; source: 'target' | 'benchmark' } {
  const target = targets?.[type];
  if (typeof target === 'number' && target > 0) return { amount: target, source: 'target' };
  return { amount: annualIncome * INSURANCE_BENCHMARK[type], source: 'benchmark' };
}

// computeInsurance() has moved server-side (server/lib/insuranceCompute.ts).
// The result is returned by POST /api/calculate as `insurance: InsuranceSummary`.

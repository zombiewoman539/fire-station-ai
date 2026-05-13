import { FireInputs, CoverageType } from './types';

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
  /** Per-type target source: 'target' if advisor set it, 'benchmark' if falling back to income multiple. */
  coverageTargetSource: Record<CoverageType, 'target' | 'benchmark'>;
  /** Per-type recommended amount that gap was computed against. */
  recommended: Record<CoverageType, number>;
  annualPremium: number;
  signalScore: number; // 0–100: composite buying-opportunity score
  // Hospital plan
  hasMSL: boolean | null;        // null = not filled in yet
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

export function computeInsurance(inputs: FireInputs, daysSinceUpdate: number): InsuranceSummary {
  const income = inputs.income.annualIncome;
  const freqMult: Record<string, number> = { monthly: 12, quarterly: 4, 'semi-annual': 2, annual: 1 };
  const active = (inputs.policies ?? []).filter(p => p.policyStatus === 'in-force');

  const totalDeath = active.reduce((s, p) => s + (p.deathSumAssured ?? 0), 0);
  const totalTPD   = active.reduce((s, p) => s + (p.tpdSumAssured ?? 0), 0);
  const totalCI    = active.reduce((s, p) => s + (p.ciSumAssured ?? 0), 0);
  const totalECI   = active.reduce((s, p) => s + (p.eciSumAssured ?? 0), 0);
  const annualPremium = active.reduce((s, p) => s + p.premiumAmount * (freqMult[p.premiumFrequency] ?? 1), 0);

  const death = resolveRecommended('death', income, inputs.coverageTargets);
  const tpd   = resolveRecommended('tpd',   income, inputs.coverageTargets);
  const ci    = resolveRecommended('ci',    income, inputs.coverageTargets);
  const eci   = resolveRecommended('eci',   income, inputs.coverageTargets);

  const recDeath = death.amount;
  const recTPD   = tpd.amount;
  const recCI    = ci.amount;
  const recECI   = eci.amount;

  const deathGap = Math.max(0, recDeath - totalDeath);
  const tpdGap   = Math.max(0, recTPD   - totalTPD);
  const ciGap    = Math.max(0, recCI    - totalCI);
  const eciGap   = Math.max(0, recECI   - totalECI);

  const hp = inputs.hospitalPlan;
  const hasMSL     = hp ? hp.hasMediShieldLife : null;
  const hasISP     = hp ? hp.hasISP : null;
  const hasRider   = hp ? hp.hasRider : null;
  const ispWardClass = hp?.ispWardClass ?? '';

  const deathScore  = recDeath > 0 ? Math.min(30, (deathGap / recDeath) * 30) : 0;
  const ciScore     = recCI    > 0 ? Math.min(25, (ciGap    / recCI)    * 25) : 0;
  const eciScore    = recECI   > 0 ? Math.min(15, (eciGap   / recECI)   * 15) : 0;
  const ispScore    = hasISP === false ? 20 : hasISP === true && hasRider === false ? 10 : 0;
  const reviewScore = daysSinceUpdate > 180 ? 10 : daysSinceUpdate > 90 ? 5 : 0;
  const signalScore = Math.round(deathScore + ciScore + eciScore + ispScore + reviewScore);

  return {
    totalDeath, totalTPD, totalCI, totalECI,
    deathGap, tpdGap, ciGap, eciGap,
    coverageTargetSource: { death: death.source, tpd: tpd.source, ci: ci.source, eci: eci.source },
    recommended: { death: recDeath, tpd: recTPD, ci: recCI, eci: recECI },
    annualPremium, signalScore,
    hasMSL, hasISP, hasRider, ispWardClass,
  };
}

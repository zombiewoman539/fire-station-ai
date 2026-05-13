import { computeInsurance, resolveRecommended, INSURANCE_BENCHMARK } from './insuranceCompute';
import { defaultInputs } from './defaults';
import { FireInputs, InsurancePolicy } from './types';

function makePolicy(over: Partial<InsurancePolicy> = {}): InsurancePolicy {
  return {
    id: 'p1', name: 'Test', policyType: 'term',
    cashValue: 0, annualGrowthRate: 0,
    deathSumAssured: 0, tpdSumAssured: 0, eciSumAssured: 0, ciSumAssured: 0,
    premiumAmount: 0, premiumFrequency: 'monthly',
    premiumNextDueDate: null, premiumPaymentTerm: 'whole-life', premiumLimitedYears: 0,
    nominees: [],
    insurer: '', policyNumber: '', policyStatus: 'in-force',
    commencementDate: null, maturityDate: null, fundAllocations: [],
    ...over,
  };
}

function makeInputs(over: Partial<FireInputs> = {}): FireInputs {
  return { ...defaultInputs, ...over };
}

describe('resolveRecommended', () => {
  it('falls back to income×benchmark when no target set', () => {
    const r = resolveRecommended('death', 100_000, undefined);
    expect(r.amount).toBe(100_000 * INSURANCE_BENCHMARK.death);
    expect(r.source).toBe('benchmark');
  });

  it('uses advisor target when present and positive', () => {
    const r = resolveRecommended('death', 100_000, { death: 2_000_000 });
    expect(r.amount).toBe(2_000_000);
    expect(r.source).toBe('target');
  });

  it('falls back to benchmark when target is 0 or negative', () => {
    const r1 = resolveRecommended('ci', 100_000, { ci: 0 });
    expect(r1.source).toBe('benchmark');
    const r2 = resolveRecommended('ci', 100_000, { ci: -1 });
    expect(r2.source).toBe('benchmark');
  });

  it('per-type targets are independent', () => {
    const death = resolveRecommended('death', 100_000, { death: 1_500_000 });
    const tpd = resolveRecommended('tpd', 100_000, { death: 1_500_000 });
    expect(death.source).toBe('target');
    expect(tpd.source).toBe('benchmark');
    expect(tpd.amount).toBe(100_000 * INSURANCE_BENCHMARK.tpd);
  });
});

describe('computeInsurance with coverageTargets', () => {
  it('reports gap against advisor-set target, not income benchmark', () => {
    const inputs = makeInputs({
      income: { ...defaultInputs.income, annualIncome: 100_000 },
      policies: [makePolicy({ deathSumAssured: 500_000 })],
      coverageTargets: { death: 2_000_000 },
    });
    const summary = computeInsurance(inputs, 0);
    expect(summary.recommended.death).toBe(2_000_000);
    expect(summary.deathGap).toBe(1_500_000);
    expect(summary.coverageTargetSource.death).toBe('target');
  });

  it('mixed mode: target on one type, benchmark on others', () => {
    const inputs = makeInputs({
      income: { ...defaultInputs.income, annualIncome: 100_000 },
      policies: [],
      coverageTargets: { death: 1_500_000 }, // tpd/ci/eci fall back
    });
    const summary = computeInsurance(inputs, 0);
    expect(summary.coverageTargetSource.death).toBe('target');
    expect(summary.coverageTargetSource.tpd).toBe('benchmark');
    expect(summary.coverageTargetSource.ci).toBe('benchmark');
    expect(summary.coverageTargetSource.eci).toBe('benchmark');
    expect(summary.recommended.death).toBe(1_500_000);
    expect(summary.recommended.tpd).toBe(100_000 * INSURANCE_BENCHMARK.tpd);
  });

  it('no targets → all sources are benchmark', () => {
    const inputs = makeInputs({
      income: { ...defaultInputs.income, annualIncome: 80_000 },
      policies: [],
    });
    const summary = computeInsurance(inputs, 0);
    expect(Object.values(summary.coverageTargetSource).every(s => s === 'benchmark')).toBe(true);
  });
});

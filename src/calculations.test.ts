import { calculate } from './calculations';
import { FireInputs, InsurancePolicy, HospitalPlan } from './types';

// ─── Minimal predictable inputs ───────────────────────────────────────────────
// No inflation, no salary growth, no investment returns, no purchases, no policies.
// This makes expected values hand-calculable.
const base: FireInputs = {
  personal: { currentAge: 30, retirementAge: 55, lifeExpectancy: 80 },
  income: {
    annualIncome: 60000,
    annualExpenses: 24000,
    expenseItems: [],
    annualInvestmentContribution: 12000,
    salaryGrowthRate: 0,
    retirementExpenses: 36000,
    inflationRate: 0,
    withdrawalRate: 4,
  },
  assets: {
    cashSavings: 0,
    investments: 100000,
    cashReturnRate: 0,
    investmentReturnRate: 0,
    investmentBuckets: [],
    retirementReturnReduction: 0,
  },
  policies: [],
  purchases: [],
  estatePlanning: { lpa: false, will: false },
};

function withInvestments(v: number): FireInputs {
  return { ...base, assets: { ...base.assets, investments: v } };
}
function withIncome(annualIncome: number): FireInputs {
  return { ...base, income: { ...base.income, annualIncome } };
}
function withRetirement(overrides: Partial<FireInputs['income']>): FireInputs {
  return { ...base, income: { ...base.income, ...overrides } };
}
function withAssets(overrides: Partial<FireInputs['assets']>): FireInputs {
  return { ...base, assets: { ...base.assets, ...overrides } };
}

function minPolicy(overrides: Partial<InsurancePolicy> = {}): InsurancePolicy {
  return {
    id: 'p1', name: 'Test Policy',
    policyType: 'whole-life',
    cashValue: 0, annualGrowthRate: 0,
    deathSumAssured: 500000, tpdSumAssured: 500000,
    eciSumAssured: 100000, ciSumAssured: 200000,
    premiumAmount: 200, premiumFrequency: 'monthly',
    premiumNextDueDate: null,
    premiumPaymentTerm: 'whole-life', premiumLimitedYears: 0,
    nominees: [], insurer: '', policyNumber: '',
    policyStatus: 'in-force',
    commencementDate: null, maturityDate: null, fundAllocations: [],
    ...overrides,
  };
}

// ─── 1. Structure ──────────────────────────────────────────────────────────────

test('returns expected FireResults shape', () => {
  const r = calculate(base);
  expect(r).toHaveProperty('yearlyData');
  expect(r).toHaveProperty('wealthAtRetirement');
  expect(r).toHaveProperty('fireNumber');
  expect(r).toHaveProperty('fireNumberBreakdown');
  expect(r).toHaveProperty('yearsToBuild');
  expect(r).toHaveProperty('onTrack');
});

test('yearlyData spans from currentAge to lifeExpectancy inclusive', () => {
  const r = calculate(base);
  // years = lifeExpectancy - currentAge = 80 - 30 = 50 → 51 entries (i = 0..50)
  expect(r.yearlyData).toHaveLength(51);
  expect(r.yearlyData[0].age).toBe(30);
  expect(r.yearlyData[50].age).toBe(80);
});

test('yearlyData ages are sequential with no gaps', () => {
  const r = calculate(base);
  for (let i = 1; i < r.yearlyData.length; i++) {
    expect(r.yearlyData[i].age).toBe(r.yearlyData[i - 1].age + 1);
  }
});

test('yearlyData.totalNetWorth is never negative', () => {
  // Even a bankrupt client gets floored at 0
  const r = calculate(withIncome(0));
  for (const yr of r.yearlyData) {
    expect(yr.totalNetWorth).toBeGreaterThanOrEqual(0);
    expect(yr.investments).toBeGreaterThanOrEqual(0);
    expect(yr.cash).toBeGreaterThanOrEqual(0);
  }
});

// ─── 2. FIRE number formula ────────────────────────────────────────────────────

test('FIRE number uses SWR formula: inflatedExpenses / SWR × 1.1', () => {
  // With inflationRate=0, yearsToRetirement=25: inflated = retirementExpenses
  const r = calculate(base);
  const expected = Math.round((36000 / 0.04) * 1.1); // 990000
  expect(r.fireNumber).toBe(expected);
});

test('higher retirementExpenses → higher FIRE number', () => {
  const lo = calculate(withRetirement({ retirementExpenses: 30000 })).fireNumber;
  const hi = calculate(withRetirement({ retirementExpenses: 60000 })).fireNumber;
  expect(hi).toBeGreaterThan(lo);
});

test('higher inflationRate → higher FIRE number', () => {
  const lo = calculate(withRetirement({ inflationRate: 0 })).fireNumber;
  const hi = calculate(withRetirement({ inflationRate: 3 })).fireNumber;
  expect(hi).toBeGreaterThan(lo);
});

test('higher withdrawalRate → lower FIRE number', () => {
  const lo = calculate(withRetirement({ withdrawalRate: 3 })).fireNumber;
  const hi = calculate(withRetirement({ withdrawalRate: 5 })).fireNumber;
  expect(lo).toBeGreaterThan(hi);
});

// ─── 3. On-track / yearsToBuild ───────────────────────────────────────────────

test('onTrack is consistent with wealthAtRetirement >= fireNumber', () => {
  for (const incAmt of [0, 40000, 120000, 200000]) {
    const r = calculate(withIncome(incAmt));
    expect(r.onTrack).toBe(r.wealthAtRetirement >= r.fireNumber);
  }
});

test('high initial investments → onTrack true', () => {
  // 150k investments + 25yr × 12k/yr = 450k, retirement drawdown 36k → 414k total
  // Plus 600k cash → 1014k > fireNumber 990k
  const r = calculate(withInvestments(150000));
  expect(r.onTrack).toBe(true);
});

test('zero income, zero savings → onTrack false', () => {
  const r = calculate({
    ...base,
    income: { ...base.income, annualIncome: 0 },
    assets: { ...base.assets, investments: 0, cashSavings: 0 },
  });
  expect(r.onTrack).toBe(false);
});

test('yearsToBuild is a number when onTrack', () => {
  const r = calculate(withInvestments(150000));
  expect(r.onTrack).toBe(true);
  expect(typeof r.yearsToBuild).toBe('number');
});

test('yearsToBuild is null when FIRE is unreachable', () => {
  const r = calculate({
    ...base,
    income: { ...base.income, annualIncome: 0 },
    assets: { ...base.assets, investments: 0, cashSavings: 0 },
  });
  expect(r.yearsToBuild).toBeNull();
});

test('higher income → higher wealthAtRetirement', () => {
  const lo = calculate(withIncome(40000)).wealthAtRetirement;
  const hi = calculate(withIncome(100000)).wealthAtRetirement;
  expect(hi).toBeGreaterThan(lo);
});

// ─── 4. moneyRunsOutAge ────────────────────────────────────────────────────────

test('moneyRunsOutAge is undefined when wealth covers full retirement', () => {
  const r = calculate(withInvestments(150000));
  expect(r.moneyRunsOutAge).toBeUndefined();
});

test('moneyRunsOutAge is set when money runs out in retirement', () => {
  // Zero income, tiny savings — money runs out early in retirement
  const r = calculate({
    ...base,
    income: { ...base.income, annualIncome: 0 },
    assets: { ...base.assets, investments: 10000, cashSavings: 0 },
  });
  expect(r.moneyRunsOutAge).toBeDefined();
  expect(r.moneyRunsOutAge).toBeGreaterThanOrEqual(base.personal.retirementAge);
});

// ─── 5. Expenses ──────────────────────────────────────────────────────────────

test('expenseItems override annualExpenses fallback', () => {
  const withItems: FireInputs = {
    ...base,
    income: {
      ...base.income,
      annualExpenses: 24000, // fallback — should be ignored
      expenseItems: [
        { id: 'e1', label: 'Rent', amount: 30000, frequency: 'annual', category: 'fixed' },
      ],
    },
  };
  // Higher effective expenses (30k vs 24k) → lower wealth
  const r1 = calculate(base);
  const r2 = calculate(withItems);
  expect(r2.wealthAtRetirement).toBeLessThan(r1.wealthAtRetirement);
});

test('higher expenses reduce wealthAtRetirement', () => {
  const lo = calculate(withRetirement({ retirementExpenses: 20000, inflationRate: 0 })).wealthAtRetirement;
  const hi = calculate(withRetirement({ retirementExpenses: 60000, inflationRate: 0 })).wealthAtRetirement;
  expect(hi).toBeLessThan(lo);
});

// ─── 6. Premiums & policies ───────────────────────────────────────────────────

test('in-force policy premium reduces wealthAtRetirement', () => {
  const withPolicy: FireInputs = { ...base, policies: [minPolicy()] };
  const without = calculate(base).wealthAtRetirement;
  const withP = calculate(withPolicy).wealthAtRetirement;
  expect(withP).toBeLessThan(without);
});

test('expired limited-pay policy does not charge premiums', () => {
  // commencementDate 1990 + 10yr premium term = expired in 2000 → no premiums ever
  const expiredLimitedPay = minPolicy({
    premiumPaymentTerm: 'limited',
    premiumLimitedYears: 10,
    commencementDate: '1990-01-01',
    cashValue: 0, annualGrowthRate: 0,
  });
  const wholeLife = minPolicy({ premiumPaymentTerm: 'whole-life', cashValue: 0, annualGrowthRate: 0 });

  const withExpired = calculate({ ...base, policies: [expiredLimitedPay] }).wealthAtRetirement;
  const withWholeLife = calculate({ ...base, policies: [wholeLife] }).wealthAtRetirement;

  // whole-life keeps charging premiums → lower wealth
  expect(withWholeLife).toBeLessThan(withExpired);
});

test('hospital plan cash premium reduces wealthAtRetirement', () => {
  const hospitalPlan: HospitalPlan = {
    hasMediShieldLife: true, hasISP: true,
    ispInsurer: 'AIA', ispWardClass: 'A',
    hasRider: true, annualPremiumMedisave: 0,
    annualPremiumCash: 3600, // S$300/month → real drag on surplus
  };
  const without = calculate(base).wealthAtRetirement;
  const withPlan = calculate({ ...base, hospitalPlan }).wealthAtRetirement;
  expect(withPlan).toBeLessThan(without);
});

// ─── 7. Investment buckets ────────────────────────────────────────────────────

test('investment buckets with same rate produce same result as single investment', () => {
  const legacy = calculate(withAssets({
    investments: 100000,
    investmentReturnRate: 5,
    investmentBuckets: [],
  }));
  const buckets = [
    { id: 'b1', label: 'ETF',   currentValue: 60000, monthlyContribution: 600, annualReturnRate: 5 },
    { id: 'b2', label: 'Bonds', currentValue: 40000, monthlyContribution: 400, annualReturnRate: 5 },
  ];
  const bucketed = calculate(withAssets({
    investments: 0, // ignored when buckets present
    investmentReturnRate: 0,
    investmentBuckets: buckets,
  }));
  // With same total value (100k) and same total contribution (1k/mo = 12k/yr) at same rate:
  // final wealth should be identical
  expect(bucketed.wealthAtRetirement).toBe(legacy.wealthAtRetirement);
});

test('retirementReturnReduction lowers wealthAtRetirement', () => {
  const noReduction = calculate(withAssets({ investmentReturnRate: 7, retirementReturnReduction: 0 }));
  const withReduction = calculate(withAssets({ investmentReturnRate: 7, retirementReturnReduction: 50 }));
  expect(withReduction.wealthAtRetirement).toBeLessThan(noReduction.wealthAtRetirement);
});

// ─── 8. Scenarios ─────────────────────────────────────────────────────────────

test('death scenario adds death sum assured as a lump sum', () => {
  const policy = minPolicy({ deathSumAssured: 500000, cashValue: 0, annualGrowthRate: 0 });
  const inputs: FireInputs = { ...base, policies: [policy] };
  const noScenario = calculate(inputs);
  const withDeath = calculate(inputs, { type: 'death', ageAtEvent: 35 });
  // Death payout adds 500k; income stops after event → net effect is complex,
  // but for a significant payout with short working life ahead the wealth should differ
  expect(withDeath.wealthAtRetirement).not.toBe(noScenario.wealthAtRetirement);
});

test('TPD scenario adds TPD sum assured', () => {
  const policy = minPolicy({ tpdSumAssured: 300000, cashValue: 0, annualGrowthRate: 0 });
  const inputs: FireInputs = { ...base, policies: [policy] };
  const noScenario = calculate(inputs);
  const withTPD = calculate(inputs, { type: 'tpd', ageAtEvent: 40 });
  expect(withTPD.wealthAtRetirement).not.toBe(noScenario.wealthAtRetirement);
});

test('CI cancer scenario applies ECI payout at event age', () => {
  const policy = minPolicy({ eciSumAssured: 200000, cashValue: 0, annualGrowthRate: 0 });
  const inputs: FireInputs = { ...base, policies: [policy] };
  const withCI = calculate(inputs, { type: 'critical-illness', ageAtEvent: 40, ciType: 'cancer', ciStage: 'early' });
  // ECI payout of 200k is applied; ongoing costs also deducted
  // The result should differ from no-scenario
  const noScenario = calculate(inputs);
  expect(withCI.wealthAtRetirement).not.toBe(noScenario.wealthAtRetirement);
});

test('death/TPD scenario sets incomeMultiplier to 0 after event', () => {
  // A person who earns a lot but dies at 31 should have far less wealth than one who lives normally
  const highEarner: FireInputs = { ...base, income: { ...base.income, annualIncome: 200000 } };
  const policy = minPolicy({ deathSumAssured: 0, cashValue: 0, annualGrowthRate: 0 });
  const normal = calculate({ ...highEarner, policies: [policy] });
  const died = calculate({ ...highEarner, policies: [policy] }, { type: 'death', ageAtEvent: 31 });
  expect(died.wealthAtRetirement).toBeLessThan(normal.wealthAtRetirement);
});

// ─── 9. Purchases ─────────────────────────────────────────────────────────────

test('lump sum purchase appears in purchaseLabels at the correct age', () => {
  const inputs: FireInputs = {
    ...base,
    purchases: [{ id: 'car', name: 'Car', age: 35, lumpSum: 80000, recurringCost: 0, recurringYears: 0, repeatEveryYears: 0 }],
  };
  const r = calculate(inputs);
  const yr = r.yearlyData.find(y => y.age === 35);
  expect(yr).toBeDefined();
  expect(yr!.purchaseLabels).toContain('Car');
});

test('lump sum purchase reduces wealth vs no purchase', () => {
  const withPurchase: FireInputs = {
    ...base,
    purchases: [{ id: 'car', name: 'Car', age: 35, lumpSum: 80000, recurringCost: 0, recurringYears: 0, repeatEveryYears: 0 }],
  };
  const without = calculate(base).wealthAtRetirement;
  const withP = calculate(withPurchase).wealthAtRetirement;
  expect(withP).toBeLessThan(without);
});

test('recurring purchase reduces wealth during its active years', () => {
  const withRecurring: FireInputs = {
    ...base,
    purchases: [{ id: 'child', name: 'Child expenses', age: 32, lumpSum: 0, recurringCost: 15000, recurringYears: 18, repeatEveryYears: 0 }],
  };
  const without = calculate(base).wealthAtRetirement;
  const withP = calculate(withRecurring).wealthAtRetirement;
  expect(withP).toBeLessThan(without);
});

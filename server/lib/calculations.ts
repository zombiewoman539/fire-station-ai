import { FireInputs, YearData, FireResults, Scenario, RetirementIncomeStream } from './types';

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

export function calculate(inputs: FireInputs, scenario?: Scenario): FireResults {
  const { personal, income, assets, policies, purchases } = inputs;
  const { currentAge, retirementAge, lifeExpectancy } = personal;
  const years = lifeExpectancy - currentAge;

  const yearlyData: YearData[] = [];
  let moneyRunsOutAge: number | undefined;

  const baseAnnualExpenses = income.expenseItems && income.expenseItems.length > 0
    ? income.expenseItems.reduce((s, item) =>
        s + (item.frequency === 'monthly' ? item.amount * 12 : item.amount), 0)
    : income.annualExpenses;

  const hasBuckets = assets.investmentBuckets && assets.investmentBuckets.length > 0;
  type LiveBucket = {
    value: number; monthlyContribution: number; rate: number;
    isProduct: boolean;
    productType?: 'growth' | 'dividend' | 'annuity';
    premiumType?: 'single' | 'limited';
    annualPremium?: number;
    premiumStartAge?: number;
    premiumPayUntilAge?: number;
    payoutStartAge?: number;
    payoutAnnualAmount?: number;
    payoutDurationYears?: number | null;
  };
  const liveBuckets: LiveBucket[] = hasBuckets
    ? assets.investmentBuckets.map(b => {
        const isProduct = b.productType === 'dividend' || b.productType === 'annuity';
        const startAge = b.premiumCommencementAge ?? currentAge;
        return {
          value: b.currentValue,
          monthlyContribution: isProduct ? 0 : b.monthlyContribution,
          rate: b.annualReturnRate / 100,
          isProduct,
          productType: b.productType,
          premiumType: b.premiumType,
          annualPremium: b.annualPremium,
          premiumStartAge: b.premiumType === 'limited' ? startAge : undefined,
          premiumPayUntilAge: b.premiumType === 'limited' ? startAge + (b.premiumYears ?? 0) : undefined,
          payoutStartAge: b.payoutStartAge,
          payoutAnnualAmount: b.payoutAnnualAmount,
          payoutDurationYears: b.payoutDurationYears,
        };
      })
    : [{
        value: assets.investments,
        monthlyContribution: income.annualInvestmentContribution / 12,
        rate: assets.investmentReturnRate / 100,
        isProduct: false,
      }];
  const annualInvestmentContribution = liveBuckets.reduce((s, b) => s + b.monthlyContribution * 12, 0);

  let cash = assets.cashSavings;
  const inForcePolicies = policies.filter(p => p.policyStatus === 'in-force');
  let insuranceValue = inForcePolicies.reduce((s, p) => s + p.cashValue, 0);

  const cashRate = assets.cashReturnRate / 100;
  const salaryGrowth = income.salaryGrowthRate / 100;
  const inflationRate = (income.inflationRate ?? 2.5) / 100;
  const retirementReturnFactor = 1 - ((assets.retirementReturnReduction ?? 30) / 100);
  const yearsToRetirement = retirementAge - currentAge;

  const totalInvestments = (): number => liveBuckets.reduce((s, b) => s + b.value, 0);

  const depositToBuckets = (amount: number) => {
    if (amount <= 0 || liveBuckets.length === 0) return;
    const growthBuckets = liveBuckets.filter(b => !b.isProduct);
    if (growthBuckets.length === 0) return;
    const totalMonthly = growthBuckets.reduce((s, b) => s + b.monthlyContribution, 0);
    if (totalMonthly <= 0) {
      const share = amount / growthBuckets.length;
      for (const b of growthBuckets) b.value += share;
      return;
    }
    for (const b of growthBuckets) {
      b.value += amount * (b.monthlyContribution / totalMonthly);
    }
  };

  const withdrawFromBuckets = (amount: number): number => {
    if (amount <= 0) return 0;
    const growthBuckets = liveBuckets.filter(b => !b.isProduct);
    const total = growthBuckets.reduce((s, b) => s + b.value, 0);
    if (total <= 0) return 0;
    const taken = Math.min(amount, total);
    if (taken === total) {
      for (const b of growthBuckets) b.value = 0;
      return taken;
    }
    for (const b of growthBuckets) {
      b.value = Math.max(0, b.value - taken * (b.value / total));
    }
    return taken;
  };

  const getProductPremiums = (age: number): number => {
    let total = 0;
    for (const b of liveBuckets) {
      if (!b.isProduct || b.premiumType !== 'limited' || !b.annualPremium) continue;
      if (b.premiumStartAge != null && age < b.premiumStartAge) continue;
      if (b.premiumPayUntilAge != null && age >= b.premiumPayUntilAge) continue;
      total += b.annualPremium;
    }
    return total;
  };

  const getProductPayouts = (age: number): number => {
    let total = 0;
    for (const b of liveBuckets) {
      if (!b.isProduct || !b.payoutStartAge || age < b.payoutStartAge) continue;
      if (b.payoutDurationYears != null && age >= b.payoutStartAge + b.payoutDurationYears) continue;
      if (b.productType === 'annuity' && b.value <= 0) continue;
      total += b.payoutAnnualAmount ?? 0;
    }
    return total;
  };

  const accumulateProductPremiums = (age: number): void => {
    for (const b of liveBuckets) {
      if (!b.isProduct || b.premiumType !== 'limited' || !b.annualPremium) continue;
      if (b.premiumStartAge != null && age < b.premiumStartAge) continue;
      if (b.premiumPayUntilAge != null && age >= b.premiumPayUntilAge) continue;
      b.value += b.annualPremium;
    }
  };

  const hasScenario = scenario && scenario.type !== 'none';
  const scenarioAge = scenario?.ageAtEvent || currentAge;
  let scenarioPayoutApplied = false;

  const ciData = scenario?.type === 'critical-illness' && scenario.ciType
    ? CI_COST_DATA[scenario.ciType]
    : null;

  const FREQ_MULT: Record<string, number> = { monthly: 12, quarterly: 4, 'semi-annual': 2, annual: 1 };
  const currentCalendarYear = new Date().getFullYear();
  const getAnnualPremiums = (yearIndex: number): number => {
    let total = 0;
    for (const p of inForcePolicies) {
      if (!p.premiumAmount || p.premiumAmount <= 0) continue;
      if (p.premiumPaymentTerm === 'limited' && p.premiumLimitedYears > 0) {
        const refISO = p.commencementDate ?? p.premiumNextDueDate;
        if (refISO) {
          const payUntilYear = new Date(refISO).getFullYear() + p.premiumLimitedYears;
          const simYear = currentCalendarYear + yearIndex;
          if (simYear >= payUntilYear) continue;
        }
      }
      total += p.premiumAmount * (FREQ_MULT[p.premiumFrequency] ?? 12);
    }
    total += inputs.hospitalPlan?.annualPremiumCash ?? 0;
    return total;
  };

  const getRecurringCostAtAge = (age: number): number => {
    let total = 0;
    for (const p of purchases) {
      if (p.recurringCost > 0 && p.recurringYears > 0) {
        if (age >= p.age && age < p.age + p.recurringYears) total += p.recurringCost;
      }
    }
    return total;
  };

  const getLumpSumAtAge = (age: number): { total: number; labels: string[] } => {
    let total = 0;
    const labels: string[] = [];
    for (const p of purchases) {
      if (p.lumpSum > 0) {
        if (p.age === age) { total += p.lumpSum; labels.push(p.name); }
        if (p.repeatEveryYears > 0 && age > p.age && (age - p.age) % p.repeatEveryYears === 0) {
          total += p.lumpSum; labels.push(p.name);
        }
      }
    }
    return { total, labels };
  };

  const deductFromLiquid = (amount: number) => {
    if (amount <= 0) return;
    const taken = withdrawFromBuckets(amount);
    const remaining = amount - taken;
    if (remaining > 0) {
      cash -= remaining;
      if (cash < 0) cash = 0;
    }
  };

  const bucketIdxById = new Map<string, number>();
  if (hasBuckets) {
    assets.investmentBuckets.forEach((b, i) => bucketIdxById.set(b.id, i));
  }

  for (let i = 0; i <= years; i++) {
    const age = currentAge + i;
    const isRetired = age >= retirementAge;

    if (hasBuckets && assets.transitions) {
      for (const t of assets.transitions) {
        if (t.atAge !== age || t.atAge <= currentAge) continue;
        const fromIdx = bucketIdxById.get(t.fromBucketId);
        const toIdx = bucketIdxById.get(t.toBucketId);
        if (fromIdx == null || toIdx == null) continue;
        const from = liveBuckets[fromIdx];
        const to = liveBuckets[toIdx];
        if (from.value <= 0) continue;
        const amount = from.value * Math.min(1, Math.max(0, t.portion));
        from.value -= amount;
        to.value += amount;
      }
    }

    let recurringPurchaseCosts = getRecurringCostAtAge(age);
    const annualPremiums = getAnnualPremiums(i);

    let scenarioLumpCost = 0;
    let incomeMultiplier = 1.0;

    if (hasScenario && age === scenarioAge && !scenarioPayoutApplied) {
      scenarioPayoutApplied = true;
      if (scenario!.type === 'death') {
        cash += inForcePolicies.reduce((s, p) => s + p.deathSumAssured, 0);
        insuranceValue = 0;
      }
      if (scenario!.type === 'tpd') {
        cash += inForcePolicies.reduce((s, p) => s + p.tpdSumAssured, 0);
        insuranceValue = 0;
      }
      if (scenario!.type === 'critical-illness' && ciData) {
        const ciStage = scenario!.ciStage ?? 'early';
        cash += inForcePolicies.reduce((s, p) => s + (ciStage === 'early' ? (p.eciSumAssured || 0) : (p.ciSumAssured || 0)), 0);
        scenarioLumpCost = ciData.initialTreatment;
      }
    }

    if (hasScenario && scenario!.type === 'critical-illness' && ciData) {
      if (age > scenarioAge && age <= scenarioAge + ciData.ongoingYears) recurringPurchaseCosts += ciData.annualOngoing;
      if (age >= scenarioAge && age < scenarioAge + Math.ceil(ciData.incomeImpactMonths / 12)) {
        incomeMultiplier = 0.2;
      } else if (age === scenarioAge + Math.ceil(ciData.incomeImpactMonths / 12)) {
        incomeMultiplier = 0.6;
      }
    }
    if (hasScenario && (scenario!.type === 'tpd' || scenario!.type === 'death') && age >= scenarioAge) {
      incomeMultiplier = 0;
    }

    const yearsFromNow = age - currentAge;
    const productPremiums = getProductPremiums(age);
    const productPayouts = getProductPayouts(age);
    accumulateProductPremiums(age);
    if (!isRetired) {
      const takeHomePay = income.annualIncome * Math.pow(1 + salaryGrowth, i) * incomeMultiplier;
      const inflatedAccumulationExpenses = baseAnnualExpenses * Math.pow(1 + inflationRate, yearsFromNow);
      const totalExpenses = inflatedAccumulationExpenses + recurringPurchaseCosts + annualPremiums + productPremiums;
      const surplus = takeHomePay - totalExpenses + productPayouts;

      if (surplus > 0) {
        const toInvest = Math.min(annualInvestmentContribution, surplus);
        depositToBuckets(toInvest);
        cash += surplus - toInvest;
      } else {
        const deficit = -surplus;
        if (cash >= deficit) {
          cash -= deficit;
        } else {
          withdrawFromBuckets(deficit - cash);
          cash = 0;
        }
      }
    } else {
      const inflatedExpenses = income.retirementExpenses * Math.pow(1 + inflationRate, yearsFromNow);
      const streamIncome = getActiveStreamIncome(age, yearsFromNow, income.retirementIncomeStreams, inflationRate);
      const expensesNeeded = inflatedExpenses + recurringPurchaseCosts + annualPremiums + productPremiums;
      const netDrawdown = expensesNeeded - streamIncome - productPayouts;

      if (netDrawdown <= 0) {
        cash += -netDrawdown;
      } else {
        const investmentsTotal = totalInvestments();
        const totalAvailable = Math.max(0, investmentsTotal) + Math.max(0, cash);

        if (totalAvailable <= 0) {
          if (!moneyRunsOutAge) moneyRunsOutAge = age;
        } else {
          const fromInvestments = withdrawFromBuckets(Math.min(netDrawdown, investmentsTotal));
          const remainder = netDrawdown - fromInvestments;
          if (remainder > 0) {
            cash -= remainder;
            if (cash < 0) {
              if (!moneyRunsOutAge) moneyRunsOutAge = age;
              cash = 0;
            }
          }
        }
      }
    }

    if (scenarioLumpCost > 0) deductFromLiquid(scenarioLumpCost);

    const { total: lumpSum, labels: purchaseLabels } = getLumpSumAtAge(age);
    if (lumpSum > 0) deductFromLiquid(lumpSum);

    if (cash > 0) cash *= (1 + cashRate);

    for (const b of liveBuckets) {
      if (b.isProduct) {
        if (b.productType === 'annuity' && b.payoutStartAge && age >= b.payoutStartAge) {
          if (b.payoutDurationYears == null || age < b.payoutStartAge + b.payoutDurationYears) {
            b.value = Math.max(0, b.value - (b.payoutAnnualAmount ?? 0));
          }
        }
        continue;
      }
      if (b.value <= 0) continue;
      const effectiveRate = isRetired ? b.rate * retirementReturnFactor : b.rate;
      b.value *= (1 + effectiveRate);
    }

    if (insuranceValue > 0 && inForcePolicies.length > 0) {
      const totalCash = inForcePolicies.reduce((s, p) => s + (p.cashValue || 0), 0);
      const weightedRate = totalCash > 0
        ? inForcePolicies.reduce((s, p) => s + (p.cashValue || 0) * (p.annualGrowthRate || 0), 0) / totalCash / 100
        : 0;
      insuranceValue *= (1 + weightedRate);
    }

    const investmentsAfter = totalInvestments();
    yearlyData.push({
      age,
      investments:    Math.max(0, Math.round(investmentsAfter)),
      cash:           Math.max(0, Math.round(cash)),
      insuranceValue: Math.max(0, Math.round(insuranceValue)),
      totalNetWorth:  Math.max(0, Math.round(investmentsAfter + cash + insuranceValue)),
      purchaseLabels,
    });
  }

  const retirementIdx = retirementAge - currentAge;
  const wealthAtRetirement = retirementIdx >= 0 && retirementIdx < yearlyData.length
    ? yearlyData[retirementIdx].totalNetWorth
    : 0;

  const grossRetirementExpenses = income.retirementExpenses;
  const inflatedRetirementExpenses = Math.round(grossRetirementExpenses * Math.pow(1 + inflationRate, yearsToRetirement));
  const withdrawalRate = income.withdrawalRate / 100;
  const streamIncomeAtRetirement = Math.round(
    getActiveStreamIncome(retirementAge, yearsToRetirement, income.retirementIncomeStreams, inflationRate)
  );
  const netDrawdownNeeded = Math.max(0, inflatedRetirementExpenses - streamIncomeAtRetirement);
  const inflationBuffer = 0.10;
  const fireNumber = Math.round((netDrawdownNeeded / withdrawalRate) * (1 + inflationBuffer));

  let yearsToBuild: number | null = null;
  for (let i = 0; i < yearlyData.length; i++) {
    if (yearlyData[i].totalNetWorth >= fireNumber) { yearsToBuild = i; break; }
  }

  return {
    yearlyData,
    wealthAtRetirement,
    fireNumber,
    fireNumberBreakdown: {
      grossRetirementExpenses,
      inflatedRetirementExpenses,
      inflationRate: income.inflationRate ?? 2.5,
      yearsToRetirement,
      streamIncomeAtRetirement,
      netDrawdownNeeded,
      withdrawalRate: income.withdrawalRate,
      inflationBuffer: inflationBuffer * 100,
    },
    yearsToBuild,
    onTrack: wealthAtRetirement >= fireNumber,
    moneyRunsOutAge,
  };
}

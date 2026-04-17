import { FireInputs, YearData, FireResults, Scenario } from './types';

export function formatSGD(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}S$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}S$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}S$${abs.toFixed(0)}`;
}

// Critical illness cost data (SGD) based on Singapore healthcare benchmarks
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

// ========================================
// Main Calculation
// ========================================

export function calculate(inputs: FireInputs, scenario?: Scenario): FireResults {
  const { personal, income, assets, policies, purchases } = inputs;
  const { currentAge, retirementAge, lifeExpectancy } = personal;
  const years = lifeExpectancy - currentAge;

  const yearlyData: YearData[] = [];
  let moneyRunsOutAge: number | undefined;

  let cash = assets.cashSavings;
  let investments = assets.investments;
  let insuranceValue = policies.reduce((s, p) => s + p.cashValue, 0);

  const cashRate = assets.cashReturnRate / 100;
  const investRate = assets.investmentReturnRate / 100;
  const salaryGrowth = income.salaryGrowthRate / 100;
  const inflationRate = (income.inflationRate ?? 2.5) / 100;
  const yearsToRetirement = retirementAge - currentAge;

  // CPF LIFE monthly payout is user-entered — used as a simple income offset from age 65
  const cpfLifeMonthly = income.cpfLifeMonthlyPayout ?? 0;

  // Scenario state
  const hasScenario = scenario && scenario.type !== 'none';
  const scenarioAge = scenario?.ageAtEvent || currentAge;
  let scenarioPayoutApplied = false;

  const ciData = scenario?.type === 'critical-illness' && scenario.ciType
    ? CI_COST_DATA[scenario.ciType]
    : null;

  // Annual premium cost across all policies for a given year index.
  // Frequency is converted to annual; limited-pay policies stop after premiumLimitedYears.
  const FREQ_MULT: Record<string, number> = { monthly: 12, quarterly: 4, 'semi-annual': 2, annual: 1 };
  const getAnnualPremiums = (yearIndex: number): number => {
    let total = 0;
    for (const p of policies) {
      if (!p.premiumAmount || p.premiumAmount <= 0) continue;
      if (p.premiumPaymentTerm === 'limited' && yearIndex >= (p.premiumLimitedYears || 0)) continue;
      total += p.premiumAmount * (FREQ_MULT[p.premiumFrequency] ?? 12);
    }
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
    investments -= amount;
    if (investments < 0) { cash += investments; investments = 0; }
    if (cash < 0) cash = 0;
  };

  for (let i = 0; i <= years; i++) {
    const age = currentAge + i;
    const isRetired = age >= retirementAge;

    let recurringPurchaseCosts = getRecurringCostAtAge(age);
    const annualPremiums = getAnnualPremiums(i);

    // === SCENARIO EFFECTS ===
    let scenarioLumpCost = 0;
    let incomeMultiplier = 1.0;

    if (hasScenario && age === scenarioAge && !scenarioPayoutApplied) {
      scenarioPayoutApplied = true;
      if (scenario!.type === 'death') {
        cash += policies.reduce((s, p) => s + p.deathSumAssured, 0);
        insuranceValue = 0;
      }
      if (scenario!.type === 'tpd') {
        cash += policies.reduce((s, p) => s + p.tpdSumAssured, 0);
        insuranceValue = 0;
      }
      if (scenario!.type === 'critical-illness' && ciData) {
        const ciStage = scenario!.ciStage ?? 'early';
        cash += policies.reduce((s, p) => s + (ciStage === 'early' ? (p.eciSumAssured || 0) : (p.ciSumAssured || 0)), 0);
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

    // ============================================================
    // ACCUMULATION PHASE
    // annualIncome is take-home pay — no CPF deduction needed
    // ============================================================
    if (!isRetired) {
      const takeHomePay = income.annualIncome * Math.pow(1 + salaryGrowth, i) * incomeMultiplier;
      const totalExpenses = income.annualExpenses + recurringPurchaseCosts + annualPremiums;
      const surplus = takeHomePay - totalExpenses;

      if (surplus > 0) {
        const toInvest = Math.min(income.annualInvestmentContribution, surplus);
        investments += toInvest;
        cash += surplus - toInvest;
      } else {
        const deficit = -surplus;
        if (cash >= deficit) {
          cash -= deficit;
        } else {
          investments -= deficit - cash;
          cash = 0;
        }
        if (investments < 0) investments = 0;
      }

    // ============================================================
    // RETIREMENT PHASE
    // ============================================================
    } else {
      // Retirement expenses in today's dollars — inflate to the actual year
      const yearsFromNow = age - currentAge;
      const inflatedExpenses = income.retirementExpenses * Math.pow(1 + inflationRate, yearsFromNow);
      const grossDrawdown = inflatedExpenses + recurringPurchaseCosts + annualPremiums;

      // CPF LIFE reduces drawdown from age 65
      const annuityIncome = age >= 65 ? cpfLifeMonthly * 12 : 0;
      const totalDrawdown = Math.max(0, grossDrawdown - annuityIncome);

      const totalAvailable = Math.max(0, investments) + Math.max(0, cash);

      if (totalAvailable <= 0 && totalDrawdown > 0) {
        if (!moneyRunsOutAge) moneyRunsOutAge = age;
      } else if (totalDrawdown > 0) {
        if (investments >= totalDrawdown) {
          investments -= totalDrawdown;
        } else {
          cash -= totalDrawdown - investments;
          investments = 0;
        }
        if (cash < 0) {
          if (!moneyRunsOutAge) moneyRunsOutAge = age;
          cash = 0;
        }
      }
    }

    // Scenario lump cost
    if (scenarioLumpCost > 0) deductFromLiquid(scenarioLumpCost);

    // Regular lump sum purchases
    const { total: lumpSum, labels: purchaseLabels } = getLumpSumAtAge(age);
    if (lumpSum > 0) deductFromLiquid(lumpSum);

    // ============================================================
    // INTEREST / RETURNS
    // ============================================================
    if (cash > 0) cash *= (1 + cashRate);

    if (investments > 0) {
      const effectiveRate = isRetired ? investRate * 0.7 : investRate;
      investments *= (1 + effectiveRate);
    }

    // Insurance cash value growth
    if (insuranceValue > 0) {
      insuranceValue *= (1 + (policies.length > 0
        ? policies.reduce((s, p) => s + p.annualGrowthRate, 0) / policies.length / 100
        : 0));
    }

    yearlyData.push({
      age,
      investments:    Math.max(0, Math.round(investments)),
      cash:           Math.max(0, Math.round(cash)),
      insuranceValue: Math.max(0, Math.round(insuranceValue)),
      totalNetWorth:  Math.max(0, Math.round(investments + cash + insuranceValue)),
      purchaseLabels,
    });
  }

  const retirementIdx = retirementAge - currentAge;
  const wealthAtRetirement = retirementIdx >= 0 && retirementIdx < yearlyData.length
    ? yearlyData[retirementIdx].totalNetWorth
    : 0;

  // ============================================================
  // FIRE NUMBER (SWR method with CPF LIFE offset)
  // ============================================================
  const grossRetirementExpenses = income.retirementExpenses;
  const inflatedRetirementExpenses = Math.round(grossRetirementExpenses * Math.pow(1 + inflationRate, yearsToRetirement));
  const cpfLifeAnnual = cpfLifeMonthly * 12;
  const yearsBeforeCpfLife = Math.max(0, 65 - retirementAge);
  const withdrawalRate = income.withdrawalRate / 100;
  const netDrawdownNeeded = Math.max(0, inflatedRetirementExpenses - cpfLifeAnnual);
  const portfolioForPostCpfLife = netDrawdownNeeded / withdrawalRate;
  const preCpfLifeBridge = yearsBeforeCpfLife > 0
    ? (inflatedRetirementExpenses - Math.min(inflatedRetirementExpenses, cpfLifeAnnual)) * yearsBeforeCpfLife
    : 0;
  const inflationBuffer = 0.10;
  const fireNumber = Math.round((portfolioForPostCpfLife + preCpfLifeBridge) * (1 + inflationBuffer));

  let yearsToBuild = retirementAge - currentAge;
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
      cpfLifeAnnual,
      netDrawdownNeeded,
      withdrawalRate: income.withdrawalRate,
      inflationBuffer: inflationBuffer * 100,
    },
    yearsToBuild,
    onTrack: wealthAtRetirement >= fireNumber,
    moneyRunsOutAge,
  };
}

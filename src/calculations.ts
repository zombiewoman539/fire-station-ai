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
// CPF Rates from 1 January 2026
// ========================================

// CPF Contribution Rates (% of wage)
function getCpfContributionRates(age: number) {
  if (age <= 55) return { employerRate: 0.17, employeeRate: 0.20, totalRate: 0.37 };
  if (age <= 60) return { employerRate: 0.16, employeeRate: 0.18, totalRate: 0.34 };
  if (age <= 65) return { employerRate: 0.125, employeeRate: 0.125, totalRate: 0.25 };
  if (age <= 70) return { employerRate: 0.09, employeeRate: 0.075, totalRate: 0.165 };
  return { employerRate: 0.075, employeeRate: 0.05, totalRate: 0.125 };
}

// CPF Allocation Rates (ratio of total contribution to each account)
function getCpfAllocationRates(age: number) {
  if (age <= 35) return { oaRate: 0.6217, saOrRaRate: 0.1621, maRate: 0.2162 };
  if (age <= 45) return { oaRate: 0.5677, saOrRaRate: 0.1891, maRate: 0.2432 };
  if (age <= 50) return { oaRate: 0.5136, saOrRaRate: 0.2162, maRate: 0.2702 };
  if (age <= 55) return { oaRate: 0.4055, saOrRaRate: 0.3108, maRate: 0.2837 };
  if (age <= 60) return { oaRate: 0.353,  saOrRaRate: 0.3382, maRate: 0.3088 };
  if (age <= 65) return { oaRate: 0.14,   saOrRaRate: 0.44,   maRate: 0.42 };
  if (age <= 70) return { oaRate: 0.0607, saOrRaRate: 0.303,  maRate: 0.6363 };
  return { oaRate: 0.08, saOrRaRate: 0.08, maRate: 0.84 };
}

// CPF Interest Rates (per annum)
const CPF_OA_RATE = 0.025;    // 2.5%
const CPF_SA_RATE = 0.04;     // 4% (SA, RA, MA)

// BHS = $79,000 for 2026, assume ~3.5% annual growth for younger members
const BHS_2026 = 79000;
const BHS_GROWTH_RATE = 0.035;

function getBhsAtAge(currentAge: number, targetAge: number): number {
  // BHS is fixed once you turn 65
  const yearsFromNow = targetAge - currentAge;
  const bhsAtTarget = BHS_2026 * Math.pow(1 + BHS_GROWTH_RATE, yearsFromNow);
  if (targetAge >= 65) {
    // Fixed at whatever the BHS is when they turn 65
    const yearsTo65 = 65 - currentAge;
    if (yearsTo65 <= 0) return BHS_2026; // already 65+
    return BHS_2026 * Math.pow(1 + BHS_GROWTH_RATE, yearsTo65);
  }
  return bhsAtTarget;
}

// CPF Extra Interest calculation
function getCpfExtraInterest(age: number, oa: number, sa: number, ma: number): { oaExtra: number; saExtra: number } {
  // Extra interest earned on OA goes to SA/RA
  const combinedBalance = oa + sa + ma;

  if (age < 55) {
    // 1% on first $60,000 combined, OA capped at $20,000
    const oaForExtra = Math.min(oa, 20000);
    const remainingCap = 60000 - oaForExtra;
    const samaForExtra = Math.min(sa + ma, remainingCap);
    const extraOnOa = oaForExtra * 0.01;
    const extraOnSaMa = samaForExtra * 0.01;
    // Extra interest on OA goes to SA; extra on SA/MA stays in respective accounts
    return { oaExtra: extraOnOa, saExtra: extraOnSaMa };
  } else {
    // ≥55: 2% on first $30,000 + 1% on next $30,000, OA capped at $20,000
    const oaForExtra = Math.min(oa, 20000);

    // First $30,000 tier (2%)
    let tier1Remaining = 30000;
    const tier1Oa = Math.min(oaForExtra, tier1Remaining);
    tier1Remaining -= tier1Oa;
    const tier1SaMa = Math.min(sa + ma, tier1Remaining);
    const tier1Interest = (tier1Oa + tier1SaMa) * 0.02;

    // Next $30,000 tier (1%)
    const usedInTier1 = tier1Oa + tier1SaMa;
    let tier2Remaining = 30000;
    const tier2Oa = Math.min(Math.max(oaForExtra - tier1Oa, 0), tier2Remaining);
    tier2Remaining -= tier2Oa;
    const tier2SaMa = Math.min(Math.max(sa + ma - tier1SaMa, 0), tier2Remaining);
    const tier2Interest = (tier2Oa + tier2SaMa) * 0.01;

    // All extra interest on OA portion goes to SA/RA
    const oaExtra = tier1Oa * 0.02 + tier2Oa * 0.01;
    const saExtra = tier1SaMa * 0.02 + tier2SaMa * 0.01;
    return { oaExtra, saExtra };
  }
}

// ========================================
// Main Calculation
// ========================================

export function calculate(inputs: FireInputs, scenario?: Scenario): FireResults {
  const { personal, income, assets, policies, purchases } = inputs;
  const { currentAge, retirementAge, lifeExpectancy } = personal;
  const years = lifeExpectancy - currentAge;

  const yearlyData: YearData[] = [];

  let cash = assets.cashSavings;
  let investments = assets.investments;
  let cpfOA = assets.cpfOA;
  let cpfSA = assets.cpfSA;
  let cpfMA = assets.cpfMA;
  let insuranceValue = policies.reduce((s, p) => s + p.cashValue, 0);

  const cashRate = assets.cashReturnRate / 100;
  const investRate = assets.investmentReturnRate / 100;
  const salaryGrowth = income.salaryGrowthRate / 100;

  // Scenario state
  const hasScenario = scenario && scenario.type !== 'none';
  const scenarioAge = scenario?.ageAtEvent || currentAge;
  let scenarioPayoutApplied = false;

  const ciData = scenario?.type === 'critical-illness' && scenario.ciType
    ? CI_COST_DATA[scenario.ciType]
    : null;

  // Helper: recurring costs at a given age
  const getRecurringCostAtAge = (age: number): number => {
    let total = 0;
    for (const p of purchases) {
      if (p.recurringCost > 0 && p.recurringYears > 0) {
        if (age >= p.age && age < p.age + p.recurringYears) {
          total += p.recurringCost;
        }
      }
    }
    return total;
  };

  // Helper: lump sums at a given age
  const getLumpSumAtAge = (age: number): { total: number; labels: string[] } => {
    let total = 0;
    const labels: string[] = [];
    for (const p of purchases) {
      if (p.lumpSum > 0) {
        if (p.age === age) {
          total += p.lumpSum;
          labels.push(p.name);
        }
        if (p.repeatEveryYears > 0 && age > p.age && (age - p.age) % p.repeatEveryYears === 0) {
          total += p.lumpSum;
          labels.push(p.name);
        }
      }
    }
    return { total, labels };
  };

  // Helper: deduct from liquid assets (investments first, then cash)
  const deductFromLiquid = (amount: number) => {
    investments -= amount;
    if (investments < 0) {
      cash += investments;
      investments = 0;
    }
    if (cash < 0) {
      // Last resort: draw from CPF OA (housing/education allowed)
      cpfOA += cash;
      cash = 0;
    }
    if (cpfOA < 0) cpfOA = 0;
  };

  for (let i = 0; i <= years; i++) {
    const age = currentAge + i;
    const isRetired = age >= retirementAge;

    let recurringPurchaseCosts = getRecurringCostAtAge(age);

    // === SCENARIO EFFECTS ===
    let scenarioLumpCost = 0;
    let incomeMultiplier = 1.0;

    if (hasScenario && age === scenarioAge && !scenarioPayoutApplied) {
      scenarioPayoutApplied = true;

      if (scenario!.type === 'death') {
        const payout = policies.reduce((s, p) => s + p.deathSumAssured, 0);
        cash += payout;
        insuranceValue = 0;
      }
      if (scenario!.type === 'tpd') {
        const payout = policies.reduce((s, p) => s + p.tpdSumAssured, 0);
        cash += payout;
        insuranceValue = 0;
      }
      if (scenario!.type === 'critical-illness' && ciData) {
        const payout = policies.reduce((s, p) => s + p.ciSumAssured, 0);
        cash += payout;
        scenarioLumpCost = ciData.initialTreatment;
      }
    }

    if (hasScenario && scenario!.type === 'critical-illness' && ciData) {
      if (age > scenarioAge && age <= scenarioAge + ciData.ongoingYears) {
        recurringPurchaseCosts += ciData.annualOngoing;
      }
      if (age >= scenarioAge && age < scenarioAge + Math.ceil(ciData.incomeImpactMonths / 12)) {
        incomeMultiplier = 0.2;
      } else if (age === scenarioAge + Math.ceil(ciData.incomeImpactMonths / 12)) {
        incomeMultiplier = 0.6;
      }
    }

    if (hasScenario && (scenario!.type === 'tpd' || scenario!.type === 'death') && age >= scenarioAge) {
      incomeMultiplier = 0;
    }

    // === ACCUMULATION PHASE ===
    if (!isRetired) {
      const grossSalary = income.annualIncome * Math.pow(1 + salaryGrowth, i) * incomeMultiplier;

      const cpfRates = getCpfContributionRates(age);
      const cpfAlloc = getCpfAllocationRates(age);

      const employeeContribution = grossSalary * cpfRates.employeeRate;
      const employerContribution = grossSalary * cpfRates.employerRate;
      const totalCpfContribution = employeeContribution + employerContribution;

      // Allocate CPF contributions to OA, SA, MA
      const toOA = totalCpfContribution * cpfAlloc.oaRate;
      const toSA = totalCpfContribution * cpfAlloc.saOrRaRate;
      const toMA = totalCpfContribution * cpfAlloc.maRate;

      cpfOA += toOA;
      cpfSA += toSA;
      cpfMA += toMA;

      // BHS overflow: if MA exceeds BHS, excess goes to SA/RA
      const bhs = getBhsAtAge(currentAge, age);
      if (cpfMA > bhs) {
        const overflow = cpfMA - bhs;
        cpfSA += overflow;
        cpfMA = bhs;
      }

      // Take-home pay = gross - employee CPF
      const takeHomePay = grossSalary - employeeContribution;
      const totalExpenses = income.annualExpenses + recurringPurchaseCosts;
      const surplus = takeHomePay - totalExpenses;

      if (surplus > 0) {
        investments += surplus * 0.7;
        cash += surplus * 0.3;
      } else {
        cash += surplus;
        if (cash < 0) {
          investments += cash;
          cash = 0;
        }
        if (investments < 0) investments = 0;
      }
    } else {
      // === RETIREMENT PHASE: drawdown ===
      const totalDrawdown = income.retirementExpenses + recurringPurchaseCosts;
      // Draw: 40% from CPF OA, 60% from investments/cash
      const fromCpf = totalDrawdown * 0.4;
      const fromLiquid = totalDrawdown * 0.6;

      cpfOA -= fromCpf;
      if (cpfOA < 0) {
        cpfSA += cpfOA; // borrow from SA
        cpfOA = 0;
      }
      if (cpfSA < 0) {
        cash += cpfSA;
        cpfSA = 0;
      }

      investments -= fromLiquid;
      if (investments < 0) {
        cash += investments;
        investments = 0;
      }
      if (cash < 0) cash = 0;
    }

    // Scenario lump cost (CI initial treatment)
    if (scenarioLumpCost > 0) {
      deductFromLiquid(scenarioLumpCost);
    }

    // Regular lump sum purchases
    const { total: lumpSum, labels: purchaseLabels } = getLumpSumAtAge(age);
    if (lumpSum > 0) {
      deductFromLiquid(lumpSum);
    }

    // === INTEREST / RETURNS ===

    // Cash savings interest
    if (cash > 0) {
      cash *= (1 + cashRate);
    }

    // Investment returns
    if (investments > 0) {
      const effectiveRate = isRetired ? investRate * 0.7 : investRate; // more conservative in retirement
      investments *= (1 + effectiveRate);
    }

    // CPF interest: OA 2.5%, SA/RA 4%, MA 4%
    if (cpfOA > 0) cpfOA *= (1 + CPF_OA_RATE);
    if (cpfSA > 0) cpfSA *= (1 + CPF_SA_RATE);
    if (cpfMA > 0) cpfMA *= (1 + CPF_SA_RATE); // MA also earns 4%

    // CPF extra interest (goes to SA/RA)
    if (cpfOA > 0 || cpfSA > 0) {
      const { oaExtra, saExtra } = getCpfExtraInterest(age, cpfOA, cpfSA, cpfMA);
      cpfSA += oaExtra + saExtra; // all extra interest credited to SA/RA
    }

    // BHS check again after interest
    if (!isRetired) {
      const bhs = getBhsAtAge(currentAge, age);
      if (cpfMA > bhs) {
        cpfSA += cpfMA - bhs;
        cpfMA = bhs;
      }
    }

    // Insurance cash value growth (only if not paid out)
    if (insuranceValue > 0) {
      insuranceValue *= (1 + (policies.length > 0
        ? policies.reduce((s, p) => s + p.annualGrowthRate, 0) / policies.length / 100
        : 0));
    }

    const cpfOaSa = Math.max(0, cpfOA) + Math.max(0, cpfSA);

    yearlyData.push({
      age,
      investments: Math.max(0, Math.round(investments)),
      cash: Math.max(0, Math.round(cash)),
      cpfOaSa: Math.round(cpfOaSa),
      insuranceValue: Math.round(Math.max(0, insuranceValue)),
      totalNetWorth: Math.max(0, Math.round(investments + cash + cpfOaSa + insuranceValue)),
      purchaseLabels,
    });
  }

  const retirementIdx = retirementAge - currentAge;
  const wealthAtRetirement = retirementIdx >= 0 && retirementIdx < yearlyData.length
    ? yearlyData[retirementIdx].totalNetWorth
    : 0;

  const yearsInRetirement = lifeExpectancy - retirementAge;
  const fireNumber = Math.round(income.retirementExpenses * yearsInRetirement * 1.2);

  let yearsToBuild = retirementAge - currentAge;
  for (let i = 0; i < yearlyData.length; i++) {
    if (yearlyData[i].totalNetWorth >= fireNumber) {
      yearsToBuild = i;
      break;
    }
  }

  return {
    yearlyData,
    wealthAtRetirement,
    fireNumber,
    yearsToBuild,
    onTrack: wealthAtRetirement >= fireNumber,
  };
}

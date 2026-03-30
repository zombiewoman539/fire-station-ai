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
    initialTreatment: 200000,    // Surgery + chemo/radiation average
    annualOngoing: 40000,        // Follow-up, medication, scans
    ongoingYears: 5,             // 5-year follow-up standard
    incomeImpactMonths: 12,      // Average work absence
    recoveryMonths: 18,
    description: 'Surgery, chemotherapy, radiation therapy, targeted therapy, and ongoing monitoring',
  },
  heart: {
    label: 'Heart Disease',
    icon: '❤️‍🩹',
    initialTreatment: 80000,     // Bypass/stent procedures
    annualOngoing: 10000,        // Medication + cardiology visits
    ongoingYears: 10,            // Lifelong but we model 10 years
    incomeImpactMonths: 4,
    recoveryMonths: 6,
    description: 'Bypass surgery or angioplasty, cardiac rehabilitation, lifelong medication',
  },
  stroke: {
    label: 'Stroke',
    icon: '🧠',
    initialTreatment: 60000,     // ICU + initial rehab
    annualOngoing: 40000,        // Physio, OT, speech therapy
    ongoingYears: 5,
    incomeImpactMonths: 18,
    recoveryMonths: 24,
    description: 'ICU care, physiotherapy, occupational therapy, speech therapy, ongoing rehabilitation',
  },
  kidney: {
    label: 'Kidney Failure',
    icon: '🫘',
    initialTreatment: 30000,     // Dialysis setup
    annualOngoing: 50000,        // ~$4k/month dialysis
    ongoingYears: 10,            // Ongoing indefinitely
    incomeImpactMonths: 6,
    recoveryMonths: 12,
    description: 'Dialysis access surgery, ongoing haemodialysis 3x/week, medication',
  },
};

export function calculate(inputs: FireInputs, scenario?: Scenario): FireResults {
  const { personal, income, assets, policies, purchases } = inputs;
  const { currentAge, retirementAge, lifeExpectancy } = personal;
  const years = lifeExpectancy - currentAge;
  const cpfRate = 0.37; // combined employer + employee contribution rate

  const yearlyData: YearData[] = [];

  let cashCpf = assets.cashSavings + assets.cpfBalance;
  let investments = assets.investments;
  let insuranceValue = policies.reduce((s, p) => s + p.cashValue, 0);

  const returnRate = assets.investmentReturnRate / 100;
  const salaryGrowth = income.salaryGrowthRate / 100;

  // Scenario-specific calculations
  const hasScenario = scenario && scenario.type !== 'none';
  const scenarioAge = scenario?.ageAtEvent || currentAge;
  let scenarioPayoutApplied = false;
  let scenarioIncomeReduced = false;

  // CI cost info
  const ciData = scenario?.type === 'critical-illness' && scenario.ciType
    ? CI_COST_DATA[scenario.ciType]
    : null;

  // Build a map of recurring expense windows from purchases
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

  for (let i = 0; i <= years; i++) {
    const age = currentAge + i;
    const isRetired = age >= retirementAge;

    // Recurring purchase costs for this year
    let recurringPurchaseCosts = getRecurringCostAtAge(age);

    // === SCENARIO EFFECTS ===
    let scenarioLumpCost = 0;
    let incomeMultiplier = 1.0;

    if (hasScenario && age === scenarioAge && !scenarioPayoutApplied) {
      scenarioPayoutApplied = true;

      if (scenario!.type === 'death') {
        // Death: insurance pays out, no more income
        const deathPayout = policies.reduce((s, p) => s + p.deathSumAssured, 0);
        cashCpf += deathPayout;
        // Person is deceased — remaining years show dependents' drawdown
        // We zero out insurance value since it paid out
        insuranceValue = 0;
      }

      if (scenario!.type === 'tpd') {
        const tpdPayout = policies.reduce((s, p) => s + p.tpdSumAssured, 0);
        cashCpf += tpdPayout;
        insuranceValue = 0;
      }

      if (scenario!.type === 'critical-illness' && ciData) {
        const ciPayout = policies.reduce((s, p) => s + p.ciSumAssured, 0);
        cashCpf += ciPayout;
        scenarioLumpCost = ciData.initialTreatment;
      }
    }

    // Ongoing CI costs
    if (hasScenario && scenario!.type === 'critical-illness' && ciData) {
      if (age > scenarioAge && age <= scenarioAge + ciData.ongoingYears) {
        recurringPurchaseCosts += ciData.annualOngoing;
      }
      // Income impact during recovery
      if (age >= scenarioAge && age < scenarioAge + Math.ceil(ciData.incomeImpactMonths / 12)) {
        incomeMultiplier = 0.2; // Can only work 20% capacity during treatment
        scenarioIncomeReduced = true;
      } else if (age === scenarioAge + Math.ceil(ciData.incomeImpactMonths / 12)) {
        incomeMultiplier = 0.6; // Partial return to work
      }
    }

    // TPD / Death = no more earned income after event
    if (hasScenario && (scenario!.type === 'tpd' || scenario!.type === 'death') && age >= scenarioAge) {
      incomeMultiplier = 0;
    }

    if (!isRetired) {
      const currentIncome = income.annualIncome * Math.pow(1 + salaryGrowth, i) * incomeMultiplier;
      const cpfContribution = currentIncome * cpfRate;
      const takeHomePay = currentIncome - cpfContribution * (20 / 37);
      const totalExpenses = income.annualExpenses + recurringPurchaseCosts;
      const surplus = takeHomePay - totalExpenses;

      cashCpf += cpfContribution;
      if (surplus > 0) {
        investments += surplus * 0.7;
        cashCpf += surplus * 0.3;
      } else {
        cashCpf += surplus;
        if (cashCpf < 0) {
          investments += cashCpf;
          cashCpf = 0;
        }
      }

      investments *= (1 + returnRate);
    } else {
      const totalDrawdown = income.retirementExpenses + recurringPurchaseCosts;
      cashCpf -= totalDrawdown * 0.4;
      investments -= totalDrawdown * 0.6;
      if (cashCpf < 0) {
        investments += cashCpf;
        cashCpf = 0;
      }
      if (investments > 0) {
        investments *= (1 + returnRate * 0.5);
      }
    }

    // Scenario lump cost (CI initial treatment)
    if (scenarioLumpCost > 0) {
      investments -= scenarioLumpCost;
      if (investments < 0) {
        cashCpf += investments;
        investments = 0;
      }
      if (cashCpf < 0) cashCpf = 0;
    }

    // Regular lump sum purchases
    const { total: lumpSum, labels: purchaseLabels } = getLumpSumAtAge(age);
    if (lumpSum > 0) {
      investments -= lumpSum;
      if (investments < 0) {
        cashCpf += investments;
        investments = 0;
      }
      if (cashCpf < 0) cashCpf = 0;
    }

    // Insurance growth (only if not paid out)
    if (insuranceValue > 0) {
      insuranceValue *= (1 + (policies.length > 0
        ? policies.reduce((s, p) => s + p.annualGrowthRate, 0) / policies.length / 100
        : 0));
    }

    yearlyData.push({
      age,
      investments: Math.max(0, Math.round(investments)),
      cashCpf: Math.max(0, Math.round(cashCpf)),
      insuranceValue: Math.round(Math.max(0, insuranceValue)),
      totalNetWorth: Math.max(0, Math.round(investments + cashCpf + insuranceValue)),
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

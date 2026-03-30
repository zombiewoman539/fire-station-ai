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

// CPF Contribution Rates from 1 January 2026
// Returns { employerRate, employeeRate, totalRate }
function getCpfContributionRates(age: number) {
  if (age <= 55) return { employerRate: 0.17, employeeRate: 0.20, totalRate: 0.37 };
  if (age <= 60) return { employerRate: 0.16, employeeRate: 0.18, totalRate: 0.34 };
  if (age <= 65) return { employerRate: 0.125, employeeRate: 0.125, totalRate: 0.25 };
  if (age <= 70) return { employerRate: 0.09, employeeRate: 0.075, totalRate: 0.165 };
  return { employerRate: 0.075, employeeRate: 0.05, totalRate: 0.125 };
}

// CPF Allocation Rates from 1 January 2026
// Returns { oaRate, saOrRaRate, maRate } — ratio of total contribution
// SA becomes RA (Retirement Account) after age 55
function getCpfAllocationRates(age: number) {
  if (age <= 35) return { oaRate: 0.6217, saOrRaRate: 0.1621, maRate: 0.2162 };
  if (age <= 45) return { oaRate: 0.5677, saOrRaRate: 0.1891, maRate: 0.2432 };
  if (age <= 50) return { oaRate: 0.5136, saOrRaRate: 0.2162, maRate: 0.2702 };
  if (age <= 55) return { oaRate: 0.4055, saOrRaRate: 0.3108, maRate: 0.2837 };
  if (age <= 60) return { oaRate: 0.353, saOrRaRate: 0.3382, maRate: 0.3088 };
  if (age <= 65) return { oaRate: 0.14, saOrRaRate: 0.44, maRate: 0.42 };
  if (age <= 70) return { oaRate: 0.0607, saOrRaRate: 0.303, maRate: 0.6363 };
  return { oaRate: 0.08, saOrRaRate: 0.08, maRate: 0.84 };
}

export function calculate(inputs: FireInputs, scenario?: Scenario): FireResults {
  const { personal, income, assets, policies, purchases } = inputs;
  const { currentAge, retirementAge, lifeExpectancy } = personal;
  const years = lifeExpectancy - currentAge;

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
      } else if (age === scenarioAge + Math.ceil(ciData.incomeImpactMonths / 12)) {
        incomeMultiplier = 0.6; // Partial return to work
      }
    }

    // TPD / Death = no more earned income after event
    if (hasScenario && (scenario!.type === 'tpd' || scenario!.type === 'death') && age >= scenarioAge) {
      incomeMultiplier = 0;
    }

    if (!isRetired) {
      // Gross salary with growth and any scenario income reduction
      const grossSalary = income.annualIncome * Math.pow(1 + salaryGrowth, i) * incomeMultiplier;

      // CPF: age-based contribution rates (from 1 Jan 2026)
      const cpfRates = getCpfContributionRates(age);
      const cpfAlloc = getCpfAllocationRates(age);

      const employeeContribution = grossSalary * cpfRates.employeeRate;
      const employerContribution = grossSalary * cpfRates.employerRate;
      const totalCpfContribution = employeeContribution + employerContribution;

      // Take-home = gross - employee's CPF portion
      const takeHomePay = grossSalary - employeeContribution;

      // CPF allocation: OA + SA/RA goes to cashCpf bucket (usable for housing/retirement)
      // MA (MediSave) is excluded — it's for healthcare, not FIRE
      const cpfToOaSa = totalCpfContribution * (cpfAlloc.oaRate + cpfAlloc.saOrRaRate);
      // MA portion excluded from FIRE calculations
      // const cpfToMa = totalCpfContribution * cpfAlloc.maRate;

      const totalExpenses = income.annualExpenses + recurringPurchaseCosts;
      const surplus = takeHomePay - totalExpenses;

      // Add OA+SA/RA contributions to CPF bucket
      cashCpf += cpfToOaSa;

      if (surplus > 0) {
        investments += surplus * 0.7;  // 70% of surplus invested
        cashCpf += surplus * 0.3;      // 30% to cash savings
      } else {
        // Deficit: draw from cash first, then investments
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

import { FireInputs, YearData, FireResults } from './types';

export function formatSGD(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}S$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}S$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}S$${abs.toFixed(0)}`;
}

export function calculate(inputs: FireInputs): FireResults {
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

  // Build a map of recurring expense windows from purchases
  // For each year, compute total recurring costs active that year
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
      // Check lump sum at purchase age
      if (p.lumpSum > 0) {
        if (p.age === age) {
          total += p.lumpSum;
          labels.push(p.name);
        }
        // Check repeating purchases
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
    const recurringPurchaseCosts = getRecurringCostAtAge(age);

    if (!isRetired) {
      // Accumulation phase
      const currentIncome = income.annualIncome * Math.pow(1 + salaryGrowth, i);
      const cpfContribution = currentIncome * cpfRate;
      const takeHomePay = currentIncome - cpfContribution * (20 / 37); // employee portion ~20%
      const totalExpenses = income.annualExpenses + recurringPurchaseCosts;
      const surplus = takeHomePay - totalExpenses;

      // CPF goes to cashCpf bucket; surplus goes to investments
      cashCpf += cpfContribution;
      if (surplus > 0) {
        investments += surplus * 0.7; // 70% invested
        cashCpf += surplus * 0.3; // 30% cash savings
      } else {
        // Deficit: draw from cash first, then investments
        cashCpf += surplus;
        if (cashCpf < 0) {
          investments += cashCpf;
          cashCpf = 0;
        }
      }

      // Investment returns
      investments *= (1 + returnRate);
    } else {
      // Retirement phase: drawdown
      const totalDrawdown = income.retirementExpenses + recurringPurchaseCosts;
      // Draw from cash/CPF first, then investments
      cashCpf -= totalDrawdown * 0.4;
      investments -= totalDrawdown * 0.6;
      if (cashCpf < 0) {
        investments += cashCpf;
        cashCpf = 0;
      }
      // Remaining investments still grow
      if (investments > 0) {
        investments *= (1 + returnRate * 0.5); // more conservative in retirement
      }
    }

    // Lump sum purchases
    const { total: lumpSum, labels: purchaseLabels } = getLumpSumAtAge(age);
    if (lumpSum > 0) {
      // Deduct from investments first, then cash
      investments -= lumpSum;
      if (investments < 0) {
        cashCpf += investments;
        investments = 0;
      }
      if (cashCpf < 0) cashCpf = 0;
    }

    // Insurance growth
    insuranceValue *= (1 + (policies.length > 0
      ? policies.reduce((s, p) => s + p.annualGrowthRate, 0) / policies.length / 100
      : 0));

    yearlyData.push({
      age,
      investments: Math.max(0, Math.round(investments)),
      cashCpf: Math.max(0, Math.round(cashCpf)),
      insuranceValue: Math.round(insuranceValue),
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

  // Years to build: find first year where total net worth >= fireNumber
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

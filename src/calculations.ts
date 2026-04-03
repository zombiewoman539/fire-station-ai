import { FireInputs, YearData, FireResults, Scenario, CpfLifeOption } from './types';

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
// CPF Retirement Sum Constants (2026 base)
// ========================================
export const FRS_2026 = 220400;
export const BRS_2026 = 110200;
export const ERS_2026 = 440800;
export const RS_GROWTH_RATE = 0.035; // 3.5%/yr (2023–2027 CPF schedule)

// CPF LIFE payout rate per dollar of RA (monthly payout / retirement sum at 2026)
export const LIFE_PAYOUT_RATES: Record<CpfLifeOption, number> = {
  BRS: 950 / 110200,
  FRS: 1780 / 220400,
  ERS: 3440 / 440800,
};

export const CPF_LIFE_BASE_PAYOUTS: Record<CpfLifeOption, { raTarget: number; monthlyPayout: number; label: string; desc: string }> = {
  BRS: { raTarget: BRS_2026, monthlyPayout: 950,  label: 'Basic (BRS)',    desc: 'Property pledge required. Lower lock-up, more OA accessible.' },
  FRS: { raTarget: FRS_2026, monthlyPayout: 1780, label: 'Full (FRS)',     desc: 'Standard planning benchmark. Most common option.' },
  ERS: { raTarget: ERS_2026, monthlyPayout: 3440, label: 'Enhanced (ERS)', desc: 'Maximum voluntary top-up. Best longevity protection.' },
};

export function getProjectedRetirementSum(option: CpfLifeOption, currentAge: number): number {
  const yearsTo55 = Math.max(0, 55 - currentAge);
  const base = CPF_LIFE_BASE_PAYOUTS[option].raTarget;
  return base * Math.pow(1 + RS_GROWTH_RATE, yearsTo55);
}

export function getProjectedMonthlyPayout(option: CpfLifeOption, currentAge: number): number {
  const projectedRA = getProjectedRetirementSum(option, currentAge);
  return Math.round(projectedRA * LIFE_PAYOUT_RATES[option]);
}

// ========================================
// CPF Rates from 1 January 2026
// ========================================

function getCpfContributionRates(age: number) {
  if (age <= 55) return { employerRate: 0.17, employeeRate: 0.20, totalRate: 0.37 };
  if (age <= 60) return { employerRate: 0.16, employeeRate: 0.18, totalRate: 0.34 };
  if (age <= 65) return { employerRate: 0.125, employeeRate: 0.125, totalRate: 0.25 };
  if (age <= 70) return { employerRate: 0.09, employeeRate: 0.075, totalRate: 0.165 };
  return { employerRate: 0.075, employeeRate: 0.05, totalRate: 0.125 };
}

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

const CPF_OA_RATE = 0.025;
const CPF_SA_RATE = 0.04;

// BHS = $79,000 for 2026. Grows at ~2.5%/yr (conservative long-term; ensures cap is effective
// since MA earns 4% interest — if BHS grew faster than 4%, the cap would never re-trigger).
const BHS_2026 = 79000;
const BHS_GROWTH_RATE = 0.025;

function getBhsAtAge(currentAge: number, targetAge: number): number {
  if (targetAge >= 65) {
    const yearsTo65 = 65 - currentAge;
    if (yearsTo65 <= 0) return BHS_2026;
    return BHS_2026 * Math.pow(1 + BHS_GROWTH_RATE, yearsTo65);
  }
  return BHS_2026 * Math.pow(1 + BHS_GROWTH_RATE, targetAge - currentAge);
}

// Extra interest on CPF balances.
// Per CPF Board rules: OA extra → credited to SA (pre-55) or RA (55+).
// SA/RA extra → stays in SA/RA. MA extra → stays in MA.
function getCpfExtraInterest(age: number, oa: number, saOrRa: number, ma: number): { oaExtra: number; saOrRaExtra: number; maExtra: number } {
  if (age < 55) {
    const oaForExtra = Math.min(oa, 20000);
    let remaining = 60000 - oaForExtra;
    const saForExtra = Math.min(saOrRa, remaining);
    remaining -= saForExtra;
    const maForExtra = Math.min(ma, remaining);
    return { oaExtra: oaForExtra * 0.01, saOrRaExtra: saForExtra * 0.01, maExtra: maForExtra * 0.01 };
  } else {
    const oaForExtra = Math.min(oa, 20000);
    // Tier 1: 2% on first $30k combined (OA capped at $20k, then RA, then MA)
    let tier1Rem = 30000;
    const tier1Oa  = Math.min(oaForExtra, tier1Rem);  tier1Rem -= tier1Oa;
    const tier1Ra  = Math.min(saOrRa, tier1Rem);       tier1Rem -= tier1Ra;
    const tier1Ma  = Math.min(ma, tier1Rem);
    // Tier 2: 1% on next $30k combined
    let tier2Rem = 30000;
    const tier2Oa  = Math.min(Math.max(oaForExtra - tier1Oa, 0), tier2Rem);  tier2Rem -= tier2Oa;
    const tier2Ra  = Math.min(Math.max(saOrRa - tier1Ra, 0), tier2Rem);       tier2Rem -= tier2Ra;
    const tier2Ma  = Math.min(Math.max(ma - tier1Ma, 0), tier2Rem);
    return {
      oaExtra:     tier1Oa * 0.02 + tier2Oa * 0.01,
      saOrRaExtra: tier1Ra * 0.02 + tier2Ra * 0.01,
      maExtra:     tier1Ma * 0.02 + tier2Ma * 0.01,
    };
  }
}

// ========================================
// Main Calculation
// ========================================

export function calculate(inputs: FireInputs, scenario?: Scenario, options?: { ignoreCpfLife?: boolean }): FireResults {
  const { personal, income, assets, policies, purchases } = inputs;
  const { currentAge, retirementAge, lifeExpectancy } = personal;
  const years = lifeExpectancy - currentAge;

  const yearlyData: YearData[] = [];
  let moneyRunsOutAge: number | undefined;
  let raAtAge65 = 0;
  let cpfLifeMonthly = 0;

  let cash = assets.cashSavings;
  let investments = assets.investments;
  let cpfOA = assets.cpfOA;
  let cpfSA = assets.cpfSA;
  let cpfRA = assets.cpfRA || 0;
  // Cap initial MA to current BHS (user may have entered a value above today's cap)
  const initialBhs = getBhsAtAge(currentAge, currentAge);
  let cpfMA = Math.min(assets.cpfMA, initialBhs);
  let insuranceValue = policies.reduce((s, p) => s + p.cashValue, 0);

  const cashRate = assets.cashReturnRate / 100;
  const investRate = assets.investmentReturnRate / 100;
  const salaryGrowth = income.salaryGrowthRate / 100;
  const inflationRate = (income.inflationRate ?? 2.5) / 100;
  const yearsToRetirement = retirementAge - currentAge;

  // If client is already 55+, SA should be 0 (fold into RA if any exists)
  let sa55Closed = currentAge >= 55;
  if (sa55Closed && cpfSA > 0) {
    cpfRA += cpfSA;
    cpfSA = 0;
  }

  // Scenario state
  const hasScenario = scenario && scenario.type !== 'none';
  const scenarioAge = scenario?.ageAtEvent || currentAge;
  let scenarioPayoutApplied = false;

  const ciData = scenario?.type === 'critical-illness' && scenario.ciType
    ? CI_COST_DATA[scenario.ciType]
    : null;

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
    if (cash < 0) { cpfOA += cash; cash = 0; }
    if (cpfOA < 0) cpfOA = 0;
  };

  for (let i = 0; i <= years; i++) {
    const age = currentAge + i;
    const isRetired = age >= retirementAge;

    // ============================================================
    // AGE 55: SA CLOSURE — RA FORMATION
    // ============================================================
    if (age === 55 && !sa55Closed) {
      sa55Closed = true;

      if (options?.ignoreCpfLife) {
        // No CPF LIFE mode: skip RA lock entirely — SA flows directly to OA
        cpfOA += cpfSA;
        cpfSA = 0;
      } else {
        const raTarget = getProjectedRetirementSum(income.cpfLifeOption, currentAge);

        // Step A: SA → RA (up to raTarget)
        const saToRa = Math.min(cpfSA, raTarget);
        cpfRA += saToRa;
        cpfSA -= saToRa;

        // Step B: Top up RA from OA if still below target
        const raShortfall = raTarget - cpfRA;
        if (raShortfall > 0 && cpfOA > 0) {
          const oaToRa = Math.min(cpfOA, raShortfall);
          cpfRA += oaToRa;
          cpfOA -= oaToRa;
        }

        // Step C: Any remaining SA (above raTarget) overflows to OA, SA closes permanently
        if (cpfSA > 0) { cpfOA += cpfSA; cpfSA = 0; }
      }
    }

    // ============================================================
    // AGE 65: CPF LIFE BEGINS — RA COMMITTED TO ANNUITY
    // ============================================================
    if (age === 65 && raAtAge65 === 0 && cpfRA > 0) {
      raAtAge65 = cpfRA;
      if (!options?.ignoreCpfLife) {
        cpfLifeMonthly = Math.round(raAtAge65 * LIFE_PAYOUT_RATES[income.cpfLifeOption]);
      }
      cpfRA = 0; // RA committed to CPF LIFE annuity — no longer on balance sheet
    }

    let recurringPurchaseCosts = getRecurringCostAtAge(age);

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
        cash += policies.reduce((s, p) => s + p.ciSumAssured, 0);
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
    // ============================================================
    if (!isRetired) {
      const CPF_OW_CEILING = 96000;
      const grossSalary = income.annualIncome * Math.pow(1 + salaryGrowth, i) * incomeMultiplier;
      const cpfRates = getCpfContributionRates(age);
      const cpfAlloc = getCpfAllocationRates(age);

      const cpfLiableWage = Math.min(grossSalary, CPF_OW_CEILING);
      const employeeContribution = cpfLiableWage * cpfRates.employeeRate;
      const employerContribution = cpfLiableWage * cpfRates.employerRate;
      const totalCpfContribution = employeeContribution + employerContribution;

      const toOA_alloc = totalCpfContribution * cpfAlloc.oaRate;
      const toSaOrRa  = totalCpfContribution * cpfAlloc.saOrRaRate;
      const toMA      = totalCpfContribution * cpfAlloc.maRate;

      cpfOA += toOA_alloc;
      cpfMA += toMA;

      if (age >= 65 || (age >= 55 && options?.ignoreCpfLife)) {
        // Post-65 or no-CPF-LIFE mode: SA/RA portion goes straight to OA
        cpfOA += toSaOrRa;
      } else if (age >= 55) {
        // SA closed at 55 — saOrRaRate portion → RA (up to projected FRS cap), overflow → OA
        const frsCap = FRS_2026 * Math.pow(1 + RS_GROWTH_RATE, age - currentAge);
        const raHeadroom = Math.max(0, frsCap - cpfRA);
        const toRA = Math.min(toSaOrRa, raHeadroom);
        cpfRA += toRA;
        cpfOA += toSaOrRa - toRA;
      } else {
        cpfSA += toSaOrRa;
      }

      // BHS overflow: MA excess → SA (pre-55) or OA (55+, SA closed)
      const bhs = getBhsAtAge(currentAge, age);
      if (cpfMA > bhs) {
        const overflow = cpfMA - bhs;
        if (age < 55) { cpfSA += overflow; } else { cpfOA += overflow; }
        cpfMA = bhs;
      }

      // Take-home = gross minus employee CPF
      const takeHomePay = grossSalary - employeeContribution;
      const totalExpenses = income.annualExpenses + recurringPurchaseCosts;
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
      // Retirement expenses are entered in today's dollars — inflate to the actual year
      const yearsFromNow = age - currentAge;
      const inflatedExpenses = income.retirementExpenses * Math.pow(1 + inflationRate, yearsFromNow);
      const grossDrawdown = inflatedExpenses + recurringPurchaseCosts;

      // CPF LIFE reduces drawdown after 65
      const annuityIncome = age >= 65 ? cpfLifeMonthly * 12 : 0;
      const totalDrawdown = Math.max(0, grossDrawdown - annuityIncome);

      const totalAvailable = Math.max(0, investments) + Math.max(0, cash) + Math.max(0, cpfOA);
      // Note: cpfRA is locked pre-65 and 0 post-65 (committed to annuity)

      if (totalAvailable <= 0 && totalDrawdown > 0) {
        if (!moneyRunsOutAge) moneyRunsOutAge = age;
      } else if (totalDrawdown > 0) {
        // Draw from OA first (up to 40% of needed), then liquid
        const fromCpfOA = Math.min(totalDrawdown * 0.4, Math.max(0, cpfOA));
        const fromLiquid = totalDrawdown - fromCpfOA;
        cpfOA -= fromCpfOA;
        if (cpfOA < 0) cpfOA = 0;

        if (investments >= fromLiquid) {
          investments -= fromLiquid;
        } else {
          cash -= fromLiquid - investments;
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

    if (cpfOA > 0) cpfOA *= (1 + CPF_OA_RATE);
    if (cpfSA > 0) cpfSA *= (1 + CPF_SA_RATE);
    if (cpfMA > 0) cpfMA *= (1 + CPF_SA_RATE);
    if (cpfRA > 0) cpfRA *= (1 + CPF_SA_RATE); // RA earns 4%

    // Extra interest — OA extra → SA/RA; SA/RA extra → stays in SA/RA; MA extra → stays in MA.
    // Post-65: RA is committed to annuity, so OA/RA extra goes to OA instead.
    const saOrRaForExtra = age >= 55 ? cpfRA : cpfSA;
    if (cpfOA > 0 || saOrRaForExtra > 0 || cpfMA > 0) {
      const { oaExtra, saOrRaExtra, maExtra } = getCpfExtraInterest(age, cpfOA, saOrRaForExtra, cpfMA);
      cpfMA += maExtra; // MA's extra always stays in MA
      if (age >= 65)   { cpfOA += oaExtra + saOrRaExtra; } // RA gone — redirect to OA
      else if (age >= 55) { cpfRA += oaExtra + saOrRaExtra; }
      else                { cpfSA += oaExtra + saOrRaExtra; }
    }

    // BHS overflow post-interest — MA is always capped at BHS regardless of retirement status
    {
      const bhs = getBhsAtAge(currentAge, age);
      if (cpfMA > bhs) {
        const overflow = cpfMA - bhs;
        if (age < 55) { cpfSA += overflow; } else { cpfOA += overflow; }
        cpfMA = bhs;
      }
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
      cpfOA:          Math.max(0, Math.round(cpfOA)),
      cpfSA:          Math.max(0, Math.round(cpfSA)),
      cpfRA:          Math.max(0, Math.round(cpfRA)),
      cpfMA:          Math.max(0, Math.round(cpfMA)),
      insuranceValue: Math.max(0, Math.round(insuranceValue)),
      totalNetWorth:  Math.max(0, Math.round(investments + cash + cpfOA + cpfSA + cpfRA + cpfMA + insuranceValue)),
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
  // Inflate expenses from today to retirement age
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
    cpfLifeMonthly,
    raAtAge65,
  };
}

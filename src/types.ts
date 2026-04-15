export interface PersonalDetails {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
}

export interface IncomeExpenses {
  annualIncome: number;
  annualExpenses: number;
  annualInvestmentContribution: number;
  salaryGrowthRate: number;
  retirementExpenses: number;
  inflationRate: number;     // Annual inflation rate (%), default 2.5 (Singapore avg)
  withdrawalRate: number;    // Safe Withdrawal Rate, default 3.5%
  cpfLifeMonthlyPayout: number;  // User-entered monthly CPF LIFE payout from age 65
}

export interface Assets {
  cashSavings: number;
  investments: number;
  cashReturnRate: number;
  investmentReturnRate: number;
}

export interface InsurancePolicy {
  id: string;
  name: string;
  policyType: 'whole-life' | 'term' | 'ilp' | 'endowment' | 'ci' | 'other';
  cashValue: number;
  annualGrowthRate: number;
  deathSumAssured: number;
  tpdSumAssured: number;
  ciSumAssured: number;
  premiumAmount: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  premiumDueDay: number;
  premiumPaymentTerm: 'whole-life' | 'limited';
  premiumLimitedYears: number;
}

export type ScenarioType = 'none' | 'critical-illness' | 'tpd' | 'death';

export interface Scenario {
  type: ScenarioType;
  ageAtEvent: number;
  ciType?: 'cancer' | 'heart' | 'stroke' | 'kidney';
}

export interface MajorPurchase {
  id: string;
  name: string;
  age: number;
  lumpSum: number;
  recurringCost: number;
  recurringYears: number;
  repeatEveryYears: number;
}

export interface FireInputs {
  personal: PersonalDetails;
  income: IncomeExpenses;
  assets: Assets;
  policies: InsurancePolicy[];
  purchases: MajorPurchase[];
}

export interface YearData {
  age: number;
  investments: number;
  cash: number;
  insuranceValue: number;
  totalNetWorth: number;
  purchaseLabels: string[];
}

export interface FireResults {
  yearlyData: YearData[];
  wealthAtRetirement: number;
  fireNumber: number;
  fireNumberBreakdown: {
    grossRetirementExpenses: number;
    inflatedRetirementExpenses: number;
    inflationRate: number;
    yearsToRetirement: number;
    cpfLifeAnnual: number;
    netDrawdownNeeded: number;
    withdrawalRate: number;
    inflationBuffer: number;
  };
  yearsToBuild: number;
  onTrack: boolean;
  moneyRunsOutAge?: number;
}

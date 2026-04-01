export interface PersonalDetails {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
}

export type CpfLifeOption = 'BRS' | 'FRS' | 'ERS';

export interface IncomeExpenses {
  annualIncome: number;
  annualExpenses: number;
  annualInvestmentContribution: number;
  salaryGrowthRate: number;
  retirementExpenses: number;
  inflationRate: number;     // Annual inflation rate (%), default 2.5 (Singapore avg)
  withdrawalRate: number;    // Safe Withdrawal Rate, default 3.5%
  cpfLifeOption: CpfLifeOption;
}

export interface Assets {
  cashSavings: number;
  investments: number;
  cpfOA: number;
  cpfSA: number;
  cpfMA: number;
  cpfRA: number;             // Retirement Account — 0 for clients under 55
  cashReturnRate: number;
  investmentReturnRate: number;
}

export interface InsurancePolicy {
  id: string;
  name: string;
  cashValue: number;
  annualGrowthRate: number;
  deathSumAssured: number;
  tpdSumAssured: number;
  ciSumAssured: number;
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
  cpfOA: number;
  cpfSA: number;    // 0 from age 55 onwards (SA permanently closed)
  cpfRA: number;    // formed at 55, locked until 65, 0 after 65 (committed to CPF LIFE)
  cpfMA: number;
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
  cpfLifeMonthly: number;   // projected monthly CPF LIFE payout (computed from RA at 65)
  raAtAge65: number;        // RA balance when CPF LIFE starts
}

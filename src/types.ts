export interface PersonalDetails {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
}

export interface IncomeExpenses {
  annualIncome: number;
  annualExpenses: number;
  salaryGrowthRate: number;
  retirementExpenses: number;
}

export interface Assets {
  cashSavings: number;
  investments: number;
  cpfOA: number;
  cpfSA: number;
  cpfMA: number;
  cashReturnRate: number;        // default 1%
  investmentReturnRate: number;  // default 7%
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
  // CI-specific
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
  cpfOaSa: number;
  insuranceValue: number;
  totalNetWorth: number;
  purchaseLabels: string[];
}

export interface FireResults {
  yearlyData: YearData[];
  wealthAtRetirement: number;
  fireNumber: number;
  yearsToBuild: number;
  onTrack: boolean;
}

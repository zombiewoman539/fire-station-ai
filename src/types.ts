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
  cpfBalance: number;
  investmentReturnRate: number;
}

export interface InsurancePolicy {
  id: string;
  name: string;
  cashValue: number;
  annualGrowthRate: number;
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
  cashCpf: number;
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

export interface PersonalDetails {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  dateOfBirth?: string | null; // YYYY-MM-DD — used to auto-calculate live age on dashboard
  phoneNumber?: string;        // contact number (not used in calculations)
  gender?: 'M' | 'F' | '';    // affects CI/life premium benchmarks and life expectancy framing
}

export interface ExpenseLineItem {
  id: string;
  label: string;
  amount: number;                       // value in the chosen frequency
  frequency: 'monthly' | 'annual';
  category: 'fixed' | 'variable';
}

export interface IncomeExpenses {
  annualIncome: number;
  annualExpenses: number;               // fallback when expenseItems is empty
  expenseItems: ExpenseLineItem[];      // when non-empty, annualExpenses is derived from this
  annualInvestmentContribution: number; // fallback when investmentBuckets is empty
  salaryGrowthRate: number;
  retirementExpenses: number;
  inflationRate: number;     // Annual inflation rate (%), default 2.5 (Singapore avg)
  withdrawalRate: number;    // Safe Withdrawal Rate, default 3.5%
}

export interface InvestmentBucket {
  id: string;
  label: string;
  currentValue: number;
  monthlyContribution: number;
  annualReturnRate: number;
}

export interface Assets {
  cashSavings: number;
  investments: number;              // fallback when investmentBuckets is empty
  cashReturnRate: number;
  investmentReturnRate: number;     // fallback when investmentBuckets is empty
  investmentBuckets: InvestmentBucket[]; // when non-empty, investments + rate are derived
}

export interface FundAllocation {
  fundName: string;
  percentage: number; // 0–100
}

export interface InsurancePolicy {
  id: string;
  name: string;
  policyType: 'whole-life' | 'term' | 'ilp' | 'endowment' | 'ci' | 'other';
  cashValue: number;
  annualGrowthRate: number;
  deathSumAssured: number;
  tpdSumAssured: number;
  eciSumAssured: number;  // Early Critical Illness sum assured
  ciSumAssured: number;   // Major Critical Illness sum assured
  premiumAmount: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  premiumNextDueDate: string | null;  // YYYY-MM-DD — next payment date (recurs per frequency)
  premiumPaymentTerm: 'whole-life' | 'limited';
  premiumLimitedYears: number;
  nomineeName: string;           // free-text nominee name
  nomineeClientId: string | null; // linked FIRE Station client ID (optional)
  // Policy management fields
  insurer: string;               // insurance company name
  policyNumber: string;          // contract/policy number
  policyStatus: 'in-force' | 'lapsed' | 'surrendered' | 'claimed' | 'matured';
  commencementDate: string | null; // YYYY-MM-DD — when policy started
  maturityDate: string | null;     // YYYY-MM-DD — when policy ends (term/endowment)
  fundAllocations: FundAllocation[]; // ILP sub-fund breakdown (empty for non-ILP)
}

export interface HospitalPlan {
  hasMediShieldLife: boolean;          // mandatory for SC/PR — always default true
  hasISP: boolean;                     // Integrated Shield Plan (private upgrade)
  ispInsurer: string;                  // AIA | NTUC Income | HSBC Life | Great Eastern | Prudential | Raffles
  ispWardClass: 'B1' | 'A' | 'Private' | '';
  hasRider: boolean;                   // rider = zero co-payment — the key upsell
  annualPremiumMedisave: number;       // ISP base portion deducted from MA
  annualPremiumCash: number;           // rider must be 100% cash
}

export interface EstatePlanning {
  lpa: boolean;  // Lasting Power of Attorney done
  will: boolean; // Will done
}

export type ScenarioType = 'none' | 'critical-illness' | 'tpd' | 'death';

export interface Scenario {
  type: ScenarioType;
  ageAtEvent: number;
  ciType?: 'cancer' | 'heart' | 'stroke' | 'kidney';
  ciStage?: 'early' | 'advanced';
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
  estatePlanning: EstatePlanning;
  hospitalPlan?: HospitalPlan;
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
    netDrawdownNeeded: number;
    withdrawalRate: number;
    inflationBuffer: number;
  };
  yearsToBuild: number;
  onTrack: boolean;
  moneyRunsOutAge?: number;
}

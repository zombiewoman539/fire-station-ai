// Mirror of src/types.ts and src/profileTypes.ts — used only by server-side lib.
// The React build has its own copies; these are kept in sync manually.

export interface PersonalDetails {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  dateOfBirth?: string | null;
  phoneNumber?: string;
  gender?: 'M' | 'F' | '';
}

export interface ExpenseLineItem {
  id: string;
  label: string;
  amount: number;
  frequency: 'monthly' | 'annual';
  category: 'fixed' | 'variable';
}

export interface RetirementIncomeStream {
  id: string;
  label: string;
  annualAmount: number;
  startAge: number;
  durationYears: number | null;
  inflate: boolean;
}

export interface IncomeExpenses {
  annualIncome: number;
  annualExpenses: number;
  expenseItems: ExpenseLineItem[];
  annualInvestmentContribution: number;
  salaryGrowthRate: number;
  retirementExpenses: number;
  retirementExpenseItems?: ExpenseLineItem[];
  retirementIncomeStreams?: RetirementIncomeStream[];
  inflationRate: number;
  withdrawalRate: number;
}

export interface InvestmentBucket {
  id: string;
  label: string;
  currentValue: number;
  monthlyContribution: number;
  annualReturnRate: number;
  productType?: 'growth' | 'dividend' | 'annuity';
  premiumType?: 'single' | 'limited';
  annualPremium?: number;
  premiumYears?: number;
  premiumCommencementAge?: number;
  payoutStartAge?: number;
  payoutAnnualAmount?: number;
  payoutDurationYears?: number | null;
}

export interface AssetTransition {
  id: string;
  atAge: number;
  fromBucketId: string;
  toBucketId: string;
  portion: number;
}

export interface Assets {
  cashSavings: number;
  investments: number;
  cashReturnRate: number;
  investmentReturnRate: number;
  investmentBuckets: InvestmentBucket[];
  retirementReturnReduction?: number;
  transitions?: AssetTransition[];
}

export interface FundAllocation {
  fundName: string;
  percentage: number;
}

export interface Nominee {
  name: string;
  percentage: number;
  clientId: string | null;
}

export interface InsurancePolicy {
  id: string;
  name: string;
  policyType: 'whole-life' | 'term' | 'ilp' | 'endowment' | 'ci' | 'other';
  cashValue: number;
  annualGrowthRate: number;
  deathSumAssured: number;
  tpdSumAssured: number;
  eciSumAssured: number;
  ciSumAssured: number;
  premiumAmount: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  premiumNextDueDate: string | null;
  premiumPaymentTerm: 'whole-life' | 'limited';
  premiumLimitedYears: number;
  nominees: Nominee[];
  insurer: string;
  policyNumber: string;
  policyStatus: 'in-force' | 'lapsed' | 'surrendered' | 'claimed' | 'matured' | 'proposed';
  commencementDate: string | null;
  maturityDate: string | null;
  fundAllocations: FundAllocation[];
}

export interface HospitalPlan {
  hasMediShieldLife: boolean;
  hasISP: boolean;
  ispInsurer: string;
  ispWardClass: 'B1' | 'A' | 'Private' | '';
  hasRider: boolean;
  annualPremiumMedisave: number;
  annualPremiumCash: number;
}

export interface EstatePlanning {
  lpa: boolean;
  lpaDonee1?: string;
  lpaDonee2?: string;
  lpaReplacementDonee?: string;
  will: boolean;
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

export type CoverageType = 'death' | 'tpd' | 'ci' | 'eci';

export interface FireInputs {
  personal: PersonalDetails;
  income: IncomeExpenses;
  assets: Assets;
  policies: InsurancePolicy[];
  purchases: MajorPurchase[];
  estatePlanning: EstatePlanning;
  hospitalPlan?: HospitalPlan;
  coverageTargets?: Partial<Record<CoverageType, number>>;
  trackingMeta?: any;
  clientToken?: string | null;
  clientVisibility?: any;
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
    streamIncomeAtRetirement: number;
    netDrawdownNeeded: number;
    withdrawalRate: number;
    inflationBuffer: number;
  };
  yearsToBuild: number | null;
  onTrack: boolean;
  moneyRunsOutAge?: number;
}

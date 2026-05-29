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
  retirementExpenses: number;           // canonical total; auto-derived when retirementExpenseItems is non-empty
  retirementExpenseItems?: ExpenseLineItem[]; // optional breakdown — same shape as accumulation expenses
  retirementIncomeStreams?: RetirementIncomeStream[]; // CPF LIFE, rental, pension, spouse CPF LIFE, etc.
  inflationRate: number;     // Annual inflation rate (%), default 2.5 (Singapore avg)
  withdrawalRate: number;    // Safe Withdrawal Rate, default 3.5%
}

export interface RetirementIncomeStream {
  id: string;
  label: string;                  // 'CPF LIFE', 'Rental income', 'Spouse CPF LIFE', ...
  annualAmount: number;           // SGD in today's dollars
  startAge: number;               // age the stream begins paying out
  durationYears: number | null;   // null = lifetime; otherwise stops after this many years
  inflate: boolean;               // false = nominal (CPF LIFE); true = grows with inflation (rental-like)
}

export interface InvestmentBucket {
  id: string;
  label: string;
  currentValue: number;
  monthlyContribution: number;
  annualReturnRate: number;
  // W2: structured product types (absent / 'growth' = standard compounding bucket)
  productType?: 'growth' | 'dividend' | 'annuity';
  premiumType?: 'single' | 'limited';
  annualPremium?: number;           // limited pay: annual premium (SGD)
  premiumYears?: number;            // limited pay: total years of the premium term
  premiumCommencementAge?: number;  // age when premium payments began (defaults to currentAge if absent)
  payoutStartAge?: number;          // age when payouts begin
  payoutAnnualAmount?: number;      // annual payout (coupon for dividend; drawdown for annuity)
  payoutDurationYears?: number | null; // null = lifetime; finite = depletes capital (annuity)
}

export interface AssetTransition {
  id: string;
  atAge: number;          // age when the transfer fires (must be > currentAge to take effect)
  fromBucketId: string;
  toBucketId: string;
  portion: number;        // 0–1 fraction of fromBucket.currentValue to transfer
}

export interface Assets {
  cashSavings: number;
  investments: number;              // fallback when investmentBuckets is empty
  cashReturnRate: number;
  investmentReturnRate: number;     // fallback when investmentBuckets is empty
  investmentBuckets: InvestmentBucket[]; // when non-empty, investments + rate are derived
  /** Percentage reduction applied to investment returns once retired (0–100).
   *  Reflects the typical de-risking when you stop earning. Default 30 (i.e. retirement rate = accumulation × 0.70). */
  retirementReturnReduction?: number;
  transitions?: AssetTransition[];
}

export interface FundAllocation {
  fundName: string;
  percentage: number; // 0–100
}

export interface Nominee {
  name: string;
  percentage: number;   // 0–100, all nominees must sum to 100
  clientId: string | null; // optional link to another FIRE Station client
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
  nominees: Nominee[];            // beneficiaries — must sum to 100%
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
  lpa: boolean;
  lpaDonee1?: string;          // up to 2 donees (Singapore OPG rules)
  lpaDonee2?: string;
  lpaReplacementDonee?: string; // 1 replacement donee
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

// ─── Track feature (Phase 1: per-ticker investment tracking) ────────────────

export type TransactionType = 'buy' | 'sell' | 'dividend';
export type SupportedCurrency = 'USD' | 'SGD';

export interface InvestmentTransaction {
  id: string;
  clientProfileId: string;
  date: string;               // YYYY-MM-DD
  type: TransactionType;
  ticker: string;
  accountId: string;
  currency: SupportedCurrency;
  quantity: number;
  amountPerUnit: number;
  tradingFees: number;
  notes: string;
  createdAt: string;
}

export interface TrackingAccount {
  id: string;
  name: string;               // 'Interactive Brokers', 'Tiger', etc.
  defaultCurrency: SupportedCurrency;
}

export interface BudgetRule {
  spending: number;            // % of take-home, 0–100
  savings: number;
  investments: number;
  insurance: number;
}

export interface TrackingMeta {
  accounts: TrackingAccount[];
  tickerCategories: Record<string, string>;   // 'CSPX' → 'S&P', 'NOW' → 'Tech'
  budgetRule: BudgetRule;
  baseCurrency: SupportedCurrency;
}

// Derived (not stored): per-ticker rollup of all transactions
export interface Holding {
  ticker: string;
  accountId: string;
  currency: SupportedCurrency;
  category: string;
  quantity: number;
  costBasis: number;           // weighted average × qty, in native currency
  averageCost: number;         // costBasis / quantity
  realizedGain: number;        // sum across all sells (native currency)
  dividendsReceived: number;   // cumulative (native currency)
}

export interface HoldingWithMarketData extends Holding {
  marketPricePerUnit: number | null;   // native currency, null if Yahoo failed
  marketValue: number | null;          // qty × marketPrice, native currency
  unrealizedGain: number | null;       // marketValue − costBasis
  unrealizedGainPct: number | null;
  marketValueBase: number | null;      // converted to baseCurrency
  costBasisBase: number;               // converted to baseCurrency
}

export interface FireInputs {
  personal: PersonalDetails;
  income: IncomeExpenses;
  assets: Assets;
  policies: InsurancePolicy[];
  purchases: MajorPurchase[];
  estatePlanning: EstatePlanning;
  hospitalPlan?: HospitalPlan;
  /** Advisor-set target coverage per type (SGD). When a type is absent, falls back to the income-multiple benchmark. */
  coverageTargets?: Partial<Record<CoverageType, number>>;
  /** Track-feature metadata: accounts, ticker categories, budget rule, base currency. */
  trackingMeta?: TrackingMeta;
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
    /** Sum of retirement income streams active at retirementAge (CPF LIFE etc.), inflated where applicable. */
    streamIncomeAtRetirement: number;
    netDrawdownNeeded: number;
    withdrawalRate: number;
    inflationBuffer: number;
  };
  /** Years from currentAge until net worth first reaches the FIRE number. null = never reaches FIRE within lifeExpectancy. */
  yearsToBuild: number | null;
  onTrack: boolean;
  moneyRunsOutAge?: number;
}

import { FireInputs, MajorPurchase } from './types';

let _id = 0;
const uid = () => String(++_id);

export const defaultPurchases: MajorPurchase[] = [
  { id: uid(), name: 'HDB BTO Flat', age: 30, lumpSum: 400000, recurringCost: 0, recurringYears: 0, repeatEveryYears: 0 },
  { id: uid(), name: 'Wedding', age: 30, lumpSum: 30000, recurringCost: 0, recurringYears: 0, repeatEveryYears: 0 },
  { id: uid(), name: 'First Child', age: 32, lumpSum: 20000, recurringCost: 15000, recurringYears: 20, repeatEveryYears: 0 },
  { id: uid(), name: 'Second Child', age: 34, lumpSum: 20000, recurringCost: 15000, recurringYears: 20, repeatEveryYears: 0 },
  { id: uid(), name: 'Car (COE + Purchase)', age: 30, lumpSum: 120000, recurringCost: 0, recurringYears: 0, repeatEveryYears: 10 },
  { id: uid(), name: "Parents' Retirement Support", age: 45, lumpSum: 0, recurringCost: 12000, recurringYears: 20, repeatEveryYears: 0 },
  { id: uid(), name: 'Home Renovation', age: 30, lumpSum: 60000, recurringCost: 0, recurringYears: 0, repeatEveryYears: 0 },
];

export const defaultInputs: FireInputs = {
  personal: {
    currentAge: 28,
    retirementAge: 55,
    lifeExpectancy: 85,
  },
  income: {
    annualIncome: 72000,
    annualExpenses: 36000,
    annualInvestmentContribution: 12000,
    salaryGrowthRate: 3,
    retirementExpenses: 48000,
    inflationRate: 2.5,
    withdrawalRate: 3.5,
    cpfLifeMonthlyPayout: 0,
  },
  assets: {
    cashSavings: 30000,
    investments: 50000,
    cashReturnRate: 1,
    investmentReturnRate: 7,
  },
  policies: [
    {
      id: uid(), name: 'Whole Life Policy',
      policyType: 'whole-life',
      cashValue: 15000, annualGrowthRate: 3.5,
      deathSumAssured: 200000, tpdSumAssured: 200000, ciSumAssured: 100000,
      premiumAmount: 200, premiumFrequency: 'monthly',
      premiumDueDay: 1, premiumPaymentTerm: 'whole-life', premiumLimitedYears: 0,
      nomineeName: '', nomineeClientId: null,
    },
  ],
  purchases: defaultPurchases,
  estatePlanning: {
    lpa: false,
    will: false,
  },
};

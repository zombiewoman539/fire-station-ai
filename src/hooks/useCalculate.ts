import { useState, useEffect, useRef } from 'react';
import type { FireInputs, FireResults, Scenario } from '../types';
import type { InsuranceSummary } from '../insuranceCompute';

export interface ExtraTier {
  extra: number;
  yearsToBuild: number | null;
  onTrack: boolean;
  wealthAtRetirement: number;
}

export interface CalculateResult {
  results: FireResults;
  insurance: InsuranceSummary;
  scenarioResults: FireResults | null;
  proposedResults: FireResults | null;
  extraInvestmentTiers: ExtraTier[];
  loading: boolean;
}

const NULL_RESULTS: FireResults = {
  yearlyData: [],
  wealthAtRetirement: 0,
  fireNumber: 0,
  fireNumberBreakdown: {
    grossRetirementExpenses: 0,
    inflatedRetirementExpenses: 0,
    inflationRate: 2.5,
    yearsToRetirement: 0,
    streamIncomeAtRetirement: 0,
    netDrawdownNeeded: 0,
    withdrawalRate: 3.5,
    inflationBuffer: 10,
  },
  yearsToBuild: null,
  onTrack: false,
};

const NULL_INSURANCE: InsuranceSummary = {
  totalDeath: 0, totalTPD: 0, totalCI: 0, totalECI: 0,
  deathGap: 0, tpdGap: 0, ciGap: 0, eciGap: 0,
  coverageTargetSource: { death: 'benchmark', tpd: 'benchmark', ci: 'benchmark', eci: 'benchmark' },
  recommended: { death: 0, tpd: 0, ci: 0, eci: 0 },
  annualPremium: 0,
  signalScore: 0,
  hasMSL: null,
  hasISP: null,
  hasRider: null,
  ispWardClass: '',
};

// Batched calculate hook — one API call covers base + scenario + proposed + extra tiers.
// No debounce on the very first call; 300ms debounce for subsequent changes.
export function useCalculate(
  inputs: FireInputs,
  scenario: Scenario,
  proposedInputs: FireInputs | null,
  daysSinceUpdate = 0,
): CalculateResult {
  const [state, setState] = useState<CalculateResult>({
    results: NULL_RESULTS,
    insurance: NULL_INSURANCE,
    scenarioResults: null,
    proposedResults: null,
    extraInvestmentTiers: [],
    loading: true,
  });

  const isFirstRef = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable serialized dependency to avoid object-reference churn
  const inputsKey = JSON.stringify(inputs);
  const scenarioKey = JSON.stringify(scenario);
  const proposedKey = JSON.stringify(proposedInputs);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const delay = isFirstRef.current ? 0 : 300;
    isFirstRef.current = false;

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputs,
            scenario: scenario.type !== 'none' ? scenario : undefined,
            proposedInputs: proposedInputs ?? undefined,
            extraTiers: [200, 500, 1000],
            daysSinceUpdate,
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setState({
          results: data.results ?? NULL_RESULTS,
          insurance: data.insurance ?? NULL_INSURANCE,
          scenarioResults: data.scenarioResults ?? null,
          proposedResults: data.proposedResults ?? null,
          extraInvestmentTiers: data.extraInvestmentTiers ?? [],
          loading: false,
        });
      } catch {
        setState(prev => ({ ...prev, loading: false }));
      }
    }, delay);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputsKey, scenarioKey, proposedKey, daysSinceUpdate]);

  return state;
}

import { Router } from 'express';
import type { Request, Response } from 'express';
import { calculate } from '../lib/calculations';
import { computeInsurance } from '../lib/insuranceCompute';
import type { FireInputs, Scenario } from '../lib/types';

const router = Router();

// POST /api/calculate
// Batches base + scenario + proposed + extraTiers into one round-trip.
router.post('/', (req: Request, res: Response) => {
  const { inputs, scenario, proposedInputs, extraTiers, daysSinceUpdate = 0 } = req.body as {
    inputs: FireInputs;
    scenario?: Scenario;
    proposedInputs?: FireInputs;
    extraTiers?: number[];
    daysSinceUpdate?: number;
  };

  if (!inputs) {
    res.status(400).json({ error: 'inputs required' });
    return;
  }

  const results = calculate(inputs);
  const insurance = computeInsurance(inputs, daysSinceUpdate as number);

  const scenarioResults = (scenario && scenario.type !== 'none')
    ? calculate(inputs, scenario)
    : null;

  const proposedResults = proposedInputs ? calculate(proposedInputs) : null;

  const extraInvestmentTiers = (extraTiers ?? []).map((extra: number) => {
    const modInputs: FireInputs = {
      ...inputs,
      income: {
        ...inputs.income,
        annualInvestmentContribution: inputs.income.annualInvestmentContribution + extra * 12,
      },
    };
    const r = calculate(modInputs);
    return { extra, yearsToBuild: r.yearsToBuild, onTrack: r.onTrack, wealthAtRetirement: r.wealthAtRetirement };
  });

  res.json({ results, insurance, scenarioResults, proposedResults, extraInvestmentTiers });
});

export default router;

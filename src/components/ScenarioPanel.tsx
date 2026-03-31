import React from 'react';
import { FireInputs, FireResults, Scenario, ScenarioType } from '../types';
import { formatSGD, CI_COST_DATA } from '../calculations';

interface Props {
  inputs: FireInputs;
  results: FireResults;
  scenarioResults: FireResults | null;
  scenario: Scenario;
  onScenarioChange: (scenario: Scenario) => void;
}

const scenarioOptions: { value: ScenarioType; label: string; icon: string }[] = [
  { value: 'none', label: 'No Scenario', icon: '✅' },
  { value: 'critical-illness', label: 'Critical Illness', icon: '🏥' },
  { value: 'tpd', label: 'Total Permanent Disability', icon: '🦽' },
  { value: 'death', label: 'Death', icon: '☠️' },
];

const ciOptions: { value: 'cancer' | 'heart' | 'stroke' | 'kidney'; label: string; icon: string }[] = [
  { value: 'cancer', label: 'Cancer', icon: '🎗️' },
  { value: 'heart', label: 'Heart Disease', icon: '❤️‍🩹' },
  { value: 'stroke', label: 'Stroke', icon: '🧠' },
  { value: 'kidney', label: 'Kidney Failure', icon: '🫘' },
];

export default function ScenarioPanel({ inputs, results, scenarioResults, scenario, onScenarioChange }: Props) {
  const totalDeathSA = inputs.policies.reduce((s, p) => s + p.deathSumAssured, 0);
  const totalTpdSA = inputs.policies.reduce((s, p) => s + p.tpdSumAssured, 0);
  const totalCiSA = inputs.policies.reduce((s, p) => s + p.ciSumAssured, 0);

  const isActive = scenario.type !== 'none';
  const ciData = scenario.ciType ? CI_COST_DATA[scenario.ciType] : null;

  // Impact calculation
  const baseWealth = results.wealthAtRetirement;
  const scenarioWealth = scenarioResults?.wealthAtRetirement ?? baseWealth;
  const impact = scenarioWealth - baseWealth;

  // "On track" in a scenario means money lasts to life expectancy — not just wealthAtRetirement vs fireNumber
  const scenarioSurvives = scenarioResults
    ? scenarioResults.moneyRunsOutAge === undefined
    : true;

  // Total CI cost over treatment period
  const totalCiCost = ciData
    ? ciData.initialTreatment + (ciData.annualOngoing * ciData.ongoingYears)
    : 0;

  // Coverage ratio
  const coverageRatio = scenario.type === 'critical-illness'
    ? (totalCiSA > 0 ? totalCiSA / totalCiCost : 0)
    : scenario.type === 'tpd'
      ? (totalTpdSA > 0 ? totalTpdSA / (inputs.income.annualIncome * 10) : 0)
      : scenario.type === 'death'
        ? (totalDeathSA > 0 ? totalDeathSA / (inputs.income.annualIncome * 10) : 0)
        : 0;

  return (
    <div style={{ padding: '14px 16px' }}>
      {/* Header */}
      <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 15 }}>⚡</span>
        <span style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 700 }}>What If Something Happens?</span>
      </div>

      {/* Scenario selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {scenarioOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => onScenarioChange({ ...scenario, type: opt.value, ciType: opt.value === 'critical-illness' ? (scenario.ciType || 'cancer') : undefined })}
            style={{
              background: scenario.type === opt.value
                ? (opt.value === 'none' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)')
                : '#1e293b',
              border: `1px solid ${scenario.type === opt.value
                ? (opt.value === 'none' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)')
                : '#334155'}`,
              borderRadius: 8,
              color: scenario.type === opt.value
                ? (opt.value === 'none' ? '#34d399' : '#f87171')
                : '#94a3b8',
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>

      {/* Age at event slider */}
      {isActive && (
        <div style={{ marginBottom: 12 }}>
          <div className="flex justify-between" style={{ fontSize: 11, marginBottom: 4 }}>
            <span style={{ color: '#94a3b8' }}>Age at event</span>
            <span style={{ color: '#f87171', fontWeight: 700 }}>{scenario.ageAtEvent}</span>
          </div>
          <input
            type="range"
            min={inputs.personal.currentAge}
            max={inputs.personal.retirementAge}
            value={scenario.ageAtEvent}
            onChange={e => onScenarioChange({ ...scenario, ageAtEvent: Number(e.target.value) })}
            className="w-full"
            style={{ accentColor: '#ef4444' }}
          />
        </div>
      )}

      {/* CI type selector */}
      {scenario.type === 'critical-illness' && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
          {ciOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => onScenarioChange({ ...scenario, ciType: opt.value })}
              style={{
                background: scenario.ciType === opt.value ? 'rgba(239, 68, 68, 0.12)' : '#1e293b',
                border: `1px solid ${scenario.ciType === opt.value ? 'rgba(239, 68, 68, 0.3)' : '#334155'}`,
                borderRadius: 6,
                color: scenario.ciType === opt.value ? '#fca5a5' : '#64748b',
                padding: '5px 10px',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Impact details */}
      {isActive && scenarioResults && (
        <div>
          {/* Impact summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {/* Retirement wealth impact */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 10,
              padding: '10px 12px',
            }}>
              <div style={{ color: '#94a3b8', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                Impact on Retirement
              </div>
              <div style={{ color: impact >= 0 ? '#34d399' : '#f87171', fontSize: 18, fontWeight: 700 }}>
                {impact >= 0 ? '+' : ''}{formatSGD(impact)}
              </div>
              <div style={{ color: scenarioSurvives ? '#34d399' : '#f87171', fontSize: 10, fontWeight: 600 }}>
                {scenarioSurvives ? 'Funds last to life expectancy' : `Depleted at age ${scenarioResults.moneyRunsOutAge}`}
              </div>
            </div>

            {/* Coverage assessment */}
            <div style={{
              background: coverageRatio >= 0.8
                ? 'rgba(16, 185, 129, 0.08)' : coverageRatio >= 0.4
                  ? 'rgba(251, 191, 36, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${coverageRatio >= 0.8
                ? 'rgba(16, 185, 129, 0.2)' : coverageRatio >= 0.4
                  ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              borderRadius: 10,
              padding: '10px 12px',
            }}>
              <div style={{ color: '#94a3b8', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                Coverage Level
              </div>
              <div style={{
                color: coverageRatio >= 0.8 ? '#34d399' : coverageRatio >= 0.4 ? '#fbbf24' : '#f87171',
                fontSize: 18, fontWeight: 700,
              }}>
                {(coverageRatio * 100).toFixed(0)}%
              </div>
              <div style={{ color: '#6b7280', fontSize: 10 }}>
                {coverageRatio >= 0.8 ? 'Well covered' : coverageRatio >= 0.4 ? 'Partially covered' : 'Critically under-insured'}
              </div>
            </div>
          </div>

          {/* CI-specific cost breakdown */}
          {scenario.type === 'critical-illness' && ciData && (
            <div style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 10,
              padding: '12px',
              marginBottom: 10,
            }}>
              <div style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                {ciData.icon} {ciData.label} — Cost Breakdown
              </div>
              <div style={{ color: '#94a3b8', fontSize: 10, lineHeight: 1.4, marginBottom: 10 }}>
                {ciData.description}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <CostRow label="Initial Treatment" amount={ciData.initialTreatment} />
                <CostRow label={`Ongoing (${ciData.ongoingYears} years)`} amount={ciData.annualOngoing * ciData.ongoingYears} />
                <CostRow label={`Income Loss (~${ciData.incomeImpactMonths} months)`}
                  amount={Math.round(inputs.income.annualIncome * (ciData.incomeImpactMonths / 12) * 0.8)} />
                <div style={{ borderTop: '1px solid #334155', paddingTop: 6, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#f87171', fontSize: 11, fontWeight: 700 }}>Total Financial Impact</span>
                  <span style={{ color: '#f87171', fontSize: 11, fontWeight: 700 }}>
                    {formatSGD(totalCiCost + Math.round(inputs.income.annualIncome * (ciData.incomeImpactMonths / 12) * 0.8))}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: '#34d399', fontSize: 11, fontWeight: 600 }}>Your CI Coverage</span>
                  <span style={{ color: '#34d399', fontSize: 11, fontWeight: 600 }}>{formatSGD(totalCiSA)}</span>
                </div>
                {totalCiSA < totalCiCost && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    marginTop: 4,
                  }}>
                    <div style={{ color: '#fca5a5', fontSize: 10, fontWeight: 700 }}>
                      Coverage Gap: {formatSGD(totalCiCost - totalCiSA)}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
                      Without sufficient CI coverage, treatment costs will severely deplete your savings and delay FIRE by years.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TPD breakdown */}
          {scenario.type === 'tpd' && (
            <div style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 10,
              padding: '12px',
              marginBottom: 10,
            }}>
              <div style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                🦽 Total Permanent Disability Impact
              </div>
              <div style={{ color: '#94a3b8', fontSize: 10, lineHeight: 1.5, marginBottom: 8 }}>
                Unable to work permanently. All earned income stops from age {scenario.ageAtEvent}. Family depends on savings, insurance payout, and CPF.
              </div>
              <CostRow label="Lost Lifetime Income" amount={Math.round(inputs.income.annualIncome * (inputs.personal.retirementAge - scenario.ageAtEvent))} />
              <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#34d399', fontSize: 11, fontWeight: 600 }}>Your TPD Coverage</span>
                <span style={{ color: '#34d399', fontSize: 11, fontWeight: 600 }}>{formatSGD(totalTpdSA)}</span>
              </div>
            </div>
          )}

          {/* Death breakdown */}
          {scenario.type === 'death' && (
            <div style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 10,
              padding: '12px',
              marginBottom: 10,
            }}>
              <div style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                ☠️ Death — Family Impact
              </div>
              <div style={{ color: '#94a3b8', fontSize: 10, lineHeight: 1.5, marginBottom: 8 }}>
                Family loses all earned income from age {scenario.ageAtEvent}. Dependents must rely on insurance payout, accumulated savings, and CPF.
              </div>
              <CostRow label="Lost Lifetime Income" amount={Math.round(inputs.income.annualIncome * (inputs.personal.retirementAge - scenario.ageAtEvent))} />
              <CostRow label="Ongoing Family Expenses" amount={Math.round(inputs.income.annualExpenses * (inputs.personal.lifeExpectancy - scenario.ageAtEvent))} />
              <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#34d399', fontSize: 11, fontWeight: 600 }}>Your Death Coverage</span>
                <span style={{ color: '#34d399', fontSize: 11, fontWeight: 600 }}>{formatSGD(totalDeathSA)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!isActive && (
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 10,
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🛡️</div>
          <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>
            Select a scenario above to see how unexpected life events could impact your financial plan — and whether your insurance coverage is sufficient.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
            <CoverageBadge label="Death" amount={totalDeathSA} />
            <CoverageBadge label="TPD" amount={totalTpdSA} />
            <CoverageBadge label="CI" amount={totalCiSA} />
          </div>
        </div>
      )}
    </div>
  );
}

function CostRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#94a3b8', fontSize: 10 }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontSize: 10, fontWeight: 600 }}>{formatSGD(amount)}</span>
    </div>
  );
}

function CoverageBadge({ label, amount }: { label: string; amount: number }) {
  const color = amount > 0 ? '#34d399' : '#f87171';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ color, fontSize: 12, fontWeight: 700 }}>{amount > 0 ? formatSGD(amount) : 'None'}</div>
    </div>
  );
}

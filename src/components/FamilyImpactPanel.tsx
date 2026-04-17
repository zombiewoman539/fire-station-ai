import React from 'react';
import { FireInputs, FireResults } from '../types';
import { calculate, formatSGD, CI_COST_DATA } from '../calculations';
import { useIsDark } from '../useIsDark';

interface Props {
  inputs: FireInputs;
  results: FireResults; // baseline
}

type ImpactTab = 'death' | 'tpd' | 'ci';

// ── Shared helpers ────────────────────────────────────────────────────────────

function yearsColor(pct: number): string {
  if (pct >= 80) return '#34d399';
  if (pct >= 50) return '#fbbf24';
  if (pct >= 25) return '#f97316';
  return '#f87171';
}

function StatBox({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: 'var(--inset)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 12px', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: color || 'var(--text-1)', lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: 'var(--text-5)', marginTop: 2, lineHeight: 1.3 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Death / TPD panels ────────────────────────────────────────────────────────

function IncomeReplacementPanel({
  type, inputs, results,
}: { type: 'death' | 'tpd'; inputs: FireInputs; results: FireResults }) {
  const isDark = useIsDark();
  const fclr = {
    red:       isDark ? '#f87171' : '#dc2626',
    green:     isDark ? '#34d399' : '#047857',
    amber:     isDark ? '#fbbf24' : '#b45309',
    blue:      isDark ? '#60a5fa' : '#1d4ed8',
    redBg:     isDark ? 'rgba(239,68,68,0.08)'  : 'rgba(220,38,38,0.09)',
    redBorder: isDark ? 'rgba(239,68,68,0.25)'  : 'rgba(220,38,38,0.35)',
    greenBg:   isDark ? 'rgba(52,211,153,0.10)' : 'rgba(5,150,105,0.10)',
    greenBorder: isDark ? 'rgba(52,211,153,0.30)': 'rgba(5,150,105,0.35)',
  };
  const { personal, income, policies } = inputs;
  const currentAge = personal.currentAge;
  const yearsNeeded = personal.lifeExpectancy - currentAge;

  // Run scenario at current age
  const scenarioResults = React.useMemo(
    () => calculate(inputs, { type, ageAtEvent: currentAge }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(inputs), type, currentAge],
  );

  // In-force coverage only
  const inForce = policies.filter(p => p.policyStatus === 'in-force');
  const payout = type === 'death'
    ? inForce.reduce((s, p) => s + (p.deathSumAssured || 0), 0)
    : inForce.reduce((s, p) => s + (p.tpdSumAssured  || 0), 0);

  // Current wealth at this moment (year 0 of baseline)
  const currentWealth = results.yearlyData[0]?.totalNetWorth ?? 0;

  // Years secured: from scenario calculation (most accurate)
  const securedToAge = scenarioResults.moneyRunsOutAge ?? personal.lifeExpectancy;
  const yearsSecured = Math.max(0, securedToAge - currentAge);
  const pct = Math.min(100, Math.round((yearsSecured / yearsNeeded) * 100));
  const color = yearsColor(pct);

  // Simplified breakdown for explainability
  const yearsFromWealth = income.annualExpenses > 0 ? currentWealth / income.annualExpenses : 0;
  const yearsFromPayout = income.annualExpenses > 0 ? payout / income.annualExpenses : 0;

  // Lost future income
  const yearsToRetirement = Math.max(0, personal.retirementAge - currentAge);
  const lostIncome = income.annualIncome * yearsToRetirement;

  // Remaining gap in S$
  const gapYears = Math.max(0, yearsNeeded - yearsSecured);
  const gapSGD   = Math.round(gapYears * income.annualExpenses);

  const isFullyCovered = scenarioResults.moneyRunsOutAge === undefined;

  return (
    <div>
      {/* Hero metric */}
      <div style={{
        background: isFullyCovered ? fclr.greenBg : fclr.redBg,
        border: `1px solid ${isFullyCovered ? fclr.greenBorder : fclr.redBorder}`,
        borderRadius: 12, padding: '14px 16px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 2 }}>
              Family security runway
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>
              {yearsSecured < 1 ? '<1' : yearsSecured.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 600 }}>years</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-4)' }}>of {yearsNeeded} years needed</div>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{pct}%</div>
          </div>
        </div>

        {/* Coverage bar */}
        <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }}>
          <div style={{
            height: '100%', borderRadius: 4,
            width: `${pct}%`,
            background: pct >= 80
              ? 'linear-gradient(90deg,#059669,#34d399)'
              : pct >= 50
                ? 'linear-gradient(90deg,#b45309,#fbbf24)'
                : 'linear-gradient(90deg,#b91c1c,#f87171)',
            transition: 'width 0.5s ease',
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-5)' }}>
          <span>Today (age {currentAge})</span>
          {!isFullyCovered && scenarioResults.moneyRunsOutAge && (
            <span style={{ color: fclr.red, fontWeight: 700 }}>
              Money runs out: age {scenarioResults.moneyRunsOutAge}
            </span>
          )}
          <span>Life exp. (age {personal.lifeExpectancy})</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <StatBox
          label="Lost income"
          value={formatSGD(lostIncome)}
          sub={`${yearsToRetirement} yrs × ${formatSGD(income.annualIncome)}/yr`}
          color={fclr.red}
        />
        <StatBox
          label={type === 'death' ? 'Death payout' : 'TPD payout'}
          value={payout > 0 ? formatSGD(payout) : 'None'}
          sub={payout > 0 ? `≈ ${yearsFromPayout.toFixed(1)} yrs of expenses` : 'No coverage'}
          color={payout > 0 ? fclr.green : fclr.red}
        />
        <StatBox
          label="From savings"
          value={formatSGD(currentWealth)}
          sub={`≈ ${yearsFromWealth.toFixed(1)} yrs of expenses`}
          color={fclr.blue}
        />
      </div>

      {/* Gap callout or success */}
      {isFullyCovered ? (
        <div style={{
          background: fclr.greenBg, border: `1px solid ${fclr.greenBorder}`,
          borderRadius: 10, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: fclr.green }}>Family is fully protected</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
              Current savings + {type === 'death' ? 'death' : 'TPD'} coverage sustain the family to life expectancy.
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: fclr.redBg, border: `1px solid ${fclr.redBorder}`,
          borderRadius: 10, padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>🚨</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: fclr.red, marginBottom: 3 }}>
                Family short by {gapYears.toFixed(1)} years — {formatSGD(gapSGD)} gap
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.5 }}>
                After exhausting savings and {type === 'death' ? 'death' : 'TPD'} payout, the family still needs{' '}
                <strong style={{ color: 'var(--text-2)' }}>{formatSGD(income.annualExpenses)}/yr</strong> for{' '}
                <strong style={{ color: fclr.red }}>{gapYears.toFixed(1)} more years</strong>.
              </div>
            </div>
          </div>
          <div style={{
            fontSize: 11, color: fclr.amber, fontWeight: 600,
            borderTop: `1px solid ${fclr.redBorder}`, paddingTop: 8,
          }}>
            💡 Recommendation: Add{' '}
            <strong>{formatSGD(gapSGD)}</strong> in{' '}
            {type === 'death' ? 'term life / whole life' : 'TPD'} coverage to fully protect your family.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Critical Illness panel ────────────────────────────────────────────────────

function CIImpactPanel({ inputs, results }: { inputs: FireInputs; results: FireResults }) {
  const isDark = useIsDark();
  const fclr = {
    red:       isDark ? '#f87171' : '#dc2626',
    redDim:    isDark ? '#fca5a5' : '#b91c1c',
    green:     isDark ? '#34d399' : '#047857',
    amber:     isDark ? '#fbbf24' : '#b45309',
    orange:    isDark ? '#f97316' : '#c2410c',
    redBg:     isDark ? 'rgba(239,68,68,0.08)'  : 'rgba(220,38,38,0.09)',
    redBorder: isDark ? 'rgba(239,68,68,0.25)'  : 'rgba(220,38,38,0.35)',
    greenBg:   isDark ? 'rgba(52,211,153,0.10)' : 'rgba(5,150,105,0.10)',
    greenBorder: isDark ? 'rgba(52,211,153,0.30)': 'rgba(5,150,105,0.35)',
  };
  const [ciType, setCiType] = React.useState<'cancer' | 'heart' | 'stroke' | 'kidney'>('cancer');
  const [ciStage, setCiStage] = React.useState<'early' | 'advanced'>('early');
  const { personal, income, policies } = inputs;
  const currentAge = personal.currentAge;
  const ciData = CI_COST_DATA[ciType];

  const ciResults = React.useMemo(
    () => calculate(inputs, { type: 'critical-illness', ageAtEvent: currentAge, ciType, ciStage }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(inputs), currentAge, ciType, ciStage],
  );

  const inForce = policies.filter(p => p.policyStatus === 'in-force');
  const totalCI = inForce.reduce((s, p) => s + (ciStage === 'early' ? (p.eciSumAssured || 0) : (p.ciSumAssured || 0)), 0);

  const totalTreatmentCost = ciData.initialTreatment + ciData.annualOngoing * ciData.ongoingYears;
  const incomeLoss = Math.round(income.annualIncome * Math.ceil(ciData.incomeImpactMonths / 12) * 0.8);
  const totalFinancialHit = totalTreatmentCost + incomeLoss;

  const coveragePct = totalFinancialHit > 0 ? Math.min(100, Math.round((totalCI / totalFinancialHit) * 100)) : 100;
  const gapSGD = Math.max(0, totalFinancialHit - totalCI);
  const color = yearsColor(coveragePct);

  const wealthImpact = ciResults.wealthAtRetirement - results.wealthAtRetirement;
  const isFullyCovered = totalCI >= totalFinancialHit;

  return (
    <div>
      {/* CI type selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {(Object.entries(CI_COST_DATA) as [keyof typeof CI_COST_DATA, typeof CI_COST_DATA[keyof typeof CI_COST_DATA]][]).map(([key, d]) => (
          <button
            key={key}
            onClick={() => setCiType(key as typeof ciType)}
            style={{
              background: ciType === key ? fclr.redBg : 'var(--inset)',
              border: `1px solid ${ciType === key ? fclr.redBorder : 'var(--border)'}`,
              borderRadius: 7, padding: '5px 10px', cursor: 'pointer',
              color: ciType === key ? fclr.redDim : 'var(--text-4)',
              fontSize: 11, fontWeight: ciType === key ? 700 : 400,
              whiteSpace: 'nowrap',
            }}
          >
            {d.icon} {d.label}
          </button>
        ))}
      </div>

      {/* Stage selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-4)' }}>Stage:</span>
        {([
          { value: 'early', label: '⚡ Early CI' },
          { value: 'advanced', label: '🏥 Major CI' },
        ] as const).map(opt => (
          <button
            key={opt.value}
            onClick={() => setCiStage(opt.value)}
            style={{
              background: ciStage === opt.value ? fclr.redBg : 'var(--inset)',
              border: `1px solid ${ciStage === opt.value ? fclr.redBorder : 'var(--border)'}`,
              borderRadius: 7, padding: '5px 10px', cursor: 'pointer',
              color: ciStage === opt.value ? fclr.redDim : 'var(--text-4)',
              fontSize: 11, fontWeight: ciStage === opt.value ? 700 : 400,
              whiteSpace: 'nowrap',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Coverage meter */}
      <div style={{
        background: isFullyCovered ? fclr.greenBg : fclr.redBg,
        border: `1px solid ${isFullyCovered ? fclr.greenBorder : fclr.redBorder}`,
        borderRadius: 12, padding: '14px 16px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 2 }}>{ciData.icon} {ciData.label} cost covered</div>
            <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>
              {coveragePct}%
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-4)' }}>Total financial hit</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: fclr.red }}>{formatSGD(totalFinancialHit)}</div>
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }}>
          <div style={{
            height: '100%', borderRadius: 4, width: `${coveragePct}%`,
            background: coveragePct >= 80
              ? 'linear-gradient(90deg,#059669,#34d399)'
              : coveragePct >= 50
                ? 'linear-gradient(90deg,#b45309,#fbbf24)'
                : 'linear-gradient(90deg,#b91c1c,#f87171)',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-5)' }}>
          <span>Your CI coverage: {totalCI > 0 ? formatSGD(totalCI) : 'None'}</span>
          <span>Needed: {formatSGD(totalFinancialHit)}</span>
        </div>
      </div>

      {/* Cost breakdown */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <StatBox label="Initial treatment" value={formatSGD(ciData.initialTreatment)} sub={ciData.description.split(',')[0]} color={fclr.red} />
        <StatBox label={`Ongoing (${ciData.ongoingYears} yrs)`} value={formatSGD(ciData.annualOngoing * ciData.ongoingYears)} sub={`${formatSGD(ciData.annualOngoing)}/yr`} color={fclr.orange} />
        <StatBox label="Income loss" value={formatSGD(incomeLoss)} sub={`~${ciData.incomeImpactMonths} months at 80%`} color={fclr.amber} />
      </div>

      {/* Retirement impact */}
      <div style={{
        background: 'var(--inset)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '10px 12px', marginBottom: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
          Impact on retirement wealth
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: wealthImpact >= 0 ? fclr.green : fclr.red }}>
          {wealthImpact >= 0 ? '+' : ''}{formatSGD(wealthImpact)}
        </div>
      </div>

      {/* Gap callout */}
      {isFullyCovered ? (
        <div style={{
          background: fclr.greenBg, border: `1px solid ${fclr.greenBorder}`,
          borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10,
        }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: fclr.green }}>CI costs fully covered</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
              Your {formatSGD(totalCI)} CI policy covers the full {formatSGD(totalFinancialHit)} {ciData.label.toLowerCase()} cost.
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: fclr.redBg, border: `1px solid ${fclr.redBorder}`,
          borderRadius: 10, padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>🚨</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: fclr.red, marginBottom: 3 }}>
                {formatSGD(gapSGD)} gap — {totalCI === 0 ? 'completely unprotected' : 'partially covered'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.5 }}>
                A {ciData.label.toLowerCase()} diagnosis would cost {formatSGD(totalFinancialHit)} in total.{' '}
                {totalCI > 0
                  ? `Your ${formatSGD(totalCI)} CI coverage leaves a ${formatSGD(gapSGD)} gap.`
                  : `Without CI coverage, this comes entirely out of savings.`}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: fclr.amber, fontWeight: 600, borderTop: `1px solid ${fclr.redBorder}`, paddingTop: 8 }}>
            💡 Recommendation: Add {formatSGD(gapSGD)} in CI coverage to protect against {ciData.label.toLowerCase()}.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FamilyImpactPanel({ inputs, results }: Props) {
  const isDark = useIsDark();
  const tabClr = {
    green:       isDark ? '#34d399' : '#047857',
    greenBg:     isDark ? 'rgba(16,185,129,0.15)' : 'rgba(5,150,105,0.12)',
    greenBorder: isDark ? 'rgba(16,185,129,0.4)'  : 'rgba(5,150,105,0.4)',
  };
  const [tab, setTab] = React.useState<ImpactTab>('death');
  const { personal } = inputs;

  const tabs: { key: ImpactTab; icon: string; label: string }[] = [
    { key: 'death', icon: '☠️', label: 'Death' },
    { key: 'tpd',   icon: '🦽', label: 'Disability' },
    { key: 'ci',    icon: '🏥', label: 'Critical Illness' },
  ];

  return (
    <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 15 }}>🏠</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
            Family Impact Analysis
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
          If the unexpected happens to you today (age {personal.currentAge}) — can your family sustain their lifestyle?
        </div>
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, background: tab === t.key ? tabClr.greenBg : 'var(--inset)',
              border: `1px solid ${tab === t.key ? tabClr.greenBorder : 'var(--border)'}`,
              borderRadius: 8, padding: '7px 0', cursor: 'pointer',
              color: tab === t.key ? tabClr.green : 'var(--text-3)',
              fontSize: 12, fontWeight: tab === t.key ? 700 : 400,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Panel content */}
      {tab === 'death' && <IncomeReplacementPanel type="death" inputs={inputs} results={results} />}
      {tab === 'tpd'   && <IncomeReplacementPanel type="tpd"   inputs={inputs} results={results} />}
      {tab === 'ci'    && <CIImpactPanel inputs={inputs} results={results} />}
    </div>
  );
}

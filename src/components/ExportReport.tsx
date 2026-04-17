import { FireInputs, FireResults } from '../types';
import { formatSGD } from '../calculations';

interface Props {
  inputs: FireInputs;
  results: FireResults;
  clientName: string;
}

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', 'semi-annual': 'Semi-Annual', annual: 'Annual',
};

const STATUS_STYLE: Record<string, string> = {
  'in-force':   'background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;',
  'lapsed':     'background:#fef2f2;color:#dc2626;border:1px solid #fecaca;',
  'surrendered':'background:#f8fafc;color:#64748b;border:1px solid #e2e8f0;',
  'claimed':    'background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;',
  'matured':    'background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe;',
};

function statusBadge(status: string) {
  const label = status.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
  const style = STATUS_STYLE[status] ?? STATUS_STYLE['surrendered'];
  return `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;${style}">${label}</span>`;
}

export function generateReportHTML(inputs: FireInputs, results: FireResults, clientName: string): string {
  const { wealthAtRetirement, fireNumber, yearsToBuild, onTrack, yearlyData } = results;
  const { personal, income, assets, policies, purchases, estatePlanning } = inputs;
  const gap = fireNumber - wealthAtRetirement;
  const yearsInRetirement = personal.lifeExpectancy - personal.retirementAge;
  const savingsRate = income.annualIncome > 0
    ? ((income.annualIncome - income.annualExpenses) / income.annualIncome * 100) : 0;
  const today = new Date().toLocaleDateString('en-SG', { year: 'numeric', month: 'long', day: 'numeric' });

  // Wealth projection table
  const keyAges = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85].filter(
    a => a >= personal.currentAge && a <= personal.lifeExpectancy
  );
  const tableRows = keyAges.map(age => {
    const d = yearlyData.find(y => y.age === age);
    if (!d) return null;
    const isRetire = age === personal.retirementAge;
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;${isRetire ? 'font-weight:700;color:#2563eb;' : ''}">${age}${isRetire ? ' ★ Retire' : ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatSGD(d.investments)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatSGD(d.cash)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatSGD(d.insuranceValue)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${formatSGD(d.totalNetWorth)}</td>
    </tr>`;
  }).filter(Boolean).join('');

  // Insurance coverage totals (in-force only)
  const inForce = policies.filter(p => p.policyStatus === 'in-force');
  const totalDeath = inForce.reduce((s, p) => s + (p.deathSumAssured || 0), 0);
  const totalTPD   = inForce.reduce((s, p) => s + (p.tpdSumAssured || 0), 0);
  const totalECI   = inForce.reduce((s, p) => s + (p.eciSumAssured || 0), 0);
  const totalCI    = inForce.reduce((s, p) => s + (p.ciSumAssured || 0), 0);

  // Insurance rows — full detail
  const policyRows = policies.map(p => {
    const freq = FREQ_LABEL[p.premiumFrequency] ?? p.premiumFrequency;
    const payTerm = p.premiumPaymentTerm === 'limited' ? `Limited ${p.premiumLimitedYears} yrs` : 'Whole Life';
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
        <div style="font-weight:600;color:#111827;">${p.name}</div>
        ${p.insurer ? `<div style="font-size:11px;color:#6b7280;margin-top:1px;">${p.insurer}</div>` : ''}
        ${p.policyNumber ? `<div style="font-size:10px;color:#9ca3af;">Policy No. ${p.policyNumber}</div>` : ''}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">${statusBadge(p.policyStatus)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#6b7280;text-transform:capitalize;vertical-align:top;">${p.policyType.replace('-', ' ')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;">${p.deathSumAssured > 0 ? formatSGD(p.deathSumAssured) : '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;">${p.tpdSumAssured > 0 ? formatSGD(p.tpdSumAssured) : '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;">${p.eciSumAssured > 0 ? formatSGD(p.eciSumAssured) : '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;">${p.ciSumAssured > 0 ? formatSGD(p.ciSumAssured) : '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
        ${p.premiumAmount > 0 ? `<div style="font-weight:600;">${formatSGD(p.premiumAmount)} ${freq}</div>` : '—'}
        ${p.premiumAmount > 0 ? `<div style="font-size:10px;color:#9ca3af;">${payTerm}</div>` : ''}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#6b7280;vertical-align:top;">
        ${p.commencementDate ? `<div>Start: ${p.commencementDate}</div>` : ''}
        ${p.maturityDate ? `<div>End: ${p.maturityDate}</div>` : ''}
      </td>
    </tr>`;
  }).join('');

  // Coverage summary row
  const coverageSummary = policies.length > 0 ? `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
      ${[
        { label: '☠️ Total Death Coverage', value: totalDeath },
        { label: '🦽 Total TPD Coverage',   value: totalTPD },
        { label: '⚡ Total ECI Coverage',    value: totalECI },
        { label: '🏥 Total Major CI Coverage', value: totalCI },
      ].map(item => `
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
          <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">${item.label}</div>
          <div style="font-size:18px;font-weight:800;color:${item.value > 0 ? '#111827' : '#9ca3af'};">${item.value > 0 ? formatSGD(item.value) : 'No coverage'}</div>
        </div>`).join('')}
    </div>` : '';

  // Purchases table
  const purchaseRows = purchases.map(p => {
    const parts = [];
    if (p.lumpSum > 0) parts.push(`${formatSGD(p.lumpSum)} lump sum`);
    if (p.recurringCost > 0) parts.push(`${formatSGD(p.recurringCost)}/yr × ${p.recurringYears} yrs`);
    if (p.repeatEveryYears > 0) parts.push(`repeats every ${p.repeatEveryYears} yrs`);
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${p.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${p.age}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${p.lumpSum > 0 ? formatSGD(p.lumpSum) : '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${p.recurringCost > 0 ? formatSGD(p.recurringCost) : '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#6b7280;">${p.recurringYears > 0 ? `${p.recurringYears} yrs` : '—'}</td>
    </tr>`;
  }).join('');

  // Estate planning
  const lpa  = estatePlanning?.lpa  ?? false;
  const will = estatePlanning?.will ?? false;
  const estateBadge = (done: boolean, label: string) =>
    `<span style="font-size:12px;font-weight:700;padding:4px 10px;border-radius:6px;margin-right:8px;${done ? 'background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe;' : 'background:#f8fafc;color:#94a3b8;border:1px solid #e2e8f0;'}">${done ? '✓ ' : ''}${label}${done ? '' : ' — Pending'}</span>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>FIRE Report - ${clientName}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; margin: 0; padding: 40px; }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
  .logo { font-size: 28px; font-weight: 800; color: #111827; }
  .logo span { color: #ef4444; }
  .status-banner { padding: 20px; border-radius: 12px; margin-bottom: 24px; }
  .status-on-track { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .status-shortfall { background: #fef2f2; border: 1px solid #fecaca; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .metric { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; }
  .metric-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 4px; }
  .metric-value { font-size: 22px; font-weight: 800; }
  .section-title { font-size: 16px; font-weight: 700; color: #111827; margin: 28px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f9fafb; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; text-align: center; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo">🔥 <span>FIRE</span> Station</div>
    <div style="color:#6b7280;font-size:13px;margin-top:2px;">Financial Independence Report for <strong>${clientName}</strong></div>
  </div>
  <div style="text-align:right;">
    <div style="color:#9ca3af;font-size:12px;">${today}</div>
    <button class="no-print" onclick="window.print()" style="margin-top:8px;padding:8px 20px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">Print / Save PDF</button>
  </div>
</div>

<div class="status-banner ${onTrack ? 'status-on-track' : 'status-shortfall'}">
  <div style="font-size:20px;font-weight:800;color:${onTrack ? '#16a34a' : '#dc2626'};margin-bottom:4px;">
    ${onTrack ? '✅ On Track for Financial Independence' : '⚠️ Action Required — Shortfall Detected'}
  </div>
  <div style="color:#4b5563;font-size:14px;">
    ${onTrack
      ? `Projected wealth at retirement exceeds FIRE target by ${formatSGD(wealthAtRetirement - fireNumber)}. Current plan supports ${yearsInRetirement} years of retirement spending.`
      : `There is a projected shortfall of ${formatSGD(Math.abs(gap))}. Without adjustments, savings may not sustain ${yearsInRetirement} years of retirement.`}
  </div>
</div>

<div class="metrics">
  <div class="metric"><div class="metric-label">Current Age</div><div class="metric-value">${personal.currentAge}</div></div>
  <div class="metric"><div class="metric-label">Retirement Age</div><div class="metric-value">${personal.retirementAge}</div></div>
  <div class="metric"><div class="metric-label">Wealth at Retirement</div><div class="metric-value" style="color:#16a34a;">${formatSGD(wealthAtRetirement)}</div></div>
  <div class="metric"><div class="metric-label">FIRE Number</div><div class="metric-value" style="color:#2563eb;">${formatSGD(fireNumber)}</div></div>
</div>

<div class="metrics" style="grid-template-columns:repeat(5,1fr);">
  <div class="metric"><div class="metric-label">Annual Income</div><div class="metric-value" style="font-size:16px;">${formatSGD(income.annualIncome)}</div></div>
  <div class="metric"><div class="metric-label">Annual Expenses</div><div class="metric-value" style="font-size:16px;">${formatSGD(income.annualExpenses)}</div></div>
  <div class="metric"><div class="metric-label">Savings Rate</div><div class="metric-value" style="font-size:16px;">${savingsRate.toFixed(0)}%</div></div>
  <div class="metric"><div class="metric-label">Investment Return</div><div class="metric-value" style="font-size:16px;">${assets.investmentReturnRate}%</div></div>
  <div class="metric"><div class="metric-label">Years to FIRE</div><div class="metric-value" style="font-size:16px;">${yearsToBuild} yrs</div></div>
</div>

<div class="section-title">Wealth Projection</div>
<table>
  <thead><tr>
    <th>Age</th>
    <th style="text-align:right;">Investments</th>
    <th style="text-align:right;">Cash</th>
    <th style="text-align:right;">Insurance</th>
    <th style="text-align:right;">Total Net Worth</th>
  </tr></thead>
  <tbody>${tableRows}</tbody>
</table>

${policies.length > 0 ? `
<div class="section-title">Insurance Portfolio</div>
${coverageSummary}
<table>
  <thead><tr>
    <th>Policy</th>
    <th>Status</th>
    <th>Type</th>
    <th style="text-align:right;">Death SA</th>
    <th style="text-align:right;">TPD SA</th>
    <th style="text-align:right;">ECI SA</th>
    <th style="text-align:right;">Major CI SA</th>
    <th>Premium</th>
    <th>Dates</th>
  </tr></thead>
  <tbody>${policyRows}</tbody>
</table>` : ''}

${purchases.length > 0 ? `
<div class="section-title">Major Life Goals</div>
<table>
  <thead><tr>
    <th>Goal</th>
    <th style="text-align:center;">Age</th>
    <th style="text-align:right;">Lump Sum</th>
    <th style="text-align:right;">Annual Cost</th>
    <th>Duration</th>
  </tr></thead>
  <tbody>${purchaseRows}</tbody>
</table>` : ''}

<div class="section-title">Estate Planning</div>
<div style="padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
  ${estateBadge(lpa, 'Lasting Power of Attorney (LPA)')}
  ${estateBadge(will, 'Will')}
  ${(!lpa || !will) ? `<p style="margin:12px 0 0;font-size:12px;color:#6b7280;">${!lpa && !will ? 'Neither LPA nor Will has been put in place.' : !lpa ? 'LPA has not been set up.' : 'Will has not been drafted.'} These are important estate planning documents and should be prioritised.</p>` : `<p style="margin:12px 0 0;font-size:12px;color:#16a34a;">Both key estate planning documents are in place.</p>`}
</div>

${!onTrack ? `
<div class="section-title">Recommended Actions</div>
<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-top:8px;">
  <ol style="margin:0;padding-left:20px;color:#92400e;font-size:13px;line-height:1.8;">
    <li>Increase monthly savings by ${formatSGD(Math.round(Math.abs(gap) / ((personal.retirementAge - personal.currentAge) * 12)))}/month</li>
    <li>Review and optimise current expense categories</li>
    <li>Consider higher-return investment portfolio allocation</li>
    <li>Evaluate adequacy of current insurance coverage</li>
    <li>Schedule follow-up review in 6 months</li>
  </ol>
</div>` : ''}

<div class="footer">
  Generated by FIRE Station &middot; For discussion purposes only &middot; Not financial advice &middot; ${today}
</div>

</body>
</html>`;
}

export default function ExportReport({ inputs, results, clientName }: Props) {
  const handleExport = () => {
    const html = generateReportHTML(inputs, results, clientName);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) w.focus();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5"
      style={{
        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
        border: 'none', borderRadius: 8, color: '#fff',
        padding: '8px 14px', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Client Report
    </button>
  );
}

import { FireInputs, FireResults } from '../types';
import { formatSGD } from '../calculations';

interface Props {
  inputs: FireInputs;
  results: FireResults;
  clientName: string;
}

export function generateReportHTML(inputs: FireInputs, results: FireResults, clientName: string): string {
  const { wealthAtRetirement, fireNumber, yearsToBuild, onTrack, yearlyData } = results;
  const { personal, income, assets, policies, purchases } = inputs;
  const gap = fireNumber - wealthAtRetirement;
  const yearsInRetirement = personal.lifeExpectancy - personal.retirementAge;
  const savingsRate = income.annualIncome > 0
    ? ((income.annualIncome - income.annualExpenses) / income.annualIncome * 100) : 0;
  const today = new Date().toLocaleDateString('en-SG', { year: 'numeric', month: 'long', day: 'numeric' });

  // Key data points for the table
  const keyAges = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85].filter(
    a => a >= personal.currentAge && a <= personal.lifeExpectancy
  );
  const tableRows = keyAges.map(age => {
    const d = yearlyData.find(y => y.age === age);
    if (!d) return null;
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;${age === personal.retirementAge ? 'font-weight:700;color:#2563eb;' : ''}">${age}${age === personal.retirementAge ? ' (Retire)' : ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatSGD(d.investments)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatSGD(d.cash)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatSGD(d.insuranceValue)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${formatSGD(d.totalNetWorth)}</td>
    </tr>`;
  }).filter(Boolean).join('');

  const purchaseList = purchases.map(p => {
    let desc = `Age ${p.age}: ${p.name}`;
    if (p.lumpSum > 0) desc += ` — ${formatSGD(p.lumpSum)} lump sum`;
    if (p.recurringCost > 0) desc += ` + ${formatSGD(p.recurringCost)}/yr for ${p.recurringYears} yrs`;
    return `<li style="margin-bottom:4px;color:#4b5563;font-size:13px;">${desc}</li>`;
  }).join('');

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
  .date { color: #9ca3af; font-size: 12px; }
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
    <div class="logo">🔥 <span>FIRE</span> Goals Mapper</div>
    <div style="color:#6b7280;font-size:13px;margin-top:2px;">Financial Independence Report for <strong>${clientName}</strong></div>
  </div>
  <div style="text-align:right;">
    <div class="date">${today}</div>
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
      : `There is a projected shortfall of ${formatSGD(Math.abs(gap))}. Without adjustments, savings may not sustain ${yearsInRetirement} years of retirement at ${formatSGD(income.retirementExpenses)}/year.`
    }
  </div>
</div>

<div class="metrics">
  <div class="metric">
    <div class="metric-label">Current Age</div>
    <div class="metric-value">${personal.currentAge}</div>
  </div>
  <div class="metric">
    <div class="metric-label">Retirement Age</div>
    <div class="metric-value">${personal.retirementAge}</div>
  </div>
  <div class="metric">
    <div class="metric-label">Wealth at Retirement</div>
    <div class="metric-value" style="color:#16a34a;">${formatSGD(wealthAtRetirement)}</div>
  </div>
  <div class="metric">
    <div class="metric-label">FIRE Number</div>
    <div class="metric-value" style="color:#2563eb;">${formatSGD(fireNumber)}</div>
  </div>
</div>

<div class="metrics" style="grid-template-columns:repeat(5,1fr);">
  <div class="metric">
    <div class="metric-label">Annual Income</div>
    <div class="metric-value" style="font-size:16px;">${formatSGD(income.annualIncome)}</div>
  </div>
  <div class="metric">
    <div class="metric-label">Annual Expenses</div>
    <div class="metric-value" style="font-size:16px;">${formatSGD(income.annualExpenses)}</div>
  </div>
  <div class="metric">
    <div class="metric-label">Savings Rate</div>
    <div class="metric-value" style="font-size:16px;">${savingsRate.toFixed(0)}%</div>
  </div>
  <div class="metric">
    <div class="metric-label">Investment Return</div>
    <div class="metric-value" style="font-size:16px;">${assets.investmentReturnRate}%</div>
  </div>
  <div class="metric">
    <div class="metric-label">Years to FIRE</div>
    <div class="metric-value" style="font-size:16px;">${yearsToBuild} yrs</div>
  </div>
</div>

<div class="section-title">Wealth Projection</div>
<table>
  <thead>
    <tr>
      <th>Age</th>
      <th style="text-align:right;">Investments</th>
      <th style="text-align:right;">Cash</th>
      <th style="text-align:right;">Insurance</th>
      <th style="text-align:right;">Total Net Worth</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
  </tbody>
</table>

<div class="section-title">Major Life Purchases</div>
<ul style="padding-left:20px;">
  ${purchaseList}
</ul>

${policies.length > 0 ? `
<div class="section-title">Insurance Policies</div>
<table>
  <thead><tr><th>Policy</th><th style="text-align:right;">Cash Value</th><th style="text-align:right;">Growth Rate</th></tr></thead>
  <tbody>
    ${policies.map(p => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${p.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatSGD(p.cashValue)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${p.annualGrowthRate}%</td>
    </tr>`).join('')}
  </tbody>
</table>
` : ''}

${!onTrack ? `
<div class="section-title">Recommended Actions</div>
<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-top:8px;">
  <ol style="margin:0;padding-left:20px;color:#92400e;font-size:13px;line-height:1.8;">
    <li>Increase monthly savings by ${formatSGD(Math.abs(gap) / ((personal.retirementAge - personal.currentAge) * 12))}/month</li>
    <li>Review and optimize current expense categories</li>
    <li>Consider higher-return investment portfolio allocation</li>
    <li>Evaluate adequacy of current insurance coverage</li>
    <li>Schedule follow-up review in 6 months</li>
  </ol>
</div>
` : ''}

<div class="footer">
  Generated by FIRE Goals Mapper &middot; For discussion purposes only &middot; Not financial advice &middot; ${today}
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

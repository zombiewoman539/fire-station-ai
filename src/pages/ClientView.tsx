import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getClientViewData } from '../services/clientAccessService';
import { ClientVisibility, InvestmentTransaction, SupportedCurrency, CashFlowMonth, Liability, LiabilityType } from '../types';
import { fetchQuotes, getFxRate, QuoteResult } from '../services/marketDataService';
import { deriveHoldings } from '../lib/holdings';

function fmtSGD(n: number, cur: SupportedCurrency = 'SGD') {
  return (cur === 'SGD' ? 'S$' : 'US$') + Math.round(n).toLocaleString('en-SG');
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleString('en-SG', { month: 'short', year: 'numeric' });
}

function rowToTransaction(r: any): InvestmentTransaction {
  return {
    id: r.id, clientProfileId: r.client_profile_id, date: r.date,
    type: r.type, ticker: r.ticker, accountId: r.account_id,
    currency: r.currency, quantity: Number(r.quantity),
    amountPerUnit: Number(r.amount_per_unit), tradingFees: Number(r.trading_fees ?? 0),
    notes: r.notes ?? '', createdAt: r.created_at,
  };
}

function rowToCashFlow(r: any): CashFlowMonth {
  return {
    id: r.id, clientProfileId: r.client_profile_id, month: r.month,
    salary: Number(r.salary ?? 0), takeHome: Number(r.take_home ?? 0),
    spending: Number(r.spending ?? 0), savings: Number(r.savings ?? 0),
    investments: Number(r.investments ?? 0), insurance: Number(r.insurance ?? 0),
    cpf: Number(r.cpf ?? 0), notes: r.notes ?? '',
  };
}

function rowToLiability(r: any): Liability {
  return {
    id: r.id, clientProfileId: r.client_profile_id, name: r.name,
    type: (r.type ?? 'other') as LiabilityType,
    balance: Number(r.balance ?? 0), interestRate: Number(r.interest_rate ?? 0),
    monthlyPayment: Number(r.monthly_payment ?? 0),
    startDate: r.start_date ?? null, endDate: r.end_date ?? null, notes: r.notes ?? '',
  };
}

export default function ClientView() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [visibility, setVisibility] = useState<ClientVisibility | null>(null);
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [cashflow, setCashflow] = useState<CashFlowMonth[]>([]);
  const [loans, setLoans] = useState<Liability[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});
  const [fxRate, setFxRate] = useState(1);
  const baseCurrency: SupportedCurrency = 'SGD';

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    getClientViewData(token).then(async (data) => {
      if (!data) { setNotFound(true); setLoading(false); return; }
      setVisibility(data.visibility);
      const txs = (data.transactions ?? []).map(rowToTransaction);
      setTransactions(txs);
      setCashflow((data.cashflow ?? []).map(rowToCashFlow));
      setLoans((data.loans ?? []).map(rowToLiability));

      // Fetch live prices if portfolio section is visible
      if (data.visibility.portfolio && txs.length > 0) {
        const holdings = deriveHoldings(txs, undefined);
        const tickers = Array.from(new Set(holdings.filter(h => h.quantity > 0).map(h => h.ticker)));
        if (tickers.length > 0) {
          const q = await fetchQuotes(tickers);
          setQuotes(q);
          const rate = await getFxRate('USD', baseCurrency);
          setFxRate(rate);
        }
      }
      setLoading(false);
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
        Loading your portfolio…
      </div>
    );
  }

  if (notFound || !visibility) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 12 }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Link not found or expired</div>
        <div style={{ fontSize: 13, color: '#64748b', maxWidth: 300, textAlign: 'center' }}>
          This client link is invalid or has been revoked by your advisor. Please ask them to generate a new link.
        </div>
      </div>
    );
  }

  const holdings = deriveHoldings(transactions, undefined);
  const enriched = holdings.map(h => {
    const q = quotes[h.ticker];
    const price = q?.price ?? null;
    const mv = price !== null ? h.quantity * price : null;
    const fxFactor = h.currency === baseCurrency ? 1 : fxRate;
    return {
      ...h,
      marketValue: mv,
      marketValueBase: mv !== null ? mv * fxFactor : null,
      unrealizedGain: mv !== null ? mv - h.costBasis : null,
      unrealizedGainPct: mv !== null && h.costBasis > 0 ? ((mv - h.costBasis) / h.costBasis) * 100 : null,
    };
  });

  const totalValue = enriched.reduce((s, h) => s + (h.marketValueBase ?? 0), 0);
  const totalCost = enriched.reduce((s, h) => s + h.costBasis * (h.currency === baseCurrency ? 1 : fxRate), 0);
  const totalGain = totalValue - totalCost;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #0f172a)', color: 'var(--text-1, #f1f5f9)' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#4f46e5', textTransform: 'uppercase', marginBottom: 6 }}>
            FIRE Station · Client View
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Your Portfolio</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-3, #64748b)' }}>
            Read-only view shared by your financial advisor.
          </p>
        </div>

        {/* Portfolio section */}
        {visibility.portfolio && (
          <Section title="Portfolio Overview">
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
              <MiniCard label="Total Value" value={fmtSGD(totalValue, baseCurrency)} />
              <MiniCard label="Amount Invested" value={fmtSGD(totalCost, baseCurrency)} />
              <MiniCard
                label="Unrealized Gain"
                value={`${totalGain >= 0 ? '+' : ''}${fmtSGD(totalGain, baseCurrency)}`}
                color={totalGain >= 0 ? '#16a34a' : '#dc2626'}
              />
            </div>
            {enriched.filter(h => h.quantity > 0).length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
                    {['Ticker', 'Qty', 'Value', 'Gain/Loss'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b', fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enriched.filter(h => h.quantity > 0).map(h => (
                    <tr key={`${h.ticker}-${h.accountId}`} style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                      <td style={{ padding: '8px', fontWeight: 700 }}>{h.ticker}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#94a3b8' }}>{h.quantity.toLocaleString()}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{h.marketValueBase !== null ? fmtSGD(h.marketValueBase, baseCurrency) : '—'}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: (h.unrealizedGain ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                        {h.unrealizedGain !== null ? `${h.unrealizedGain >= 0 ? '+' : ''}${fmtSGD(h.unrealizedGain * (h.currency === baseCurrency ? 1 : fxRate), baseCurrency)} (${h.unrealizedGainPct?.toFixed(1)}%)` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        )}

        {/* Cash flow section */}
        {visibility.cashflow && cashflow.length > 0 && (
          <Section title="Monthly Cash Flow">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
                  {['Month', 'Take-Home', 'Spending', 'Savings', 'Investments'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b', fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cashflow.slice(0, 12).map(m => (
                  <tr key={m.month} style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{monthLabel(m.month)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{m.takeHome ? fmtSGD(m.takeHome) : '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{m.spending ? fmtSGD(m.spending) : '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{m.savings ? fmtSGD(m.savings) : '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{m.investments ? fmtSGD(m.investments) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Loans section */}
        {visibility.loans && loans.length > 0 && (
          <Section title="Loans & Debts">
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
              <MiniCard label="Total Outstanding" value={fmtSGD(loans.reduce((s, l) => s + l.balance, 0))} />
              <MiniCard label="Monthly Payments" value={fmtSGD(loans.reduce((s, l) => s + l.monthlyPayment, 0))} />
            </div>
            {loans.map(l => (
              <div key={l.id} style={{ background: 'rgba(148,163,184,0.06)', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{l.name}</div>
                <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#94a3b8' }}>
                  <span>Balance: <strong style={{ color: '#f1f5f9' }}>{fmtSGD(l.balance)}</strong></span>
                  <span>Rate: <strong style={{ color: '#f1f5f9' }}>{l.interestRate}%</strong></span>
                  <span>Monthly: <strong style={{ color: '#f1f5f9' }}>{fmtSGD(l.monthlyPayment)}</strong></span>
                </div>
              </div>
            ))}
          </Section>
        )}

        <p style={{ fontSize: 11, color: '#334155', marginTop: 40, textAlign: 'center' }}>
          Powered by FIRE Station · Data is shared by your advisor and updated manually
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 14, padding: 24, marginBottom: 20 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: '#e2e8f0' }}>{title}</h2>
      {children}
    </div>
  );
}

function MiniCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 10, padding: '12px 16px', minWidth: 150 }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color ?? '#f1f5f9' }}>{value}</div>
    </div>
  );
}

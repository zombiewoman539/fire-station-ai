import { InvestmentTransaction, SupportedCurrency } from '../types';
import { QuoteResult } from '../services/marketDataService';

export interface PortfolioSnapshot {
  date: string;             // YYYY-MM-DD
  portfolioValue: number;   // market value in base currency (converted using fxRate at that date)
  invested: number;         // cumulative net invested capital (buys - sells, no dividends)
  dividends: number;        // cumulative dividends received (value at transaction date)
}

/** Build a daily portfolio value time series from transactions + historical prices.
 *
 * Algorithm: for each date in the price history timeline, compute what holdings
 * existed at close of that date, then value them at that day's close price.
 * Uses USD→base-currency conversion from the FX history if provided.
 */
export function buildPerformanceHistory(
  transactions: InvestmentTransaction[],
  priceHistory: Record<string, QuoteResult>,  // ticker → result with .history
  fxHistory: QuoteResult | null,              // USDSGD=X history (null if base=USD)
  baseCurrency: SupportedCurrency,
): PortfolioSnapshot[] {
  if (transactions.length === 0) return [];

  // Build FX lookup: date → rate (null = use latest known)
  const fxByDate: Record<string, number> = {};
  if (fxHistory?.history) {
    for (const { date, close } of fxHistory.history) {
      if (close > 0) fxByDate[date] = close;
    }
  }

  // Collect all dates across all tickers, sorted
  const dateSet = new Set<string>();
  for (const result of Object.values(priceHistory)) {
    for (const { date } of result.history) dateSet.add(date);
  }
  const dates = Array.from(dateSet).sort();
  if (dates.length === 0) return [];

  // Sort transactions by date
  const txSorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  let txIdx = 0;
  // holdings: ticker:accountId → {qty, costBasis in native currency, nativeCurrency}
  const holdings: Record<string, { qty: number; currency: SupportedCurrency }> = {};
  let cumulativeInvested = 0;    // in base currency
  let cumulativeDividends = 0;   // in base currency

  // For FX: last known rate
  let lastFxRate = baseCurrency === 'USD' ? 1 : 1.35;

  const snapshots: PortfolioSnapshot[] = [];

  for (const date of dates) {
    // Update FX rate for this date
    if (fxByDate[date]) lastFxRate = fxByDate[date];

    // Process all transactions up to and including this date
    while (txIdx < txSorted.length && txSorted[txIdx].date <= date) {
      const tx = txSorted[txIdx];
      const key = `${tx.ticker}:${tx.accountId}`;
      const fxFactor = tx.currency === baseCurrency ? 1 : lastFxRate;
      const totalCost = (tx.quantity * tx.amountPerUnit + tx.tradingFees) * fxFactor;

      if (tx.type === 'buy') {
        if (!holdings[key]) holdings[key] = { qty: 0, currency: tx.currency };
        holdings[key].qty += tx.quantity;
        cumulativeInvested += totalCost;
      } else if (tx.type === 'sell') {
        if (holdings[key]) {
          holdings[key].qty = Math.max(0, holdings[key].qty - tx.quantity);
        }
        cumulativeInvested -= (tx.quantity * tx.amountPerUnit - tx.tradingFees) * fxFactor;
      } else if (tx.type === 'dividend') {
        cumulativeDividends += (tx.quantity * tx.amountPerUnit) * fxFactor;
      }
      txIdx++;
    }

    // Value current holdings at today's close
    let portfolioValue = 0;
    for (const [key, holding] of Object.entries(holdings)) {
      if (holding.qty <= 0) continue;
      const ticker = key.split(':')[0];
      const hist = priceHistory[ticker]?.history;
      if (!hist) continue;
      // Find closest price on or before this date
      const entry = [...hist].reverse().find(p => p.date <= date);
      if (!entry) continue;
      const fxFactor = holding.currency === baseCurrency ? 1 : lastFxRate;
      portfolioValue += holding.qty * entry.close * fxFactor;
    }

    if (portfolioValue > 0 || cumulativeInvested > 0) {
      snapshots.push({
        date,
        portfolioValue: Math.round(portfolioValue),
        invested: Math.round(Math.max(0, cumulativeInvested)),
        dividends: Math.round(cumulativeDividends),
      });
    }
  }

  return snapshots;
}

/** Money-weighted rate of return (approximate IRR) over a period.
 *
 * Returns annualised decimal (e.g. 0.12 = 12%) or null if insufficient data.
 */
export function calculateMWR(
  transactions: InvestmentTransaction[],
  currentValue: number,   // in base currency
  baseCurrency: SupportedCurrency,
  fxRate: number,
): number | null {
  if (transactions.length === 0 || currentValue <= 0) return null;

  const today = new Date();
  const cashFlows: Array<{ date: Date; amount: number }> = [];

  for (const tx of transactions) {
    const d = new Date(tx.date + 'T00:00:00');
    const fxFactor = tx.currency === baseCurrency ? 1 : fxRate;
    if (tx.type === 'buy') {
      cashFlows.push({ date: d, amount: -(tx.quantity * tx.amountPerUnit + tx.tradingFees) * fxFactor });
    } else if (tx.type === 'sell') {
      cashFlows.push({ date: d, amount: (tx.quantity * tx.amountPerUnit - tx.tradingFees) * fxFactor });
    } else if (tx.type === 'dividend') {
      cashFlows.push({ date: d, amount: tx.quantity * tx.amountPerUnit * fxFactor });
    }
  }
  // Terminal cash flow = current value
  cashFlows.push({ date: today, amount: currentValue });

  // Bisection to find IRR (annual rate)
  function npv(rate: number): number {
    const t0 = cashFlows[0].date.getTime();
    return cashFlows.reduce((sum, cf) => {
      const years = (cf.date.getTime() - t0) / (365.25 * 24 * 3600 * 1000);
      return sum + cf.amount / Math.pow(1 + rate, years);
    }, 0);
  }

  let lo = -0.99, hi = 10.0;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (Math.abs(hi - lo) < 1e-7) return mid;
    if (npv(mid) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

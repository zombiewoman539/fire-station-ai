import { InvestmentTransaction, Holding, TrackingMeta } from '../types';

/**
 * Derive current holdings from a list of transactions.
 *
 * Cost basis = weighted average. When a sell happens, we keep the same average cost on the
 * remaining shares and book the difference as a realized gain. Dividends do not affect qty
 * or cost basis — they accumulate into dividendsReceived.
 *
 * Holdings are keyed by (ticker, accountId) so the same ticker in two different brokerages
 * appears as two separate rows. Currency is read from the most recent transaction for the
 * pair (currency shouldn't change for a given account but we tolerate it).
 */
export function deriveHoldings(
  transactions: InvestmentTransaction[],
  trackingMeta: TrackingMeta | undefined,
): Holding[] {
  type Acc = {
    ticker: string;
    accountId: string;
    currency: Holding['currency'];
    quantity: number;
    costBasis: number;
    realizedGain: number;
    dividendsReceived: number;
  };

  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? -1 : 1));
  const map = new Map<string, Acc>();
  const key = (t: { ticker: string; accountId: string }) => `${t.ticker}::${t.accountId}`;

  for (const tx of sorted) {
    let acc = map.get(key(tx));
    if (!acc) {
      acc = {
        ticker: tx.ticker,
        accountId: tx.accountId,
        currency: tx.currency,
        quantity: 0,
        costBasis: 0,
        realizedGain: 0,
        dividendsReceived: 0,
      };
      map.set(key(tx), acc);
    }
    acc.currency = tx.currency;

    if (tx.type === 'buy') {
      acc.quantity += tx.quantity;
      acc.costBasis += tx.quantity * tx.amountPerUnit + tx.tradingFees;
    } else if (tx.type === 'sell') {
      if (acc.quantity <= 0) continue; // can't sell what you don't have
      const sellQty = Math.min(tx.quantity, acc.quantity);
      const avgCost = acc.costBasis / acc.quantity;
      const costRemoved = avgCost * sellQty;
      const proceeds = sellQty * tx.amountPerUnit - tx.tradingFees;
      acc.quantity -= sellQty;
      acc.costBasis -= costRemoved;
      acc.realizedGain += proceeds - costRemoved;
      if (acc.quantity < 1e-9) {
        acc.quantity = 0;
        acc.costBasis = 0;
      }
    } else if (tx.type === 'dividend') {
      acc.dividendsReceived += tx.quantity * tx.amountPerUnit - tx.tradingFees;
    }
  }

  const out: Holding[] = [];
  Array.from(map.values()).forEach(acc => {
    if (acc.quantity < 1e-9 && acc.dividendsReceived === 0 && acc.realizedGain === 0) return;
    out.push({
      ticker: acc.ticker,
      accountId: acc.accountId,
      currency: acc.currency,
      category: trackingMeta?.tickerCategories?.[acc.ticker] ?? 'Uncategorised',
      quantity: acc.quantity,
      costBasis: acc.costBasis,
      averageCost: acc.quantity > 0 ? acc.costBasis / acc.quantity : 0,
      realizedGain: acc.realizedGain,
      dividendsReceived: acc.dividendsReceived,
    });
  });
  return out.sort((a, b) => (a.ticker < b.ticker ? -1 : 1));
}

/** Sum holdings (open positions only — qty > 0) into a single total. Pure helper. */
export function sumQuantities(holdings: Holding[]): number {
  return holdings.reduce((s, h) => s + h.quantity, 0);
}

/** Total dividends received across all holdings, in their native currencies (NOT converted). */
export function totalDividends(holdings: Holding[]): number {
  return holdings.reduce((s, h) => s + h.dividendsReceived, 0);
}

/** Total realized gains across all holdings (informational, no tax in SG). */
export function totalRealizedGains(holdings: Holding[]): number {
  return holdings.reduce((s, h) => s + h.realizedGain, 0);
}

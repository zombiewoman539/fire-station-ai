import { deriveHoldings } from './holdings';
import { InvestmentTransaction, TrackingMeta } from '../types';

function tx(partial: Partial<InvestmentTransaction>): InvestmentTransaction {
  return {
    id: partial.id ?? Math.random().toString(36),
    clientProfileId: partial.clientProfileId ?? 'client-1',
    date: partial.date ?? '2025-01-01',
    type: partial.type ?? 'buy',
    ticker: partial.ticker ?? 'AAPL',
    accountId: partial.accountId ?? 'acc-1',
    currency: partial.currency ?? 'USD',
    quantity: partial.quantity ?? 0,
    amountPerUnit: partial.amountPerUnit ?? 0,
    tradingFees: partial.tradingFees ?? 0,
    notes: partial.notes ?? '',
    createdAt: partial.createdAt ?? '2025-01-01T00:00:00Z',
  };
}

const meta: TrackingMeta = {
  accounts: [{ id: 'acc-1', name: 'IBKR', defaultCurrency: 'USD' }],
  tickerCategories: { AAPL: 'Tech', SPY: 'S&P', CSPX: 'S&P' },
  budgetRule: { spending: 20, savings: 20, investments: 50, insurance: 10 },
  baseCurrency: 'SGD',
};

describe('deriveHoldings', () => {
  it('handles a single buy', () => {
    const h = deriveHoldings([
      tx({ type: 'buy', ticker: 'AAPL', quantity: 10, amountPerUnit: 200 }),
    ], meta);
    expect(h).toHaveLength(1);
    expect(h[0].quantity).toBe(10);
    expect(h[0].costBasis).toBe(2000);
    expect(h[0].averageCost).toBe(200);
    expect(h[0].category).toBe('Tech');
    expect(h[0].realizedGain).toBe(0);
  });

  it('includes trading fees in the cost basis on buys', () => {
    const h = deriveHoldings([
      tx({ type: 'buy', ticker: 'AAPL', quantity: 10, amountPerUnit: 200, tradingFees: 5 }),
    ], meta);
    expect(h[0].costBasis).toBe(2005);
    expect(h[0].averageCost).toBe(200.5);
  });

  it('weights cost basis across multiple buys', () => {
    const h = deriveHoldings([
      tx({ type: 'buy', date: '2025-01-01', ticker: 'AAPL', quantity: 10, amountPerUnit: 100 }),
      tx({ type: 'buy', date: '2025-02-01', ticker: 'AAPL', quantity: 10, amountPerUnit: 200 }),
    ], meta);
    expect(h[0].quantity).toBe(20);
    expect(h[0].costBasis).toBe(3000);
    expect(h[0].averageCost).toBe(150);
  });

  it('reduces quantity and books realized gain on a sell', () => {
    const h = deriveHoldings([
      tx({ type: 'buy', date: '2025-01-01', ticker: 'AAPL', quantity: 10, amountPerUnit: 100 }),
      tx({ type: 'sell', date: '2025-06-01', ticker: 'AAPL', quantity: 4, amountPerUnit: 150 }),
    ], meta);
    expect(h[0].quantity).toBe(6);
    expect(h[0].costBasis).toBe(600);   // 6 × $100 remaining
    expect(h[0].realizedGain).toBe(200); // (150 - 100) × 4
  });

  it('subtracts trading fees from sell proceeds', () => {
    const h = deriveHoldings([
      tx({ type: 'buy', date: '2025-01-01', ticker: 'AAPL', quantity: 10, amountPerUnit: 100 }),
      tx({ type: 'sell', date: '2025-06-01', ticker: 'AAPL', quantity: 4, amountPerUnit: 150, tradingFees: 10 }),
    ], meta);
    expect(h[0].realizedGain).toBe(190); // 200 gain - 10 fees
  });

  it('removes a holding when fully sold', () => {
    const h = deriveHoldings([
      tx({ type: 'buy', date: '2025-01-01', ticker: 'AAPL', quantity: 10, amountPerUnit: 100 }),
      tx({ type: 'sell', date: '2025-06-01', ticker: 'AAPL', quantity: 10, amountPerUnit: 150 }),
    ], meta);
    expect(h).toHaveLength(1);  // kept because realizedGain > 0
    expect(h[0].quantity).toBe(0);
    expect(h[0].costBasis).toBe(0);
    expect(h[0].realizedGain).toBe(500);
  });

  it('accumulates dividends without changing quantity or cost basis', () => {
    const h = deriveHoldings([
      tx({ type: 'buy', date: '2025-01-01', ticker: 'AAPL', quantity: 10, amountPerUnit: 100 }),
      tx({ type: 'dividend', date: '2025-04-01', ticker: 'AAPL', quantity: 10, amountPerUnit: 0.5 }),
      tx({ type: 'dividend', date: '2025-07-01', ticker: 'AAPL', quantity: 10, amountPerUnit: 0.6 }),
    ], meta);
    expect(h[0].quantity).toBe(10);
    expect(h[0].costBasis).toBe(1000);
    expect(h[0].dividendsReceived).toBe(11);  // 5 + 6
  });

  it('separates holdings by account even for the same ticker', () => {
    const h = deriveHoldings([
      tx({ type: 'buy', ticker: 'AAPL', accountId: 'acc-1', quantity: 10, amountPerUnit: 100 }),
      tx({ type: 'buy', ticker: 'AAPL', accountId: 'acc-2', quantity: 5, amountPerUnit: 200 }),
    ], meta);
    expect(h).toHaveLength(2);
    expect(h.find(x => x.accountId === 'acc-1')?.quantity).toBe(10);
    expect(h.find(x => x.accountId === 'acc-2')?.quantity).toBe(5);
  });

  it('ignores sells when no shares are held (defensive)', () => {
    const h = deriveHoldings([
      tx({ type: 'sell', ticker: 'AAPL', quantity: 5, amountPerUnit: 100 }),
    ], meta);
    expect(h).toHaveLength(0);
  });

  it('uses Uncategorised when no category mapping exists', () => {
    const h = deriveHoldings([
      tx({ type: 'buy', ticker: 'WEIRDTICKER', quantity: 1, amountPerUnit: 1 }),
    ], meta);
    expect(h[0].category).toBe('Uncategorised');
  });

  it('processes transactions in date order regardless of input order', () => {
    const h = deriveHoldings([
      // Sell comes first in array but after the buy by date
      tx({ id: '2', type: 'sell', date: '2025-06-01', ticker: 'AAPL', quantity: 5, amountPerUnit: 150 }),
      tx({ id: '1', type: 'buy',  date: '2025-01-01', ticker: 'AAPL', quantity: 10, amountPerUnit: 100 }),
    ], meta);
    expect(h[0].quantity).toBe(5);
    expect(h[0].realizedGain).toBe(250);
  });
});

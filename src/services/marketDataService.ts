import { SupportedCurrency } from '../types';

/**
 * Yahoo Finance market data service.
 *
 * Endpoints used:
 *   https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=3mo&interval=1d
 *
 * Caches results in sessionStorage with a 15-minute TTL to avoid hammering Yahoo on every page load.
 * Direct browser access works because Yahoo's chart API allows CORS for query1.finance.yahoo.com.
 */

const TTL_MS = 15 * 60 * 1000;
const SESSION_KEY = 'fire-market-data-cache-v1';

export interface QuoteResult {
  ticker: string;
  price: number | null;            // null = fetch failed
  priceCurrency: string | null;    // 'USD', 'SGD', etc. as reported by Yahoo
  history: Array<{ date: string; close: number }>;  // for the 90-day sparkline
  fetchedAt: number;
}

type CacheShape = Record<string, QuoteResult>;

function loadCache(): CacheShape {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function saveCache(cache: CacheShape): void {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(cache)); } catch { /* quota */ }
}

function cacheFresh(entry: QuoteResult | undefined): entry is QuoteResult {
  return !!entry && Date.now() - entry.fetchedAt < TTL_MS;
}

async function fetchOne(ticker: string): Promise<QuoteResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=3mo&interval=1d`;
  const fetchedAt = Date.now();
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error('no result');
    const meta = result.meta;
    const timestamps: number[] = result.timestamp ?? [];
    const closes: Array<number | null> = result.indicators?.quote?.[0]?.close ?? [];
    const history = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        close: closes[i] as number,
      }))
      .filter(p => typeof p.close === 'number' && !isNaN(p.close));
    const price = typeof meta?.regularMarketPrice === 'number' ? meta.regularMarketPrice : null;
    return {
      ticker,
      price,
      priceCurrency: meta?.currency ?? null,
      history,
      fetchedAt,
    };
  } catch {
    return { ticker, price: null, priceCurrency: null, history: [], fetchedAt };
  }
}

/** Fetch quotes for many tickers in parallel, using cache. */
export async function fetchQuotes(tickers: string[]): Promise<Record<string, QuoteResult>> {
  const cache = loadCache();
  const out: Record<string, QuoteResult> = {};
  const toFetch: string[] = [];

  for (const t of tickers) {
    const cached = cache[t];
    if (cacheFresh(cached)) {
      out[t] = cached;
    } else {
      toFetch.push(t);
    }
  }

  if (toFetch.length === 0) return out;

  const results = await Promise.all(toFetch.map(fetchOne));
  for (const r of results) {
    out[r.ticker] = r;
    cache[r.ticker] = r;
  }
  saveCache(cache);
  return out;
}

/** Force a refresh, bypassing the cache. */
export async function refreshQuotes(tickers: string[]): Promise<Record<string, QuoteResult>> {
  const cache = loadCache();
  for (const t of tickers) delete cache[t];
  saveCache(cache);
  return fetchQuotes(tickers);
}

/** Get the USD→SGD or SGD→USD conversion rate. Cached. */
export async function getFxRate(
  from: SupportedCurrency,
  to: SupportedCurrency,
): Promise<number> {
  if (from === to) return 1;
  // Yahoo FX pairs: USDSGD=X gives USD→SGD rate
  const pair = `${from}${to}=X`;
  const quote = (await fetchQuotes([pair]))[pair];
  if (quote?.price && quote.price > 0) return quote.price;
  // Fallback rough rate so the UI doesn't break
  if (from === 'USD' && to === 'SGD') return 1.35;
  if (from === 'SGD' && to === 'USD') return 1 / 1.35;
  return 1;
}

/** Convert an amount from one currency to another. */
export async function convert(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
): Promise<number> {
  if (from === to) return amount;
  const rate = await getFxRate(from, to);
  return amount * rate;
}

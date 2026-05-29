import { supabase } from './supabaseClient';
import { SupportedCurrency } from '../types';

/**
 * Yahoo Finance market data service.
 *
 * Yahoo's chart API doesn't return CORS headers, so we proxy through a Supabase
 * Edge Function (supabase/functions/market-data) which fetches server-side and
 * returns the data with proper CORS headers.
 *
 * Results are cached in sessionStorage with a 15-minute TTL.
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

async function fetchBatch(tickers: string[]): Promise<Record<string, QuoteResult>> {
  const fetchedAt = Date.now();
  const out: Record<string, QuoteResult> = {};
  if (tickers.length === 0) return out;

  // Raw fetch instead of supabase.functions.invoke — the JS client adds an
  // x-client-info header that some browsers cache aggressively in the CORS
  // preflight. Raw fetch only sends the headers we explicitly set.
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
  const supabaseKey = process.env.REACT_APP_SUPABASE_KEY!;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? supabaseKey;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/market-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ tickers }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    for (const ticker of tickers) {
      const r = (data as any)?.[ticker];
      out[ticker] = {
        ticker,
        price: r?.price ?? null,
        priceCurrency: r?.priceCurrency ?? null,
        history: Array.isArray(r?.history) ? r.history : [],
        fetchedAt,
      };
    }
  } catch (e) {
    console.warn('market-data fetch failed', e);
    for (const ticker of tickers) {
      out[ticker] = { ticker, price: null, priceCurrency: null, history: [], fetchedAt };
    }
  }
  return out;
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

  const fetched = await fetchBatch(toFetch);
  for (const ticker of Object.keys(fetched)) {
    out[ticker] = fetched[ticker];
    cache[ticker] = fetched[ticker];
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

// Market data proxy for Yahoo Finance.
//
// Yahoo's chart API doesn't return CORS headers, so direct browser fetches fail.
// This edge function calls Yahoo server-side and returns the data with proper
// CORS headers so the React app can use it from any origin.
//
// Body: { tickers: string[] }
// Returns: Record<ticker, { price, priceCurrency, history: [{date, close}] }>

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface QuoteResponse {
  price: number | null;
  priceCurrency: string | null;
  history: Array<{ date: string; close: number }>;
}

async function fetchOne(ticker: string): Promise<QuoteResponse> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=3mo&interval=1d`;
  try {
    const res = await fetch(url, {
      headers: {
        // Yahoo returns 429 for empty user agents
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
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
      .filter((p) => typeof p.close === 'number' && !isNaN(p.close));
    const price = typeof meta?.regularMarketPrice === 'number' ? meta.regularMarketPrice : null;
    return {
      price,
      priceCurrency: meta?.currency ?? null,
      history,
    };
  } catch {
    return { price: null, priceCurrency: null, history: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { tickers } = await req.json();
    if (!Array.isArray(tickers)) {
      return new Response(JSON.stringify({ error: 'tickers must be an array' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    const unique = Array.from(new Set(tickers.filter((t) => typeof t === 'string' && t.length > 0)));
    if (unique.length > 50) {
      return new Response(JSON.stringify({ error: 'max 50 tickers per call' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const results = await Promise.all(unique.map(fetchOne));
    const out: Record<string, QuoteResponse> = {};
    unique.forEach((t, i) => { out[t] = results[i]; });

    return new Response(JSON.stringify(out), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

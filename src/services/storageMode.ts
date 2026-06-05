import { supabase } from './supabaseClient';

/**
 * Storage mode helper.
 *
 * Returns true when the service should use the localStorage fallback instead of Supabase.
 * Rule: localStorage only kicks in when we're on localhost AND no Supabase session exists.
 * If the user is signed in (even on localhost), we hit Supabase like normal.
 *
 * This lets the user test against real cloud data on localhost just by signing in,
 * while keeping the "no setup required" localStorage flow for quick dev iteration.
 */
const isLocalhost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

let _cached: boolean | null = null;
let _inflight: Promise<boolean> | null = null;

export async function checkLocalStorageMode(): Promise<boolean> {
  if (!isLocalhost) return false;
  if (_cached !== null) return _cached;
  if (_inflight) return _inflight;
  _inflight = (async () => {
    const { data } = await supabase.auth.getSession();
    _cached = !data.session;
    _inflight = null;
    return _cached;
  })();
  return _inflight;
}

// Synchronous variant — uses cached value; defaults to true on localhost
// when the cache hasn't been hydrated yet. Used inside non-async helpers.
export function checkLocalStorageModeSync(): boolean {
  if (!isLocalhost) return false;
  return _cached ?? true;
}

// Invalidate when auth state changes (sign-in or sign-out)
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange(() => { _cached = null; });
}

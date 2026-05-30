import { supabase } from './supabaseClient';
import { ClientVisibility } from '../types';

const DEFAULT_VISIBILITY: ClientVisibility = {
  portfolio: true,
  cashflow: false,
  loans: false,
  performance: false,
};

function randomToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

/** Generate a new share token for the profile. Returns the token string. */
export async function generateClientToken(profileId: string): Promise<string> {
  const token = randomToken();
  const { error } = await supabase
    .from('client_profiles')
    .update({ client_token: token })
    .eq('id', profileId);
  if (error) throw error;
  return token;
}

/** Revoke the share token (sets to null). */
export async function revokeClientToken(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('client_profiles')
    .update({ client_token: null })
    .eq('id', profileId);
  if (error) throw error;
}

/** Save visibility settings for a profile. */
export async function saveClientVisibility(profileId: string, visibility: ClientVisibility): Promise<void> {
  const { error } = await supabase
    .from('client_profiles')
    .update({ client_visibility: visibility })
    .eq('id', profileId);
  if (error) throw error;
}

/** Fetch client view data for a given token. Uses security-definer RPC so no auth needed. */
export async function getClientViewData(token: string): Promise<{
  profileId: string;
  visibility: ClientVisibility;
  transactions?: any[];
  cashflow?: any[];
  loans?: any[];
} | null> {
  const { data, error } = await supabase.rpc('get_client_view', { p_token: token });
  if (error) { console.error('get_client_view error', error); return null; }
  if (!data) return null;
  return {
    profileId: data.profileId,
    visibility: { ...DEFAULT_VISIBILITY, ...(data.visibility ?? {}) },
    transactions: data.transactions ?? undefined,
    cashflow: data.cashflow ?? undefined,
    loans: data.loans ?? undefined,
  };
}

export { DEFAULT_VISIBILITY };

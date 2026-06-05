import { supabase } from './supabaseClient';
import { checkLocalStorageMode } from './storageMode';
import { Liability, LiabilityType } from '../types';

const LOCAL_KEY = 'fire-local-liabilities';
function localLoad(): Liability[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}
function localSave(rows: Liability[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
}

function rowToLiability(row: any): Liability {
  return {
    id: row.id,
    clientProfileId: row.client_profile_id,
    name: row.name,
    type: (row.type ?? 'other') as LiabilityType,
    balance: row.balance ?? 0,
    interestRate: row.interest_rate ?? 0,
    monthlyPayment: row.monthly_payment ?? 0,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    notes: row.notes ?? '',
  };
}

export async function listLiabilities(clientProfileId: string): Promise<Liability[]> {
  if (await checkLocalStorageMode()) {
    return localLoad().filter(l => l.clientProfileId === clientProfileId);
  }
  const { data, error } = await supabase
    .from('liabilities')
    .select('*')
    .eq('client_profile_id', clientProfileId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToLiability);
}

export async function createLiability(params: Omit<Liability, 'id'>): Promise<Liability> {
  if (await checkLocalStorageMode()) {
    const l: Liability = { id: `lib-${Date.now()}`, ...params };
    localSave([...localLoad(), l]);
    return l;
  }
  const { data, error } = await supabase
    .from('liabilities')
    .insert({
      client_profile_id: params.clientProfileId,
      name: params.name,
      type: params.type,
      balance: params.balance,
      interest_rate: params.interestRate,
      monthly_payment: params.monthlyPayment,
      start_date: params.startDate ?? null,
      end_date: params.endDate ?? null,
      notes: params.notes,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToLiability(data);
}

export async function updateLiability(id: string, updates: Partial<Omit<Liability, 'id' | 'clientProfileId'>>): Promise<void> {
  if (await checkLocalStorageMode()) {
    const all = localLoad();
    const l = all.find(x => x.id === id);
    if (l) { Object.assign(l, updates); localSave(all); }
    return;
  }
  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined)          dbUpdates.name = updates.name;
  if (updates.type !== undefined)          dbUpdates.type = updates.type;
  if (updates.balance !== undefined)       dbUpdates.balance = updates.balance;
  if (updates.interestRate !== undefined)  dbUpdates.interest_rate = updates.interestRate;
  if (updates.monthlyPayment !== undefined) dbUpdates.monthly_payment = updates.monthlyPayment;
  if (updates.startDate !== undefined)     dbUpdates.start_date = updates.startDate;
  if (updates.endDate !== undefined)       dbUpdates.end_date = updates.endDate;
  if (updates.notes !== undefined)         dbUpdates.notes = updates.notes;
  const { error } = await supabase.from('liabilities').update(dbUpdates).eq('id', id);
  if (error) throw error;
}

export async function deleteLiability(id: string): Promise<void> {
  if (await checkLocalStorageMode()) { localSave(localLoad().filter(l => l.id !== id)); return; }
  const { error } = await supabase.from('liabilities').delete().eq('id', id);
  if (error) throw error;
}

/** Months remaining on a loan given current balance, monthly payment, and monthly rate. */
export function monthsRemaining(balance: number, monthlyPayment: number, annualRate: number): number | null {
  if (monthlyPayment <= 0 || balance <= 0) return null;
  const r = annualRate / 100 / 12;
  if (r === 0) return Math.ceil(balance / monthlyPayment);
  // n = -ln(1 - r*B/P) / ln(1+r)
  const inner = 1 - (r * balance) / monthlyPayment;
  if (inner <= 0) return null;
  return Math.ceil(-Math.log(inner) / Math.log(1 + r));
}

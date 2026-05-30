import { supabase } from './supabaseClient';
import { useLocalStorageMode } from './storageMode';
import { CashFlowMonth } from '../types';

const LOCAL_KEY = 'fire-local-cash-flow-months';
function localLoad(): CashFlowMonth[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}
function localSave(rows: CashFlowMonth[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
}

function rowToMonth(row: any): CashFlowMonth {
  return {
    id: row.id,
    clientProfileId: row.client_profile_id,
    month: row.month,
    salary: row.salary ?? 0,
    takeHome: row.take_home ?? 0,
    spending: row.spending ?? 0,
    savings: row.savings ?? 0,
    investments: row.investments ?? 0,
    insurance: row.insurance ?? 0,
    cpf: row.cpf ?? 0,
    notes: row.notes ?? '',
  };
}

export async function listCashFlowMonths(clientProfileId: string): Promise<CashFlowMonth[]> {
  if (await useLocalStorageMode()) {
    return localLoad().filter(m => m.clientProfileId === clientProfileId);
  }
  const { data, error } = await supabase
    .from('cash_flow_months')
    .select('*')
    .eq('client_profile_id', clientProfileId)
    .order('month', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToMonth);
}

export async function upsertCashFlowMonth(params: Omit<CashFlowMonth, 'id'>): Promise<CashFlowMonth> {
  if (await useLocalStorageMode()) {
    const all = localLoad();
    const idx = all.findIndex(m => m.clientProfileId === params.clientProfileId && m.month === params.month);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...params };
      localSave(all);
      return all[idx];
    }
    const m: CashFlowMonth = { id: `cf-${Date.now()}`, ...params };
    localSave([m, ...all]);
    return m;
  }
  const { data, error } = await supabase
    .from('cash_flow_months')
    .upsert({
      client_profile_id: params.clientProfileId,
      month: params.month,
      salary: params.salary,
      take_home: params.takeHome,
      spending: params.spending,
      savings: params.savings,
      investments: params.investments,
      insurance: params.insurance,
      cpf: params.cpf,
      notes: params.notes,
    }, { onConflict: 'client_profile_id,month' })
    .select()
    .single();
  if (error) throw error;
  return rowToMonth(data);
}

export async function deleteCashFlowMonth(id: string): Promise<void> {
  if (await useLocalStorageMode()) { localSave(localLoad().filter(m => m.id !== id)); return; }
  const { error } = await supabase.from('cash_flow_months').delete().eq('id', id);
  if (error) throw error;
}

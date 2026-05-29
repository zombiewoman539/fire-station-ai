import { supabase } from './supabaseClient';
import { useLocalStorageMode } from './storageMode';
import { InvestmentTransaction, TransactionType, SupportedCurrency } from '../types';

const LOCAL_KEY = 'fire-local-investment-transactions';
function localLoad(): InvestmentTransaction[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}
function localSave(txs: InvestmentTransaction[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(txs));
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function rowToTx(row: any): InvestmentTransaction {
  return {
    id: row.id,
    clientProfileId: row.client_profile_id,
    date: row.date,
    type: row.type as TransactionType,
    ticker: row.ticker,
    accountId: row.account_id,
    currency: (row.currency ?? 'USD') as SupportedCurrency,
    quantity: Number(row.quantity),
    amountPerUnit: Number(row.amount_per_unit),
    tradingFees: Number(row.trading_fees ?? 0),
    notes: row.notes ?? '',
    createdAt: row.created_at,
  };
}

export async function listTransactions(clientProfileId: string): Promise<InvestmentTransaction[]> {
  if (await useLocalStorageMode()) {
    return localLoad()
      .filter(t => t.clientProfileId === clientProfileId)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  const { data, error } = await supabase
    .from('investment_transactions')
    .select('*')
    .eq('client_profile_id', clientProfileId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToTx);
}

export async function createTransaction(
  params: Omit<InvestmentTransaction, 'id' | 'createdAt'>,
): Promise<InvestmentTransaction> {
  if (await useLocalStorageMode()) {
    const tx: InvestmentTransaction = {
      ...params,
      id: newId(),
      createdAt: new Date().toISOString(),
    };
    localSave([tx, ...localLoad()]);
    return tx;
  }
  const { data, error } = await supabase
    .from('investment_transactions')
    .insert({
      client_profile_id: params.clientProfileId,
      date: params.date,
      type: params.type,
      ticker: params.ticker,
      account_id: params.accountId,
      currency: params.currency,
      quantity: params.quantity,
      amount_per_unit: params.amountPerUnit,
      trading_fees: params.tradingFees,
      notes: params.notes,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToTx(data);
}

export async function updateTransaction(
  id: string,
  patch: Partial<Omit<InvestmentTransaction, 'id' | 'clientProfileId' | 'createdAt'>>,
): Promise<void> {
  if (await useLocalStorageMode()) {
    const all = localLoad();
    const t = all.find(x => x.id === id);
    if (t) { Object.assign(t, patch); localSave(all); }
    return;
  }
  const dbUpdate: Record<string, any> = {};
  if (patch.date !== undefined)          dbUpdate.date = patch.date;
  if (patch.type !== undefined)          dbUpdate.type = patch.type;
  if (patch.ticker !== undefined)        dbUpdate.ticker = patch.ticker;
  if (patch.accountId !== undefined)     dbUpdate.account_id = patch.accountId;
  if (patch.currency !== undefined)      dbUpdate.currency = patch.currency;
  if (patch.quantity !== undefined)      dbUpdate.quantity = patch.quantity;
  if (patch.amountPerUnit !== undefined) dbUpdate.amount_per_unit = patch.amountPerUnit;
  if (patch.tradingFees !== undefined)   dbUpdate.trading_fees = patch.tradingFees;
  if (patch.notes !== undefined)         dbUpdate.notes = patch.notes;
  const { error } = await supabase
    .from('investment_transactions')
    .update(dbUpdate)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  if (await useLocalStorageMode()) {
    localSave(localLoad().filter(t => t.id !== id));
    return;
  }
  const { error } = await supabase
    .from('investment_transactions')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/** Bulk insert (used by CSV/Sheets paste). */
export async function createTransactionsBulk(
  rows: Array<Omit<InvestmentTransaction, 'id' | 'createdAt'>>,
): Promise<InvestmentTransaction[]> {
  if (await useLocalStorageMode()) {
    const now = new Date().toISOString();
    const created: InvestmentTransaction[] = rows.map(r => ({
      ...r,
      id: newId(),
      createdAt: now,
    }));
    localSave([...created, ...localLoad()]);
    return created;
  }
  const { data, error } = await supabase
    .from('investment_transactions')
    .insert(rows.map(r => ({
      client_profile_id: r.clientProfileId,
      date: r.date,
      type: r.type,
      ticker: r.ticker,
      account_id: r.accountId,
      currency: r.currency,
      quantity: r.quantity,
      amount_per_unit: r.amountPerUnit,
      trading_fees: r.tradingFees,
      notes: r.notes,
    })))
    .select();
  if (error) throw error;
  return (data ?? []).map(rowToTx);
}

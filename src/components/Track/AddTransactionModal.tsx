import React, { useState } from 'react';
import {
  InvestmentTransaction, TransactionType, SupportedCurrency, TrackingAccount,
} from '../../types';

export default function AddTransactionModal({
  clientProfileId, accounts, existing, onClose, onSubmit,
}: {
  clientProfileId: string;
  accounts: TrackingAccount[];
  existing: InvestmentTransaction | null;
  onClose: () => void;
  onSubmit: (params: Omit<InvestmentTransaction, 'id' | 'createdAt'>) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(existing?.date ?? today);
  const [type, setType] = useState<TransactionType>(existing?.type ?? 'buy');
  const [ticker, setTicker] = useState(existing?.ticker ?? '');
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts[0]?.id ?? '');
  const [currency, setCurrency] = useState<SupportedCurrency>(existing?.currency ?? accounts.find(a => a.id === accountId)?.defaultCurrency ?? 'USD');
  const [quantity, setQuantity] = useState<string>(existing?.quantity?.toString() ?? '');
  const [amountPerUnit, setAmountPerUnit] = useState<string>(existing?.amountPerUnit?.toString() ?? '');
  const [tradingFees, setTradingFees] = useState<string>(existing?.tradingFees?.toString() ?? '0');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const totalAmount = (Number(quantity) || 0) * (Number(amountPerUnit) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim() || !accountId) return;
    setSaving(true);
    try {
      await onSubmit({
        clientProfileId,
        date,
        type,
        ticker: ticker.trim().toUpperCase(),
        accountId,
        currency,
        quantity: Number(quantity) || 0,
        amountPerUnit: Number(amountPerUnit) || 0,
        tradingFees: Number(tradingFees) || 0,
        notes: notes.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <form onSubmit={handleSubmit} style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
        padding: '24px 28px', width: '100%', maxWidth: 520,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>
          {existing ? 'Edit transaction' : 'New transaction'}
        </h2>

        {/* Type pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['buy', 'sell', 'dividend'] as TransactionType[]).map(t => (
            <button key={t} type="button" onClick={() => setType(t)} style={{
              flex: 1, padding: '7px 0', borderRadius: 8, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
              border: `1px solid ${type === t ? typeColor(t) : 'var(--border)'}`,
              background: type === t ? `${typeColor(t)}25` : 'transparent',
              color: type === t ? typeColor(t) : 'var(--text-3)',
              transition: 'all 0.12s',
            }}>{t}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Field label="Date">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={inputStyle} />
          </Field>
          <Field label="Ticker">
            <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="AAPL"
              required style={{ ...inputStyle, textTransform: 'uppercase' }} />
          </Field>
          <Field label="Quantity">
            <input type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)}
              onFocus={e => e.target.select()} required style={inputStyle} />
          </Field>
          <Field label={type === 'dividend' ? 'Amount per share' : 'Price per unit'}>
            <input type="number" step="any" value={amountPerUnit} onChange={e => setAmountPerUnit(e.target.value)}
              onFocus={e => e.target.select()} required style={inputStyle} />
          </Field>
          <Field label="Trading fees">
            <input type="number" step="any" value={tradingFees} onChange={e => setTradingFees(e.target.value)}
              onFocus={e => e.target.select()} style={inputStyle} />
          </Field>
          <Field label="Currency">
            <select value={currency} onChange={e => setCurrency(e.target.value as SupportedCurrency)} style={inputStyle}>
              <option value="USD">USD</option>
              <option value="SGD">SGD</option>
            </select>
          </Field>
          <Field label="Account" full>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} required style={inputStyle}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Notes" full>
            <input value={notes} onChange={e => setNotes(e.target.value)} style={inputStyle} placeholder="Optional" />
          </Field>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
          Total: <strong style={{ color: 'var(--text-1)' }}>
            {currency === 'SGD' ? 'S$' : '$'}{totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </strong>
          {Number(tradingFees) > 0 && (
            <> · Fees: {currency === 'SGD' ? 'S$' : '$'}{Number(tradingFees).toFixed(2)}</>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
          <button type="submit" disabled={saving || !ticker.trim()} style={primaryBtn}>
            {saving ? 'Saving…' : (existing ? 'Save' : 'Add')}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function typeColor(t: TransactionType): string {
  return t === 'buy' ? '#10b981' : t === 'sell' ? '#ef4444' : '#fbbf24';
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  borderRadius: 8, padding: '8px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
};
const primaryBtn: React.CSSProperties = {
  padding: '8px 18px', borderRadius: 8, border: 'none', background: '#10b981',
  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const ghostBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

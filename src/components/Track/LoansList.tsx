import React, { useState } from 'react';
import { Liability, LiabilityType } from '../../types';
import { monthsRemaining } from '../../services/liabilitiesService';

const TYPE_LABELS: Record<LiabilityType, string> = {
  mortgage: 'Mortgage',
  car: 'Car Loan',
  student: 'Student Loan',
  personal: 'Personal Loan',
  other: 'Other',
};

const TYPE_COLORS: Record<LiabilityType, string> = {
  mortgage: '#4f46e5',
  car: '#059669',
  student: '#d97706',
  personal: '#dc2626',
  other: '#6b7280',
};

function fmtSGD(n: number) {
  return 'S$' + n.toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface LoanModalProps {
  existing?: Liability | null;
  clientProfileId: string;
  onClose: () => void;
  onSubmit: (params: Omit<Liability, 'id'>) => Promise<void>;
}

function LoanModal({ existing, clientProfileId, onClose, onSubmit }: LoanModalProps) {
  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<LiabilityType>(existing?.type ?? 'personal');
  const [balance, setBalance] = useState(existing?.balance?.toString() ?? '');
  const [rate, setRate] = useState(existing?.interestRate?.toString() ?? '');
  const [payment, setPayment] = useState(existing?.monthlyPayment?.toString() ?? '');
  const [startDate, setStartDate] = useState(existing?.startDate ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        clientProfileId,
        name: name.trim(),
        type,
        balance: parseFloat(balance) || 0,
        interestRate: parseFloat(rate) || 0,
        monthlyPayment: parseFloat(payment) || 0,
        startDate: startDate || null,
        endDate: null,
        notes: notes.trim(),
      });
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 420, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{existing ? 'Edit Loan' : 'Add Loan / Debt'}</h2>
        <label style={labelStyle}>
          <span style={labelSpan}>Name</span>
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. HDB Mortgage" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          <span style={labelSpan}>Type</span>
          <select value={type} onChange={e => setType(e.target.value as LiabilityType)} style={inputStyle}>
            {(Object.keys(TYPE_LABELS) as LiabilityType[]).map(k => (
              <option key={k} value={k}>{TYPE_LABELS[k]}</option>
            ))}
          </select>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={labelStyle}>
            <span style={labelSpan}>Outstanding Balance (S$)</span>
            <input required type="number" min={0} value={balance} onChange={e => setBalance(e.target.value)} placeholder="450000" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelSpan}>Interest Rate (% p.a.)</span>
            <input type="number" min={0} step={0.01} value={rate} onChange={e => setRate(e.target.value)} placeholder="2.5" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelSpan}>Monthly Payment (S$)</span>
            <input required type="number" min={0} value={payment} onChange={e => setPayment(e.target.value)} placeholder="2000" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelSpan}>Start Date</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </label>
        </div>
        <label style={labelStyle}>
          <span style={labelSpan}>Notes</span>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" style={inputStyle} />
        </label>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button type="submit" disabled={saving} style={submitBtnStyle}>{saving ? 'Saving…' : existing ? 'Save' : 'Add Loan'}</button>
        </div>
      </form>
    </div>
  );
}

interface Props {
  clientProfileId: string;
  loans: Liability[];
  totalMonthlyFromCashFlow?: number;
  onCreate: (params: Omit<Liability, 'id'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Omit<Liability, 'id' | 'clientProfileId'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function LoansList({ clientProfileId, loans, onCreate, onUpdate, onDelete }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Liability | null>(null);

  const totalDebt = loans.reduce((s, l) => s + l.balance, 0);
  const totalPayment = loans.reduce((s, l) => s + l.monthlyPayment, 0);

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <SummaryCard label="Total Outstanding Debt" value={fmtSGD(totalDebt)} />
        <SummaryCard label="Total Monthly Payments" value={fmtSGD(totalPayment)} />
        <SummaryCard label="Number of Loans" value={String(loans.length)} />
      </div>

      {/* Add button */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} style={submitBtnStyle}>
          + Add Loan / Debt
        </button>
      </div>

      {loans.length === 0 && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          No loans recorded. Add your HDB mortgage, car loan, or other debt here.
        </div>
      )}

      {/* Loan cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loans.map(loan => {
          const months = monthsRemaining(loan.balance, loan.monthlyPayment, loan.interestRate);
          const payoffDate = months !== null
            ? new Date(Date.now() + months * 30.44 * 24 * 3600 * 1000).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })
            : null;
          const paidPct = loan.startDate && loan.balance > 0
            ? null  // would need original amount to compute
            : null;

          return (
            <div key={loan.id} style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ background: TYPE_COLORS[loan.type], color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                  {TYPE_LABELS[loan.type]}
                </span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{loan.name}</span>
                <div style={{ flex: 1 }} />
                <button onClick={() => { setEditing(loan); setModalOpen(true); }} style={iconBtnStyle} title="Edit">✏️</button>
                <button onClick={() => { if (window.confirm('Delete this loan?')) onDelete(loan.id); }} style={iconBtnStyle} title="Delete">🗑️</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                <Stat label="Outstanding" value={fmtSGD(loan.balance)} />
                <Stat label="Interest Rate" value={`${loan.interestRate}% p.a.`} />
                <Stat label="Monthly Payment" value={fmtSGD(loan.monthlyPayment)} />
                <Stat label="Est. Payoff" value={payoffDate ?? (months !== null ? `${months} months` : '—')} />
              </div>
              {loan.notes && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>{loan.notes}</div>}
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <LoanModal
          existing={editing}
          clientProfileId={clientProfileId}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSubmit={async (params) => {
            if (editing) await onUpdate(editing.id, params);
            else await onCreate(params);
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--card-bg, var(--input-bg))', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', minWidth: 160 }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{value}</div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13 };
const labelSpan: React.CSSProperties = { color: 'var(--text-2)', fontWeight: 500, fontSize: 12 };
const inputStyle: React.CSSProperties = { padding: '7px 10px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 7, color: 'var(--text-1)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
const submitBtnStyle: React.CSSProperties = { padding: '8px 18px', background: 'var(--accent, #4f46e5)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 18px', background: 'none', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)' };
const iconBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontSize: 14, opacity: 0.6 };

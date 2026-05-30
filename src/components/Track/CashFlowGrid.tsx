import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CashFlowMonth, BudgetRule } from '../../types';

type CashFlowField = keyof Omit<CashFlowMonth, 'id' | 'clientProfileId' | 'month' | 'notes'>;

const FIELDS: { key: CashFlowField; label: string }[] = [
  { key: 'salary',      label: 'Gross Salary' },
  { key: 'takeHome',    label: 'Take-Home' },
  { key: 'spending',    label: 'Spending' },
  { key: 'savings',     label: 'Savings' },
  { key: 'investments', label: 'Investments' },
  { key: 'insurance',   label: 'Insurance' },
  { key: 'cpf',         label: 'CPF' },
];

function fmtSGD(n: number) {
  if (n === 0) return '—';
  return 'S$' + n.toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  const date = new Date(Number(y), Number(mo) - 1, 1);
  return date.toLocaleString('en-SG', { month: 'short', year: 'numeric' });
}

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function prevMonths(count: number): string[] {
  const result: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() - 1);
  }
  return result;
}

interface EditingCell {
  month: string;
  field: CashFlowField | 'notes';
}

interface Props {
  clientProfileId: string;
  annualIncome: number;         // from FIRE plan income.annualIncome, for comparison
  budgetRule: BudgetRule;
  months: CashFlowMonth[];
  onUpsert: (m: Omit<CashFlowMonth, 'id'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBudgetRuleChange: (rule: BudgetRule) => Promise<void>;
}

export default function CashFlowGrid({
  clientProfileId, annualIncome, budgetRule, months, onUpsert, onDelete, onBudgetRuleChange,
}: Props) {
  const [displayMonths, setDisplayMonths] = useState<string[]>(() => prevMonths(12));
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [saving, setSaving] = useState<string | null>(null);  // 'month:field' key
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // ensure current month is always in the list
  useEffect(() => {
    const now = thisMonth();
    setDisplayMonths(prev => prev.includes(now) ? prev : [now, ...prev]);
  }, []);

  const monthMap = useMemo(() => {
    const m: Record<string, CashFlowMonth> = {};
    for (const row of months) m[row.month] = row;
    return m;
  }, [months]);

  function getRow(month: string): Partial<CashFlowMonth> {
    return monthMap[month] ?? {};
  }

  function startEdit(month: string, field: CashFlowField | 'notes', currentVal: number | string) {
    setEditing({ month, field });
    setDraftValue(String(typeof currentVal === 'number' && currentVal === 0 ? '' : currentVal));
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  async function commitEdit() {
    if (!editing) return;
    const { month, field } = editing;
    const existing = monthMap[month];
    const base: Omit<CashFlowMonth, 'id'> = {
      clientProfileId,
      month,
      salary: existing?.salary ?? 0,
      takeHome: existing?.takeHome ?? 0,
      spending: existing?.spending ?? 0,
      savings: existing?.savings ?? 0,
      investments: existing?.investments ?? 0,
      insurance: existing?.insurance ?? 0,
      cpf: existing?.cpf ?? 0,
      notes: existing?.notes ?? '',
    };
    if (field === 'notes') {
      base.notes = draftValue;
    } else {
      const num = parseFloat(draftValue.replace(/,/g, '')) || 0;
      (base as any)[field] = num;
    }
    setSaving(`${month}:${field}`);
    setEditing(null);
    try { await onUpsert(base); } finally { setSaving(null); }
  }

  function applyBudgetRule(month: string, takeHome: number) {
    const existing = monthMap[month];
    const base: Omit<CashFlowMonth, 'id'> = {
      clientProfileId, month,
      salary: existing?.salary ?? 0,
      takeHome,
      spending: Math.round(takeHome * (budgetRule.spending / 100)),
      savings: Math.round(takeHome * (budgetRule.savings / 100)),
      investments: Math.round(takeHome * (budgetRule.investments / 100)),
      insurance: Math.round(takeHome * (budgetRule.insurance / 100)),
      cpf: existing?.cpf ?? 0,
      notes: existing?.notes ?? '',
    };
    onUpsert(base);
  }

  const planMonthly = annualIncome > 0 ? annualIncome / 12 : null;

  // Summary stats across all months with data
  const totals = useMemo(() => {
    const t: Record<string, number> = { salary: 0, takeHome: 0, spending: 0, savings: 0, investments: 0, insurance: 0, cpf: 0 };
    let count = 0;
    for (const m of months) {
      if (m.takeHome > 0) { count++; for (const f of FIELDS) t[f.key] += (m as any)[f.key]; }
    }
    return { totals: t, count };
  }, [months]);

  const savingsRate = totals.totals.takeHome > 0
    ? ((totals.totals.savings + totals.totals.investments) / totals.totals.takeHome * 100).toFixed(1)
    : null;

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <SummaryCard label="Avg Monthly Take-Home" value={totals.count > 0 ? fmtSGD(Math.round(totals.totals.takeHome / totals.count)) : '—'} />
        <SummaryCard label="Avg Monthly Spending" value={totals.count > 0 ? fmtSGD(Math.round(totals.totals.spending / totals.count)) : '—'} />
        <SummaryCard label="Avg Savings + Inv Rate" value={savingsRate ? `${savingsRate}%` : '—'} highlight={savingsRate ? Number(savingsRate) >= 30 : false} />
        {planMonthly && (
          <SummaryCard label="FIRE Plan Monthly" value={fmtSGD(Math.round(planMonthly))} sub="take-home target" />
        )}
      </div>

      {/* Budget rule chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Budget rule:</span>
        {FIELDS.filter(f => f.key !== 'salary' && f.key !== 'cpf').map(f => (
          <span key={f.key} style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px',
            background: 'var(--input-bg)', border: '1px solid var(--input-border)',
            borderRadius: 12, color: 'var(--text-2)',
          }}>
            {f.label} {(budgetRule as any)[f.key]}%
          </span>
        ))}
        <button onClick={() => setShowBudgetEditor(v => !v)} style={linkBtnStyle}>Edit rule</button>
      </div>

      {showBudgetEditor && (
        <BudgetRuleEditor rule={budgetRule} onChange={onBudgetRuleChange} onClose={() => setShowBudgetEditor(false)} />
      )}

      {/* Grid */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 800, width: '100%', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ ...thStyle, textAlign: 'left', width: 110 }}>Month</th>
              {FIELDS.map(f => (
                <th key={f.key} style={thStyle}>{f.label}</th>
              ))}
              <th style={{ ...thStyle, width: 100 }}>Notes</th>
              <th style={{ ...thStyle, width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {displayMonths.map((month, i) => {
              const row = getRow(month);
              const hasData = !!monthMap[month];
              return (
                <tr key={month} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--hover-bg, rgba(0,0,0,0.02))' }}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-2)', padding: '6px 8px' }}>
                    {monthLabel(month)}
                  </td>
                  {FIELDS.map(f => {
                    const val = (row as any)[f.key] as number | undefined ?? 0;
                    const isEditing = editing?.month === month && editing.field === f.key;
                    const isSaving = saving === `${month}:${f.key}`;
                    return (
                      <td key={f.key} style={{ ...tdStyle, position: 'relative' }}>
                        {isEditing ? (
                          <input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            value={draftValue}
                            onChange={e => setDraftValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                            style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--accent, #4f46e5)', borderRadius: 4, padding: '3px 6px', color: 'var(--text-1)', fontSize: 13, outline: 'none' }}
                          />
                        ) : (
                          <div
                            onClick={() => startEdit(month, f.key, val)}
                            style={{ cursor: 'pointer', padding: '3px 6px', borderRadius: 4, color: val === 0 ? 'var(--text-4, #bbb)' : 'var(--text-1)', textAlign: 'right', minWidth: 70 }}
                            title="Click to edit"
                          >
                            {isSaving ? '…' : val === 0 ? '—' : `S$${val.toLocaleString('en-SG')}`}
                          </div>
                        )}
                        {/* Auto-fill from budget rule trigger on take-home */}
                        {f.key === 'takeHome' && isEditing && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 6, padding: 6, fontSize: 11, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                            <button
                              onMouseDown={e => { e.preventDefault(); const n = parseFloat(draftValue.replace(/,/g, '')) || 0; if (n > 0) { setEditing(null); applyBudgetRule(month, n); } }}
                              style={{ ...linkBtnStyle, fontSize: 11 }}
                            >
                              Auto-fill with budget rule
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {/* Notes cell */}
                  <td style={tdStyle}>
                    {editing?.month === month && editing.field === 'notes' ? (
                      <textarea
                        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                        value={draftValue}
                        onChange={e => setDraftValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => { if (e.key === 'Escape') setEditing(null); }}
                        rows={2}
                        style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--accent, #4f46e5)', borderRadius: 4, padding: '3px 6px', color: 'var(--text-1)', fontSize: 12, outline: 'none', resize: 'none' }}
                      />
                    ) : (
                      <div
                        onClick={() => startEdit(month, 'notes', row.notes ?? '')}
                        style={{ cursor: 'pointer', padding: '3px 6px', borderRadius: 4, color: row.notes ? 'var(--text-2)' : 'var(--text-4, #bbb)', fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={row.notes || 'Click to add note'}
                      >
                        {row.notes || '—'}
                      </div>
                    )}
                  </td>
                  {/* Delete */}
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {hasData && (
                      <button
                        onClick={() => { if (window.confirm("Clear this month's data?")) onDelete(monthMap[month].id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4, #bbb)', fontSize: 16, padding: 2 }}
                        title="Clear month"
                      >×</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      <button
        onClick={() => setDisplayMonths(prev => [...prev, ...prevMonths(6).filter(m => !prev.includes(m))])}
        style={{ marginTop: 12, ...linkBtnStyle }}
      >
        + Load 6 more months
      </button>
    </div>
  );
}

function SummaryCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div style={{ background: 'var(--card-bg, var(--input-bg))', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', minWidth: 160 }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: highlight ? 'var(--green, #16a34a)' : 'var(--text-1)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-4, #bbb)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function BudgetRuleEditor({ rule, onChange, onClose }: { rule: BudgetRule; onChange: (r: BudgetRule) => Promise<void>; onClose: () => void }) {
  const [draft, setDraft] = useState<BudgetRule>({ ...rule });
  const total = draft.spending + draft.savings + draft.investments + draft.insurance;

  const fields: { key: keyof BudgetRule; label: string }[] = [
    { key: 'spending', label: 'Spending' },
    { key: 'savings', label: 'Savings' },
    { key: 'investments', label: 'Investments' },
    { key: 'insurance', label: 'Insurance' },
  ];

  return (
    <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16, maxWidth: 440 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Budget Rule</span>
        <span style={{ fontSize: 12, color: total === 100 ? 'var(--green, #16a34a)' : 'var(--red, #dc2626)', marginLeft: 'auto' }}>
          Total: {total}% {total !== 100 && '(must equal 100)'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {fields.map(f => (
          <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
            <span style={{ color: 'var(--text-2)' }}>{f.label} %</span>
            <input
              type="number" min={0} max={100}
              value={draft[f.key]}
              onChange={e => setDraft(prev => ({ ...prev, [f.key]: Number(e.target.value) || 0 }))}
              style={{ padding: '5px 8px', background: 'var(--bg)', border: '1px solid var(--input-border)', borderRadius: 6, color: 'var(--text-1)', fontSize: 13, width: '100%' }}
            />
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          disabled={total !== 100}
          onClick={async () => { await onChange(draft); onClose(); }}
          style={{ padding: '6px 16px', background: total === 100 ? 'var(--accent, #4f46e5)' : 'var(--text-4, #bbb)', color: '#fff', border: 'none', borderRadius: 7, cursor: total === 100 ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600 }}
        >Save</button>
        <button onClick={onClose} style={{ padding: '6px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)' }}>Cancel</button>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 6px', textAlign: 'right', fontSize: 12, fontWeight: 600,
  color: 'var(--text-3)', whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '4px 2px', verticalAlign: 'middle',
};

const linkBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--accent, #4f46e5)', fontSize: 13, padding: 0, textDecoration: 'underline',
};

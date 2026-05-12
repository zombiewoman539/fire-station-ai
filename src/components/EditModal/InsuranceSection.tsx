import React from 'react';
import { FireInputs, InsurancePolicy, FundAllocation, Nominee } from '../../types';
import { listProfiles } from '../../services/profileStorageSupabase';
import { ClientProfile } from '../../profileTypes';
import { NumberField, SelectField, SectionLabel } from '../FormFields';
import { HospitalPlanSection } from './HospitalPlanSection';
import { uid } from '../../utils/uid';

const POLICY_TYPES = [
  { value: 'whole-life', label: 'Whole Life' },
  { value: 'term', label: 'Term' },
  { value: 'ilp', label: 'ILP (Investment-Linked)' },
  { value: 'endowment', label: 'Endowment' },
  { value: 'ci', label: 'Critical Illness (Standalone)' },
  { value: 'other', label: 'Other' },
];

const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi-annual', label: 'Semi-annual' },
  { value: 'annual', label: 'Annual' },
];

export function InsuranceSection({ inputs, onChange, currentProfileId }: { inputs: FireInputs; onChange: (i: FireInputs) => void; currentProfileId?: string }) {
  const update = (policies: InsurancePolicy[]) => onChange({ ...inputs, policies });
  const upd = (id: string, field: keyof InsurancePolicy, val: string | number | null | FundAllocation[] | Nominee[]) =>
    update(inputs.policies.map(p => p.id === id ? { ...p, [field]: val } : p));

  const [allProfiles, setAllProfiles] = React.useState<ClientProfile[]>([]);
  React.useEffect(() => {
    listProfiles().then(list => setAllProfiles(list.filter(p => p.id !== currentProfileId))).catch(() => {});
  }, [currentProfileId]);

  const addPolicy = () => update([...inputs.policies, {
    id: uid(), name: 'New Policy', policyType: 'whole-life',
    cashValue: 0, annualGrowthRate: 3,
    deathSumAssured: 0, tpdSumAssured: 0, eciSumAssured: 0, ciSumAssured: 0,
    premiumAmount: 0, premiumFrequency: 'monthly',
    premiumNextDueDate: null, premiumPaymentTerm: 'limited', premiumLimitedYears: 20,
    nominees: [],
    insurer: '', policyNumber: '', policyStatus: 'in-force' as const,
    commencementDate: null, maturityDate: null, fundAllocations: [],
  }]);

  return (
    <div>
      <HospitalPlanSection inputs={inputs} onChange={onChange} />
      {inputs.policies.map(p => (
        <div key={p.id} style={{
          background: 'var(--inset)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '16px', marginBottom: 16, position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <input
              value={p.name}
              onChange={e => upd(p.id, 'name', e.target.value)}
              style={{
                flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                borderRadius: 8, padding: '7px 10px', fontSize: 14, fontWeight: 600,
                color: 'var(--text-1)', outline: 'none',
              }}
            />
            <button onClick={() => update(inputs.policies.filter(x => x.id !== p.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 16, padding: 4 }}
              title="Remove policy">✕</button>
          </div>

          <SelectField
            label="Policy Type"
            value={p.policyType}
            options={POLICY_TYPES}
            onChange={v => upd(p.id, 'policyType', v)}
          />

          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, marginTop: 4 }}>
            <SectionLabel>Policy Details</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>Insurer</label>
                <input
                  list={`insurer-list-${p.id}`}
                  value={p.insurer}
                  onChange={e => upd(p.id, 'insurer', e.target.value)}
                  placeholder="e.g. AIA, Prudential…"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                    borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                  }}
                />
                <datalist id={`insurer-list-${p.id}`}>
                  {['AIA', 'Prudential', 'Great Eastern', 'Income Insurance', 'Manulife', 'AXA', 'HSBC Life', 'Singlife', 'Tokio Marine', 'FWD', 'Sun Life'].map(i => (
                    <option key={i} value={i} />
                  ))}
                </datalist>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>Policy Number</label>
                <input
                  value={p.policyNumber}
                  onChange={e => upd(p.id, 'policyNumber', e.target.value)}
                  placeholder="Contract / policy no."
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                    borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
            </div>
            <SelectField
              label="Status"
              value={p.policyStatus}
              options={[
                { value: 'in-force', label: 'In Force' },
                { value: 'lapsed', label: 'Lapsed' },
                { value: 'surrendered', label: 'Surrendered' },
                { value: 'claimed', label: 'Claimed' },
                { value: 'matured', label: 'Matured' },
              ]}
              onChange={v => upd(p.id, 'policyStatus', v)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>Commencement Date</label>
                <input
                  type="date"
                  value={p.commencementDate ?? ''}
                  onChange={e => upd(p.id, 'commencementDate', e.target.value || null)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                    borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>
                  Maturity Date <span style={{ color: 'var(--text-5)', fontSize: 10 }}>(term / endowment)</span>
                </label>
                <input
                  type="date"
                  value={p.maturityDate ?? ''}
                  onChange={e => upd(p.id, 'maturityDate', e.target.value || null)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                    borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, marginTop: 4 }}>
            <SectionLabel>Premium</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <NumberField label="Amount" value={p.premiumAmount} prefix="S$" small
                onChange={v => upd(p.id, 'premiumAmount', v)} />
              <SelectField label="Frequency" value={p.premiumFrequency} options={FREQUENCIES} small
                onChange={v => upd(p.id, 'premiumFrequency', v)} />
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>Next Due Date</label>
                <input
                  type="date"
                  value={p.premiumNextDueDate ?? ''}
                  onChange={e => upd(p.id, 'premiumNextDueDate', e.target.value || null)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                    borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              <SelectField label="Payment Term" value={p.premiumPaymentTerm} options={[
                { value: 'whole-life', label: 'Whole Life' },
                { value: 'limited', label: 'Limited Pay' },
              ]} small onChange={v => upd(p.id, 'premiumPaymentTerm', v)} />
            </div>
            {p.premiumPaymentTerm === 'limited' && (
              <NumberField label="Limited Pay Years" value={p.premiumLimitedYears} small
                onChange={v => upd(p.id, 'premiumLimitedYears', v)} />
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, marginTop: 4 }}>
            <SectionLabel>Coverage (Sum Assured)</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <NumberField label="☠️ Death" value={p.deathSumAssured} prefix="S$" small
                tip="Death benefit paid to beneficiaries. Used in the Death scenario."
                onChange={v => upd(p.id, 'deathSumAssured', v)} />
              <NumberField label="🦽 TPD" value={p.tpdSumAssured} prefix="S$" small
                tip="Total & Permanent Disability benefit."
                onChange={v => upd(p.id, 'tpdSumAssured', v)} />
              <NumberField label="⚡ ECI" value={p.eciSumAssured} prefix="S$" small
                tip="Early Critical Illness benefit — paid on early/intermediate stage diagnosis."
                onChange={v => upd(p.id, 'eciSumAssured', v)} />
              <NumberField label="🏥 Major CI" value={p.ciSumAssured} prefix="S$" small
                tip="Major Critical Illness benefit — paid on advanced/severe stage diagnosis."
                onChange={v => upd(p.id, 'ciSumAssured', v)} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, marginTop: 4 }}>
            <SectionLabel>Cash Value</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <NumberField label="Current Value" value={p.cashValue} prefix="S$" small
                tip="Current surrender/cash value of the policy. Shown in the Insurance bar on the chart."
                onChange={v => upd(p.id, 'cashValue', v)} />
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: 'var(--text-4)', display: 'block', marginBottom: 4 }}>
                  Growth Rate
                </label>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.annualGrowthRate}% p.a.</span>
                </div>
                <input type="range" min={0} max={10} step={0.5} value={p.annualGrowthRate}
                  onChange={e => upd(p.id, 'annualGrowthRate', Number(e.target.value))}
                  style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          {p.policyType === 'ilp' && (
            <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, marginTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <SectionLabel>Fund Allocations</SectionLabel>
                {(() => {
                  const total = (p.fundAllocations || []).reduce((s, f) => s + (f.percentage || 0), 0);
                  return total > 0 && (
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: Math.abs(total - 100) < 0.01 ? '#34d399' : '#fbbf24',
                    }}>
                      {total.toFixed(0)}% allocated
                    </span>
                  );
                })()}
              </div>
              {(p.fundAllocations || []).map((f, fi) => (
                <div key={fi} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Fund name (e.g. China Equity)"
                    value={f.fundName}
                    onChange={e => {
                      const allocs = [...(p.fundAllocations || [])];
                      allocs[fi] = { ...allocs[fi], fundName: e.target.value };
                      upd(p.id, 'fundAllocations', allocs);
                    }}
                    style={{
                      flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                      borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input
                      type="number" min={0} max={100} step={1}
                      value={f.percentage}
                      onChange={e => {
                        const allocs = [...(p.fundAllocations || [])];
                        allocs[fi] = { ...allocs[fi], percentage: Math.max(0, Math.min(100, Number(e.target.value))) };
                        upd(p.id, 'fundAllocations', allocs);
                      }}
                      style={{
                        width: 56, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                        borderRadius: 8, padding: '6px 8px', color: 'var(--text-1)', fontSize: 13,
                        outline: 'none', textAlign: 'right',
                      }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-4)' }}>%</span>
                  </div>
                  <button
                    onClick={() => {
                      const allocs = (p.fundAllocations || []).filter((_, i) => i !== fi);
                      upd(p.id, 'fundAllocations', allocs);
                    }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-5)', fontSize: 16,
                      cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0,
                    }}
                  >×</button>
                </div>
              ))}
              <button
                onClick={() => {
                  const allocs: FundAllocation[] = [...(p.fundAllocations || []), { fundName: '', percentage: 0 }];
                  upd(p.id, 'fundAllocations', allocs);
                }}
                style={{
                  marginTop: 4, background: 'none', border: '1px dashed var(--border-mid)',
                  borderRadius: 8, padding: '5px 12px', fontSize: 12, color: 'var(--text-4)',
                  cursor: 'pointer', width: '100%',
                }}
              >
                + Add Fund
              </button>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <SectionLabel>Nomination</SectionLabel>
              {(() => {
                const total = (p.nominees || []).reduce((s, n) => s + (n.percentage || 0), 0);
                return total > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: Math.abs(total - 100) < 0.01 ? '#34d399' : '#fbbf24',
                  }}>
                    {total.toFixed(0)}% allocated
                  </span>
                );
              })()}
            </div>
            {(p.nominees || []).map((n, ni) => (
              <div key={ni} style={{
                background: 'var(--inset)', border: '1px solid var(--border-soft)',
                borderRadius: 10, padding: '10px 12px', marginBottom: 8,
              }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <input
                    type="text"
                    placeholder="Nominee name"
                    value={n.name}
                    onChange={e => {
                      const nominees = [...(p.nominees || [])];
                      nominees[ni] = { ...nominees[ni], name: e.target.value };
                      upd(p.id, 'nominees', nominees);
                    }}
                    style={{
                      flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                      borderRadius: 8, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input
                      type="number" min={0} max={100} step={1}
                      value={n.percentage}
                      onChange={e => {
                        const nominees = [...(p.nominees || [])];
                        nominees[ni] = { ...nominees[ni], percentage: Math.max(0, Math.min(100, Number(e.target.value))) };
                        upd(p.id, 'nominees', nominees);
                      }}
                      style={{
                        width: 56, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                        borderRadius: 8, padding: '6px 8px', color: 'var(--text-1)', fontSize: 13,
                        outline: 'none', textAlign: 'right',
                      }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-4)' }}>%</span>
                  </div>
                  <button
                    onClick={() => {
                      const nominees = (p.nominees || []).filter((_, i) => i !== ni);
                      upd(p.id, 'nominees', nominees);
                    }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-5)', fontSize: 16,
                      cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0,
                    }}
                  >×</button>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={n.clientId ?? ''}
                    onChange={e => {
                      const val = e.target.value;
                      const linked = allProfiles.find(c => c.id === val);
                      const nominees = [...(p.nominees || [])];
                      nominees[ni] = { ...nominees[ni], clientId: val || null, ...(linked ? { name: linked.name } : {}) };
                      upd(p.id, 'nominees', nominees);
                    }}
                    style={{
                      flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                      borderRadius: 8, padding: '5px 10px', color: 'var(--text-3)', fontSize: 12, outline: 'none',
                    }}
                  >
                    <option value="">Link to FIRE Station client (optional)</option>
                    {allProfiles.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {n.clientId && (
                    <button
                      onClick={() => {
                        const nominees = [...(p.nominees || [])];
                        nominees[ni] = { ...nominees[ni], clientId: null };
                        upd(p.id, 'nominees', nominees);
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-5)', fontSize: 11, flexShrink: 0 }}
                    >
                      Unlink
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                const nominees: Nominee[] = [...(p.nominees || []), { name: '', percentage: 0, clientId: null }];
                upd(p.id, 'nominees', nominees);
              }}
              style={{
                marginTop: 4, background: 'none', border: '1px dashed var(--border-mid)',
                borderRadius: 8, padding: '5px 12px', fontSize: 12, color: 'var(--text-4)',
                cursor: 'pointer', width: '100%',
              }}
            >
              + Add Nominee
            </button>
          </div>
        </div>
      ))}

      <button onClick={addPolicy}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 10,
          background: 'none', border: '1px dashed rgba(16, 185, 129, 0.4)',
          cursor: 'pointer', color: '#34d399', fontSize: 13, fontWeight: 600,
        }}>
        + Add Policy
      </button>
    </div>
  );
}

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import {
  getAdvisorSummaries, getAllTeamProfiles, getAdvisorTargets, setAdvisorTarget,
  getAdvisorProfiles,
  AdvisorSummary, TeamProfile, AdvisorTarget,
} from '../services/teamService';
import { listTasks, createTask, Task } from '../services/taskService';
import { calculate, formatSGD } from '../calculations';
import { FireInputs } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function daysSinceLabel(iso: string | null): string {
  const d = daysSince(iso);
  if (d === null) return '—';
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

function activityColor(iso: string | null): string {
  const d = daysSince(iso);
  if (d === null) return 'var(--text-4)';
  if (d <= 7) return '#34d399';
  if (d <= 30) return '#fbbf24';
  return '#f87171';
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Insurance gap computation ────────────────────────────────────────────────

// Singapore benchmarks: Death/TPD = 10× income, CI = 5×, ECI = 2×
const BENCH = { death: 10, tpd: 10, ci: 5, eci: 2 };

interface InsuranceSummary {
  totalDeath: number;
  totalTPD: number;
  totalCI: number;
  totalECI: number;
  deathGap: number;
  tpdGap: number;
  ciGap: number;
  eciGap: number;
  annualPremium: number;
  signalScore: number; // 0–100: composite buying-opportunity score
  // Hospital plan
  hasMSL: boolean | null;        // null = not filled in yet
  hasISP: boolean | null;
  hasRider: boolean | null;
  ispWardClass: string;
}

function computeInsurance(inputs: FireInputs, daysSinceUpdate: number): InsuranceSummary {
  const income = inputs.income.annualIncome;
  const freqMult: Record<string, number> = { monthly: 12, quarterly: 4, 'semi-annual': 2, annual: 1 };
  const active = (inputs.policies ?? []).filter(p => p.policyStatus === 'in-force');

  const totalDeath = active.reduce((s, p) => s + (p.deathSumAssured ?? 0), 0);
  const totalTPD   = active.reduce((s, p) => s + (p.tpdSumAssured ?? 0), 0);
  const totalCI    = active.reduce((s, p) => s + (p.ciSumAssured ?? 0), 0);
  const totalECI   = active.reduce((s, p) => s + (p.eciSumAssured ?? 0), 0);
  const annualPremium = active.reduce((s, p) => s + p.premiumAmount * (freqMult[p.premiumFrequency] ?? 1), 0);

  const recDeath = income * BENCH.death;
  const recCI    = income * BENCH.ci;
  const recECI   = income * BENCH.eci;
  const recTPD   = income * BENCH.tpd;

  const deathGap = Math.max(0, recDeath - totalDeath);
  const tpdGap   = Math.max(0, recTPD   - totalTPD);
  const ciGap    = Math.max(0, recCI    - totalCI);
  const eciGap   = Math.max(0, recECI   - totalECI);

  // Hospital plan
  const hp = inputs.hospitalPlan;
  const hasMSL     = hp ? hp.hasMediShieldLife : null;
  const hasISP     = hp ? hp.hasISP : null;
  const hasRider   = hp ? hp.hasRider : null;
  const ispWardClass = hp?.ispWardClass ?? '';

  // Signal score: bigger gaps = higher score, no ISP adds points, review overdue adds points
  const deathScore  = recDeath > 0 ? Math.min(30, (deathGap / recDeath) * 30) : 0;
  const ciScore     = recCI    > 0 ? Math.min(25, (ciGap    / recCI)    * 25) : 0;
  const eciScore    = recECI   > 0 ? Math.min(15, (eciGap   / recECI)   * 15) : 0;
  const ispScore    = hasISP === false ? 20 : hasISP === true && hasRider === false ? 10 : 0;
  const reviewScore = daysSinceUpdate > 180 ? 10 : daysSinceUpdate > 90 ? 5 : 0;
  const signalScore = Math.round(deathScore + ciScore + eciScore + ispScore + reviewScore);

  return { totalDeath, totalTPD, totalCI, totalECI, deathGap, tpdGap, ciGap, eciGap, annualPremium, signalScore, hasMSL, hasISP, hasRider, ispWardClass };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientRow {
  profile: TeamProfile;
  advisor: AdvisorSummary | undefined;
  age: number | null;
  retirementAge: number | null;
  annualIncome: number | null;
  gender: 'M' | 'F' | '' | null;
  phoneNumber: string | null;
  // FIRE
  onTrack: boolean | null;
  fireGap: number | null;
  fireSurplus: number | null;
  moneyRunsOutAge: number | undefined;
  fireNumber: number | null;
  wealthAtRetirement: number | null;
  // Insurance
  ins: InsuranceSummary | null;
}

interface LeaderboardRow {
  advisor: AdvisorSummary;
  totalClients: number;
  newClientsThisMonth: number;
  tasksCompletedThisMonth: number;
  openTasks: number;
  urgentTasks: number;
  staleClientsCount: number;
  targetNewClients: number;
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function GapCell({ gap, rec, label }: { gap: number; rec: number; label: string }) {
  if (rec === 0) return <span style={{ color: 'var(--text-5)', fontSize: 12 }}>—</span>;
  if (gap <= 0) return (
    <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399',
      background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: 20 }}>
      Covered
    </span>
  );
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>-{formatSGD(gap)}</div>
      <div style={{ fontSize: 10, color: 'var(--text-5)' }}>{label}</div>
    </div>
  );
}

function SignalBadge({ score }: { score: number }) {
  const color = score >= 70 ? '#f87171' : score >= 40 ? '#fbbf24' : '#34d399';
  const label = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 36, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
    </div>
  );
}

// ─── Target cell (inline-editable) ───────────────────────────────────────────

function TargetCell({ advisorUserId, value, month, onSaved }: {
  advisorUserId: string; value: number; month: string; onSaved: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = parseInt(draft, 10);
    if (isNaN(n) || n < 0) { setDraft(String(value)); setEditing(false); return; }
    setSaving(true);
    try { await setAdvisorTarget(advisorUserId, month, n); onSaved(n); } catch { /* ignore */ }
    setSaving(false); setEditing(false);
  };

  if (!editing) return (
    <button onClick={() => { setDraft(String(value)); setEditing(true); }} title="Click to set target"
      style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 6,
        padding: '2px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 700,
        color: value > 0 ? 'var(--text-2)' : 'var(--text-5)' }}>
      {value > 0 ? value : '—'}
    </button>
  );

  return (
    <input autoFocus type="number" min={0} value={draft}
      onChange={e => setDraft(e.target.value)} onBlur={save} disabled={saving}
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
      style={{ width: 52, padding: '2px 8px', borderRadius: 6, border: '1px solid #10b981',
        background: 'var(--bg)', color: 'var(--text-1)', fontSize: 13, fontWeight: 700,
        textAlign: 'center', outline: 'none' }} />
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, target }: { value: number; target: number }) {
  if (target === 0) return <span style={{ fontSize: 12, color: 'var(--text-5)' }}>No target</span>;
  const pct = Math.min(100, Math.round((value / target) * 100));
  const color = pct >= 100 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#f87171';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 64, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}/{target}</span>
    </div>
  );
}

// ─── Follow-up button ────────────────────────────────────────────────────────

function FollowUpBtn({ profile, advisor }: { profile: TeamProfile; advisor: AdvisorSummary }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  const handleClick = async () => {
    if (!advisor.userId || state !== 'idle') return;
    setState('loading');
    try {
      await createTask({ title: `Follow up with ${profile.name}`, assignedTo: advisor.userId,
        clientProfileId: profile.id, clientName: profile.name, priority: 'urgent' });
      setState('done');
      setTimeout(() => setState('idle'), 3000);
    } catch { setState('idle'); }
  };

  return (
    <button onClick={handleClick} disabled={state !== 'idle'} style={{
      fontSize: 11, padding: '4px 11px', borderRadius: 6, fontWeight: 700,
      cursor: state === 'idle' ? 'pointer' : 'default', border: '1px solid',
      background: state === 'done' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.08)',
      color: state === 'done' ? '#34d399' : state === 'loading' ? 'var(--text-4)' : '#f87171',
      borderColor: state === 'done' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.25)',
      transition: 'all 0.15s' }}>
      {state === 'done' ? '✓ Assigned' : state === 'loading' ? '…' : '+ Follow up'}
    </button>
  );
}

// ─── Assign task modal ────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text-1)', fontSize: 13, outline: 'none',
  boxSizing: 'border-box' as const,
};
const ghostBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const primaryBtn: React.CSSProperties = {
  padding: '8px 18px', borderRadius: 8, border: 'none',
  background: '#10b981', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

function DashboardAssignModal({ advisor, preselectedClientId, preselectedClientName, onClose, onCreated }: {
  advisor: AdvisorSummary; preselectedClientId: string; preselectedClientName: string;
  onClose: () => void; onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [clientProfiles, setClientProfiles] = useState<any[]>([]);
  const [clientId, setClientId] = useState(preselectedClientId);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (advisor.userId) getAdvisorProfiles(advisor.userId).then(setClientProfiles);
  }, [advisor.userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !advisor.userId) return;
    setSaving(true); setError('');
    try {
      const client = clientProfiles.find(p => p.id === clientId);
      await createTask({ title: title.trim(), assignedTo: advisor.userId,
        clientProfileId: clientId || undefined,
        clientName: client?.name ?? preselectedClientName ?? undefined,
        dueDate: dueDate || undefined, notes: notes.trim() || undefined, priority });
      onCreated();
    } catch (err: any) { setError(err.message); setSaving(false); }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 440,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>Assign task</h2>
        <p style={{ margin: '0 0 22px', fontSize: 13, color: 'var(--text-3)' }}>To: {advisor.email}</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Task</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Review coverage gap" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Client</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} style={inputStyle}>
              <option value="">— No client —</option>
              {clientProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Priority</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['normal', 'urgent'] as const).map(p => (
                <button key={p} type="button" onClick={() => setPriority(p)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', border: '1px solid',
                  background: priority === p ? (p === 'urgent' ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.12)') : 'transparent',
                  color: priority === p ? (p === 'urgent' ? '#f87171' : '#34d399') : 'var(--text-4)',
                  borderColor: priority === p ? (p === 'urgent' ? 'rgba(248,113,113,0.4)' : 'rgba(52,211,153,0.3)') : 'var(--border)',
                }}>{p === 'urgent' ? '🔴 Urgent' : '⚪ Normal'}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Due date <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notes <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Context for the advisor…" rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          {error && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
            <button type="submit" disabled={saving || !title.trim()} style={primaryBtn}>
              {saving ? 'Assigning…' : 'Assign task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── All Clients table ────────────────────────────────────────────────────────

type ViewMode = 'fire' | 'insurance';
type SortKey = 'name' | 'age' | 'income' | 'fireGap' | 'deathGap' | 'ciGap' | 'eciGap' | 'signal' | 'lastSeen';
type SortDir = 'asc' | 'desc';

function AllClientsTable({ profiles, advisors, onTaskCreated }: {
  profiles: TeamProfile[]; advisors: AdvisorSummary[]; onTaskCreated: () => void;
}) {
  const [view, setView] = useState<ViewMode>('fire');
  const [search, setSearch] = useState('');
  const [advisorFilter, setAdvisorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'gap' | 'ontrack' | 'highsignal'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('signal');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showAll, setShowAll] = useState(false);
  const [assignRow, setAssignRow] = useState<ClientRow | null>(null);
  const PAGE = 25;

  const advisorByUserId = useMemo(() => {
    const map: Record<string, AdvisorSummary> = {};
    for (const a of advisors) { if (a.userId) map[a.userId] = a; }
    return map;
  }, [advisors]);

  const rows: ClientRow[] = useMemo(() => {
    return profiles.map(p => {
      const dsUpdate = daysSince(p.updatedAt) ?? 0;
      let onTrack: boolean | null = null;
      let fireGap: number | null = null;
      let fireSurplus: number | null = null;
      let moneyRunsOutAge: number | undefined;
      let fireNumber: number | null = null;
      let wealthAtRetirement: number | null = null;
      let ins: InsuranceSummary | null = null;
      let age: number | null = null;
      let retirementAge: number | null = null;
      let annualIncome: number | null = null;
      let gender: 'M' | 'F' | '' | null = null;
      let phoneNumber: string | null = null;

      try {
        if (p.inputs) {
          const inputs = p.inputs as FireInputs;
          age = inputs.personal?.currentAge ?? null;
          retirementAge = inputs.personal?.retirementAge ?? null;
          annualIncome = inputs.income?.annualIncome ?? null;
          gender = (inputs.personal?.gender ?? null) as 'M' | 'F' | '' | null;
          phoneNumber = inputs.personal?.phoneNumber ?? null;
          const r = calculate(inputs);
          onTrack = r.onTrack;
          fireNumber = r.fireNumber;
          wealthAtRetirement = r.wealthAtRetirement;
          fireGap = onTrack ? null : r.fireNumber - r.wealthAtRetirement;
          fireSurplus = onTrack ? r.wealthAtRetirement - r.fireNumber : null;
          moneyRunsOutAge = r.moneyRunsOutAge;
          ins = computeInsurance(inputs, dsUpdate);
        }
      } catch { /* incomplete inputs — leave nulls */ }

      return {
        profile: p, advisor: advisorByUserId[p.advisorUserId],
        age, retirementAge, annualIncome, gender, phoneNumber,
        onTrack, fireGap, fireSurplus, moneyRunsOutAge, fireNumber, wealthAtRetirement, ins,
      };
    });
  }, [profiles, advisorByUserId]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setShowAll(false);
  };

  const advisorOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { userId: string; label: string }[] = [];
    for (const p of profiles) {
      if (!seen.has(p.advisorUserId)) {
        seen.add(p.advisorUserId);
        opts.push({ userId: p.advisorUserId, label: p.advisorEmail.split('@')[0] });
      }
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [profiles]);

  const sorted = useMemo(() => {
    const getValue = (r: ClientRow): number => {
      switch (sortKey) {
        case 'name':      return 0; // handled separately
        case 'age':       return r.age ?? -1;
        case 'income':    return r.annualIncome ?? -1;
        case 'fireGap':   return r.fireGap ?? (r.fireSurplus !== null ? -r.fireSurplus : -Infinity);
        case 'deathGap':  return r.ins?.deathGap ?? -1;
        case 'ciGap':     return r.ins?.ciGap ?? -1;
        case 'eciGap':    return r.ins?.eciGap ?? -1;
        case 'signal':    return r.ins?.signalScore ?? -1;
        case 'lastSeen':  return daysSince(r.profile.updatedAt) ?? -1;
        default:          return -1;
      }
    };
    return [...rows].sort((a, b) => {
      if (sortKey === 'name') {
        const cmp = a.profile.name.localeCompare(b.profile.name);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const diff = getValue(b) - getValue(a);
      return sortDir === 'desc' ? diff : -diff;
    });
  }, [rows, sortKey, sortDir]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sorted.filter(r => {
      if (advisorFilter && r.profile.advisorUserId !== advisorFilter) return false;
      if (statusFilter === 'gap' && r.onTrack !== false) return false;
      if (statusFilter === 'ontrack' && r.onTrack !== true) return false;
      if (statusFilter === 'highsignal' && (r.ins?.signalScore ?? 0) < 60) return false;
      if (q && !r.profile.name.toLowerCase().includes(q) && !r.profile.advisorEmail.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sorted, search, advisorFilter, statusFilter]);

  const visible = showAll ? filtered : filtered.slice(0, PAGE);
  const gapCount = rows.filter(r => r.onTrack === false).length;
  const onTrackCount = rows.filter(r => r.onTrack === true).length;
  const highSignalCount = rows.filter(r => (r.ins?.signalScore ?? 0) >= 60).length;

  const colHd = (key: SortKey, align: 'left' | 'center' | 'right' = 'left'): React.CSSProperties => ({
    fontSize: 10, fontWeight: 700, color: sortKey === key ? 'var(--text-2)' : 'var(--text-5)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    padding: '8px 14px', textAlign: align, whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border)', cursor: 'pointer',
    userSelect: 'none',
    background: sortKey === key ? 'rgba(96,165,250,0.04)' : 'transparent',
  });

  const SortArrow = ({ k }: { k: SortKey }) =>
    sortKey === k ? <span style={{ fontSize: 9, marginLeft: 3 }}>{sortDir === 'desc' ? '▼' : '▲'}</span> : null;

  const viewBtn = (v: ViewMode, label: string) => (
    <button onClick={() => setView(v)} style={{
      fontSize: 12, padding: '5px 14px', borderRadius: 8, cursor: 'pointer',
      fontWeight: 700, border: '1px solid',
      background: view === v ? 'rgba(96,165,250,0.12)' : 'transparent',
      color: view === v ? '#60a5fa' : 'var(--text-4)',
      borderColor: view === v ? 'rgba(96,165,250,0.35)' : 'var(--border)',
    }}>{label}</button>
  );

  return (
    <div style={{ marginBottom: 36 }}>
      {assignRow && assignRow.advisor && (
        <DashboardAssignModal
          advisor={assignRow.advisor}
          preselectedClientId={assignRow.profile.id}
          preselectedClientName={assignRow.profile.name}
          onClose={() => setAssignRow(null)}
          onCreated={() => { setAssignRow(null); onTaskCreated(); }}
        />
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>All Clients</span>
        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{profiles.length} total</span>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {viewBtn('fire', 'FIRE View')}
          {viewBtn('insurance', 'Insurance View')}
        </div>

        {/* Right controls */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status filters */}
          <div style={{ display: 'flex', gap: 4 }}>
            {([
              { key: 'all',        label: 'All',                   color: '#60a5fa' },
              { key: 'gap',        label: `FIRE gap (${gapCount})`,  color: '#f87171' },
              { key: 'ontrack',    label: `On track (${onTrackCount})`, color: '#34d399' },
              { key: 'highsignal', label: `High signal (${highSignalCount})`, color: '#fbbf24' },
            ] as const).map(f => (
              <button key={f.key} onClick={() => { setStatusFilter(f.key); setShowAll(false); }} style={{
                fontSize: 11, padding: '4px 9px', borderRadius: 20, cursor: 'pointer',
                fontWeight: 700, border: '1px solid',
                background: statusFilter === f.key ? `${f.color}22` : 'transparent',
                color: statusFilter === f.key ? f.color : 'var(--text-5)',
                borderColor: statusFilter === f.key ? `${f.color}55` : 'var(--border)',
              }}>{f.label}</button>
            ))}
          </div>

          <input type="text" placeholder="Search…" value={search}
            onChange={e => { setSearch(e.target.value); setShowAll(false); }}
            style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-1)', outline: 'none', width: 140 }} />
          <select value={advisorFilter}
            onChange={e => { setAdvisorFilter(e.target.value); setShowAll(false); }}
            style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-1)', outline: 'none', cursor: 'pointer' }}>
            <option value="">All advisors</option>
            {advisorOptions.map(o => <option key={o.userId} value={o.userId}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: 'var(--text-4)', fontSize: 13 }}>No clients match.</div>
      ) : (
        <>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                <thead>
                  {view === 'fire' ? (
                    <tr>
                      <th style={colHd('name')} onClick={() => handleSort('name')}>Client <SortArrow k="name" /></th>
                      <th style={colHd('name')}>Advisor</th>
                      <th style={{ ...colHd('age', 'center') }} onClick={() => handleSort('age')}>Age <SortArrow k="age" /></th>
                      <th style={{ ...colHd('income', 'right') }} onClick={() => handleSort('income')}>Income <SortArrow k="income" /></th>
                      <th style={{ ...colHd('fireGap', 'center') }} onClick={() => handleSort('fireGap')}>FIRE Status <SortArrow k="fireGap" /></th>
                      <th style={{ ...colHd('fireGap', 'right') }} onClick={() => handleSort('fireGap')}>Gap / Surplus <SortArrow k="fireGap" /></th>
                      <th style={{ ...colHd('lastSeen', 'center') }} onClick={() => handleSort('lastSeen')}>Last seen <SortArrow k="lastSeen" /></th>
                      <th style={{ ...colHd('name'), textAlign: 'right' }}></th>
                    </tr>
                  ) : (
                    <tr>
                      <th style={colHd('name')} onClick={() => handleSort('name')}>Client <SortArrow k="name" /></th>
                      <th style={colHd('name')}>Advisor</th>
                      <th style={{ ...colHd('age', 'center') }} onClick={() => handleSort('age')}>Age <SortArrow k="age" /></th>
                      <th style={{ ...colHd('income', 'right') }} onClick={() => handleSort('income')}>Income <SortArrow k="income" /></th>
                      <th style={{ ...colHd('deathGap', 'center') }} onClick={() => handleSort('deathGap')}>Death Gap <SortArrow k="deathGap" /></th>
                      <th style={{ ...colHd('ciGap', 'center') }} onClick={() => handleSort('ciGap')}>CI Gap <SortArrow k="ciGap" /></th>
                      <th style={{ ...colHd('eciGap', 'center') }} onClick={() => handleSort('eciGap')}>ECI Gap <SortArrow k="eciGap" /></th>
                      <th style={{ ...colHd('name', 'center') }}>Hospital Plan</th>
                      <th style={{ ...colHd('signal', 'center') }} onClick={() => handleSort('signal')}>Signal <SortArrow k="signal" /></th>
                      <th style={{ ...colHd('name'), textAlign: 'right' }}></th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {visible.map((row, i) => {
                    const d = daysSince(row.profile.updatedAt);
                    const updColor = activityColor(row.profile.updatedAt);
                    return (
                      <tr key={row.profile.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                        {/* Client name — same in both views */}
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{row.profile.name}</div>
                          {row.phoneNumber && (
                            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{row.phoneNumber}</div>
                          )}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            {row.profile.advisorEmail.split('@')[0]}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                          {row.age !== null ? (
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                                {row.age}
                                {row.gender ? (
                                  <span style={{ fontSize: 10, color: 'var(--text-5)', marginLeft: 4 }}>({row.gender})</span>
                                ) : null}
                              </div>
                              {row.retirementAge && (
                                <div style={{ fontSize: 10, color: 'var(--text-5)' }}>ret. {row.retirementAge}</div>
                              )}
                            </div>
                          ) : <span style={{ color: 'var(--text-5)', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
                            {row.annualIncome ? formatSGD(row.annualIncome) : '—'}
                          </span>
                        </td>

                        {view === 'fire' ? (
                          <>
                            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                              {row.onTrack === null ? (
                                <span style={{ fontSize: 11, color: 'var(--text-5)' }}>—</span>
                              ) : row.onTrack ? (
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399',
                                  background: 'rgba(52,211,153,0.1)', padding: '2px 9px', borderRadius: 20 }}>
                                  On track
                                </span>
                              ) : (
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171',
                                  background: 'rgba(248,113,113,0.1)', padding: '2px 9px', borderRadius: 20 }}>
                                  Gap{row.moneyRunsOutAge ? ` · age ${row.moneyRunsOutAge}` : ''}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                              {row.fireGap !== null ? (
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>-{formatSGD(row.fireGap)}</span>
                              ) : row.fireSurplus !== null ? (
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>+{formatSGD(row.fireSurplus)}</span>
                              ) : <span style={{ fontSize: 12, color: 'var(--text-5)' }}>—</span>}
                            </td>
                            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: updColor }}>
                                {d !== null ? (d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d}d ago`) : '—'}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                              {row.ins ? (
                                <GapCell gap={row.ins.deathGap}
                                  rec={(row.annualIncome ?? 0) * BENCH.death}
                                  label={`rec. ${formatSGD((row.annualIncome ?? 0) * BENCH.death)}`} />
                              ) : <span style={{ color: 'var(--text-5)', fontSize: 12 }}>—</span>}
                            </td>
                            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                              {row.ins ? (
                                <GapCell gap={row.ins.ciGap}
                                  rec={(row.annualIncome ?? 0) * BENCH.ci}
                                  label={`rec. ${formatSGD((row.annualIncome ?? 0) * BENCH.ci)}`} />
                              ) : <span style={{ color: 'var(--text-5)', fontSize: 12 }}>—</span>}
                            </td>
                            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                              {row.ins ? (
                                <GapCell gap={row.ins.eciGap}
                                  rec={(row.annualIncome ?? 0) * BENCH.eci}
                                  label={`rec. ${formatSGD((row.annualIncome ?? 0) * BENCH.eci)}`} />
                              ) : <span style={{ color: 'var(--text-5)', fontSize: 12 }}>—</span>}
                            </td>
                            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                              {row.ins?.hasISP === null ? (
                                <span style={{ fontSize: 11, color: 'var(--text-5)' }}>—</span>
                              ) : row.ins?.hasISP === false ? (
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 8px', borderRadius: 20 }}>No ISP</span>
                              ) : row.ins?.hasRider === false ? (
                                <div>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '2px 8px', borderRadius: 20 }}>No rider</span>
                                  {row.ins.ispWardClass && <div style={{ fontSize: 10, color: 'var(--text-5)', marginTop: 2 }}>Class {row.ins.ispWardClass}</div>}
                                </div>
                              ) : (
                                <div>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: 20 }}>ISP + Rider</span>
                                  {row.ins?.ispWardClass && <div style={{ fontSize: 10, color: 'var(--text-5)', marginTop: 2 }}>Class {row.ins.ispWardClass}</div>}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                              {row.ins ? <SignalBadge score={row.ins.signalScore} /> : <span style={{ color: 'var(--text-5)', fontSize: 12 }}>—</span>}
                            </td>
                          </>
                        )}

                        <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                          {row.advisor && (
                            <button onClick={() => setAssignRow(row)} style={{
                              fontSize: 11, padding: '4px 11px', borderRadius: 6, fontWeight: 700,
                              cursor: 'pointer', border: '1px solid rgba(96,165,250,0.3)',
                              background: 'rgba(96,165,250,0.08)', color: '#60a5fa' }}>
                              + Task
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {filtered.length > PAGE && !showAll && (
            <button onClick={() => setShowAll(true)} style={{
              marginTop: 10, fontSize: 12, color: 'var(--text-4)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Show all {filtered.length} clients ↓
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ManagerDashboardPage() {
  const { teamStatus } = useTeam();
  const [advisors, setAdvisors] = useState<AdvisorSummary[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<TeamProfile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [targets, setTargets] = useState<AdvisorTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const month = currentMonth();

  const load = useCallback(async () => {
    setLoading(true);
    const [adv, profiles, t, tgts] = await Promise.all([
      getAdvisorSummaries(), getAllTeamProfiles(), listTasks(), getAdvisorTargets(month),
    ]);
    setAdvisors(adv); setTeamProfiles(profiles); setTasks(t); setTargets(tgts);
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const monthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }, []);

  const staleThreshold = useMemo(() =>
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), []);

  const reviewThreshold = useMemo(() =>
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), []);

  const leaderboard: LeaderboardRow[] = useMemo(() => {
    const activeAdvisors = advisors.filter(a => a.role === 'advisor' && a.status === 'active');
    return activeAdvisors.map(advisor => {
      const ap = teamProfiles.filter(p => p.advisorUserId === advisor.userId);
      const newClientsThisMonth = ap.filter(p => p.createdAt >= monthStart).length;
      const at = tasks.filter(t => t.assignedTo === advisor.userId);
      const tasksCompletedThisMonth = at.filter(
        t => t.status === 'done' && t.completedAt && t.completedAt >= monthStart).length;
      const openTasks = at.filter(t => t.status === 'todo').length;
      const urgentTasks = at.filter(t => t.status === 'todo' && t.priority === 'urgent').length;
      const staleClientsCount = ap.filter(p => p.updatedAt < staleThreshold).length;
      const target = targets.find(t => t.advisorUserId === advisor.userId);
      return { advisor, totalClients: advisor.clientCount, newClientsThisMonth,
        tasksCompletedThisMonth, openTasks, urgentTasks, staleClientsCount,
        targetNewClients: target?.targetNewClients ?? 0 };
    }).sort((a, b) =>
      (b.tasksCompletedThisMonth + b.newClientsThisMonth * 2) -
      (a.tasksCompletedThisMonth + a.newClientsThisMonth * 2)
    );
  }, [advisors, teamProfiles, tasks, targets, monthStart, staleThreshold]);

  const staleProfiles = useMemo(() => {
    const advisorByUserId: Record<string, AdvisorSummary> = {};
    for (const a of advisors) { if (a.userId) advisorByUserId[a.userId] = a; }
    return teamProfiles
      .filter(p => p.updatedAt < staleThreshold)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      .map(p => ({ profile: p, advisor: advisorByUserId[p.advisorUserId] }))
      .filter(x => x.advisor);
  }, [teamProfiles, staleThreshold, advisors]);

  // Insurance portfolio intel — computed once across all team profiles
  const intelSummary = useMemo(() => {
    let noDeathCover = 0;
    let noCICover = 0;
    let noECICover = 0;
    let totalDeathGap = 0;
    let totalCIGap = 0;
    let highSignal = 0;
    let needsReview = 0;
    let noISP = 0;
    let noRider = 0;

    for (const p of teamProfiles) {
      const ds = daysSince(p.updatedAt) ?? 0;
      if (p.updatedAt < reviewThreshold) needsReview++;
      try {
        if (p.inputs) {
          const ins = computeInsurance(p.inputs as FireInputs, ds);
          if (ins.totalDeath === 0) noDeathCover++;
          if (ins.totalCI === 0) noCICover++;
          if (ins.totalECI === 0) noECICover++;
          totalDeathGap += ins.deathGap;
          totalCIGap    += ins.ciGap;
          if (ins.signalScore >= 60) highSignal++;
          if (ins.hasISP === false) noISP++;
          if (ins.hasISP === true && ins.hasRider === false) noRider++;
        }
      } catch { /* skip */ }
    }
    return { noDeathCover, noCICover, noECICover, totalDeathGap, totalCIGap, highSignal, needsReview, noISP, noRider };
  }, [teamProfiles, reviewThreshold]);

  const summary = useMemo(() => ({
    activeFAs: advisors.filter(a => a.role === 'advisor' && a.status === 'active').length,
    totalClients: leaderboard.reduce((s, r) => s + r.totalClients, 0),
    newThisMonth: leaderboard.reduce((s, r) => s + r.newClientsThisMonth, 0),
    openTasks: tasks.filter(t => t.status === 'todo').length,
    urgentTasks: tasks.filter(t => t.status === 'todo' && t.priority === 'urgent').length,
  }), [advisors, leaderboard, tasks]);

  const handleTargetSaved = (advisorUserId: string, newVal: number) => {
    setTargets(prev => {
      const existing = prev.find(t => t.advisorUserId === advisorUserId);
      if (existing) return prev.map(t => t.advisorUserId === advisorUserId ? { ...t, targetNewClients: newVal } : t);
      return [...prev, { advisorUserId, month, targetNewClients: newVal }];
    });
  };

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ fontSize: 32 }}>🔥</div>
      </div>
    );
  }

  const colHd: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: 'var(--text-5)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    padding: '8px 14px', textAlign: 'left', whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border)',
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', padding: '28px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Team Dashboard
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)' }}>
            {teamStatus?.orgName ?? 'My Team'}
          </div>
        </div>

        {/* Team summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 12 }}>
          {[
            { label: 'Active FAs',      value: summary.activeFAs,     color: '#34d399' },
            { label: 'Total Clients',   value: summary.totalClients,  color: '#60a5fa' },
            { label: 'New This Month',  value: summary.newThisMonth,  color: '#a78bfa' },
            { label: 'Open Tasks',      value: summary.openTasks,     color: '#fbbf24' },
            { label: 'Urgent Tasks',    value: summary.urgentTasks,   color: summary.urgentTasks > 0 ? '#f87171' : 'var(--text-3)' },
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: c.color, marginBottom: 2 }}>{c.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Insurance intelligence cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, marginBottom: 32 }}>
          {[
            { label: 'No death cover',       value: intelSummary.noDeathCover,           color: '#f87171', border: 'rgba(248,113,113,0.2)' },
            { label: 'No CI cover',          value: intelSummary.noCICover,              color: '#fbbf24', border: 'rgba(251,191,36,0.2)' },
            { label: 'No ECI cover',         value: intelSummary.noECICover,             color: '#a78bfa', border: 'rgba(167,139,250,0.2)' },
            { label: 'No ISP',               value: intelSummary.noISP,                  color: '#f87171', border: 'rgba(248,113,113,0.2)' },
            { label: 'ISP — no rider',       value: intelSummary.noRider,                color: '#fbbf24', border: 'rgba(251,191,36,0.2)' },
            { label: 'Total death gap',      value: formatSGD(intelSummary.totalDeathGap), color: '#f87171', border: 'rgba(248,113,113,0.2)' },
            { label: 'High signal (≥60)',    value: intelSummary.highSignal,              color: '#fbbf24', border: 'rgba(251,191,36,0.2)' },
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--surface)', border: `1px solid ${c.border}`, borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.color, marginBottom: 2 }}>{c.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-4)', lineHeight: 1.3 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* All Clients */}
        <AllClientsTable profiles={teamProfiles} advisors={advisors} onTaskCreated={load} />

        {/* FA Leaderboard */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>FA Leaderboard</span>
            <span style={{ fontSize: 12, color: 'var(--text-4)' }}>this month · click target to edit</span>
          </div>
          {leaderboard.length === 0 ? (
            <div style={{ color: 'var(--text-4)', fontSize: 13 }}>No active advisors yet.</div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...colHd, width: 36 }}>#</th>
                    <th style={colHd}>Advisor</th>
                    <th style={{ ...colHd, textAlign: 'center' }}>Clients</th>
                    <th style={{ ...colHd, textAlign: 'center' }}>New/mo</th>
                    <th style={colHd}>Target</th>
                    <th style={{ ...colHd, textAlign: 'center' }}>✓ Tasks/mo</th>
                    <th style={{ ...colHd, textAlign: 'center' }}>Open</th>
                    <th style={{ ...colHd, textAlign: 'center' }}>Stale 30d+</th>
                    <th style={colHd}>Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, i) => (
                    <tr key={row.advisor.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 800,
                          color: i === 0 ? '#fbbf24' : i === 1 ? 'var(--text-3)' : 'var(--text-5)' }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                        </span>
                      </td>
                      <td style={{ padding: '14px 14px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                          {row.advisor.email.split('@')[0]}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-5)' }}>
                          {row.advisor.email.split('@')[1] ? `@${row.advisor.email.split('@')[1]}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)' }}>{row.totalClients}</span>
                      </td>
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: row.newClientsThisMonth > 0 ? '#a78bfa' : 'var(--text-4)' }}>
                          {row.newClientsThisMonth}
                        </span>
                      </td>
                      <td style={{ padding: '14px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <TargetCell advisorUserId={row.advisor.userId!} value={row.targetNewClients}
                            month={month} onSaved={v => handleTargetSaved(row.advisor.userId!, v)} />
                          {row.targetNewClients > 0 && (
                            <ProgressBar value={row.newClientsThisMonth} target={row.targetNewClients} />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: row.tasksCompletedThisMonth > 0 ? '#34d399' : 'var(--text-4)' }}>
                          {row.tasksCompletedThisMonth}
                        </span>
                      </td>
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: row.openTasks > 0 ? '#fbbf24' : 'var(--text-4)' }}>
                          {row.openTasks}
                        </span>
                        {row.urgentTasks > 0 && (
                          <div style={{ fontSize: 10, color: '#f87171', fontWeight: 700 }}>{row.urgentTasks} urgent</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: row.staleClientsCount > 0 ? '#f87171' : 'var(--text-4)' }}>
                          {row.staleClientsCount}
                        </span>
                      </td>
                      <td style={{ padding: '14px 14px' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: activityColor(row.advisor.lastActive) }}>
                          {daysSinceLabel(row.advisor.lastActive)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stale clients */}
        {staleProfiles.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>Stale Clients</span>
              <span style={{ fontSize: 12, color: '#f87171' }}>
                {staleProfiles.length} client{staleProfiles.length !== 1 ? 's' : ''} not updated in 30+ days
              </span>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={colHd}>Client</th>
                    <th style={colHd}>Advisor</th>
                    <th style={{ ...colHd, textAlign: 'center' }}>Last updated</th>
                    <th style={{ ...colHd, textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {staleProfiles.map(({ profile, advisor }, i) => {
                    const d = daysSince(profile.updatedAt);
                    return (
                      <tr key={profile.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{profile.name}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{advisor.email}</span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: d !== null && d > 60 ? '#f87171' : '#fbbf24' }}>
                            {d !== null ? `${d}d ago` : '—'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <FollowUpBtn profile={profile} advisor={advisor} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

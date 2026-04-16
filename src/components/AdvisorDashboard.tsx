import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { listProfiles } from '../services/profileStorageSupabase';
import { calculate } from '../calculations';
import { ClientProfile } from '../profileTypes';
import { FireResults } from '../types';

interface ClientRow {
  profile: ClientProfile;
  results: FireResults;
  totalDeathSA: number;
  totalPremiumPA: number;
  hasMissingInsurance: boolean;
  hasMissingEstate: boolean;
}

type SortKey = 'name' | 'age' | 'retirementAge' | 'onTrack' | 'wealth' | 'coverage';
type SortDir = 'asc' | 'desc';

function formatSGDK(n: number) {
  if (Math.abs(n) >= 1_000_000) return `S$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `S$${Math.round(n / 1_000)}K`;
  return `S$${Math.round(n)}`;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '16px 20px', minWidth: 130, flex: 1,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || 'var(--text-1)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function AdvisorDashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState<'all' | 'on-track' | 'shortfall' | 'gaps'>('all');

  useEffect(() => {
    listProfiles().then(profiles => {
      const built: ClientRow[] = profiles.map(profile => {
        const results = calculate(profile.inputs);
        const policies = profile.inputs.policies || [];
        const totalDeathSA = policies.reduce((s, p) => s + (p.deathSumAssured || 0), 0);
        const freq: Record<string, number> = { monthly: 12, quarterly: 4, 'semi-annual': 2, annual: 1 };
        const totalPremiumPA = policies.reduce((s, p) => s + (p.premiumAmount || 0) * (freq[p.premiumFrequency] || 12), 0);
        const hasMissingInsurance = policies.length === 0 || totalDeathSA === 0;
        const ep = profile.inputs.estatePlanning;
        const hasMissingEstate = !ep?.lpa || !ep?.will;
        return { profile, results, totalDeathSA, totalPremiumPA, hasMissingInsurance, hasMissingEstate };
      });
      setRows(built);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const onTrack = rows.filter(r => r.results.onTrack).length;
    const shortfall = total - onTrack;
    const noInvestments = rows.filter(r => {
      const a = r.profile.inputs.assets;
      return (a?.investments || 0) === 0 && (r.profile.inputs.income?.annualInvestmentContribution || 0) === 0;
    }).length;
    const noInsurance = rows.filter(r => r.hasMissingInsurance).length;
    const missingEstate = rows.filter(r => r.hasMissingEstate).length;
    return { total, onTrack, shortfall, noInvestments, noInsurance, missingEstate };
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === 'on-track') list = list.filter(r => r.results.onTrack);
    if (filter === 'shortfall') list = list.filter(r => !r.results.onTrack);
    if (filter === 'gaps') list = list.filter(r => r.hasMissingInsurance || r.hasMissingEstate);
    return [...list].sort((a, b) => {
      let av: string | number = 0;
      let bv: string | number = 0;
      if (sortKey === 'name') { av = a.profile.name.toLowerCase(); bv = b.profile.name.toLowerCase(); }
      if (sortKey === 'age') { av = a.profile.inputs.personal?.currentAge || 0; bv = b.profile.inputs.personal?.currentAge || 0; }
      if (sortKey === 'retirementAge') { av = a.profile.inputs.personal?.retirementAge || 0; bv = b.profile.inputs.personal?.retirementAge || 0; }
      if (sortKey === 'onTrack') { av = a.results.onTrack ? 1 : 0; bv = b.results.onTrack ? 1 : 0; }
      if (sortKey === 'wealth') { av = a.results.wealthAtRetirement; bv = b.results.wealthAtRetirement; }
      if (sortKey === 'coverage') { av = a.totalDeathSA; bv = b.totalDeathSA; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, filter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleViewClient = (profile: ClientProfile) => {
    localStorage.setItem('fire-active-profile', profile.id);
    navigate('/');
  };

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: sortKey === key ? '#34d399' : 'var(--text-4)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
    borderBottom: '1px solid var(--border)',
  });

  const thPlain: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em',
    whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)',
  };

  const sortArrow = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)' }}>
        Loading client data…
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', padding: '24px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>Portfolio Overview</h1>
          <p style={{ fontSize: 13, color: 'var(--text-4)', marginTop: 4 }}>
            {stats.total} client{stats.total !== 1 ? 's' : ''} · last updated on load
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
          <StatCard label="Total Clients" value={stats.total} />
          <StatCard
            label="On Track"
            value={stats.onTrack}
            sub={stats.total ? `${Math.round(stats.onTrack / stats.total * 100)}% of clients` : '—'}
            color="#34d399"
          />
          <StatCard
            label="Shortfall"
            value={stats.shortfall}
            sub={stats.total ? `${Math.round(stats.shortfall / stats.total * 100)}% of clients` : '—'}
            color={stats.shortfall > 0 ? '#f87171' : 'var(--text-1)'}
          />
          <StatCard
            label="No Investments"
            value={stats.noInvestments}
            sub="no portfolio or contributions"
            color={stats.noInvestments > 0 ? '#fbbf24' : 'var(--text-1)'}
          />
          <StatCard
            label="No Insurance"
            value={stats.noInsurance}
            sub="zero coverage"
            color={stats.noInsurance > 0 ? '#fbbf24' : 'var(--text-1)'}
          />
          <StatCard
            label="Missing Estate Docs"
            value={stats.missingEstate}
            sub="no LPA or no Will"
            color={stats.missingEstate > 0 ? '#818cf8' : 'var(--text-1)'}
          />
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {([
            { key: 'all', label: 'All Clients' },
            { key: 'on-track', label: '✓ On Track' },
            { key: 'shortfall', label: '⚠ Shortfall' },
            { key: 'gaps', label: 'Has Gaps' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: '1px solid',
                background: filter === f.key ? 'rgba(16,185,129,0.12)' : 'var(--card)',
                color: filter === f.key ? '#34d399' : 'var(--text-3)',
                borderColor: filter === f.key ? 'rgba(16,185,129,0.3)' : 'var(--border)',
              }}
            >
              {f.label}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-4)', alignSelf: 'center' }}>
            {filtered.length} client{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                <th style={thStyle('name')} onClick={() => handleSort('name')}>Name{sortArrow('name')}</th>
                <th style={thStyle('age')} onClick={() => handleSort('age')}>Age{sortArrow('age')}</th>
                <th style={thStyle('retirementAge')} onClick={() => handleSort('retirementAge')}>Retire{sortArrow('retirementAge')}</th>
                <th style={thStyle('onTrack')} onClick={() => handleSort('onTrack')}>Status{sortArrow('onTrack')}</th>
                <th style={thStyle('wealth')} onClick={() => handleSort('wealth')}>Wealth at Retirement{sortArrow('wealth')}</th>
                <th style={thStyle('coverage')} onClick={() => handleSort('coverage')}>Death Coverage{sortArrow('coverage')}</th>
                <th style={thPlain}>LPA</th>
                <th style={thPlain}>Will</th>
                <th style={thPlain}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
                    No clients match this filter.
                  </td>
                </tr>
              )}
              {filtered.map((row, i) => {
                const { profile, results } = row;
                const ep = profile.inputs.estatePlanning;
                const lpa = ep?.lpa ?? false;
                const will = ep?.will ?? false;
                const age = profile.inputs.personal?.currentAge;
                const retAge = profile.inputs.personal?.retirementAge;

                return (
                  <tr
                    key={profile.id}
                    style={{
                      borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onClick={() => handleViewClient(profile)}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: 'var(--inset)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: 'var(--text-3)',
                        }}>
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{profile.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-2)' }}>{age ?? '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-2)' }}>{retAge ?? '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                        background: results.onTrack ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: results.onTrack ? '#34d399' : '#f87171',
                        border: `1px solid ${results.onTrack ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      }}>
                        {results.onTrack ? '✓ On Track' : '⚠ Shortfall'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatSGDK(results.wealthAtRetirement)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: row.hasMissingInsurance ? '#fbbf24' : 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
                      {row.hasMissingInsurance ? '— No coverage' : formatSGDK(row.totalDeathSA)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: lpa ? 'rgba(99,102,241,0.2)' : 'rgba(100,116,139,0.1)',
                        color: lpa ? '#818cf8' : 'var(--text-4)',
                        border: `1px solid ${lpa ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                      }}>{lpa ? '✓' : '—'}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: will ? 'rgba(99,102,241,0.2)' : 'rgba(100,116,139,0.1)',
                        color: will ? '#818cf8' : 'var(--text-4)',
                        border: `1px solid ${will ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                      }}>{will ? '✓' : '—'}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); handleViewClient(profile); }}
                        style={{
                          background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                          padding: '4px 10px', fontSize: 11, fontWeight: 600,
                          color: 'var(--text-3)', cursor: 'pointer',
                        }}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

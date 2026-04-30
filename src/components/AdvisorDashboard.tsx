import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { listProfiles } from '../services/profileStorageSupabase';
import { listMyTasks, Task } from '../services/taskService';
import { calculate } from '../calculations';
import { ClientProfile } from '../profileTypes';
import { daysUntilNext, isPremiumActive, nextOccurrence } from '../premiumUtils';
import DashboardShell from './Dashboard/DashboardShell';
import { enrichProfile } from '../enrichProfile';

interface UpcomingPremium {
  clientName: string;
  clientId: string;
  policyName: string;
  amount: number;
  frequency: string;
  nextDueDate: string;
  daysUntil: number;
}

const FREQ_LABEL: Record<string, string> = {
  monthly: '/mth', quarterly: '/qtr', 'semi-annual': '/half-yr', annual: '/yr',
};

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
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
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listProfiles(), listMyTasks().catch(() => [] as Task[])])
      .then(([p, t]) => {
        setProfiles(p);
        setTasks(t);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Stats card aggregates use the same enrichment the Dashboard table uses
  const stats = useMemo(() => {
    const enriched = profiles.map(p => enrichProfile(p, { tasks }));
    const total = enriched.length;
    const onTrack = enriched.filter(r => r.fireOnTrack).length;
    const shortfall = total - onTrack;
    const noInvestments = enriched.filter(r => {
      const a = r.profile.inputs.assets;
      return (a?.investments || 0) === 0 && (r.profile.inputs.income?.annualInvestmentContribution || 0) === 0;
    }).length;
    const noInsurance = enriched.filter(r => r.hasMissingInsurance).length;
    const missingEstate = enriched.filter(r => r.hasMissingEstate).length;
    const overdueReview = enriched.filter(r => r.reviewOverdue || (r.daysSinceMeeting !== null && r.daysSinceMeeting > 365)).length;
    const neverMet = enriched.filter(r => r.daysSinceMeeting === null).length;
    const dueSoon = enriched.filter(r => r.nearestDueDays !== null && r.nearestDueDays <= 30).length;
    return { total, onTrack, shortfall, noInvestments, noInsurance, missingEstate, overdueReview, neverMet, dueSoon };
  }, [profiles, tasks]);

  // All in-force premiums with a due date within 90 days, sorted by date
  const upcomingPremiums = useMemo((): UpcomingPremium[] => {
    const list: UpcomingPremium[] = [];
    profiles.forEach(profile => {
      (profile.inputs.policies || [])
        .filter(p => p.policyStatus === 'in-force' && p.premiumNextDueDate && isPremiumActive(p))
        .forEach(p => {
          const days = daysUntilNext(p.premiumNextDueDate, p.premiumFrequency);
          const next = nextOccurrence(p.premiumNextDueDate, p.premiumFrequency);
          if (days !== null && next !== null && days <= 90) {
            list.push({
              clientName: profile.name,
              clientId: profile.id,
              policyName: p.name,
              amount: p.premiumAmount,
              frequency: p.premiumFrequency,
              nextDueDate: next.toISOString().slice(0, 10),
              daysUntil: days,
            });
          }
        });
    });
    return list.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [profiles]);

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
            {stats.total} client{stats.total !== 1 ? 's' : ''}
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
          <StatCard
            label="Needs Follow-up"
            value={stats.overdueReview + stats.neverMet}
            sub={`${stats.overdueReview} overdue · ${stats.neverMet} never met`}
            color={(stats.overdueReview + stats.neverMet) > 0 ? '#fb923c' : 'var(--text-1)'}
          />
          <StatCard
            label="Premiums Due ≤30d"
            value={stats.dueSoon}
            sub="clients with upcoming renewal"
            color={stats.dueSoon > 0 ? '#f87171' : 'var(--text-1)'}
          />
        </div>

        {/* Upcoming Premiums timeline */}
        {upcomingPremiums.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>
              💳 Upcoming Premiums <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-4)' }}>— next 90 days</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {upcomingPremiums.map((up, i) => {
                const isOverdue = up.daysUntil < 0;
                const isUrgent = up.daysUntil >= 0 && up.daysUntil <= 7;
                const isSoon   = up.daysUntil > 7 && up.daysUntil <= 30;
                const accentColor = isOverdue ? '#f87171' : isUrgent ? '#fb923c' : isSoon ? '#fbbf24' : 'var(--text-4)';
                return (
                  <div
                    key={i}
                    onClick={() => { localStorage.setItem('fire-active-profile', up.clientId); navigate('/'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: 'var(--card)', border: '1px solid var(--border)',
                      borderLeft: `3px solid ${accentColor}`,
                      borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--card)'}
                  >
                    <div style={{ textAlign: 'center', minWidth: 52, flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: accentColor, lineHeight: 1 }}>
                        {isOverdue ? `+${Math.abs(up.daysUntil)}d` : up.daysUntil === 0 ? 'Today' : `${up.daysUntil}d`}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-5)', marginTop: 2 }}>
                        {isOverdue ? 'overdue' : 'remaining'}
                      </div>
                    </div>
                    <div style={{ width: 1, height: 32, background: 'var(--border)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{up.clientName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {up.policyName}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
                        S${up.amount.toLocaleString()}{FREQ_LABEL[up.frequency] ?? ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>
                        {formatShortDate(up.nextDueDate)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter + saved views + client table */}
        <DashboardShell
          dashboardKind="advisor"
          profiles={profiles}
          tasks={tasks}
        />
      </div>
    </div>
  );
}

// Re-export calculate so other files that import from here keep working (none in repo today, but kept for safety).
export { calculate };

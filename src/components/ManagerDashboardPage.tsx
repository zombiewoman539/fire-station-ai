import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import {
  getAdvisorSummaries, getAllTeamProfiles, getAdvisorTargets, setAdvisorTarget,
  AdvisorSummary, TeamProfile, AdvisorTarget,
} from '../services/teamService';
import { listTasks, createTask, Task } from '../services/taskService';

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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Target cell (inline-editable) ───────────────────────────────────────────

function TargetCell({ advisorUserId, value, month, onSaved }: {
  advisorUserId: string;
  value: number;
  month: string;
  onSaved: (newVal: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = parseInt(draft, 10);
    if (isNaN(n) || n < 0) { setDraft(String(value)); setEditing(false); return; }
    setSaving(true);
    try {
      await setAdvisorTarget(advisorUserId, month, n);
      onSaved(n);
    } catch { /* ignore */ }
    setSaving(false);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(String(value)); setEditing(true); }}
        title="Click to set target"
        style={{
          background: 'none', border: '1px dashed var(--border)', borderRadius: 6,
          padding: '2px 10px', cursor: 'pointer', color: value > 0 ? 'var(--text-2)' : 'var(--text-5)',
          fontSize: 13, fontWeight: 700,
        }}
      >
        {value > 0 ? value : '—'}
      </button>
    );
  }

  return (
    <input
      autoFocus
      type="number"
      min={0}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
      disabled={saving}
      style={{
        width: 52, padding: '2px 8px', borderRadius: 6,
        border: '1px solid #10b981', background: 'var(--bg)',
        color: 'var(--text-1)', fontSize: 13, fontWeight: 700,
        textAlign: 'center', outline: 'none',
      }}
    />
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, target }: { value: number; target: number }) {
  if (target === 0) return <span style={{ fontSize: 12, color: 'var(--text-5)' }}>No target</span>;
  const pct = Math.min(100, Math.round((value / target) * 100));
  const color = pct >= 100 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#f87171';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 64, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>
        {value}/{target}
      </span>
    </div>
  );
}

// ─── Follow-up button (one-click task create) ─────────────────────────────────

function FollowUpBtn({ profile, advisor }: { profile: TeamProfile; advisor: AdvisorSummary }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  const handleClick = async () => {
    if (!advisor.userId || state !== 'idle') return;
    setState('loading');
    try {
      await createTask({
        title: `Follow up with ${profile.name}`,
        assignedTo: advisor.userId,
        clientProfileId: profile.id,
        clientName: profile.name,
        priority: 'urgent',
      });
      setState('done');
      setTimeout(() => setState('idle'), 3000);
    } catch {
      setState('idle');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={state !== 'idle'}
      style={{
        fontSize: 11, padding: '4px 11px', borderRadius: 6, fontWeight: 700,
        cursor: state === 'idle' ? 'pointer' : 'default',
        border: '1px solid',
        background: state === 'done' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.08)',
        color: state === 'done' ? '#34d399' : state === 'loading' ? 'var(--text-4)' : '#f87171',
        borderColor: state === 'done' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.25)',
        transition: 'all 0.15s',
      }}
    >
      {state === 'done' ? '✓ Assigned' : state === 'loading' ? '…' : '+ Follow up'}
    </button>
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
      getAdvisorSummaries(),
      getAllTeamProfiles(),
      listTasks(),
      getAdvisorTargets(month),
    ]);
    setAdvisors(adv);
    setTeamProfiles(profiles);
    setTasks(t);
    setTargets(tgts);
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const monthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }, []);

  const staleThreshold = useMemo(() => {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }, []);

  const leaderboard: LeaderboardRow[] = useMemo(() => {
    const activeAdvisors = advisors.filter(a => a.role === 'advisor' && a.status === 'active');
    return activeAdvisors.map(advisor => {
      const advisorProfiles = teamProfiles.filter(p => p.advisorUserId === advisor.userId);
      const newClientsThisMonth = advisorProfiles.filter(p => p.createdAt >= monthStart).length;
      const advisorTasks = tasks.filter(t => t.assignedTo === advisor.userId);
      const tasksCompletedThisMonth = advisorTasks.filter(
        t => t.status === 'done' && t.completedAt && t.completedAt >= monthStart
      ).length;
      const openTasks = advisorTasks.filter(t => t.status === 'todo').length;
      const urgentTasks = advisorTasks.filter(t => t.status === 'todo' && t.priority === 'urgent').length;
      const staleClientsCount = advisorProfiles.filter(p => p.updatedAt < staleThreshold).length;
      const target = targets.find(t => t.advisorUserId === advisor.userId);
      return {
        advisor,
        totalClients: advisor.clientCount,
        newClientsThisMonth,
        tasksCompletedThisMonth,
        openTasks,
        urgentTasks,
        staleClientsCount,
        targetNewClients: target?.targetNewClients ?? 0,
      };
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
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Team Dashboard
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)' }}>
            {teamStatus?.orgName ?? 'My Team'}
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Active FAs', value: summary.activeFAs, color: '#34d399' },
            { label: 'Total Clients', value: summary.totalClients, color: '#60a5fa' },
            { label: 'New This Month', value: summary.newThisMonth, color: '#a78bfa' },
            { label: 'Open Tasks', value: summary.openTasks, color: '#fbbf24' },
            { label: 'Urgent Tasks', value: summary.urgentTasks, color: summary.urgentTasks > 0 ? '#f87171' : 'var(--text-3)' },
          ].map(c => (
            <div key={c.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '16px 20px',
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: c.color, marginBottom: 2 }}>{c.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
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
                    <th style={{ ...colHd }}>Target</th>
                    <th style={{ ...colHd, textAlign: 'center' }}>✓ Tasks/mo</th>
                    <th style={{ ...colHd, textAlign: 'center' }}>Open</th>
                    <th style={{ ...colHd, textAlign: 'center' }}>Stale 30d+</th>
                    <th style={{ ...colHd }}>Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, i) => (
                    <tr key={row.advisor.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 800,
                          color: i === 0 ? '#fbbf24' : i === 1 ? 'var(--text-3)' : 'var(--text-5)',
                        }}>
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
                          <TargetCell
                            advisorUserId={row.advisor.userId!}
                            value={row.targetNewClients}
                            month={month}
                            onSaved={v => handleTargetSaved(row.advisor.userId!, v)}
                          />
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
          <div>
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

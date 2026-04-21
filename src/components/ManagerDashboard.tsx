import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTeam } from '../contexts/TeamContext';
import {
  AdvisorSummary, getAdvisorSummaries, getAdvisorProfiles,
  inviteAdvisor, removeMember, transferClient, getAllTeamProfiles, TeamProfile,
} from '../services/teamService';
import { listTasks, createTask, Task } from '../services/taskService';
import { calculate } from '../calculations';
import { defaultInputs } from '../defaults';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysSince(iso: string | null): string {
  if (!iso) return '—';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function activityColor(lastActive: string | null): string {
  if (!lastActive) return 'var(--text-4)';
  const days = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);
  if (days <= 7) return '#34d399';
  if (days <= 30) return '#fbbf24';
  return '#f87171';
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--text-2)', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text-1)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const ghostBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'transparent',
  color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const primaryBtn: React.CSSProperties = {
  padding: '8px 18px', borderRadius: 8,
  border: 'none', background: '#10b981',
  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

// ─── Assign task modal ────────────────────────────────────────────────────────

interface AssignTaskModalProps {
  advisor: AdvisorSummary;
  onClose: () => void;
  onCreated: () => void;
}

function AssignTaskModal({ advisor, onClose, onCreated }: AssignTaskModalProps) {
  const [title, setTitle] = useState('');
  const [clientProfiles, setClientProfiles] = useState<any[]>([]);
  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (advisor.userId) {
      getAdvisorProfiles(advisor.userId).then(setClientProfiles);
    }
  }, [advisor.userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !advisor.userId) return;
    setSaving(true);
    setError('');
    try {
      const client = clientProfiles.find(p => p.id === clientId);
      await createTask({
        title: title.trim(),
        assignedTo: advisor.userId,
        clientProfileId: clientId || undefined,
        clientName: client?.name ?? undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 440,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>
          Assign task
        </h2>
        <p style={{ margin: '0 0 22px', fontSize: 13, color: 'var(--text-3)' }}>
          To: {advisor.email}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Task</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Review CI coverage gap" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Client <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} style={inputStyle}>
              <option value="">— No client —</option>
              {clientProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Due date <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notes <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Context or instructions for the advisor…"
              rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
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

// ─── Transfer client modal ────────────────────────────────────────────────────

interface TransferModalProps {
  profile: { id: string; name: string };
  advisors: AdvisorSummary[];
  currentUserId: string;
  onClose: () => void;
  onTransferred: () => void;
}

function TransferModal({ profile, advisors, currentUserId, onClose, onTransferred }: TransferModalProps) {
  const targets = advisors.filter(a => a.role === 'advisor' && a.status === 'active' && a.userId !== currentUserId);
  const [toUserId, setToUserId] = useState(targets[0]?.userId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUserId) return;
    setSaving(true);
    try {
      await transferClient(profile.id, toUserId);
      onTransferred();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 400,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>
          Transfer client
        </h2>
        <p style={{ margin: '0 0 22px', fontSize: 13, color: 'var(--text-3)' }}>
          Moving <strong style={{ color: 'var(--text-1)' }}>{profile.name}</strong> to a different advisor.
        </p>

        {targets.length === 0 ? (
          <p style={{ color: '#f87171', fontSize: 13 }}>No other active advisors to transfer to.</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Transfer to</label>
              <select value={toUserId} onChange={e => setToUserId(e.target.value)} style={inputStyle}>
                {targets.map(a => <option key={a.userId!} value={a.userId!}>{a.email}</option>)}
              </select>
            </div>
            {error && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
              <button type="submit" disabled={saving} style={{ ...primaryBtn, background: '#f97316' }}>
                {saving ? 'Transferring…' : 'Transfer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Advisor clients drawer ───────────────────────────────────────────────────

interface AdvisorClientsDrawerProps {
  advisor: AdvisorSummary;
  allAdvisors: AdvisorSummary[];
  onClose: () => void;
  onTransferred: () => void;
}

function AdvisorClientsDrawer({ advisor, allAdvisors, onClose, onTransferred }: AdvisorClientsDrawerProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferTarget, setTransferTarget] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(() => {
    if (!advisor.userId) return;
    setLoading(true);
    getAdvisorProfiles(advisor.userId)
      .then(setProfiles)
      .finally(() => setLoading(false));
  }, [advisor.userId]);

  useEffect(() => { load(); }, [load]);

  const handleTransferred = () => {
    setTransferTarget(null);
    load();
    onTransferred();
  };

  return (
    <>
      {transferTarget && (
        <TransferModal
          profile={transferTarget}
          advisors={allAdvisors}
          currentUserId={advisor.userId ?? ''}
          onClose={() => setTransferTarget(null)}
          onTransferred={handleTransferred}
        />
      )}
      <div
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 1500, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
        }}
      >
        <div style={{
          width: 460, height: '100%', background: 'var(--surface)',
          borderLeft: '1px solid var(--border)', padding: '28px 24px',
          overflowY: 'auto', display: 'flex', flexDirection: 'column', color: 'var(--text-1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Advisor
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{advisor.email}</div>
              <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>
                {profiles.length} client{profiles.length !== 1 ? 's' : ''}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '6px 12px', cursor: 'pointer', color: 'var(--text-2)', fontSize: 13,
            }}>✕ Close</button>
          </div>

          {loading ? (
            <div style={{ color: 'var(--text-4)', fontSize: 13 }}>Loading clients…</div>
          ) : profiles.length === 0 ? (
            <div style={{ color: 'var(--text-4)', fontSize: 13 }}>No clients yet.</div>
          ) : (
            profiles.map(p => {
              const meta = (p.meta as any) ?? {};
              return (
                <div key={p.id} style={{
                  background: 'var(--inset)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '14px 16px', marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{p.name}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-5)' }}>{daysSince(p.updated_at)}</span>
                      <button
                        onClick={() => setTransferTarget({ id: p.id, name: p.name })}
                        style={{
                          fontSize: 11, padding: '3px 9px', borderRadius: 6,
                          border: '1px solid var(--border)', background: 'transparent',
                          color: 'var(--text-3)', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        Transfer
                      </button>
                    </div>
                  </div>
                  {meta.lastMeetingDate && (
                    <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
                      Last meeting: {new Date(meta.lastMeetingDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                  {meta.nextReviewDate && (
                    <div style={{ fontSize: 12, color: new Date(meta.nextReviewDate) < new Date() ? '#f87171' : '#fbbf24' }}>
                      Next review: {new Date(meta.nextReviewDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

// ─── Advisor row ──────────────────────────────────────────────────────────────

interface AdvisorRowProps {
  member: AdvisorSummary;
  taskStats: { open: number; doneThisMonth: number };
  onViewClients: () => void;
  onAssignTask: () => void;
  onRemove: () => void;
}

function AdvisorRow({ member, taskStats, onViewClients, onAssignTask, onRemove }: AdvisorRowProps) {
  const isManager = member.role === 'manager';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '2fr 70px 80px 80px 100px 1fr',
      alignItems: 'center', gap: 12,
      padding: '14px 20px', background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 12, marginBottom: 8,
    }}>
      {/* Email + role + join date */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{member.email}</span>
          {isManager && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', background: 'rgba(16,185,129,0.12)', padding: '1px 7px', borderRadius: 20 }}>Manager</span>
          )}
          {member.status === 'pending' && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', padding: '1px 7px', borderRadius: 20 }}>Pending</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-5)' }}>
          Joined {new Date(member.createdAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* Clients */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>{member.clientCount}</div>
        <div style={{ fontSize: 10, color: 'var(--text-5)' }}>clients</div>
      </div>

      {/* Open tasks */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: taskStats.open > 0 ? '#fbbf24' : 'var(--text-3)' }}>
          {taskStats.open}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-5)' }}>open tasks</div>
      </div>

      {/* Done this month */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: taskStats.doneThisMonth > 0 ? '#34d399' : 'var(--text-3)' }}>
          {taskStats.doneThisMonth}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-5)' }}>done/mo</div>
      </div>

      {/* Last active */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: activityColor(member.lastActive) }}>
          {daysSince(member.lastActive)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-5)' }}>last active</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {!isManager && member.status === 'active' && (
          <>
            <button onClick={onViewClients} style={{
              fontSize: 12, padding: '5px 11px', borderRadius: 7,
              background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)',
              color: '#34d399', cursor: 'pointer', fontWeight: 600,
            }}>
              Clients
            </button>
            <button onClick={onAssignTask} style={{
              fontSize: 12, padding: '5px 11px', borderRadius: 7,
              background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)',
              color: '#60a5fa', cursor: 'pointer', fontWeight: 600,
            }}>
              Assign task
            </button>
          </>
        )}
        {!isManager && (
          <button onClick={onRemove} style={{
            fontSize: 12, padding: '5px 10px', borderRadius: 7,
            background: 'none', border: '1px solid var(--border)', color: 'var(--text-5)', cursor: 'pointer',
          }}>✕</button>
        )}
      </div>
    </div>
  );
}

// ─── All clients tab ──────────────────────────────────────────────────────────

function AllClientsTab({ advisors }: { advisors: AdvisorSummary[] }) {
  const [teamProfiles, setTeamProfiles] = useState<TeamProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'on-track' | 'shortfall'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'advisor' | 'updated'>('updated');
  const [transferTarget, setTransferTarget] = useState<{ id: string; name: string; advisorUserId: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getAllTeamProfiles().then(data => { setTeamProfiles(data); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    return teamProfiles.map(p => {
      let onTrack = false;
      try {
        const inputs = { ...defaultInputs, ...p.inputs };
        const result = calculate(inputs);
        onTrack = result.onTrack;
      } catch { /* skip */ }
      return { ...p, onTrack };
    });
  }, [teamProfiles]);

  const filtered = useMemo(() => {
    let r = rows;
    if (filter === 'on-track') r = r.filter(x => x.onTrack);
    if (filter === 'shortfall') r = r.filter(x => !x.onTrack);
    if (sortBy === 'name') r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'advisor') r = [...r].sort((a, b) => a.advisorEmail.localeCompare(b.advisorEmail));
    if (sortBy === 'updated') r = [...r].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return r;
  }, [rows, filter, sortBy]);

  const onTrackCount = rows.filter(r => r.onTrack).length;
  const shortfallCount = rows.filter(r => !r.onTrack).length;

  return (
    <div>
      {transferTarget && (
        <TransferModal
          profile={transferTarget}
          advisors={advisors}
          currentUserId={transferTarget.advisorUserId}
          onClose={() => setTransferTarget(null)}
          onTransferred={() => { setTransferTarget(null); load(); }}
        />
      )}

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', value: rows.length, color: '#60a5fa' },
          { label: 'On Track', value: onTrackCount, color: '#34d399' },
          { label: 'Shortfall', value: shortfallCount, color: '#f87171' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 20px', flex: 1, textAlign: 'center',
          }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-5)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'on-track', 'shortfall'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              border: '1px solid var(--border)', cursor: 'pointer',
              background: filter === f ? '#10b981' : 'transparent',
              color: filter === f ? '#fff' : 'var(--text-3)',
            }}>
              {f === 'all' ? 'All' : f === 'on-track' ? 'On track' : 'Shortfall'}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-4)' }}>Sort:</span>
          {(['updated', 'name', 'advisor'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)} style={{
              padding: '5px 11px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              border: '1px solid var(--border)', cursor: 'pointer',
              background: sortBy === s ? 'var(--surface)' : 'transparent',
              color: sortBy === s ? 'var(--text-1)' : 'var(--text-4)',
            }}>
              {s === 'updated' ? 'Recent' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 2fr 100px 100px 80px',
        gap: 12, padding: '6px 16px', marginBottom: 4,
      }}>
        {['Client', 'Advisor', 'Status', 'Last updated', ''].map(h => (
          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-4)', fontSize: 13, padding: 16 }}>Loading all clients…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: 'var(--text-4)', fontSize: 13, padding: 16 }}>No clients match this filter.</div>
      ) : (
        filtered.map(row => (
          <div key={row.id} style={{
            display: 'grid', gridTemplateColumns: '2fr 2fr 100px 100px 80px',
            alignItems: 'center', gap: 12,
            padding: '12px 16px', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 10, marginBottom: 6,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{row.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.advisorEmail}
            </div>
            <div>
              <span style={{
                fontSize: 11, fontWeight: 700,
                padding: '3px 9px', borderRadius: 6,
                background: row.onTrack ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                color: row.onTrack ? '#34d399' : '#f87171',
              }}>
                {row.onTrack ? 'On track' : 'Shortfall'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{daysSince(row.updatedAt)}</div>
            <button
              onClick={() => setTransferTarget({ id: row.id, name: row.name, advisorUserId: row.advisorUserId })}
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-3)', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Transfer
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Tasks tab ────────────────────────────────────────────────────────────────

function TeamTasksTab({ advisors }: { advisors: AdvisorSummary[] }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignTarget, setAssignTarget] = useState<AdvisorSummary | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listTasks().then(data => { setTasks(data); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const emailByUserId = useMemo(() => {
    const map: Record<string, string> = {};
    advisors.forEach(a => { if (a.userId) map[a.userId] = a.email; });
    return map;
  }, [advisors]);

  const grouped = useMemo(() => {
    const g: Record<string, Task[]> = {};
    for (const t of tasks) {
      const key = t.assignedTo;
      if (!g[key]) g[key] = [];
      g[key].push(t);
    }
    return g;
  }, [tasks]);

  const activeAdvisors = advisors.filter(a => a.role === 'advisor' && a.status === 'active');

  return (
    <div>
      {assignTarget && (
        <AssignTaskModal
          advisor={assignTarget}
          onClose={() => setAssignTarget(null)}
          onCreated={() => { setAssignTarget(null); load(); }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeAdvisors.map(a => (
            <button key={a.id} onClick={() => setAssignTarget(a)} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: '1px solid rgba(96,165,250,0.3)',
              background: 'rgba(96,165,250,0.08)', color: '#60a5fa', cursor: 'pointer',
            }}>
              + Assign to {a.email.split('@')[0]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-4)', fontSize: 13 }}>Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <div style={{
          border: '1px dashed var(--border)', borderRadius: 16,
          padding: '48px 32px', textAlign: 'center',
        }}>
          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 14 }}>
            No tasks assigned yet. Use "Assign task" on an advisor row to get started.
          </p>
        </div>
      ) : (
        activeAdvisors.map(advisor => {
          const advisorTasks = grouped[advisor.userId ?? ''] ?? [];
          if (advisorTasks.length === 0) return null;
          const open = advisorTasks.filter(t => t.status === 'todo');
          const done = advisorTasks.filter(t => t.status === 'done');
          return (
            <div key={advisor.id} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{advisor.email}</span>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 10,
                  background: 'var(--border)', color: 'var(--text-4)',
                }}>
                  {open.length} open · {done.length} done
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {advisorTasks.map(t => {
                  const overdue = t.dueDate && new Date(t.dueDate + 'T23:59:59') < new Date() && t.status === 'todo';
                  return (
                    <div key={t.id} style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '12px 16px',
                      opacity: t.status === 'done' ? 0.6 : 1,
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: t.status === 'done' ? '#34d399' : overdue ? '#f87171' : '#fbbf24',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: 'var(--text-1)',
                          textDecoration: t.status === 'done' ? 'line-through' : 'none',
                        }}>
                          {t.title}
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                          {t.clientName && (
                            <span style={{ fontSize: 11, color: '#34d399' }}>{t.clientName}</span>
                          )}
                          {t.dueDate && (
                            <span style={{ fontSize: 11, color: overdue ? '#f87171' : 'var(--text-4)' }}>
                              Due {new Date(t.dueDate + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        padding: '2px 9px', borderRadius: 6,
                        background: t.status === 'done' ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)',
                        color: t.status === 'done' ? '#34d399' : '#fbbf24',
                      }}>
                        {t.status === 'done' ? 'Done' : 'Open'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

type Tab = 'team' | 'tasks' | 'all-clients';

export default function ManagerDashboard() {
  const { teamStatus } = useTeam();
  const [tab, setTab] = useState<Tab>('team');
  const [advisors, setAdvisors] = useState<AdvisorSummary[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState<AdvisorSummary | null>(null);
  const [assignTarget, setAssignTarget] = useState<AdvisorSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [advisorData, taskData] = await Promise.all([getAdvisorSummaries(), listTasks()]);
    setAdvisors(advisorData);
    setTasks(taskData);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg('');
    try {
      await inviteAdvisor(inviteEmail.trim());
      setInviteMsg(`Invite sent to ${inviteEmail.trim()}.`);
      setInviteEmail('');
      load();
    } catch (e: any) {
      setInviteMsg(`Error: ${e.message}`);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (member: AdvisorSummary) => {
    if (!window.confirm(`Remove ${member.email} from the team?`)) return;
    await removeMember(member.id);
    load();
  };

  const activeAdvisors = advisors.filter(a => a.role === 'advisor' && a.status === 'active');
  const pendingAdvisors = advisors.filter(a => a.status === 'pending');
  const totalClients = activeAdvisors.reduce((s, a) => s + a.clientCount, 0);
  const totalOpenTasks = tasks.filter(t => t.status === 'todo').length;

  // Task stats per advisor
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const taskStatsByAdvisor = useMemo(() => {
    const map: Record<string, { open: number; doneThisMonth: number }> = {};
    for (const t of tasks) {
      if (!map[t.assignedTo]) map[t.assignedTo] = { open: 0, doneThisMonth: 0 };
      if (t.status === 'todo') map[t.assignedTo].open++;
      if (t.status === 'done' && t.completedAt && t.completedAt >= monthStart) map[t.assignedTo].doneThisMonth++;
    }
    return map;
  }, [tasks, monthStart]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'team', label: 'Team' },
    { id: 'tasks', label: `Tasks${totalOpenTasks > 0 ? ` (${totalOpenTasks})` : ''}` },
    { id: 'all-clients', label: `All Clients (${totalClients})` },
  ];

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', color: 'var(--text-1)', padding: '28px 32px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Manager Dashboard
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
            {teamStatus?.orgName}
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Active Advisors', value: activeAdvisors.length, color: '#34d399' },
            { label: 'Total Clients', value: totalClients, color: '#60a5fa' },
            { label: 'Open Tasks', value: totalOpenTasks, color: '#fbbf24' },
            { label: 'Pending Invites', value: pendingAdvisors.length, color: '#a78bfa' },
          ].map(card => (
            <div key={card.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '18px 22px',
            }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: card.color, marginBottom: 4 }}>{card.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 18px', fontSize: 13, fontWeight: 600,
              border: 'none', background: 'none', cursor: 'pointer',
              color: tab === t.id ? '#10b981' : 'var(--text-4)',
              borderBottom: tab === t.id ? '2px solid #10b981' : '2px solid transparent',
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        {/* Modals */}
        {selectedAdvisor && (
          <AdvisorClientsDrawer
            advisor={selectedAdvisor}
            allAdvisors={advisors}
            onClose={() => setSelectedAdvisor(null)}
            onTransferred={load}
          />
        )}
        {assignTarget && (
          <AssignTaskModal
            advisor={assignTarget}
            onClose={() => setAssignTarget(null)}
            onCreated={() => { setAssignTarget(null); load(); }}
          />
        )}

        {/* Team tab */}
        {tab === 'team' && (
          <>
            {/* Invite advisor */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '18px 22px', marginBottom: 24,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>Invite Advisor</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  placeholder="advisor@example.com"
                  style={{ flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-1)', fontSize: 13, outline: 'none' }}
                />
                <button onClick={handleInvite} disabled={inviting} style={{
                  padding: '10px 20px', background: '#10b981', border: 'none', borderRadius: 10,
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: inviting ? 'not-allowed' : 'pointer', opacity: inviting ? 0.6 : 1,
                }}>
                  {inviting ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
              {inviteMsg && (
                <div style={{ marginTop: 10, fontSize: 12, color: inviteMsg.startsWith('Error') ? '#f87171' : '#34d399' }}>
                  {inviteMsg}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 8, lineHeight: 1.5 }}>
                Added automatically when they sign in with this email.
              </div>
            </div>

            {/* Team member list */}
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>Team Members</div>
            {loading ? (
              <div style={{ color: 'var(--text-4)', fontSize: 13 }}>Loading team…</div>
            ) : advisors.length === 0 ? (
              <div style={{ color: 'var(--text-4)', fontSize: 13 }}>No team members yet.</div>
            ) : (
              <>
                <div style={{
                  display: 'grid', gridTemplateColumns: '2fr 70px 80px 80px 100px 1fr',
                  gap: 12, padding: '6px 20px', marginBottom: 4,
                }}>
                  {['Member', 'Clients', 'Open tasks', 'Done/mo', 'Last active', ''].map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                  ))}
                </div>
                {advisors.map(m => (
                  <AdvisorRow
                    key={m.id}
                    member={m}
                    taskStats={taskStatsByAdvisor[m.userId ?? ''] ?? { open: 0, doneThisMonth: 0 }}
                    onViewClients={() => setSelectedAdvisor(m)}
                    onAssignTask={() => setAssignTarget(m)}
                    onRemove={() => handleRemove(m)}
                  />
                ))}
              </>
            )}
          </>
        )}

        {tab === 'tasks' && <TeamTasksTab advisors={advisors} />}
        {tab === 'all-clients' && <AllClientsTab advisors={advisors} />}
      </div>
    </div>
  );
}

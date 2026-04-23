import React, { useEffect, useState, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import {
  AdvisorSummary, getAdvisorSummaries, getAdvisorProfiles,
  inviteAdvisor, removeMember,
  dissolveOrganization, createOrganization,
} from '../services/teamService';
import { createTask } from '../services/taskService';

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
  preselectedClientId?: string;
  preselectedClientName?: string;
  onClose: () => void;
  onCreated: () => void;
}

function AssignTaskModal({ advisor, preselectedClientId, preselectedClientName, onClose, onCreated }: AssignTaskModalProps) {
  const [title, setTitle] = useState('');
  const [clientProfiles, setClientProfiles] = useState<any[]>([]);
  const [clientId, setClientId] = useState(preselectedClientId ?? '');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
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
        clientName: client?.name ?? preselectedClientName ?? undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        priority,
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
            <label style={labelStyle}>Priority</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['normal', 'urgent'] as const).map(p => (
                <button key={p} type="button" onClick={() => setPriority(p)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', border: '1px solid',
                  background: priority === p ? (p === 'urgent' ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.12)') : 'transparent',
                  color: priority === p ? (p === 'urgent' ? '#f87171' : '#34d399') : 'var(--text-4)',
                  borderColor: priority === p ? (p === 'urgent' ? 'rgba(248,113,113,0.4)' : 'rgba(52,211,153,0.3)') : 'var(--border)',
                }}>
                  {p === 'urgent' ? '🔴 Urgent' : '⚪ Normal'}
                </button>
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

// ─── Advisor clients drawer ───────────────────────────────────────────────────

interface AdvisorClientsDrawerProps {
  advisor: AdvisorSummary;
  onClose: () => void;
  onAssignTask: () => void;
}

function AdvisorClientsDrawer({ advisor, onClose, onAssignTask }: AdvisorClientsDrawerProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!advisor.userId) return;
    setLoading(true);
    getAdvisorProfiles(advisor.userId)
      .then(setProfiles)
      .finally(() => setLoading(false));
  }, [advisor.userId]);

  useEffect(() => { load(); }, [load]);

  return (
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Advisor
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{advisor.email}</div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>
              {profiles.length} client{profiles.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onAssignTask} style={{
              fontSize: 12, padding: '6px 12px', borderRadius: 8, fontWeight: 600,
              background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)',
              color: '#60a5fa', cursor: 'pointer',
            }}>
              + Assign task
            </button>
            <button onClick={onClose} style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '6px 12px', cursor: 'pointer', color: 'var(--text-2)', fontSize: 13,
            }}>✕ Close</button>
          </div>
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
                  <span style={{ fontSize: 11, color: 'var(--text-5)' }}>{daysSince(p.updated_at)}</span>
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
  );
}

// ─── Advisor row ──────────────────────────────────────────────────────────────

interface AdvisorRowProps {
  member: AdvisorSummary;
  onViewClients: () => void;
  onAssignTask: () => void;
  onRemove: () => void;
}

function AdvisorRow({ member, onViewClients, onAssignTask, onRemove }: AdvisorRowProps) {
  const isManager = member.role === 'manager';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 70px 120px 1fr',
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { teamStatus, loaded: teamLoaded, refresh: refreshTeam } = useTeam();
  const [advisors, setAdvisors] = useState<AdvisorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState<AdvisorSummary | null>(null);
  const [assignTarget, setAssignTarget] = useState<AdvisorSummary | null>(null);

  // No-team setup state
  const [orgName, setOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Must be declared before early return (Rules of Hooks)
  const [dissolving, setDissolving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setAdvisors(await getAdvisorSummaries());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!teamLoaded) {
    return (
      <div style={{ minHeight: '100%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 32 }}>🔥</div>
      </div>
    );
  }

  // Advisors who navigate to /team directly should not see org admin UI
  if (teamStatus && teamStatus.role !== 'manager') {
    return (
      <div style={{ minHeight: '100%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>Manager access only</div>
          <div style={{ fontSize: 13, color: 'var(--text-4)' }}>This page is for team managers.</div>
        </div>
      </div>
    );
  }

  if (!teamStatus) {
    return (
      <div style={{ minHeight: '100%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👔</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>Set up your team</div>
          <div style={{ fontSize: 14, color: 'var(--text-4)', lineHeight: 1.6, marginBottom: 32 }}>
            Give your team a name — this is usually your agency or practice name.
          </div>
          <input
            type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateOrg()}
            placeholder="e.g. Zenith Advisory" autoFocus
            style={{
              width: '100%', boxSizing: 'border-box', marginBottom: 12,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '13px 16px', fontSize: 15,
              color: 'var(--text-1)', outline: 'none',
            }}
          />
          {createError && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{createError}</div>}
          <button onClick={handleCreateOrg} disabled={creating} style={{
            width: '100%', padding: '13px 0', borderRadius: 10,
            background: creating ? 'rgba(16,185,129,0.4)' : '#10b981',
            border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: creating ? 'not-allowed' : 'pointer',
          }}>
            {creating ? 'Creating…' : 'Create Team'}
          </button>
        </div>
      </div>
    );
  }

  function handleCreateOrg() {
    if (!orgName.trim()) { setCreateError('Enter a team name.'); return; }
    setCreating(true); setCreateError('');
    createOrganization(orgName.trim())
      .then(() => refreshTeam())
      .catch((e: any) => { setCreateError(e.message || 'Something went wrong.'); setCreating(false); });
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true); setInviteMsg('');
    try {
      await inviteAdvisor(inviteEmail.trim());
      setInviteMsg(`Invite sent to ${inviteEmail.trim()}.`);
      setInviteEmail(''); load();
    } catch (e: any) { setInviteMsg(`Error: ${e.message}`); }
    finally { setInviting(false); }
  };

  const handleRemove = async (member: AdvisorSummary) => {
    if (!window.confirm(`Remove ${member.email} from the team?`)) return;
    await removeMember(member.id); load();
  };

  const handleDissolve = async () => {
    if (!window.confirm(`Delete the entire team "${teamStatus?.orgName}"?\n\nAll members are removed. Each advisor keeps their own client profiles — you will lose visibility into them. This cannot be undone.`)) return;
    setDissolving(true);
    try { await dissolveOrganization(); window.location.href = '/'; }
    catch (e: any) { alert(`Failed to delete team: ${e.message}`); setDissolving(false); }
  };

  const pendingCount = advisors.filter(a => a.status === 'pending').length;

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', color: 'var(--text-1)', padding: '28px 32px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Team</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)' }}>{teamStatus?.orgName}</div>
          {pendingCount > 0 && (
            <div style={{ fontSize: 12, color: '#fbbf24', marginTop: 4 }}>
              {pendingCount} pending invite{pendingCount !== 1 ? 's' : ''} — advisors will appear once they sign in
            </div>
          )}
        </div>

        {/* Modals */}
        {selectedAdvisor && (
          <AdvisorClientsDrawer
            advisor={selectedAdvisor}
            onClose={() => setSelectedAdvisor(null)}
            onAssignTask={() => { setAssignTarget(selectedAdvisor); setSelectedAdvisor(null); }}
          />
        )}
        {assignTarget && (
          <AssignTaskModal
            advisor={assignTarget}
            onClose={() => setAssignTarget(null)}
            onCreated={() => { setAssignTarget(null); load(); }}
          />
        )}

        {/* Invite */}
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
            Advisor joins automatically when they sign in with this email.
          </div>
        </div>

        {/* Members */}
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>Members</div>
        {loading ? (
          <div style={{ color: 'var(--text-4)', fontSize: 13 }}>Loading…</div>
        ) : advisors.length === 0 ? (
          <div style={{ color: 'var(--text-4)', fontSize: 13 }}>No team members yet.</div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 70px 120px 1fr',
              gap: 12, padding: '6px 20px', marginBottom: 4,
            }}>
              {['Member', 'Clients', 'Last active', ''].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
              ))}
            </div>
            {advisors.map(m => (
              <AdvisorRow
                key={m.id}
                member={m}
                onViewClients={() => setSelectedAdvisor(m)}
                onAssignTask={() => setAssignTarget(m)}
                onRemove={() => handleRemove(m)}
              />
            ))}
          </>
        )}

        {/* Danger zone */}
        <div style={{ marginTop: 48, borderTop: '1px solid rgba(239,68,68,0.2)', paddingTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Danger zone
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 12, padding: '16px 20px',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>Delete this team</div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>Each member keeps their own client profiles. You will lose visibility into advisors' profiles.</div>
            </div>
            <button onClick={handleDissolve} disabled={dissolving} style={{
              padding: '8px 18px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.4)',
              background: 'transparent', color: '#f87171',
              fontSize: 13, fontWeight: 700, cursor: dissolving ? 'not-allowed' : 'pointer',
              opacity: dissolving ? 0.5 : 1, whiteSpace: 'nowrap',
            }}>
              {dissolving ? 'Deleting…' : 'Delete team'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

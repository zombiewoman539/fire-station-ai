import React, { useEffect, useState, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import {
  AdvisorSummary, getAdvisorSummaries, getAdvisorProfiles,
  inviteAdvisor, removeMember,
} from '../services/teamService';

function daysSince(iso: string | null): string {
  if (!iso) return '—';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function statusColor(lastActive: string | null): string {
  if (!lastActive) return '#6b7280';
  const days = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);
  if (days <= 7) return '#34d399';
  if (days <= 30) return '#fbbf24';
  return '#f87171';
}

function AdvisorRow({
  member,
  onViewClients,
  onRemove,
}: {
  member: AdvisorSummary;
  onViewClients: (m: AdvisorSummary) => void;
  onRemove: (m: AdvisorSummary) => void;
}) {
  const isManager = member.role === 'manager';

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '2fr 80px 100px 90px 140px',
      alignItems: 'center', gap: 12,
      padding: '14px 20px', background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 12, marginBottom: 8,
    }}>
      {/* Name / email */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>
            {member.email}
          </span>
          {isManager && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#34d399',
              background: 'rgba(16,185,129,0.12)', padding: '1px 7px', borderRadius: 20,
            }}>Manager</span>
          )}
          {member.status === 'pending' && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#fbbf24',
              background: 'rgba(251,191,36,0.12)', padding: '1px 7px', borderRadius: 20,
            }}>Pending</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-5)' }}>
          Joined {new Date(member.createdAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* Client count */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>{member.clientCount}</div>
        <div style={{ fontSize: 10, color: 'var(--text-5)' }}>clients</div>
      </div>

      {/* Last active */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: statusColor(member.lastActive) }}>
          {daysSince(member.lastActive)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-5)' }}>last active</div>
      </div>

      {/* Role badge */}
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: isManager ? '#34d399' : '#60a5fa',
          background: isManager ? 'rgba(16,185,129,0.1)' : 'rgba(96,165,250,0.1)',
          padding: '4px 10px', borderRadius: 20,
        }}>
          {isManager ? '👔 Manager' : '💼 Advisor'}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {!isManager && member.status === 'active' && (
          <button
            onClick={() => onViewClients(member)}
            style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 8,
              background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)',
              color: '#34d399', cursor: 'pointer', fontWeight: 600,
            }}
          >
            View clients
          </button>
        )}
        {!isManager && (
          <button
            onClick={() => onRemove(member)}
            style={{
              fontSize: 12, padding: '5px 10px', borderRadius: 8,
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text-5)', cursor: 'pointer',
            }}
          >✕</button>
        )}
      </div>
    </div>
  );
}

function AdvisorClientsDrawer({
  advisor,
  onClose,
}: {
  advisor: AdvisorSummary;
  onClose: () => void;
}) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!advisor.userId) return;
    getAdvisorProfiles(advisor.userId)
      .then(setProfiles)
      .finally(() => setLoading(false));
  }, [advisor.userId]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1500, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: 440, height: '100%', background: 'var(--surface)',
        borderLeft: '1px solid var(--border)', padding: '28px 24px',
        overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Advisor</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{advisor.email}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '6px 12px', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13,
          }}>✕ Close</button>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-4)', fontSize: 13 }}>Loading clients…</div>
        ) : profiles.length === 0 ? (
          <div style={{ color: 'var(--text-4)', fontSize: 13 }}>No clients yet.</div>
        ) : (
          profiles.map(p => {
            const meta = (p.meta as any) ?? {};
            const daysSinceUpdate = Math.floor((Date.now() - new Date(p.updated_at).getTime()) / 86400000);
            return (
              <div key={p.id} style={{
                background: 'var(--inset)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 16px', marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>{p.name}</div>
                  <span style={{ fontSize: 11, color: daysSinceUpdate <= 7 ? '#34d399' : 'var(--text-5)' }}>
                    {daysSince(p.updated_at)}
                  </span>
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

export default function ManagerDashboard() {
  const { teamStatus } = useTeam();
  const [advisors, setAdvisors] = useState<AdvisorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState<AdvisorSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAdvisorSummaries();
    setAdvisors(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg('');
    try {
      await inviteAdvisor(inviteEmail.trim());
      setInviteMsg(`Invite sent to ${inviteEmail.trim()}. They'll be added automatically when they sign in.`);
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

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
          Manager Dashboard
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
          {teamStatus?.orgName}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-4)' }}>
          Bird's-eye view of your team's client portfolios
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Active Advisors', value: activeAdvisors.length, color: '#34d399' },
          { label: 'Total Clients', value: totalClients, color: '#60a5fa' },
          { label: 'Pending Invites', value: pendingAdvisors.length, color: '#fbbf24' },
        ].map(card => (
          <div key={card.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '20px 24px',
          }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: card.color, marginBottom: 4 }}>{card.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Invite advisor */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 28,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>
          Invite Advisor
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
            placeholder="advisor@example.com"
            style={{
              flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
              borderRadius: 10, padding: '10px 14px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
            }}
          />
          <button onClick={handleInvite} disabled={inviting} style={{
            padding: '10px 20px', background: '#10b981', border: 'none', borderRadius: 10,
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: inviting ? 'not-allowed' : 'pointer',
            opacity: inviting ? 0.6 : 1,
          }}>
            {inviting ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
        {inviteMsg && (
          <div style={{
            marginTop: 10, fontSize: 12, lineHeight: 1.5,
            color: inviteMsg.startsWith('Error') ? '#f87171' : '#34d399',
          }}>{inviteMsg}</div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 8, lineHeight: 1.5 }}>
          The advisor will be automatically added to your team when they sign in with this email address.
        </div>
      </div>

      {/* Team list */}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>
        Team Members
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-4)', fontSize: 13 }}>Loading team…</div>
      ) : advisors.length === 0 ? (
        <div style={{ color: 'var(--text-4)', fontSize: 13 }}>No team members yet. Invite your first advisor above.</div>
      ) : (
        <>
          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 80px 100px 90px 140px',
            gap: 12, padding: '6px 20px', marginBottom: 4,
          }}>
            {['Member', 'Clients', 'Last active', 'Role', ''].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {h}
              </div>
            ))}
          </div>
          {advisors.map(m => (
            <AdvisorRow
              key={m.id}
              member={m}
              onViewClients={setSelectedAdvisor}
              onRemove={handleRemove}
            />
          ))}
        </>
      )}

      {selectedAdvisor && (
        <AdvisorClientsDrawer
          advisor={selectedAdvisor}
          onClose={() => setSelectedAdvisor(null)}
        />
      )}
    </div>
  );
}

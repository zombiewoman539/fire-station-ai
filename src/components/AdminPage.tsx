import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { adminListUsers, adminSetSubscription, AdminUser } from '../services/adminService';
import { Tier } from '../services/subscriptionService';

const ADMIN_USER_ID = 'ef44569c-5216-4847-9b19-3b7797d13ea9';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function TierBadge({ tier, status, trialEndsAt }: { tier: string; status: string; trialEndsAt: string | null }) {
  const isTrialing = status === 'trialing' && trialEndsAt && new Date(trialEndsAt) > new Date();
  const color =
    isTrialing ? '#a78bfa' :
    tier === 'team' ? '#34d399' :
    tier === 'pro' ? '#60a5fa' :
    'var(--text-5)';
  const label = isTrialing ? `${tier} (trial)` : tier;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
      background: `color-mix(in srgb, ${color} 15%, transparent)`,
      color,
      border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      textTransform: 'capitalize',
    }}>
      {label}
    </span>
  );
}

interface EditDrawerProps {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}

function EditDrawer({ user, onClose, onSaved }: EditDrawerProps) {
  const [tier, setTier] = useState<Tier>(user.tier as Tier);
  const [mode, setMode] = useState<'active' | 'trialing' | 'starter'>(
    user.status === 'trialing' ? 'trialing' : user.status === 'active' ? 'active' : 'starter'
  );
  const [trialDays, setTrialDays] = useState(14);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const trialEndsDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + trialDays);
    return d.toISOString().split('T')[0];
  })();

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (mode === 'starter') {
        await adminSetSubscription(user.userId, 'starter', 'none', null);
      } else if (mode === 'active') {
        await adminSetSubscription(user.userId, tier, 'active', null);
      } else {
        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + trialDays);
        await adminSetSubscription(user.userId, tier, 'trialing', endsAt.toISOString());
      }
      setSuccess('Saved!');
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '32px 36px', width: '100%', maxWidth: 480,
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Edit subscription</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>{user.email}</div>
        </div>

        {/* Mode selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>Access type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['starter', 'active', 'trialing'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 12, fontWeight: 700,
                border: `1px solid ${mode === m ? '#10b981' : 'var(--border)'}`,
                background: mode === m ? 'rgba(16,185,129,0.12)' : 'transparent',
                color: mode === m ? '#10b981' : 'var(--text-4)', cursor: 'pointer',
                textTransform: 'capitalize',
              }}>
                {m === 'starter' ? 'Downgrade' : m === 'active' ? 'Full access' : 'Trial'}
              </button>
            ))}
          </div>
        </div>

        {/* Tier — shown unless downgrading */}
        {mode !== 'starter' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>Tier</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['pro', 'team'] as Tier[]).map(t => (
                <button key={t} onClick={() => setTier(t)} style={{
                  flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 12, fontWeight: 700,
                  border: `1px solid ${tier === t ? '#60a5fa' : 'var(--border)'}`,
                  background: tier === t ? 'rgba(96,165,250,0.12)' : 'transparent',
                  color: tier === t ? '#60a5fa' : 'var(--text-4)', cursor: 'pointer',
                  textTransform: 'capitalize',
                }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trial length — shown only for trialing */}
        {mode === 'trialing' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>
              Trial length — {trialDays} days (expires {trialEndsDate})
            </label>
            <input
              type="range" min={3} max={90} value={trialDays}
              onChange={e => setTrialDays(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#a78bfa' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-5)', marginTop: 4 }}>
              <span>3 days</span><span>30 days</span><span>90 days</span>
            </div>
          </div>
        )}

        {/* Summary */}
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6,
        }}>
          {mode === 'starter' && 'User will be downgraded to the free Starter plan.'}
          {mode === 'active' && `User gets full ${tier.charAt(0).toUpperCase() + tier.slice(1)} access with no expiry.`}
          {mode === 'trialing' && `User gets ${tier.charAt(0).toUpperCase() + tier.slice(1)} access for ${trialDays} days, expiring ${trialEndsDate}. After that they automatically drop to Starter.`}
        </div>

        {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {success && <div style={{ color: '#34d399', fontSize: 13, marginBottom: 12 }}>{success}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 9, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '9px 24px', borderRadius: 9, border: 'none',
            background: saving ? 'rgba(16,185,129,0.4)' : '#10b981',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Saving…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminListUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (userId === ADMIN_USER_ID) load();
    else if (userId !== null) setLoading(false);
  }, [userId, load]);

  if (userId === null || loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ fontSize: 32 }}>🔥</div>
      </div>
    );
  }

  if (userId !== ADMIN_USER_ID) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-4)', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Not found</div>
      </div>
    );
  }

  const filtered = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: users.length,
    pro: users.filter(u => u.tier === 'pro' && u.status === 'active').length,
    team: users.filter(u => u.tier === 'team' && u.status === 'active').length,
    trialing: users.filter(u => u.status === 'trialing' && u.trialEndsAt && new Date(u.trialEndsAt) > new Date()).length,
  };

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', color: 'var(--text-1)', padding: '28px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {editUser && (
          <EditDrawer user={editUser} onClose={() => setEditUser(null)} onSaved={load} />
        )}

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            🔐 Admin
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)' }}>User Management</div>
          <div style={{ fontSize: 13, color: 'var(--text-4)', marginTop: 4 }}>
            Manage tiers and trials. Changes take effect immediately on next page load.
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total users', value: stats.total, color: 'var(--text-2)' },
            { label: 'Pro', value: stats.pro, color: '#60a5fa' },
            { label: 'Team', value: stats.team, color: '#34d399' },
            { label: 'On trial', value: stats.trialing, color: '#a78bfa' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '18px 22px',
            }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '11px 16px', borderRadius: 10, marginBottom: 16,
            border: '1px solid var(--border)', background: 'var(--bg)',
            color: 'var(--text-1)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
          }}
        />

        {error && (
          <div style={{ color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 120px 100px 110px 80px',
          gap: 12, padding: '6px 16px', marginBottom: 4,
        }}>
          {['Email', 'Tier', 'Last active', 'Trial ends', ''].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
          ))}
        </div>

        {/* User rows */}
        {filtered.map(u => {
          const trialExpired = u.trialEndsAt && new Date(u.trialEndsAt) <= new Date();
          return (
            <div key={u.userId} style={{
              display: 'grid', gridTemplateColumns: '2fr 120px 100px 110px 80px',
              alignItems: 'center', gap: 12,
              padding: '12px 16px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, marginBottom: 6,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{u.email}</div>
                <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 2 }}>
                  Joined {formatDate(u.createdAt)}
                </div>
              </div>
              <div><TierBadge tier={u.tier} status={u.status} trialEndsAt={u.trialEndsAt} /></div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{formatDate(u.lastSignInAt)}</div>
              <div style={{ fontSize: 12, color: trialExpired ? '#f87171' : u.trialEndsAt ? '#a78bfa' : 'var(--text-5)' }}>
                {u.trialEndsAt ? formatDate(u.trialEndsAt) + (trialExpired ? ' ✕' : '') : '—'}
              </div>
              <button
                onClick={() => setEditUser(u)}
                style={{
                  padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-3)', cursor: 'pointer',
                }}
              >
                Edit
              </button>
            </div>
          );
        })}

        {filtered.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-4)', fontSize: 14 }}>
            No users found.
          </div>
        )}

        {/* TODO: Stripe trials — push trial directly through Stripe API so conversion to paid is automatic */}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { createOrganization } from '../services/teamService';
import { useTeam } from '../contexts/TeamContext';

const SOLO_KEY = 'fire-solo-mode';

interface Props {
  onDismiss: () => void;
}

export default function TeamOnboarding({ onDismiss }: Props) {
  const { refresh } = useTeam();
  const [view, setView] = useState<'menu' | 'create'>('menu');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!orgName.trim()) { setError('Enter a team name.'); return; }
    setLoading(true);
    setError('');
    try {
      await createOrganization(orgName.trim());
      await refresh();
      onDismiss();
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleSolo = () => {
    localStorage.setItem(SOLO_KEY, '1');
    onDismiss();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 480, background: 'var(--surface)', borderRadius: 20,
        border: '1px solid var(--border)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        padding: '36px 40px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔥</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
            Welcome to FIRE Station
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-4)', lineHeight: 1.6 }}>
            Are you using FIRE Station solo, or as part of a team?
          </div>
        </div>

        {view === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Create team */}
            <button onClick={() => setView('create')} style={{
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)',
              borderRadius: 14, padding: '18px 20px', cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.1)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28 }}>👔</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#34d399', marginBottom: 4 }}>
                    I'm a Manager
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-4)', lineHeight: 1.5 }}>
                    Create a new team and invite your financial advisors. You'll get a bird's-eye view of all their clients.
                  </div>
                </div>
              </div>
            </button>

            {/* Join as advisor (auto-detected) */}
            <button onClick={handleSolo} style={{
              background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)',
              borderRadius: 14, padding: '18px 20px', cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(96,165,250,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(96,165,250,0.08)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28 }}>💼</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>
                    I'm an Advisor
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-4)', lineHeight: 1.5 }}>
                    If your manager has already invited you, you've been automatically added. Otherwise continue solo.
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {view === 'create' && (
          <div>
            <button onClick={() => setView('menu')} style={{
              background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 13,
              cursor: 'pointer', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6,
            }}>← Back</button>

            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 20 }}>
              Name your team
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 16, lineHeight: 1.5 }}>
              This is usually your agency or team name — e.g. "Zenith Advisory" or "Team Alpha".
            </div>

            <input
              type="text"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Zenith Advisory"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                borderRadius: 10, padding: '12px 14px', fontSize: 15,
                color: 'var(--text-1)', outline: 'none', marginBottom: 8,
              }}
            />
            {error && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 12 }}>{error}</div>}

            <button onClick={handleCreate} disabled={loading} style={{
              width: '100%', padding: '13px 0', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'rgba(16,185,129,0.4)' : '#10b981',
              border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
              marginTop: 8, transition: 'background 0.15s',
            }}>
              {loading ? 'Creating…' : 'Create Team'}
            </button>
          </div>
        )}

        {/* Solo skip link */}
        {view === 'menu' && (
          <button onClick={handleSolo} style={{
            display: 'block', width: '100%', marginTop: 20, background: 'none', border: 'none',
            color: 'var(--text-5)', fontSize: 12, cursor: 'pointer', textAlign: 'center',
          }}>
            Continue solo — I'll set this up later
          </button>
        )}
      </div>
    </div>
  );
}

export function shouldShowOnboarding(): boolean {
  return localStorage.getItem(SOLO_KEY) !== '1';
}

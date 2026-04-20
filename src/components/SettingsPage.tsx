import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useTheme } from '../App';
import { useTeam } from '../contexts/TeamContext';
import { createOrganization, inviteAdvisor, leaveTeam } from '../services/teamService';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--text-4)',
        marginBottom: 12, paddingBottom: 8,
        borderBottom: '1px solid var(--border)',
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </div>
    </div>
  );
}

function Row({
  label, description, children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px',
      background: 'var(--surface)',
      borderRadius: 10,
      gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: description ? 2 : 0 }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.5 }}>{description}</div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: checked ? '#10b981' : 'var(--border)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

export default function SettingsPage() {
  const [theme, toggleTheme] = useTheme();
  const [email, setEmail] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
  const { teamStatus, loaded: teamLoaded, refresh: refreshTeam } = useTeam();

  // Display preferences — stored in localStorage
  const [showCash, setShowCashPref] = useState(
    () => localStorage.getItem('fa-show-cash') !== 'false'
  );
  const [sidebarOpen, setSidebarOpenPref] = useState(
    () => localStorage.getItem('fa-sidebar-open') === 'true'
  );

  // Team section state
  const [teamView, setTeamView] = useState<'idle' | 'create'>('idle');
  const [orgName, setOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '');
    });
  }, []);

  const handleShowCash = (v: boolean) => {
    setShowCashPref(v);
    localStorage.setItem('fa-show-cash', v ? 'true' : 'false');
  };

  const handleSidebarOpen = (v: boolean) => {
    setSidebarOpenPref(v);
    localStorage.setItem('fa-sidebar-open', v ? 'true' : 'false');
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleCreateTeam = async () => {
    if (!orgName.trim()) { setCreateError('Enter a team name.'); return; }
    setCreating(true);
    setCreateError('');
    try {
      await createOrganization(orgName.trim());
      // Clear the solo-mode flag so the team tab appears in the navbar
      localStorage.removeItem('fire-solo-mode');
      await refreshTeam();
      setTeamView('idle');
      setOrgName('');
    } catch (e: any) {
      setCreateError(e.message || 'Something went wrong.');
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg('');
    try {
      await inviteAdvisor(inviteEmail.trim());
      setInviteMsg(`Invite sent to ${inviteEmail.trim()}.`);
      setInviteEmail('');
    } catch (e: any) {
      setInviteMsg(`Error: ${e.message}`);
    } finally {
      setInviting(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!window.confirm(`Leave ${teamStatus?.orgName ?? 'your team'}? You will need to be re-invited to rejoin.`)) return;
    setLeaving(true);
    try {
      await leaveTeam();
      localStorage.removeItem('fire-solo-mode');
      await refreshTeam();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      background: 'var(--bg)',
      padding: '32px 0',
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px' }}>
        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', margin: 0, marginBottom: 4 }}>
            Settings
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-4)', margin: 0 }}>
            Manage your account and app preferences.
          </p>
        </div>

        {/* Account */}
        <Section title="Account">
          <Row
            label="Signed in as"
            description={email || 'Loading...'}
          >
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8,
                color: '#f87171',
                fontSize: 12, fontWeight: 600,
                padding: '7px 14px',
                cursor: signingOut ? 'not-allowed' : 'pointer',
                opacity: signingOut ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </Row>
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <Row
            label="Theme"
            description="Switch between dark and light mode."
          >
            <button
              onClick={toggleTheme}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-2)',
                fontSize: 12, fontWeight: 600,
                padding: '7px 14px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>
          </Row>
        </Section>

        {/* Team */}
        <Section title="Team">
          {!teamLoaded ? (
            <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-4)' }}>Loading…</div>
          ) : !teamStatus ? (
            /* ── Solo: offer to create a team ── */
            teamView === 'create' ? (
              <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '16px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 12 }}>Name your team</div>
                <input
                  type="text"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                  placeholder="e.g. Zenith Advisory"
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                    borderRadius: 8, padding: '10px 12px', fontSize: 13,
                    color: 'var(--text-1)', outline: 'none', marginBottom: 8,
                  }}
                />
                {createError && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>{createError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleCreateTeam}
                    disabled={creating}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 8,
                      background: creating ? 'rgba(16,185,129,0.4)' : '#10b981',
                      border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                      cursor: creating ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {creating ? 'Creating…' : 'Create Team'}
                  </button>
                  <button
                    onClick={() => { setTeamView('idle'); setOrgName(''); setCreateError(''); }}
                    style={{
                      padding: '9px 16px', borderRadius: 8, background: 'none',
                      border: '1px solid var(--border)', color: 'var(--text-4)',
                      fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Row label="Team" description="You're currently using FIRE Station solo.">
                <button
                  onClick={() => setTeamView('create')}
                  style={{
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: 8, color: '#34d399', fontSize: 12, fontWeight: 600,
                    padding: '7px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  Create a Team
                </button>
              </Row>
            )
          ) : teamStatus.role === 'manager' ? (
            /* ── Manager: show org + quick invite ── */
            <>
              <Row label={teamStatus.orgName} description="You are the manager of this team.">
                <button
                  onClick={() => navigate('/team')}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text-2)', fontSize: 12, fontWeight: 600,
                    padding: '7px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  Manage team →
                </button>
              </Row>
              <div style={{
                background: 'var(--surface)', borderRadius: 10, padding: '14px 16px', marginTop: 2,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>Quick invite</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInvite()}
                    placeholder="advisor@example.com"
                    style={{
                      flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                      borderRadius: 8, padding: '8px 12px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleInvite}
                    disabled={inviting}
                    style={{
                      padding: '8px 16px', background: '#10b981', border: 'none', borderRadius: 8,
                      color: '#fff', fontSize: 12, fontWeight: 700,
                      cursor: inviting ? 'not-allowed' : 'pointer', opacity: inviting ? 0.6 : 1,
                    }}
                  >
                    {inviting ? '…' : 'Invite'}
                  </button>
                </div>
                {inviteMsg && (
                  <div style={{
                    marginTop: 8, fontSize: 12,
                    color: inviteMsg.startsWith('Error') ? '#f87171' : '#34d399',
                  }}>{inviteMsg}</div>
                )}
              </div>
            </>
          ) : (
            /* ── Advisor: show org + leave ── */
            <Row label={teamStatus.orgName} description="You are an advisor in this team.">
              <button
                onClick={handleLeaveTeam}
                disabled={leaving}
                style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8, color: '#f87171', fontSize: 12, fontWeight: 600,
                  padding: '7px 14px', cursor: leaving ? 'not-allowed' : 'pointer',
                  opacity: leaving ? 0.6 : 1, whiteSpace: 'nowrap',
                }}
              >
                {leaving ? 'Leaving…' : 'Leave team'}
              </button>
            </Row>
          )}
        </Section>

        {/* Display preferences */}
        <Section title="Display Preferences">
          <Row
            label="Show cash savings on chart"
            description="When on, the Cash Savings bar is visible by default when you open a client."
          >
            <Toggle checked={showCash} onChange={handleShowCash} />
          </Row>
          <Row
            label="Start with client list open"
            description="When on, the left sidebar shows on load. Turn off to maximise the chart area by default."
          >
            <Toggle checked={sidebarOpen} onChange={handleSidebarOpen} />
          </Row>
        </Section>

        {/* About */}
        <Section title="About">
          <Row label="App" description="FIRE Station — Singapore Financial Planning Tool">
            <span style={{ fontSize: 12, color: 'var(--text-5)' }}>v1.0</span>
          </Row>
        </Section>
      </div>
    </div>
  );
}

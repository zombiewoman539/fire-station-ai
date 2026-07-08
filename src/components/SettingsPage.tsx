import React, { useState, useEffect } from 'react';
import { useTheme } from '../App';
import { useLicense } from '../contexts/LicenseContext';

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

function Row({ label, description, children }: { label: string; description?: string; children?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px', background: 'var(--surface)', borderRadius: 10, gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: description ? 2 : 0 }}>
          {label}
        </div>
        {description && <div style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.5 }}>{description}</div>}
      </div>
      {children && <div style={{ flexShrink: 0 }}>{children}</div>}
    </div>
  );
}

export default function SettingsPage() {
  const [theme, toggleTheme] = useTheme();
  const { tier, licenseValid, expiresAt, loaded } = useLicense();
  const [sidebarOpen, setSidebarOpenPref] = useState(
    () => localStorage.getItem('fa-sidebar-open') === 'true'
  );
  const [showCash, setShowCashPref] = useState(
    () => localStorage.getItem('fa-show-cash') !== 'false'
  );

  // Password change state
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // Backup state
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    fetch('/api/backup/status')
      .then(r => r.json())
      .then(d => setLastUpdated(d.lastUpdated ?? null))
      .catch(() => {});
  }, []);

  const handleSidebarOpen = (v: boolean) => {
    setSidebarOpenPref(v);
    localStorage.setItem('fa-sidebar-open', v ? 'true' : 'false');
  };

  const handleShowCash = (v: boolean) => {
    setShowCashPref(v);
    localStorage.setItem('fa-show-cash', v ? 'true' : 'false');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (newPw.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwSuccess(true);
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
        setTimeout(() => { setPwSuccess(false); setShowPwForm(false); }, 2000);
      } else {
        setPwError(data.error || 'Failed to change password');
      }
    } catch {
      setPwError('Server error — please try again');
    } finally {
      setPwLoading(false);
    }
  };

  const handleExportBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await fetch('/api/backup/export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1]
        ?? `firestation-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore — user will notice the download didn't happen
    } finally {
      setBackupLoading(false);
    }
  };

  const tierLabel = tier ? (tier.charAt(0).toUpperCase() + tier.slice(1)) : 'Pro';

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)', padding: '32px 0' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', margin: 0, marginBottom: 4 }}>
            Settings
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-4)', margin: 0 }}>
            Manage your license, password, and app preferences.
          </p>
        </div>

        {/* License */}
        <Section title="License">
          <Row
            label={`${tierLabel} plan`}
            description={
              licenseValid
                ? expiresAt ? `Expires ${new Date(expiresAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Active'
                : 'License not verified — check your internet connection'
            }
          >
            <span style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              background: licenseValid ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
              color: licenseValid ? '#34d399' : '#f87171',
              border: `1px solid ${licenseValid ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              {licenseValid ? 'Active' : 'Inactive'}
            </span>
          </Row>
        </Section>

        {/* Security */}
        <Section title="Security">
          {!showPwForm ? (
            <Row label="Password" description="Change your local access password">
              <button
                onClick={() => setShowPwForm(true)}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text-2)', fontSize: 12, fontWeight: 600,
                  padding: '7px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                Change password
              </button>
            </Row>
          ) : (
            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '20px 16px' }}>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Current password"
                  autoFocus
                  style={{
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '10px 12px', fontSize: 13,
                    color: 'var(--text-1)', outline: 'none',
                  }}
                />
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="New password (min 6 characters)"
                  style={{
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '10px 12px', fontSize: 13,
                    color: 'var(--text-1)', outline: 'none',
                  }}
                />
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Confirm new password"
                  style={{
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '10px 12px', fontSize: 13,
                    color: 'var(--text-1)', outline: 'none',
                  }}
                />
                {pwError && <div style={{ color: '#f87171', fontSize: 12 }}>{pwError}</div>}
                {pwSuccess && <div style={{ color: '#34d399', fontSize: 12 }}>Password changed successfully</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="submit"
                    disabled={pwLoading || !currentPw || !newPw || !confirmPw}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                      background: pwLoading ? 'rgba(16,185,129,0.4)' : '#10b981',
                      color: '#fff', fontSize: 13, fontWeight: 700,
                      cursor: pwLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {pwLoading ? 'Saving…' : 'Save password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPwForm(false); setPwError(''); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}
                    style={{
                      padding: '10px 16px', borderRadius: 8,
                      background: 'transparent', border: '1px solid var(--border)',
                      color: 'var(--text-3)', fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <Row label="Theme" description="Switch between dark and light mode.">
            <button
              onClick={toggleTheme}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-2)', fontSize: 12, fontWeight: 600,
                padding: '7px 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>
          </Row>
        </Section>

        {/* Data */}
        <Section title="Data">
          <Row
            label="Export backup"
            description={
              lastUpdated
                ? `Last data change: ${new Date(lastUpdated).toLocaleString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                : 'Download all your client data as a JSON backup file'
            }
          >
            <button
              onClick={handleExportBackup}
              disabled={backupLoading}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-2)', fontSize: 12, fontWeight: 600,
                padding: '7px 14px', cursor: backupLoading ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap', opacity: backupLoading ? 0.6 : 1,
              }}
            >
              {backupLoading ? 'Exporting…' : 'Export backup'}
            </button>
          </Row>
        </Section>

        {/* Display */}
        <Section title="Display">
          <Row label="Show cash column" description="Show cash savings column in client table.">
            <button
              onClick={() => handleShowCash(!showCash)}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: showCash ? '#10b981' : 'var(--border)',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3,
                left: showCash ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </button>
          </Row>
          <Row label="Sidebar open by default" description="Auto-open the client sidebar on load.">
            <button
              onClick={() => handleSidebarOpen(!sidebarOpen)}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: sidebarOpen ? '#10b981' : 'var(--border)',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3,
                left: sidebarOpen ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </button>
          </Row>
        </Section>
      </div>
    </div>
  );
}

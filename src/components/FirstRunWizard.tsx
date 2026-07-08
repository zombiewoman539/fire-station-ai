import React, { useState } from 'react';

type Step = 'license' | 'password';

export default function FirstRunWizard() {
  const [step, setStep] = useState<Step>('license');
  const [licenseKey, setLicenseKey] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [licenseTier, setLicenseTier] = useState('');

  const handleLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKey.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setLicenseTier(data.tier ?? 'Pro');
        setStep('password');
      } else {
        setError(data.error || 'License key not recognised');
      }
    } catch {
      setError('Cannot connect to license server — check your internet connection');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to set password');
      }
    } catch {
      setError('Server error — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
      background: '#0f172a', color: '#f1f5f9',
    }}>
      <div style={{
        width: 400, background: '#1e293b', border: '1px solid #334155',
        borderRadius: 16, padding: 40,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔥</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Welcome to FIRE Station</h1>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            {(['license', 'password'] as Step[]).map((s, i) => (
              <div key={s} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: step === s ? '#10b981' : i < ['license', 'password'].indexOf(step) ? '#10b981' : '#334155',
                transition: 'background 0.2s',
              }} />
            ))}
          </div>
        </div>

        {step === 'license' && (
          <form onSubmit={handleLicenseSubmit}>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
              Enter your license key to activate FIRE Station. You received this key when you subscribed.
            </p>
            <input
              type="text"
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value)}
              placeholder="FS-XXXX-XXXX-XXXX"
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', fontSize: 14,
                background: '#0f172a', border: '1px solid #334155',
                borderRadius: 8, color: '#f1f5f9', outline: 'none',
                boxSizing: 'border-box', marginBottom: 12, letterSpacing: 1,
              }}
            />
            {error && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>{error}</div>}
            <button
              type="submit"
              disabled={loading || !licenseKey.trim()}
              style={{
                width: '100%', padding: '12px', fontSize: 14, fontWeight: 700,
                background: loading ? '#334155' : '#10b981',
                border: 'none', borderRadius: 8, color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Verifying…' : 'Verify License →'}
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            {licenseTier && (
              <div style={{
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 20,
                fontSize: 13, color: '#34d399',
              }}>
                ✓ License verified — {licenseTier} plan activated
              </div>
            )}
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
              Set a password to protect your client data. This is stored locally and only you know it.
            </p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password (min 6 characters)"
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', fontSize: 14,
                background: '#0f172a', border: '1px solid #334155',
                borderRadius: 8, color: '#f1f5f9', outline: 'none',
                boxSizing: 'border-box', marginBottom: 10,
              }}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              style={{
                width: '100%', padding: '12px 14px', fontSize: 14,
                background: '#0f172a', border: '1px solid #334155',
                borderRadius: 8, color: '#f1f5f9', outline: 'none',
                boxSizing: 'border-box', marginBottom: 12,
              }}
            />
            {error && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>{error}</div>}
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              style={{
                width: '100%', padding: '12px', fontSize: 14, fontWeight: 700,
                background: loading ? '#334155' : '#10b981',
                border: 'none', borderRadius: 8, color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Setting up…' : 'Launch FIRE Station →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';

export default function PasswordGate() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid password');
      }
    } catch {
      setError('Cannot connect to server');
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
        width: 360, background: '#1e293b', border: '1px solid #334155',
        borderRadius: 16, padding: 36,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔥</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>FIRE Station</h1>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#94a3b8' }}>Enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{
              width: '100%', padding: '12px 14px', fontSize: 14,
              background: '#0f172a', border: '1px solid #334155',
              borderRadius: 8, color: '#f1f5f9', outline: 'none',
              boxSizing: 'border-box', marginBottom: 12,
            }}
          />
          {error && (
            <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%', padding: '12px', fontSize: 14, fontWeight: 700,
              background: loading ? '#334155' : '#10b981',
              border: 'none', borderRadius: 8, color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Unlocking…' : 'Unlock →'}
          </button>
        </form>
      </div>
    </div>
  );
}

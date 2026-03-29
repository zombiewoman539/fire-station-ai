import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface Props {
  onAuth: () => void;
}

export default function AuthGate({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onAuth();
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setMessage('Check your email to confirm your account, then log in.');
      setMode('login');
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      setError(error.message);
    } else {
      setMessage('Password reset email sent. Check your inbox.');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleSubmit = mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgot;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: '#1f2937',
        borderRadius: 16,
        border: '1px solid #374151',
        padding: '40px 32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #f97316, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
          }}>
            🔥
          </div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>FIRE Goals Mapper</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Singapore Financial Planner</p>
        </div>

        {/* Title */}
        <h2 style={{ color: '#e5e7eb', fontSize: 16, fontWeight: 600, marginBottom: 20, textAlign: 'center' }}>
          {mode === 'login' ? 'Sign in to your account' : mode === 'signup' ? 'Create your account' : 'Reset password'}
        </h2>

        {/* Messages */}
        {message && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#34d399', fontSize: 13,
          }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#f87171', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Google Sign In */}
        {mode !== 'forgot' && (
          <>
            <button
              onClick={handleGoogle}
              disabled={loading}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 8,
                background: '#fff', border: 'none', color: '#374151',
                fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#374151' }} />
              <span style={{ color: '#4b5563', fontSize: 12 }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#374151' }} />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: '#111827', border: '1px solid #374151', color: '#fff',
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {mode !== 'forgot' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  background: '#111827', border: '1px solid #374151', color: '#fff',
                  fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
              background: loading ? '#374151' : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
          </button>
        </form>

        {/* Footer links */}
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13 }}>
                Forgot password?
              </button>
              <div style={{ marginTop: 12, color: '#6b7280' }}>
                Don't have an account?{' '}
                <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
                  style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Sign up
                </button>
              </div>
            </>
          )}
          {mode === 'signup' && (
            <div style={{ color: '#6b7280' }}>
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(''); setMessage(''); }}
                style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Sign in
              </button>
            </div>
          )}
          {mode === 'forgot' && (
            <button onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

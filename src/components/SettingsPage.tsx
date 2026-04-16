import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useTheme } from '../App';

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

  // Display preferences — stored in localStorage
  const [showCash, setShowCashPref] = useState(
    () => localStorage.getItem('fa-show-cash') !== 'false'
  );
  const [sidebarOpen, setSidebarOpenPref] = useState(
    () => localStorage.getItem('fa-sidebar-open') === 'true'
  );

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

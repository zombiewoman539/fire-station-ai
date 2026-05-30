import React, { useState } from 'react';
import { ClientVisibility } from '../../types';
import { generateClientToken, revokeClientToken, saveClientVisibility, DEFAULT_VISIBILITY } from '../../services/clientAccessService';

interface Props {
  profileId: string;
  profileName: string;
  existingToken: string | null | undefined;
  visibility: ClientVisibility;
  onUpdate: (token: string | null, visibility: ClientVisibility) => void;
  onClose: () => void;
}

export default function InviteClientModal({ profileId, profileName, existingToken, visibility, onUpdate, onClose }: Props) {
  const [token, setToken] = useState<string | null>(existingToken ?? null);
  const [vis, setVis] = useState<ClientVisibility>({ ...DEFAULT_VISIBILITY, ...visibility });
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const clientUrl = token
    ? `${window.location.origin}/client-view/${token}`
    : null;

  async function handleGenerate() {
    setGenerating(true);
    try {
      const newToken = await generateClientToken(profileId);
      setToken(newToken);
      onUpdate(newToken, vis);
    } finally { setGenerating(false); }
  }

  async function handleRevoke() {
    if (!window.confirm('Revoke the client link? The client will no longer be able to view the portfolio.')) return;
    setRevoking(true);
    try {
      await revokeClientToken(profileId);
      setToken(null);
      onUpdate(null, vis);
    } finally { setRevoking(false); }
  }

  async function handleSaveVisibility() {
    setSaving(true);
    try {
      await saveClientVisibility(profileId, vis);
      onUpdate(token, vis);
    } finally { setSaving(false); }
  }

  function copyLink() {
    if (!clientUrl) return;
    navigator.clipboard.writeText(clientUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const visFields: { key: keyof ClientVisibility; label: string; desc: string }[] = [
    { key: 'portfolio', label: 'Portfolio & Holdings', desc: 'Shows holdings table, pie charts, and transactions' },
    { key: 'cashflow',  label: 'Cash Flow', desc: 'Monthly income, spending, and savings data' },
    { key: 'loans',     label: 'Loans & Debts', desc: 'Outstanding balances and monthly payments' },
    { key: 'performance', label: 'Performance Chart', desc: '1-year portfolio vs S&P 500 chart' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: 480, maxWidth: 'calc(100vw - 32px)', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Client Access — {profileName}</h2>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-3)' }}>×</button>
        </div>

        {/* Link section */}
        <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Share a read-only link with your client. They can view only the sections you enable below — no login required.
          </p>
          {clientUrl ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                readOnly
                value={clientUrl}
                style={{ flex: 1, padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--input-border)', borderRadius: 7, color: 'var(--text-2)', fontSize: 12, outline: 'none' }}
              />
              <button onClick={copyLink} style={{ padding: '7px 14px', background: copied ? '#16a34a' : 'var(--accent, #4f46e5)', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          ) : (
            <button onClick={handleGenerate} disabled={generating} style={{ padding: '9px 20px', background: 'var(--accent, #4f46e5)', color: '#fff', border: 'none', borderRadius: 8, cursor: generating ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {generating ? 'Generating…' : 'Generate Client Link'}
            </button>
          )}
          {clientUrl && (
            <button onClick={handleRevoke} disabled={revoking} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red, #dc2626)', fontSize: 12, padding: 0, textDecoration: 'underline' }}>
              {revoking ? 'Revoking…' : 'Revoke link'}
            </button>
          )}
        </div>

        {/* Visibility toggles */}
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>What can the client see?</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visFields.map(f => (
              <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={vis[f.key]}
                  onChange={e => setVis(prev => ({ ...prev, [f.key]: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent, #4f46e5)' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{f.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', background: 'none', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)' }}>Close</button>
          <button onClick={handleSaveVisibility} disabled={saving} style={{ padding: '8px 18px', background: 'var(--accent, #4f46e5)', color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
            {saving ? 'Saving…' : 'Save Visibility'}
          </button>
        </div>
      </div>
    </div>
  );
}

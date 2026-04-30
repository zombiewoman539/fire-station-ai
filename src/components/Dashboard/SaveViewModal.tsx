import React from 'react';

interface Props {
  initialName?: string;
  isManager: boolean;
  defaultScope: 'personal' | 'team';
  onClose: () => void;
  onSave: (name: string, scope: 'personal' | 'team') => Promise<void>;
}

export default function SaveViewModal({ initialName = '', isManager, defaultScope, onClose, onSave }: Props) {
  const [name, setName] = React.useState(initialName);
  const [scope, setScope] = React.useState<'personal' | 'team'>(isManager ? defaultScope : 'personal');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError('');
    try {
      await onSave(name.trim(), scope);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save');
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '24px 28px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <h2 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
          Save view
        </h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
              Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. 50+ shortfall list"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 7,
                border: '1px solid var(--border)',
                background: 'var(--input-bg)', color: 'var(--text-1)',
                fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
              Visibility
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setScope('personal')}
                style={scopeBtn(scope === 'personal')}
              >
                Personal
              </button>
              <button
                type="button"
                onClick={() => isManager && setScope('team')}
                disabled={!isManager}
                style={{ ...scopeBtn(scope === 'team'), opacity: isManager ? 1 : 0.4, cursor: isManager ? 'pointer' : 'not-allowed' }}
                title={isManager ? 'Visible to everyone in your team' : 'Only managers can publish team views'}
              >
                🌐 Team {!isManager && '(managers only)'}
              </button>
            </div>
          </div>

          {error && <div style={{ color: '#f87171', fontSize: 12 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
            <button type="submit" disabled={!name.trim() || saving} style={{
              ...ghostBtn,
              background: name.trim() ? '#10b981' : 'var(--border)',
              color: name.trim() ? '#fff' : 'var(--text-3)',
              border: 'none',
            }}>
              {saving ? 'Saving…' : 'Save view'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function scopeBtn(active: boolean): React.CSSProperties {
  return {
    flex: 1, padding: '8px 12px', borderRadius: 7,
    border: '1px solid ' + (active ? '#10b981' : 'var(--border)'),
    background: active ? 'rgba(16,185,129,0.12)' : 'transparent',
    color: active ? '#34d399' : 'var(--text-2)',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  };
}

const ghostBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 7,
  border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-2)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
};

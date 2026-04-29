import React, { useEffect, useState } from 'react';
import { createTask, Task } from '../services/taskService';
import { listProfiles } from '../services/profileStorageSupabase';
import { ClientProfile } from '../profileTypes';

interface Props {
  /** When set, the client picker is locked to this client. */
  initialClientProfileId?: string;
  initialClientName?: string;
  /** Optional initial notes to pre-fill (e.g. when creating a task from a note entry). */
  initialNotes?: string;
  /** Optional initial due date (YYYY-MM-DD). */
  initialDueDate?: string;
  /** Optional initial title. */
  initialTitle?: string;
  /** Pre-loaded profile list. If omitted, the component fetches its own. */
  profiles?: ClientProfile[];
  onClose: () => void;
  onCreated: (task: Task) => void;
}

export default function NewTaskModal({
  initialClientProfileId,
  initialClientName,
  initialNotes,
  initialDueDate,
  initialTitle,
  profiles: profilesProp,
  onClose,
  onCreated,
}: Props) {
  const [title, setTitle] = useState(initialTitle ?? '');
  const [clientId, setClientId] = useState(initialClientProfileId ?? '');
  const [dueDate, setDueDate] = useState(initialDueDate ?? '');
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [profiles, setProfiles] = useState<ClientProfile[]>(profilesProp ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const clientLocked = !!initialClientProfileId;

  useEffect(() => {
    if (profilesProp) return;
    if (clientLocked) return; // no need to fetch if picker is locked
    listProfiles().then(setProfiles).catch(err => console.error('Load profiles failed:', err));
  }, [profilesProp, clientLocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const selectedProfile = profiles.find(p => p.id === clientId);
      const resolvedClientName = clientLocked
        ? (initialClientName ?? selectedProfile?.name)
        : selectedProfile?.name;
      const task = await createTask({
        title: title.trim(),
        clientProfileId: clientId || undefined,
        clientName: resolvedClientName ?? undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        priority,
      });
      onCreated(task);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create task');
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
        borderRadius: 16,
        padding: '28px 32px',
        width: '100%', maxWidth: 460,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <h2 style={{ margin: '0 0 24px', fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>
          New task
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Task</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Follow up on CI coverage discussion"
              required
              style={inputStyle}
            />
          </div>

          {/* Client */}
          <div>
            <label style={labelStyle}>
              Client {!clientLocked && <span style={{ color: 'var(--text-3)' }}>(optional)</span>}
            </label>
            {clientLocked ? (
              <div style={{
                ...inputStyle,
                background: 'var(--input-bg)',
                color: 'var(--text-2)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 5,
                  background: 'rgba(16,185,129,0.12)',
                  color: '#34d399',
                  border: '1px solid rgba(16,185,129,0.25)',
                }}>
                  {initialClientName ?? 'Client'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-4)' }}>
                  Locked to this client
                </span>
              </div>
            ) : (
              <select value={clientId} onChange={e => setClientId(e.target.value)} style={inputStyle}>
                <option value="">— No client —</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Due date + priority */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Due date <span style={{ color: 'var(--text-3)' }}>(optional)</span></label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as 'normal' | 'urgent')}
                style={inputStyle}
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes <span style={{ color: 'var(--text-3)' }}>(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Context, action items, talking points…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {error && (
            <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={ghostBtnStyle}>Cancel</button>
            <button type="submit" disabled={saving || !title.trim()} style={primaryBtnStyle}>
              {saving ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--text-2)', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text-1)', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
};

const ghostBtnStyle: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-2)',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '9px 20px', borderRadius: 8,
  border: 'none', background: '#10b981',
  color: '#fff', fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
};

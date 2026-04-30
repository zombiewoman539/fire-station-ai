import React from 'react';
import { NoteEntry } from '../profileTypes';

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const datePart = d.toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const timePart = d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

function formatMeetingDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const now = new Date();
  return d.toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}

interface Props {
  entries: NoteEntry[];
  onChange: (next: NoteEntry[]) => void;
  onTurnIntoTask?: (body: string) => void;
}

export default function NotesLog({ entries, onChange, onTurnIntoTask }: Props) {
  // Quick-add state
  const [draft, setDraft] = React.useState('');
  const [draftIsMeeting, setDraftIsMeeting] = React.useState(false);
  const [draftMeetingDate, setDraftMeetingDate] = React.useState(todayISO());

  // Edit state
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingBody, setEditingBody] = React.useState('');
  const [editingIsMeeting, setEditingIsMeeting] = React.useState(false);
  const [editingMeetingDate, setEditingMeetingDate] = React.useState(todayISO());

  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  const submitDraft = () => {
    const body = draft.trim();
    if (!body) return;
    const entry: NoteEntry = {
      id: newId(),
      createdAt: new Date().toISOString(),
      body,
      ...(draftIsMeeting ? { meetingDate: draftMeetingDate || todayISO() } : {}),
    };
    onChange([entry, ...entries]);
    setDraft('');
    setDraftIsMeeting(false);
    setDraftMeetingDate(todayISO());
  };

  const handleDraftKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submitDraft();
    }
  };

  const startEdit = (entry: NoteEntry) => {
    setEditingId(entry.id);
    setEditingBody(entry.body);
    setEditingIsMeeting(!!entry.meetingDate);
    setEditingMeetingDate(entry.meetingDate ?? todayISO());
  };

  const saveEdit = () => {
    if (!editingId) return;
    const body = editingBody.trim();
    if (!body) {
      setEditingId(null);
      return;
    }
    onChange(entries.map(e =>
      e.id === editingId
        ? {
            ...e,
            body,
            updatedAt: new Date().toISOString(),
            meetingDate: editingIsMeeting ? (editingMeetingDate || todayISO()) : undefined,
          }
        : e
    ));
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingBody('');
  };

  const deleteEntry = (entry: NoteEntry) => {
    if (!window.confirm('Delete this note?')) return;
    onChange(entries.filter(e => e.id !== entry.id));
  };

  return (
    <div>
      {/* Quick-add */}
      <div style={{
        background: 'var(--input-bg)',
        border: '1px solid var(--input-border)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
      }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleDraftKey}
          placeholder={draftIsMeeting ? 'What was discussed? Next steps?' : 'Add a note about this client… (Cmd/Ctrl+Enter to save)'}
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'transparent', border: 'none', outline: 'none',
            resize: 'vertical', fontFamily: 'inherit', fontSize: 13,
            color: 'var(--text-1)', lineHeight: 1.6,
          }}
        />
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 8, gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={draftIsMeeting}
                onChange={e => setDraftIsMeeting(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>🗓 Meeting</span>
            </label>
            {draftIsMeeting && (
              <input
                type="date"
                value={draftMeetingDate}
                onChange={e => setDraftMeetingDate(e.target.value)}
                style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '3px 6px', fontSize: 12,
                  color: 'var(--text-1)', outline: 'none',
                }}
              />
            )}
          </div>
          <button
            type="button"
            onClick={submitDraft}
            disabled={!draft.trim()}
            style={{
              padding: '6px 14px', borderRadius: 7,
              border: 'none', cursor: draft.trim() ? 'pointer' : 'not-allowed',
              background: draft.trim() ? '#10b981' : 'var(--border)',
              color: draft.trim() ? '#fff' : 'var(--text-3)',
              fontSize: 12, fontWeight: 600,
              transition: 'background 0.15s',
            }}
          >
            {draftIsMeeting ? 'Log meeting' : 'Add note'}
          </button>
        </div>
      </div>

      {/* Feed */}
      {entries.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '24px 16px',
          fontSize: 12, color: 'var(--text-4)',
          border: '1px dashed var(--border)', borderRadius: 10,
        }}>
          No notes yet. Add one above to start a log of conversations and meetings.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(entry => {
            const isEditing = editingId === entry.id;
            const isHovered = hoveredId === entry.id;
            const isMeeting = !!entry.meetingDate;
            return (
              <div
                key={entry.id}
                onMouseEnter={() => setHoveredId(entry.id)}
                onMouseLeave={() => setHoveredId(prev => (prev === entry.id ? null : prev))}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid ' + (isMeeting ? 'rgba(59,130,246,0.35)' : 'var(--border)'),
                  borderRadius: 10,
                  padding: '12px 14px',
                  position: 'relative',
                }}
              >
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  marginBottom: 6, gap: 12,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: 'var(--text-3)', letterSpacing: '0.01em',
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                  }}>
                    {isMeeting && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                        background: 'rgba(59,130,246,0.12)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59,130,246,0.3)',
                        letterSpacing: '0.04em',
                      }}>
                        🗓 MEETING · {formatMeetingDate(entry.meetingDate!)}
                      </span>
                    )}
                    <span>{formatStamp(entry.createdAt)}</span>
                    {entry.updatedAt && (
                      <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>
                        (edited)
                      </span>
                    )}
                  </span>

                  <div style={{
                    display: 'flex', gap: 4,
                    opacity: isHovered || isEditing ? 1 : 0,
                    transition: 'opacity 0.15s',
                  }}>
                    {!isEditing && onTurnIntoTask && (
                      <button
                        type="button"
                        title="Turn into task"
                        onClick={() => onTurnIntoTask(entry.body)}
                        style={iconBtnStyle}
                      >
                        → Task
                      </button>
                    )}
                    {!isEditing && (
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => startEdit(entry)}
                        style={iconBtnStyle}
                      >
                        Edit
                      </button>
                    )}
                    {!isEditing && (
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => deleteEntry(entry)}
                        style={{ ...iconBtnStyle, color: '#f87171' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <>
                    <textarea
                      autoFocus
                      value={editingBody}
                      onChange={e => setEditingBody(e.target.value)}
                      rows={Math.max(3, editingBody.split('\n').length)}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                        borderRadius: 8, padding: '8px 10px',
                        color: 'var(--text-1)', fontSize: 13, lineHeight: 1.6,
                        outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                      }}
                    />
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      marginTop: 8, gap: 12, flexWrap: 'wrap',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <label style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', userSelect: 'none',
                        }}>
                          <input
                            type="checkbox"
                            checked={editingIsMeeting}
                            onChange={e => setEditingIsMeeting(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span>🗓 Meeting</span>
                        </label>
                        {editingIsMeeting && (
                          <input
                            type="date"
                            value={editingMeetingDate}
                            onChange={e => setEditingMeetingDate(e.target.value)}
                            style={{
                              background: 'var(--bg)', border: '1px solid var(--border)',
                              borderRadius: 6, padding: '3px 6px', fontSize: 12,
                              color: 'var(--text-1)', outline: 'none',
                            }}
                          />
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" onClick={cancelEdit} style={ghostBtnStyle}>Cancel</button>
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={!editingBody.trim()}
                          style={{
                            ...ghostBtnStyle,
                            background: editingBody.trim() ? '#10b981' : 'var(--border)',
                            color: editingBody.trim() ? '#fff' : 'var(--text-3)',
                            border: 'none',
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p style={{
                    margin: 0, fontSize: 13, lineHeight: 1.6,
                    color: 'var(--text-1)', whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {entry.body}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 11, fontWeight: 600,
  color: 'var(--text-3)',
  padding: '2px 6px', borderRadius: 4,
};

const ghostBtnStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 7,
  border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-2)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
};

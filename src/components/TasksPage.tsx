import React, { useEffect, useState, useCallback } from 'react';
import { listMyTasks, createTask, completeTask, reopenTask, deleteTask, Task } from '../services/taskService';
import { listProfiles } from '../services/profileStorageSupabase';
import { ClientProfile } from '../profileTypes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-SG', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate + 'T23:59:59') < new Date();
}

function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const d = new Date();
  const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return dueDate === localToday;
}

// ─── New task modal ───────────────────────────────────────────────────────────

interface NewTaskModalProps {
  profiles: ClientProfile[];
  onClose: () => void;
  onCreated: (task: Task) => void;
}

function NewTaskModal({ profiles, onClose, onCreated }: NewTaskModalProps) {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const selectedProfile = profiles.find(p => p.id === clientId);
      const task = await createTask({
        title: title.trim(),
        clientProfileId: clientId || undefined,
        clientName: selectedProfile?.name ?? undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
      });
      onCreated(task);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
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
            <label style={labelStyle}>Client <span style={{ color: 'var(--text-3)' }}>(optional)</span></label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} style={inputStyle}>
              <option value="">— No client —</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <label style={labelStyle}>Due date <span style={{ color: 'var(--text-3)' }}>(optional)</span></label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              style={inputStyle}
            />
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

// ─── Complete modal (log notes when marking done) ─────────────────────────────

interface CompleteModalProps {
  task: Task;
  onClose: () => void;
  onDone: (notes: string) => void;
}

function CompleteModal({ task, onClose, onDone }: CompleteModalProps) {
  const [notes, setNotes] = useState(task.notes);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onDone(notes);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
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
        <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>
          Mark as done
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-3)' }}>
          {task.title}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Meeting notes <span style={{ color: 'var(--text-3)' }}>(optional)</span></label>
            <textarea
              autoFocus
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What was discussed? What's the next step?"
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={ghostBtnStyle}>Cancel</button>
            <button type="submit" disabled={saving} style={primaryBtnStyle}>
              {saving ? 'Saving…' : 'Mark done'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onComplete: (task: Task) => void;
  onReopen: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function TaskCard({ task, onComplete, onReopen, onDelete }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const overdue = isOverdue(task.dueDate);
  const today = isDueToday(task.dueDate);
  const done = task.status === 'done';

  const dueDateColor = done
    ? 'var(--text-3)'
    : overdue ? '#f87171'
    : today ? '#fbbf24'
    : 'var(--text-3)';

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '14px 16px',
      opacity: done ? 0.65 : 1,
      transition: 'opacity 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Checkbox */}
        <button
          onClick={() => done ? onReopen(task) : onComplete(task)}
          title={done ? 'Reopen' : 'Mark done'}
          style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
            border: done ? 'none' : '1.5px solid var(--border)',
            background: done ? '#10b981' : 'transparent',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: 1,
            transition: 'background 0.15s, border 0.15s',
          }}
        >
          {done && (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 14, fontWeight: 600,
              color: done ? 'var(--text-3)' : 'var(--text-1)',
              textDecoration: done ? 'line-through' : 'none',
            }}>
              {task.title}
            </span>

            {task.clientName && (
              <span style={{
                fontSize: 11, fontWeight: 600,
                padding: '2px 8px', borderRadius: 5,
                background: 'rgba(16,185,129,0.1)',
                color: '#34d399',
                border: '1px solid rgba(16,185,129,0.2)',
                whiteSpace: 'nowrap',
              }}>
                {task.clientName}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
            {task.dueDate && (
              <span style={{ fontSize: 12, color: dueDateColor }}>
                {overdue && !done ? '⚠ ' : ''}
                {today && !done ? 'Today · ' : ''}
                {formatDate(task.dueDate)}
              </span>
            )}
            {done && task.completedAt && (
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Completed {new Date(task.completedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>

          {/* Notes preview / expand */}
          {task.notes && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                background: 'none', border: 'none', padding: '6px 0 0',
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              {expanded ? (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {task.notes}
                </p>
              ) : (
                <p style={{
                  margin: 0, fontSize: 13, color: 'var(--text-3)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {task.notes}
                </p>
              )}
            </button>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(task)}
          title="Delete task"
          style={{
            background: 'none', border: 'none',
            color: 'var(--text-3)', cursor: 'pointer',
            padding: '2px 4px', borderRadius: 4, flexShrink: 0,
            fontSize: 16, lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label, count, collapsed, onToggle }: {
  label: string; count: number; collapsed: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px 0', marginBottom: 10,
      }}
    >
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--text-3)',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 700,
        padding: '1px 7px', borderRadius: 10,
        background: 'var(--border)', color: 'var(--text-3)',
      }}>
        {count}
      </span>
      <svg
        width="12" height="12" viewBox="0 0 12 12" fill="none"
        style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', color: 'var(--text-3)' }}
      >
        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<Task | null>(null);
  const [doneCollapsed, setDoneCollapsed] = useState(false);

  const load = useCallback(async () => {
    const [taskData, profileData] = await Promise.all([listMyTasks(), listProfiles()]);
    setTasks(taskData);
    setProfiles(profileData);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (task: Task) => {
    setTasks(prev => [task, ...prev]);
    setShowNewModal(false);
  };

  const handleComplete = async (task: Task, notes: string) => {
    await completeTask(task.id, notes);
    setTasks(prev => prev.map(t =>
      t.id === task.id
        ? { ...t, status: 'done', notes, completedAt: new Date().toISOString() }
        : t
    ));
    setCompleteTarget(null);
  };

  const handleReopen = async (task: Task) => {
    await reopenTask(task.id);
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, status: 'todo', completedAt: null } : t
    ));
  };

  const handleDelete = async (task: Task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    await deleteTask(task.id);
    setTasks(prev => prev.filter(t => t.id !== task.id));
  };

  const todo = tasks
    .filter(t => t.status === 'todo')
    .sort((a, b) => {
      // Overdue first, then by due date, then undated
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate < b.dueDate ? -1 : 1;
    });

  const done = tasks
    .filter(t => t.status === 'done')
    .sort((a, b) => (a.completedAt ?? '') > (b.completedAt ?? '') ? -1 : 1);

  return (
    <div style={{
      minHeight: '100%',
      background: 'var(--bg)',
      color: 'var(--text-1)',
      padding: '32px 40px',
    }}>
      {/* Modals */}
      {showNewModal && (
        <NewTaskModal
          profiles={profiles}
          onClose={() => setShowNewModal(false)}
          onCreated={handleCreated}
        />
      )}
      {completeTarget && (
        <CompleteModal
          task={completeTarget}
          onClose={() => setCompleteTarget(null)}
          onDone={(notes) => handleComplete(completeTarget, notes)}
        />
      )}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 36, maxWidth: 680,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
            Tasks
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
            {todo.length} open · {done.length} completed
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 9,
            border: 'none', background: '#10b981',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New task
        </button>
      </div>

      <div style={{ maxWidth: 680 }}>
        {loading ? (
          <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
        ) : tasks.length === 0 ? (
          <div style={{
            border: '1px dashed var(--border)',
            borderRadius: 16, padding: '56px 32px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 14 }}>
              No tasks yet. Create one to track follow-ups with your clients.
            </p>
          </div>
        ) : (
          <>
            {/* To do */}
            {todo.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <SectionHeader
                  label="To do"
                  count={todo.length}
                  collapsed={false}
                  onToggle={() => {}}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {todo.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={t => setCompleteTarget(t)}
                      onReopen={handleReopen}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Done */}
            {done.length > 0 && (
              <div>
                <SectionHeader
                  label="Completed"
                  count={done.length}
                  collapsed={doneCollapsed}
                  onToggle={() => setDoneCollapsed(c => !c)}
                />
                {!doneCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {done.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onComplete={t => setCompleteTarget(t)}
                        onReopen={handleReopen}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

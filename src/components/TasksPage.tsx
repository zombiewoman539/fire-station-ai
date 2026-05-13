import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  listMyTasks, createTask, completeTask, reopenTask, deleteTask, updateTask, Task,
} from '../services/taskService';
import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate,
  generateDueTasks, TaskTemplate, INTERVAL_OPTIONS,
} from '../services/taskTemplateService';
import { listProfiles } from '../services/profileStorageSupabase';
import { ClientProfile } from '../profileTypes';
import NewTaskModal from './NewTaskModal';

// ─── Date helpers ────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-SG', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return dueDate < todayISO();
}

function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return dueDate === todayISO();
}

// ─── Smart-view types ────────────────────────────────────────────────────────

type ViewKey =
  | 'today'
  | 'upcoming'
  | 'all'
  | 'completed'
  | 'recurring'
  | `client:${string}`;

interface ParsedView {
  kind: 'today' | 'upcoming' | 'all' | 'completed' | 'recurring' | 'client';
  clientId?: string;
}

function parseView(view: ViewKey): ParsedView {
  if (view.startsWith('client:')) {
    return { kind: 'client', clientId: view.slice('client:'.length) };
  }
  return { kind: view as 'today' | 'upcoming' | 'all' | 'completed' | 'recurring' };
}

// Sort: urgent first, then by due date asc, undated last, then createdAt desc
function sortTodos(a: Task, b: Task): number {
  if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
  if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
  if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  if (!a.dueDate && b.dueDate) return 1;
  if (a.dueDate && !b.dueDate) return -1;
  return a.createdAt < b.createdAt ? 1 : -1;
}

// ─── Inline task row ─────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  onToggle: (task: Task, withNotes?: boolean) => void;
  onDelete: (task: Task) => void;
  onUpdateNotes: (task: Task, notes: string) => void;
  /** When true, show the post-completion "Add note" affordance for ~5s. */
  justCompleted: boolean;
  /** When true, immediately expand the inline notes editor (e.g. shift-click). */
  notesEditing: boolean;
  onCloseNotesEditor: () => void;
}

function TaskRow({
  task, onToggle, onDelete, onUpdateNotes,
  justCompleted, notesEditing, onCloseNotesEditor,
}: TaskRowProps) {
  const [notesDraft, setNotesDraft] = useState(task.notes);
  const [showNotesPreview, setShowNotesPreview] = useState(false);

  useEffect(() => { setNotesDraft(task.notes); }, [task.notes, notesEditing]);

  const overdue = isOverdue(task.dueDate);
  const today = isDueToday(task.dueDate);
  const done = task.status === 'done';

  const dueDateColor = done
    ? 'var(--text-3)'
    : overdue ? '#f87171'
    : today ? '#fbbf24'
    : 'var(--text-3)';

  const handleCheckboxClick = (e: React.MouseEvent) => {
    if (e.shiftKey && !done) {
      onToggle(task, true);
      return;
    }
    onToggle(task, false);
  };

  const saveNotes = () => {
    onUpdateNotes(task, notesDraft);
    onCloseNotesEditor();
  };

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '12px 14px',
      opacity: done ? 0.65 : 1,
      transition: 'opacity 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Checkbox */}
        <button
          onClick={handleCheckboxClick}
          title={done ? 'Reopen' : 'Mark done (shift-click to add note first)'}
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
            {task.priority === 'urgent' && !done && (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
                background: 'rgba(248,113,113,0.15)', color: '#f87171',
                border: '1px solid rgba(248,113,113,0.3)', letterSpacing: '0.05em',
                flexShrink: 0,
              }}>
                URGENT
              </span>
            )}
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
            {justCompleted && !notesEditing && (
              <button
                onClick={onCloseNotesEditor}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 12, color: '#34d399', cursor: 'pointer',
                  fontWeight: 600, textDecoration: 'underline',
                }}
              >
                Add completion note
              </button>
            )}
          </div>

          {/* Inline notes editor */}
          {notesEditing ? (
            <div style={{ marginTop: 8 }}>
              <textarea
                autoFocus
                value={notesDraft}
                onChange={e => setNotesDraft(e.target.value)}
                placeholder={done ? 'What was discussed? Next steps?' : 'Add notes…'}
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                  borderRadius: 8, padding: '8px 10px',
                  color: 'var(--text-1)', fontSize: 13, lineHeight: 1.6,
                  outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onCloseNotesEditor}
                  style={{
                    padding: '5px 10px', borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-2)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveNotes}
                  style={{
                    padding: '5px 12px', borderRadius: 6,
                    border: 'none',
                    background: '#10b981', color: '#fff',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : task.notes ? (
            <button
              onClick={() => setShowNotesPreview(p => !p)}
              style={{
                background: 'none', border: 'none', padding: '6px 0 0',
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              {showNotesPreview ? (
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
          ) : null}
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

// ─── Quick-add ───────────────────────────────────────────────────────────────

interface QuickAddProps {
  profiles: ClientProfile[];
  defaultClientId: string;
  onCreated: (task: Task) => void;
  onOpenFullModal: (seed: { title: string; clientId: string; dueDate: string }) => void;
}

function QuickAdd({ profiles, defaultClientId, onCreated, onOpenFullModal }: QuickAddProps) {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState(defaultClientId);
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setClientId(defaultClientId); }, [defaultClientId]);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const profile = profiles.find(p => p.id === clientId);
      const task = await createTask({
        title: title.trim(),
        clientProfileId: clientId || undefined,
        clientName: profile?.name,
        dueDate: dueDate || undefined,
      });
      onCreated(task);
      setTitle('');
      setDueDate('');
    } catch (err) {
      console.error('Quick-add failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10, padding: '6px 10px',
      marginBottom: 12,
    }}>
      <span style={{ color: 'var(--text-3)', fontSize: 16, fontWeight: 600, flexShrink: 0 }}>＋</span>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Add a task… press Enter to save"
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: 'var(--text-1)', fontSize: 14, padding: '7px 0',
        }}
      />
      <select
        value={clientId}
        onChange={e => setClientId(e.target.value)}
        title="Client"
        style={{
          background: 'var(--input-bg)', border: '1px solid var(--input-border)',
          borderRadius: 6, padding: '5px 8px', color: 'var(--text-1)', fontSize: 12,
          maxWidth: 140,
        }}
      >
        <option value="">No client</option>
        {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input
        type="date"
        value={dueDate}
        onChange={e => setDueDate(e.target.value)}
        title="Due date"
        style={{
          background: 'var(--input-bg)', border: '1px solid var(--input-border)',
          borderRadius: 6, padding: '5px 8px', color: 'var(--text-1)', fontSize: 12,
        }}
      />
      <button
        type="button"
        onClick={() => onOpenFullModal({ title, clientId, dueDate })}
        title="More options (priority, notes)"
        style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: 6,
          padding: '4px 8px', color: 'var(--text-3)', cursor: 'pointer', fontSize: 13,
        }}
      >
        …
      </button>
      <button
        type="button"
        onClick={submit}
        disabled={!title.trim() || saving}
        style={{
          padding: '5px 14px', borderRadius: 6, border: 'none',
          background: title.trim() ? '#10b981' : 'var(--border)',
          color: title.trim() ? '#fff' : 'var(--text-3)',
          fontSize: 12, fontWeight: 600,
          cursor: title.trim() ? 'pointer' : 'not-allowed',
        }}
      >
        {saving ? 'Adding…' : 'Add'}
      </button>
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', marginBottom: 8 }}>
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
    </div>
  );
}

// ─── Left rail ───────────────────────────────────────────────────────────────

interface RailItemProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  indent?: boolean;
}

function RailItem({ label, count, active, onClick, indent }: RailItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        width: '100%', padding: indent ? '6px 10px 6px 22px' : '7px 10px',
        background: active ? 'var(--border)' : 'transparent',
        border: 'none', borderRadius: 7, cursor: 'pointer',
        color: active ? 'var(--text-1)' : 'var(--text-2)',
        fontSize: 13, fontWeight: active ? 600 : 500,
        textAlign: 'left',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {count > 0 && (
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
          padding: '0 6px', minWidth: 18, textAlign: 'right',
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const VIEW_STORAGE_KEY = 'tasksPage.activeView';
const FILTERS_STORAGE_KEY = 'tasksPage.filters';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewKey>(() => {
    return (localStorage.getItem(VIEW_STORAGE_KEY) as ViewKey) || 'today';
  });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<{ urgent: boolean; overdue: boolean }>(() => {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : { urgent: false, overdue: false };
    } catch {
      return { urgent: false, overdue: false };
    }
  });

  const [modalSeed, setModalSeed] = useState<{ title?: string; clientId?: string; dueDate?: string } | null>(null);
  const [recentlyCompletedId, setRecentlyCompletedId] = useState<string | null>(null);
  const [notesEditingId, setNotesEditingId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(VIEW_STORAGE_KEY, activeView); }, [activeView]);
  useEffect(() => { localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters)); }, [filters]);

  const [templates, setTemplates] = useState<TaskTemplate[]>([]);

  const load = useCallback(async () => {
    const [taskData, profileData, templateData] = await Promise.all([
      listMyTasks(), listProfiles(), listTemplates().catch(() => [] as TaskTemplate[]),
    ]);
    setTemplates(templateData);
    // Auto-generate tasks for due templates, then refresh task list
    if (templateData.length > 0) {
      const generated = await generateDueTasks(templateData).catch(() => 0);
      if (generated > 0) {
        const refreshed = await listMyTasks().catch(() => taskData);
        setTasks(refreshed);
        // Refresh templates so lastGeneratedAt is up to date
        listTemplates().then(setTemplates).catch(() => {});
      } else {
        setTasks(taskData);
      }
    } else {
      setTasks(taskData);
    }
    setProfiles(profileData);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const handleCreated = (task: Task) => {
    setTasks(prev => [task, ...prev]);
    setModalSeed(null);
  };

  const handleToggle = async (task: Task, withNotes?: boolean) => {
    if (task.status === 'done') {
      await reopenTask(task.id);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'todo', completedAt: null } : t));
      setRecentlyCompletedId(null);
      return;
    }
    if (withNotes) {
      // Shift-click: open notes editor BEFORE completing
      setNotesEditingId(task.id);
      return;
    }
    // Optimistic: mark done immediately, no modal
    await completeTask(task.id, task.notes);
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, status: 'done', completedAt: new Date().toISOString() } : t,
    ));
    setRecentlyCompletedId(task.id);
    setTimeout(() => {
      setRecentlyCompletedId(prev => (prev === task.id ? null : prev));
    }, 5000);
  };

  const handleUpdateNotes = async (task: Task, notes: string) => {
    if (notes === task.notes) return;
    // For todos that haven't been completed yet, we may need to complete them first
    if (task.status === 'todo' && notesEditingId === task.id) {
      // Shift-click flow: save notes AND complete
      await completeTask(task.id, notes);
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: 'done', notes, completedAt: new Date().toISOString() } : t,
      ));
      setRecentlyCompletedId(null);
    } else {
      await updateTask(task.id, { notes });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, notes } : t));
    }
  };

  const handleDelete = async (task: Task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    await deleteTask(task.id);
    setTasks(prev => prev.filter(t => t.id !== task.id));
  };

  // ── Filtering / grouping ────────────────────────────────────────────────────
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  const weekEnd = addDaysISO(today, 7);
  const twoWeeksEnd = addDaysISO(today, 14);

  // Apply search + filter chips first
  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter(t => {
      if (q) {
        const hay = `${t.title} ${t.clientName ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.urgent && t.priority !== 'urgent') return false;
      if (filters.overdue && !(t.status === 'todo' && isOverdue(t.dueDate))) return false;
      return true;
    });
  }, [tasks, search, filters]);

  const view = parseView(activeView);

  // Compute the visible list for the active view
  const viewTasks = useMemo(() => {
    if (view.kind === 'completed') {
      return filteredTasks
        .filter(t => t.status === 'done')
        .sort((a, b) => (a.completedAt ?? '') > (b.completedAt ?? '') ? -1 : 1);
    }
    if (view.kind === 'today') {
      return filteredTasks
        .filter(t => t.status === 'todo')
        .filter(t => (t.dueDate && t.dueDate <= today) || (!t.dueDate && t.priority === 'urgent'))
        .sort(sortTodos);
    }
    if (view.kind === 'upcoming') {
      return filteredTasks
        .filter(t => t.status === 'todo')
        .filter(t => t.dueDate && t.dueDate >= today)
        .sort(sortTodos);
    }
    if (view.kind === 'client') {
      return filteredTasks
        .filter(t => t.status === 'todo' && t.clientProfileId === view.clientId)
        .sort(sortTodos);
    }
    // 'all'
    return filteredTasks
      .filter(t => t.status === 'todo')
      .sort(sortTodos);
  }, [filteredTasks, view, today]);

  // For "Upcoming": group by date bucket
  const upcomingGroups = useMemo(() => {
    if (view.kind !== 'upcoming') return null;
    const groups: { label: string; tasks: Task[] }[] = [
      { label: 'Today', tasks: [] },
      { label: 'Tomorrow', tasks: [] },
      { label: 'This week', tasks: [] },
      { label: 'Next week', tasks: [] },
      { label: 'Later', tasks: [] },
    ];
    for (const t of viewTasks) {
      if (!t.dueDate) continue;
      if (t.dueDate === today) groups[0].tasks.push(t);
      else if (t.dueDate === tomorrow) groups[1].tasks.push(t);
      else if (t.dueDate < weekEnd) groups[2].tasks.push(t);
      else if (t.dueDate < twoWeeksEnd) groups[3].tasks.push(t);
      else groups[4].tasks.push(t);
    }
    return groups.filter(g => g.tasks.length > 0);
  }, [view.kind, viewTasks, today, tomorrow, weekEnd, twoWeeksEnd]);

  // ── Counts for left rail ────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const todos = tasks.filter(t => t.status === 'todo');
    const todayCount = todos.filter(t =>
      (t.dueDate && t.dueDate <= today) || (!t.dueDate && t.priority === 'urgent')
    ).length;
    const upcomingCount = todos.filter(t => t.dueDate && t.dueDate >= today).length;
    const allCount = todos.length;
    const completedCount = tasks.filter(t => t.status === 'done').length;

    const byClient: Map<string, { id: string; name: string; count: number }> = new Map();
    for (const t of todos) {
      if (!t.clientProfileId) continue;
      const name = t.clientName || 'Unnamed';
      const cur = byClient.get(t.clientProfileId);
      if (cur) cur.count += 1;
      else byClient.set(t.clientProfileId, { id: t.clientProfileId, name, count: 1 });
    }
    const clients = Array.from(byClient.values()).sort((a, b) => b.count - a.count);

    return { today: todayCount, upcoming: upcomingCount, all: allCount, completed: completedCount, clients };
  }, [tasks, today]);

  // Template handlers
  const handleTemplateCreated = (t: TaskTemplate) => setTemplates(prev => [t, ...prev]);
  const handleTemplateDeleted = async (id: string) => {
    if (!window.confirm('Delete this recurring task?')) return;
    await deleteTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };
  const handleTemplateUpdated = async (id: string, patch: Partial<TaskTemplate>) => {
    await updateTemplate(id, patch);
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const viewLabel = (() => {
    if (view.kind === 'today') return 'Today';
    if (view.kind === 'upcoming') return 'Upcoming';
    if (view.kind === 'all') return 'All open tasks';
    if (view.kind === 'completed') return 'Completed';
    if (view.kind === 'recurring') return 'Recurring tasks';
    if (view.kind === 'client') {
      const client = counts.clients.find(c => c.id === view.clientId);
      return client?.name ?? 'Client';
    }
    return 'Tasks';
  })();

  const defaultClientForQuickAdd = view.kind === 'client' ? (view.clientId ?? '') : '';

  return (
    <div style={{
      minHeight: '100%',
      background: 'var(--bg)',
      color: 'var(--text-1)',
      padding: '24px 28px',
    }}>
      {modalSeed && (
        <NewTaskModal
          profiles={profiles}
          initialTitle={modalSeed.title}
          initialClientProfileId={modalSeed.clientId || undefined}
          initialClientName={profiles.find(p => p.id === modalSeed.clientId)?.name}
          initialDueDate={modalSeed.dueDate}
          onClose={() => setModalSeed(null)}
          onCreated={handleCreated}
        />
      )}

      <div style={{ display: 'flex', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
        {/* Left rail */}
        <aside style={{ width: 220, flexShrink: 0, position: 'sticky', top: 24, alignSelf: 'flex-start' }}>
          <div style={{ marginBottom: 18 }}>
            <h1 style={{
              margin: '0 0 4px', fontSize: 18, fontWeight: 800,
              color: 'var(--text-1)', letterSpacing: '-0.02em',
            }}>
              Tasks
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)' }}>
              {counts.all} open · {counts.completed} done
            </p>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <RailItem label="Today"    count={counts.today}    active={activeView === 'today'}    onClick={() => setActiveView('today')} />
            <RailItem label="Upcoming" count={counts.upcoming} active={activeView === 'upcoming'} onClick={() => setActiveView('upcoming')} />
            <RailItem label="All"      count={counts.all}      active={activeView === 'all'}      onClick={() => setActiveView('all')} />

            {counts.clients.length > 0 && (
              <>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--text-4)',
                  padding: '14px 10px 6px',
                }}>
                  By client
                </div>
                {counts.clients.map(c => (
                  <RailItem
                    key={c.id}
                    label={c.name}
                    count={c.count}
                    active={activeView === `client:${c.id}`}
                    onClick={() => setActiveView(`client:${c.id}`)}
                    indent
                  />
                ))}
              </>
            )}

            <div style={{ height: 12 }} />
            <RailItem label="Recurring" count={templates.length} active={activeView === 'recurring'} onClick={() => setActiveView('recurring')} />
            <RailItem label="Completed" count={counts.completed} active={activeView === 'completed'} onClick={() => setActiveView('completed')} />
          </nav>
        </aside>

        {/* Main pane */}
        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 16, gap: 12, flexWrap: 'wrap',
          }}>
            <h2 style={{
              margin: 0, fontSize: 20, fontWeight: 700,
              color: 'var(--text-1)', letterSpacing: '-0.01em',
            }}>
              {viewLabel}
            </h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                style={{
                  width: 200, padding: '6px 10px', borderRadius: 7,
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)', color: 'var(--text-1)',
                  fontSize: 13, outline: 'none',
                }}
              />
              <FilterChip
                label="Urgent"
                active={filters.urgent}
                onClick={() => setFilters(f => ({ ...f, urgent: !f.urgent }))}
              />
              <FilterChip
                label="Overdue"
                active={filters.overdue}
                onClick={() => setFilters(f => ({ ...f, overdue: !f.overdue }))}
              />
            </div>
          </div>

          {view.kind !== 'recurring' && (
            <QuickAdd
              profiles={profiles}
              defaultClientId={defaultClientForQuickAdd}
              onCreated={handleCreated}
              onOpenFullModal={(seed) => setModalSeed(seed)}
            />
          )}

          {view.kind === 'recurring' ? (
            <RecurringPane
              templates={templates}
              profiles={profiles}
              onCreated={handleTemplateCreated}
              onDeleted={handleTemplateDeleted}
              onUpdated={handleTemplateUpdated}
            />
          ) : loading ? (
            <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
          ) : viewTasks.length === 0 ? (
            <EmptyState view={view.kind} hasAnyTasks={tasks.length > 0} />
          ) : view.kind === 'upcoming' && upcomingGroups ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {upcomingGroups.map(g => (
                <div key={g.label}>
                  <SectionHeader label={g.label} count={g.tasks.length} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {g.tasks.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                        onUpdateNotes={handleUpdateNotes}
                        justCompleted={recentlyCompletedId === task.id}
                        notesEditing={notesEditingId === task.id}
                        onCloseNotesEditor={() => {
                          setNotesEditingId(null);
                          setRecentlyCompletedId(null);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {viewTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onUpdateNotes={handleUpdateNotes}
                  justCompleted={recentlyCompletedId === task.id}
                  notesEditing={notesEditingId === task.id}
                  onCloseNotesEditor={() => {
                    setNotesEditingId(null);
                    setRecentlyCompletedId(null);
                  }}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Filter chip ─────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px', borderRadius: 7,
        border: '1px solid ' + (active ? '#10b981' : 'var(--border)'),
        background: active ? 'rgba(16,185,129,0.12)' : 'transparent',
        color: active ? '#34d399' : 'var(--text-2)',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

// ─── Recurring pane ──────────────────────────────────────────────────────────

function RecurringPane({ templates, profiles, onCreated, onDeleted, onUpdated }: {
  templates: TaskTemplate[];
  profiles: ClientProfile[];
  onCreated: (t: TaskTemplate) => void;
  onDeleted: (id: string) => void;
  onUpdated: (id: string, patch: Partial<TaskTemplate>) => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newInterval, setNewInterval] = useState(30);
  const [newClientId, setNewClientId] = useState('');
  const [newPriority, setNewPriority] = useState<'normal' | 'urgent'>('normal');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const profile = profiles.find(p => p.id === newClientId);
      const t = await createTemplate({
        title: newTitle.trim(),
        intervalDays: newInterval,
        clientProfileId: newClientId || undefined,
        clientName: profile?.name,
        priority: newPriority,
      });
      onCreated(t);
      setShowNew(false);
      setNewTitle('');
      setNewInterval(30);
      setNewClientId('');
      setNewPriority('normal');
    } finally {
      setSaving(false);
    }
  };

  function nextDueLabel(t: TaskTemplate): string {
    if (!t.lastGeneratedAt) return 'Due now';
    const d = new Date(t.lastGeneratedAt.slice(0, 10) + 'T00:00:00');
    d.setDate(d.getDate() + t.intervalDays);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Due now';
    if (diff === 1) return 'Due tomorrow';
    return `Due in ${diff} days`;
  }

  const intervalLabel = (days: number) =>
    INTERVAL_OPTIONS.find(o => o.days === days)?.label ?? `Every ${days} days`;

  return (
    <div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-3)' }}>
        Recurring tasks are automatically added to your task list on schedule.
      </p>

      {templates.map(t => (
        <div key={t.id} style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 8,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15,
          }}>↻</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {t.priority === 'urgent' && (
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
                  background: 'rgba(248,113,113,0.15)', color: '#f87171',
                  border: '1px solid rgba(248,113,113,0.3)',
                }}>URGENT</span>
              )}
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{t.title}</span>
              {t.clientName && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                  background: 'rgba(16,185,129,0.1)', color: '#34d399',
                  border: '1px solid rgba(16,185,129,0.2)',
                }}>{t.clientName}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                {intervalLabel(t.intervalDays)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {nextDueLabel(t)}
              </span>
            </div>
          </div>
          <button onClick={() => onDeleted(t.id)} style={{
            background: 'none', border: 'none', color: 'var(--text-3)',
            cursor: 'pointer', padding: '2px 4px', fontSize: 16, lineHeight: 1,
          }}>×</button>
        </div>
      ))}

      {showNew ? (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px', marginTop: 8,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Task title…"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{
                background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                borderRadius: 8, padding: '8px 12px', color: 'var(--text-1)',
                fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={newInterval} onChange={e => setNewInterval(Number(e.target.value))} style={selectStyle}>
                {INTERVAL_OPTIONS.map(o => (
                  <option key={o.days} value={o.days}>{o.label}</option>
                ))}
              </select>
              <select value={newClientId} onChange={e => setNewClientId(e.target.value)} style={selectStyle}>
                <option value="">No client</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={newPriority} onChange={e => setNewPriority(e.target.value as 'normal' | 'urgent')} style={selectStyle}>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNew(false)} style={ghostBtnStyle}>Cancel</button>
              <button onClick={handleCreate} disabled={saving || !newTitle.trim()} style={primaryBtnStyle}>
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowNew(true)} style={{
          width: '100%', padding: '10px 0', fontSize: 13, color: 'var(--accent)',
          border: '1px dashed rgba(99,102,241,0.4)', borderRadius: 10,
          background: 'none', cursor: 'pointer', marginTop: 4, fontWeight: 600,
        }}>
          + New recurring task
        </button>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  borderRadius: 7, padding: '6px 10px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
};

const ghostBtnStyle: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '7px 18px', borderRadius: 8, border: 'none',
  background: '#10b981', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ view, hasAnyTasks }: { view: ParsedView['kind']; hasAnyTasks: boolean }) {
  const messages: Record<ParsedView['kind'], string> = {
    today: hasAnyTasks ? 'Nothing due today. Nice work.' : 'No tasks yet. Add one above to get started.',
    upcoming: 'No upcoming tasks.',
    all: hasAnyTasks ? 'No open tasks.' : 'No tasks yet. Add one above to get started.',
    completed: 'Nothing completed yet.',
    recurring: '',
    client: 'No open tasks for this client.',
  };
  return (
    <div style={{
      border: '1px dashed var(--border)',
      borderRadius: 14, padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 28, marginBottom: 8, color: 'var(--text-4)' }}>✓</div>
      <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 13 }}>
        {messages[view]}
      </p>
    </div>
  );
}


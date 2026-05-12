import React from 'react';
import { ClientProfile, NoteEntry } from '../../profileTypes';
import { listProfiles } from '../../services/profileStorageSupabase';
import { Task, listTasks, completeTask, reopenTask, deleteTask } from '../../services/taskService';
import NotesLog from '../NotesLog';
import NewTaskModal from '../NewTaskModal';
import TagInput from '../TagInput';

export function ActivitySection({ profile, onMetaChange }: {
  profile: ClientProfile | null | undefined;
  onMetaChange: (updates: Partial<Pick<ClientProfile, 'lastMeetingDate' | 'nextReviewDate' | 'notes' | 'noteEntries' | 'tags'>>) => void;
}) {
  const nextReview = profile?.nextReviewDate ?? '';
  const noteEntries: NoteEntry[] = profile?.noteEntries ?? [];

  const meetingEntries = noteEntries.filter(e => e.meetingDate);
  const meetingCount = meetingEntries.length;
  const derivedFromEntries = meetingEntries.length > 0
    ? meetingEntries.reduce((max, e) => (e.meetingDate! > max ? e.meetingDate! : max), meetingEntries[0].meetingDate!)
    : null;
  const latestMeetingDate = derivedFromEntries ?? (profile?.lastMeetingDate ?? null);
  const isLegacyMeetingDate = !derivedFromEntries && !!profile?.lastMeetingDate;
  const daysSinceMeeting = latestMeetingDate
    ? Math.floor((Date.now() - new Date(latestMeetingDate + 'T00:00:00').getTime()) / 86400000)
    : null;

  const reviewDate = nextReview ? new Date(nextReview) : null;
  const reviewOverdue = reviewDate ? reviewDate < new Date() : false;
  const daysUntilReview = reviewDate ? Math.ceil((reviewDate.getTime() - Date.now()) / 86400000) : null;

  const handleNotesChange = (next: NoteEntry[]) => {
    const meetings = next.filter(e => e.meetingDate);
    if (meetings.length === 0) {
      onMetaChange({ noteEntries: next });
      return;
    }
    const derivedLastMeeting = meetings.reduce(
      (max, e) => (e.meetingDate! > max ? e.meetingDate! : max),
      meetings[0].meetingDate!,
    );
    if (derivedLastMeeting !== (profile?.lastMeetingDate ?? null)) {
      onMetaChange({ noteEntries: next, lastMeetingDate: derivedLastMeeting });
    } else {
      onMetaChange({ noteEntries: next });
    }
  };

  const [tagSuggestions, setTagSuggestions] = React.useState<string[]>([]);
  React.useEffect(() => {
    listProfiles()
      .then(profiles => {
        const set = new Set<string>();
        for (const p of profiles) {
          for (const t of p.tags ?? []) set.add(t);
        }
        setTagSuggestions(Array.from(set).sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => setTagSuggestions([]));
  }, [profile?.id]);

  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = React.useState(false);
  const [showTaskModal, setShowTaskModal] = React.useState(false);
  const [taskModalSeed, setTaskModalSeed] = React.useState<string | undefined>(undefined);

  const refreshTasks = React.useCallback(async () => {
    if (!profile?.id) return;
    setTasksLoading(true);
    try {
      const all = await listTasks();
      setTasks(all.filter(t => t.clientProfileId === profile.id));
    } catch (e) {
      console.error('Load tasks failed:', e);
    } finally {
      setTasksLoading(false);
    }
  }, [profile?.id]);

  React.useEffect(() => {
    if (profile?.id) refreshTasks();
    else setTasks([]);
  }, [profile?.id, refreshTasks]);

  const openTasks = tasks.filter(t => t.status === 'todo').sort((a, b) => {
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
    if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  });

  const handleToggleTask = async (task: Task) => {
    if (task.status === 'todo') {
      await completeTask(task.id, task.notes);
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: 'done', completedAt: new Date().toISOString() } : t,
      ));
    } else {
      await reopenTask(task.id);
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: 'todo', completedAt: null } : t,
      ));
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    await deleteTask(task.id);
    setTasks(prev => prev.filter(t => t.id !== task.id));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 8, padding: '8px 12px', color: 'var(--text-1)', fontSize: 13, outline: 'none',
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 20, lineHeight: 1.6 }}>
        Log meetings, keep notes, schedule reviews, and tag this client. The "Last meeting" date and count come from any notes tagged as meetings.
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
          Tags
        </label>
        <TagInput
          value={profile?.tags ?? []}
          onChange={(next) => onMetaChange({ tags: next })}
          suggestions={tagSuggestions}
          placeholder="Add tag (e.g. VIP, warm, do-not-contact) — Enter to add"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, marginBottom: 20 }}>
        <div style={{
          flex: 1,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 14px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4 }}>
            Last meeting
          </div>
          {latestMeetingDate ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
                {new Date(latestMeetingDate + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: daysSinceMeeting !== null && daysSinceMeeting > 365 ? '#f87171'
                  : daysSinceMeeting !== null && daysSinceMeeting > 180 ? '#fbbf24'
                  : '#34d399',
              }}>
                {daysSinceMeeting === 0 ? 'Today' : `${daysSinceMeeting} days ago`}
              </span>
              {isLegacyMeetingDate && (
                <span style={{ fontSize: 10, color: 'var(--text-4)', fontStyle: 'italic' }}>
                  (legacy — log a meeting below to start counting)
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-4)' }}>
              No meetings logged yet
            </div>
          )}
        </div>
        <div style={{
          flex: '0 0 auto',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 18px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minWidth: 90,
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
            {meetingCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            {meetingCount === 1 ? 'meeting' : 'meetings'}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
          Next Review Date
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="date" value={nextReview} onChange={e => onMetaChange({ nextReviewDate: e.target.value || null })} style={inputStyle} />
          {daysUntilReview !== null && (
            <span style={{
              fontSize: 12, whiteSpace: 'nowrap', fontWeight: 600,
              color: reviewOverdue ? '#f87171' : daysUntilReview <= 14 ? '#fbbf24' : '#34d399',
            }}>
              {reviewOverdue
                ? `Overdue by ${Math.abs(daysUntilReview)} days`
                : daysUntilReview === 0 ? 'Today'
                : `In ${daysUntilReview} days`}
            </span>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>
            Notes & meetings
          </label>
        </div>
        <NotesLog
          entries={noteEntries}
          onChange={handleNotesChange}
          onTurnIntoTask={(body) => {
            setTaskModalSeed(body);
            setShowTaskModal(true);
          }}
        />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>
            Open tasks {openTasks.length > 0 && (
              <span style={{ marginLeft: 6, color: 'var(--text-4)', fontWeight: 500 }}>· {openTasks.length}</span>
            )}
          </label>
          <button
            type="button"
            onClick={() => { setTaskModalSeed(undefined); setShowTaskModal(true); }}
            disabled={!profile?.id}
            style={{
              padding: '5px 12px', borderRadius: 7,
              border: 'none', cursor: profile?.id ? 'pointer' : 'not-allowed',
              background: '#10b981', color: '#fff',
              fontSize: 12, fontWeight: 600,
              opacity: profile?.id ? 1 : 0.5,
            }}
          >
            + New task
          </button>
        </div>

        {tasksLoading ? (
          <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '12px 0' }}>Loading…</div>
        ) : openTasks.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '20px 16px',
            fontSize: 12, color: 'var(--text-4)',
            border: '1px dashed var(--border)', borderRadius: 10,
          }}>
            No open tasks for this client.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {openTasks.map(task => {
              const overdue = task.dueDate && new Date(task.dueDate + 'T23:59:59') < new Date();
              const today = task.dueDate && (() => {
                const d = new Date();
                const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                return task.dueDate === t;
              })();
              const dueColor = overdue ? '#f87171' : today ? '#fbbf24' : 'var(--text-3)';
              return (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 12px',
                }}>
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task)}
                    title="Mark done"
                    style={{
                      width: 18, height: 18, borderRadius: 5,
                      border: '1.5px solid var(--border)',
                      background: 'transparent', cursor: 'pointer', flexShrink: 0,
                    }}
                  />
                  {task.priority === 'urgent' && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                      background: 'rgba(248,113,113,0.15)', color: '#f87171',
                      border: '1px solid rgba(248,113,113,0.3)', letterSpacing: '0.05em',
                    }}>URGENT</span>
                  )}
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-1)' }}>
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <span style={{ fontSize: 11, color: dueColor, whiteSpace: 'nowrap' }}>
                      {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task)}
                    title="Delete"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-3)', fontSize: 14, padding: '0 2px',
                    }}
                  >×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showTaskModal && profile?.id && (
        <NewTaskModal
          initialClientProfileId={profile.id}
          initialClientName={profile.name}
          initialNotes={taskModalSeed}
          onClose={() => { setShowTaskModal(false); setTaskModalSeed(undefined); }}
          onCreated={() => {
            setShowTaskModal(false);
            setTaskModalSeed(undefined);
            refreshTasks();
          }}
        />
      )}
    </div>
  );
}

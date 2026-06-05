import { supabase } from './supabaseClient';
import { checkLocalStorageMode } from './storageMode';

const LOCAL_KEY = 'fire-local-tasks';
function localLoad(): Task[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}
function localSave(ts: Task[]): void { localStorage.setItem(LOCAL_KEY, JSON.stringify(ts)); }

export interface Task {
  id: string;
  createdBy: string;
  assignedTo: string;
  clientProfileId: string | null;
  clientName: string | null;
  title: string;
  notes: string;
  dueDate: string | null;   // ISO date string "YYYY-MM-DD"
  status: 'todo' | 'done';
  priority: 'normal' | 'urgent';
  createdAt: string;
  completedAt: string | null;
}

function rowToTask(row: any): Task {
  return {
    id: row.id,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    clientProfileId: row.client_profile_id ?? null,
    clientName: row.client_name ?? null,
    title: row.title,
    notes: row.notes ?? '',
    dueDate: row.due_date ?? null,
    status: row.status as 'todo' | 'done',
    priority: (row.priority ?? 'normal') as 'normal' | 'urgent',
    createdAt: row.created_at,
    completedAt: row.completed_at ?? null,
  };
}

export async function listTasks(): Promise<Task[]> {
  if (await checkLocalStorageMode()) return localLoad();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToTask);
}

/** Returns only tasks assigned to the current user (for the personal Tasks page). */
export async function listMyTasks(): Promise<Task[]> {
  if (await checkLocalStorageMode()) return localLoad();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('assigned_to', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToTask);
}

export async function createTask(params: {
  title: string;
  clientProfileId?: string;
  clientName?: string;
  dueDate?: string;
  notes?: string;
  assignedTo?: string;
  priority?: 'normal' | 'urgent';
}): Promise<Task> {
  if (await checkLocalStorageMode()) {
    const task: Task = {
      id: crypto.randomUUID?.() ?? `task-${Date.now()}`,
      createdBy: 'local-dev', assignedTo: 'local-dev',
      clientProfileId: params.clientProfileId ?? null,
      clientName: params.clientName ?? null,
      title: params.title, notes: params.notes ?? '',
      dueDate: params.dueDate ?? null,
      status: 'todo', priority: params.priority ?? 'normal',
      createdAt: new Date().toISOString(), completedAt: null,
    };
    localSave([task, ...localLoad()]);
    return task;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      created_by: user.id,
      assigned_to: params.assignedTo ?? user.id,
      client_profile_id: params.clientProfileId ?? null,
      client_name: params.clientName ?? null,
      title: params.title,
      notes: params.notes ?? '',
      due_date: params.dueDate ?? null,
      status: 'todo',
      priority: params.priority ?? 'normal',
    })
    .select()
    .single();

  if (error) throw error;
  return rowToTask(data);
}

export async function updateTask(
  id: string,
  updates: Partial<Pick<Task, 'title' | 'notes' | 'dueDate' | 'status' | 'completedAt' | 'assignedTo' | 'priority'>>,
): Promise<void> {
  if (await checkLocalStorageMode()) {
    const all = localLoad();
    const t = all.find(x => x.id === id);
    if (t) { Object.assign(t, updates); localSave(all); }
    return;
  }
  const dbUpdates: Record<string, any> = {};

  if (updates.title !== undefined)       dbUpdates.title = updates.title;
  if (updates.notes !== undefined)       dbUpdates.notes = updates.notes;
  if (updates.dueDate !== undefined)     dbUpdates.due_date = updates.dueDate;
  if (updates.status !== undefined)      dbUpdates.status = updates.status;
  if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
  if (updates.assignedTo !== undefined)  dbUpdates.assigned_to = updates.assignedTo;
  if (updates.priority !== undefined)    dbUpdates.priority = updates.priority;

  const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  if (await checkLocalStorageMode()) { localSave(localLoad().filter(t => t.id !== id)); return; }
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function completeTask(id: string, notes: string): Promise<void> {
  if (await checkLocalStorageMode()) {
    const all = localLoad();
    const t = all.find(x => x.id === id);
    if (t) { t.status = 'done'; t.notes = notes; t.completedAt = new Date().toISOString(); localSave(all); }
    return;
  }
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'done', notes, completed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function reopenTask(id: string): Promise<void> {
  if (await checkLocalStorageMode()) {
    const all = localLoad();
    const t = all.find(x => x.id === id);
    if (t) { t.status = 'todo'; t.completedAt = null; localSave(all); }
    return;
  }
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'todo', completed_at: null })
    .eq('id', id);
  if (error) throw error;
}

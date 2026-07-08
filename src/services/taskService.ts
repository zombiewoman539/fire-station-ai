const BASE = '';

export interface Task {
  id: string;
  createdBy: string;
  assignedTo: string;
  clientProfileId: string | null;
  clientName: string | null;
  title: string;
  notes: string;
  dueDate: string | null;
  status: 'todo' | 'done';
  priority: 'normal' | 'urgent';
  createdAt: string;
  completedAt: string | null;
}

function rowToTask(row: any): Task {
  return {
    id: row.id,
    createdBy: row.created_by ?? 'local',
    assignedTo: row.assigned_to ?? 'local',
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

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res;
}

export async function listTasks(): Promise<Task[]> {
  const res = await apiFetch('/api/tasks');
  const rows = await res.json();
  return (rows as any[]).map(rowToTask);
}

export async function listMyTasks(): Promise<Task[]> {
  return listTasks();
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
  const res = await apiFetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: params.title,
      clientProfileId: params.clientProfileId ?? null,
      clientName: params.clientName ?? null,
      dueDate: params.dueDate ?? null,
      notes: params.notes ?? '',
      priority: params.priority ?? 'normal',
    }),
  });
  return rowToTask(await res.json());
}

export async function updateTask(
  id: string,
  updates: Partial<Pick<Task, 'title' | 'notes' | 'dueDate' | 'status' | 'completedAt' | 'assignedTo' | 'priority'>>,
): Promise<void> {
  await apiFetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: updates.title,
      notes: updates.notes,
      dueDate: updates.dueDate,
      status: updates.status,
      completedAt: updates.completedAt,
      priority: updates.priority,
    }),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
}

export async function completeTask(id: string, notes: string): Promise<void> {
  await updateTask(id, { status: 'done', notes, completedAt: new Date().toISOString() });
}

export async function reopenTask(id: string): Promise<void> {
  await updateTask(id, { status: 'todo', completedAt: null });
}

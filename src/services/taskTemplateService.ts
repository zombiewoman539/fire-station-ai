import { createTask } from './taskService';

const BASE = '';

export interface TaskTemplate {
  id: string;
  userId: string;
  title: string;
  notes: string;
  intervalDays: number;
  clientProfileId: string | null;
  clientName: string | null;
  priority: 'normal' | 'urgent';
  lastGeneratedAt: string | null;
  createdAt: string;
}

export const INTERVAL_OPTIONS: { label: string; days: number }[] = [
  { label: 'Weekly',      days: 7 },
  { label: 'Fortnightly', days: 14 },
  { label: 'Monthly',     days: 30 },
  { label: 'Quarterly',   days: 90 },
];

function rowToTemplate(row: any): TaskTemplate {
  return {
    id: row.id,
    userId: row.user_id ?? 'local',
    title: row.title,
    notes: row.notes ?? '',
    intervalDays: row.interval_days,
    clientProfileId: row.client_profile_id ?? null,
    clientName: row.client_name ?? null,
    priority: (row.priority ?? 'normal') as 'normal' | 'urgent',
    lastGeneratedAt: row.last_generated_at ?? null,
    createdAt: row.created_at,
  };
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res;
}

export async function listTemplates(): Promise<TaskTemplate[]> {
  const res = await apiFetch('/api/task-templates');
  const rows = await res.json();
  return (rows as any[]).map(rowToTemplate);
}

export async function createTemplate(params: {
  title: string;
  notes?: string;
  intervalDays: number;
  clientProfileId?: string;
  clientName?: string;
  priority?: 'normal' | 'urgent';
}): Promise<TaskTemplate> {
  const res = await apiFetch('/api/task-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: params.title,
      notes: params.notes ?? '',
      intervalDays: params.intervalDays,
      clientProfileId: params.clientProfileId ?? null,
      clientName: params.clientName ?? null,
      priority: params.priority ?? 'normal',
    }),
  });
  return rowToTemplate(await res.json());
}

export async function updateTemplate(
  id: string,
  updates: Partial<Pick<TaskTemplate, 'title' | 'notes' | 'intervalDays' | 'clientProfileId' | 'clientName' | 'priority'>>,
): Promise<void> {
  await apiFetch(`/api/task-templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: updates.title,
      notes: updates.notes,
      intervalDays: updates.intervalDays,
      clientProfileId: updates.clientProfileId,
      clientName: updates.clientName,
      priority: updates.priority,
    }),
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiFetch(`/api/task-templates/${id}`, { method: 'DELETE' });
}

export async function generateDueTasks(templates: TaskTemplate[]): Promise<number> {
  const today = todayISO();
  let count = 0;

  for (const t of templates) {
    const isDue = t.lastGeneratedAt === null
      ? true
      : daysBetween(t.lastGeneratedAt, today) >= t.intervalDays;

    if (!isDue) continue;

    await createTask({
      title: t.title,
      notes: t.notes || undefined,
      clientProfileId: t.clientProfileId ?? undefined,
      clientName: t.clientName ?? undefined,
      priority: t.priority,
      dueDate: today,
    });

    await apiFetch(`/api/task-templates/${t.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lastGeneratedAt: new Date().toISOString() }),
    });

    count++;
  }

  return count;
}

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA.slice(0, 10) + 'T00:00:00').getTime();
  const b = new Date(isoB.slice(0, 10) + 'T00:00:00').getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

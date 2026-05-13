import { supabase } from './supabaseClient';
import { createTask } from './taskService';

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
    userId: row.user_id,
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

export async function listTemplates(): Promise<TaskTemplate[]> {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToTemplate);
}

export async function createTemplate(params: {
  title: string;
  notes?: string;
  intervalDays: number;
  clientProfileId?: string;
  clientName?: string;
  priority?: 'normal' | 'urgent';
}): Promise<TaskTemplate> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('task_templates')
    .insert({
      user_id: user.id,
      title: params.title,
      notes: params.notes ?? '',
      interval_days: params.intervalDays,
      client_profile_id: params.clientProfileId ?? null,
      client_name: params.clientName ?? null,
      priority: params.priority ?? 'normal',
    })
    .select()
    .single();
  if (error) throw error;
  return rowToTemplate(data);
}

export async function updateTemplate(
  id: string,
  updates: Partial<Pick<TaskTemplate, 'title' | 'notes' | 'intervalDays' | 'clientProfileId' | 'clientName' | 'priority'>>,
): Promise<void> {
  const dbUpdates: Record<string, any> = {};
  if (updates.title !== undefined)           dbUpdates.title = updates.title;
  if (updates.notes !== undefined)           dbUpdates.notes = updates.notes;
  if (updates.intervalDays !== undefined)    dbUpdates.interval_days = updates.intervalDays;
  if (updates.clientProfileId !== undefined) dbUpdates.client_profile_id = updates.clientProfileId;
  if (updates.clientName !== undefined)      dbUpdates.client_name = updates.clientName;
  if (updates.priority !== undefined)        dbUpdates.priority = updates.priority;
  const { error } = await supabase.from('task_templates').update(dbUpdates).eq('id', id);
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('task_templates').delete().eq('id', id);
  if (error) throw error;
}

/** Called on TasksPage mount. Creates a task for every template that is due,
 *  then updates last_generated_at. Only fires for future-from-creation templates
 *  (never retroactively). Returns the number of tasks generated. */
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

    await supabase
      .from('task_templates')
      .update({ last_generated_at: new Date().toISOString() })
      .eq('id', t.id);

    count++;
  }

  return count;
}

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA.slice(0, 10) + 'T00:00:00').getTime();
  const b = new Date(isoB.slice(0, 10) + 'T00:00:00').getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

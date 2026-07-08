import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db';
import crypto from 'crypto';

const router = Router();

function rowToTask(row: any): object {
  return {
    id: row.id,
    created_by: 'local',
    assigned_to: 'local',
    client_profile_id: row.client_profile_id ?? null,
    client_name: row.client_name ?? null,
    title: row.title,
    notes: row.notes ?? '',
    due_date: row.due_date ?? null,
    status: row.status,
    priority: row.priority ?? 'normal',
    created_at: row.created_at,
    completed_at: row.completed_at ?? null,
  };
}

// GET /api/tasks
router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  res.json(rows.map(rowToTask));
});

// POST /api/tasks
router.post('/', (req: Request, res: Response) => {
  const { title, clientProfileId, clientName, dueDate, notes, priority } = req.body as {
    title?: string;
    clientProfileId?: string;
    clientName?: string;
    dueDate?: string;
    notes?: string;
    priority?: string;
  };
  if (!title) { res.status(400).json({ error: 'title required' }); return; }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO tasks (id, title, client_profile_id, client_name, notes, due_date, status, priority, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'todo', ?, ?)
  `).run(
    id,
    title,
    clientProfileId ?? null,
    clientName ?? null,
    notes ?? '',
    dueDate ?? null,
    priority ?? 'normal',
    now,
  );

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.status(201).json(rowToTask(row));
});

// PUT /api/tasks/:id
router.put('/:id', (req: Request, res: Response) => {
  const { title, notes, dueDate, status, completedAt, priority } = req.body as {
    title?: string;
    notes?: string;
    dueDate?: string;
    status?: string;
    completedAt?: string | null;
    priority?: string;
  };

  const updates: string[] = [];
  const values: unknown[] = [];

  if (title !== undefined)       { updates.push('title = ?');        values.push(title); }
  if (notes !== undefined)       { updates.push('notes = ?');        values.push(notes); }
  if (dueDate !== undefined)     { updates.push('due_date = ?');     values.push(dueDate); }
  if (status !== undefined)      { updates.push('status = ?');       values.push(status); }
  if (completedAt !== undefined) { updates.push('completed_at = ?'); values.push(completedAt); }
  if (priority !== undefined)    { updates.push('priority = ?');     values.push(priority); }

  if (updates.length === 0) { res.json({ ok: true }); return; }
  values.push(req.params.id);

  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

// DELETE /api/tasks/:id
router.delete('/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

import { Router } from 'express';
import type { Request, Response } from 'express';
import { readCollection, writeCollection } from '../db';
import crypto from 'crypto';

const router = Router();
const COL = 'tasks';

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
  const rows = readCollection(COL).sort((a, b) => b.created_at.localeCompare(a.created_at));
  res.json(rows.map(rowToTask));
});

// POST /api/tasks
router.post('/', (req: Request, res: Response) => {
  const { title, clientProfileId, clientName, dueDate, notes, priority } = req.body as any;
  if (!title) { res.status(400).json({ error: 'title required' }); return; }
  const row = {
    id: crypto.randomUUID(), title,
    client_profile_id: clientProfileId ?? null,
    client_name: clientName ?? null,
    notes: notes ?? '',
    due_date: dueDate ?? null,
    status: 'todo',
    priority: priority ?? 'normal',
    created_at: new Date().toISOString(),
    completed_at: null,
  };
  const all = readCollection(COL);
  all.push(row);
  writeCollection(COL, all);
  res.status(201).json(rowToTask(row));
});

// PUT /api/tasks/:id
router.put('/:id', (req: Request, res: Response) => {
  const { title, notes, dueDate, status, completedAt, priority } = req.body as any;
  const all = readCollection(COL);
  const row = all.find(r => r.id === req.params.id);
  if (row) {
    if (title !== undefined)       row.title = title;
    if (notes !== undefined)       row.notes = notes;
    if (dueDate !== undefined)     row.due_date = dueDate;
    if (status !== undefined)      row.status = status;
    if (completedAt !== undefined) row.completed_at = completedAt;
    if (priority !== undefined)    row.priority = priority;
    writeCollection(COL, all);
  }
  res.json({ ok: true });
});

// DELETE /api/tasks/:id
router.delete('/:id', (req: Request, res: Response) => {
  writeCollection(COL, readCollection(COL).filter(r => r.id !== req.params.id));
  res.json({ ok: true });
});

export default router;

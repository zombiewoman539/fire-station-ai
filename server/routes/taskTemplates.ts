import { Router } from 'express';
import type { Request, Response } from 'express';
import { readCollection, writeCollection } from '../db';
import crypto from 'crypto';

const router = Router();
const COL = 'task_templates';

function rowToTemplate(row: any): object {
  return {
    id: row.id,
    user_id: 'local',
    title: row.title,
    notes: row.notes ?? '',
    interval_days: row.interval_days,
    client_profile_id: row.client_profile_id ?? null,
    client_name: row.client_name ?? null,
    priority: row.priority ?? 'normal',
    last_generated_at: row.last_generated_at ?? null,
    created_at: row.created_at,
  };
}

// GET /api/task-templates
router.get('/', (_req: Request, res: Response) => {
  const rows = readCollection(COL).sort((a, b) => b.created_at.localeCompare(a.created_at));
  res.json(rows.map(rowToTemplate));
});

// POST /api/task-templates
router.post('/', (req: Request, res: Response) => {
  const { title, notes, intervalDays, clientProfileId, clientName, priority } = req.body as any;
  if (!title) { res.status(400).json({ error: 'title required' }); return; }
  const row = {
    id: crypto.randomUUID(), title,
    notes: notes ?? '',
    interval_days: intervalDays ?? 30,
    client_profile_id: clientProfileId ?? null,
    client_name: clientName ?? null,
    priority: priority ?? 'normal',
    last_generated_at: null,
    created_at: new Date().toISOString(),
  };
  const all = readCollection(COL);
  all.push(row);
  writeCollection(COL, all);
  res.status(201).json(rowToTemplate(row));
});

// PUT /api/task-templates/:id
router.put('/:id', (req: Request, res: Response) => {
  const { title, notes, intervalDays, clientProfileId, clientName, priority, lastGeneratedAt } = req.body as any;
  const all = readCollection(COL);
  const row = all.find(r => r.id === req.params.id);
  if (row) {
    if (title !== undefined)           row.title = title;
    if (notes !== undefined)           row.notes = notes;
    if (intervalDays !== undefined)    row.interval_days = intervalDays;
    if (clientProfileId !== undefined) row.client_profile_id = clientProfileId;
    if (clientName !== undefined)      row.client_name = clientName;
    if (priority !== undefined)        row.priority = priority;
    if (lastGeneratedAt !== undefined) row.last_generated_at = lastGeneratedAt;
    writeCollection(COL, all);
  }
  res.json({ ok: true });
});

// DELETE /api/task-templates/:id
router.delete('/:id', (req: Request, res: Response) => {
  writeCollection(COL, readCollection(COL).filter(r => r.id !== req.params.id));
  res.json({ ok: true });
});

export default router;

import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db';
import crypto from 'crypto';

const router = Router();

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
  const rows = db.prepare('SELECT * FROM task_templates ORDER BY created_at DESC').all();
  res.json(rows.map(rowToTemplate));
});

// POST /api/task-templates
router.post('/', (req: Request, res: Response) => {
  const { title, notes, intervalDays, clientProfileId, clientName, priority } = req.body as {
    title?: string;
    notes?: string;
    intervalDays?: number;
    clientProfileId?: string;
    clientName?: string;
    priority?: string;
  };
  if (!title) { res.status(400).json({ error: 'title required' }); return; }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO task_templates (id, title, notes, interval_days, client_profile_id, client_name, priority, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    title,
    notes ?? '',
    intervalDays ?? 30,
    clientProfileId ?? null,
    clientName ?? null,
    priority ?? 'normal',
    now,
  );

  const row = db.prepare('SELECT * FROM task_templates WHERE id = ?').get(id);
  res.status(201).json(rowToTemplate(row));
});

// PUT /api/task-templates/:id
router.put('/:id', (req: Request, res: Response) => {
  const { title, notes, intervalDays, clientProfileId, clientName, priority, lastGeneratedAt } =
    req.body as {
      title?: string;
      notes?: string;
      intervalDays?: number;
      clientProfileId?: string;
      clientName?: string;
      priority?: string;
      lastGeneratedAt?: string | null;
    };

  const updates: string[] = [];
  const values: unknown[] = [];

  if (title !== undefined)           { updates.push('title = ?');              values.push(title); }
  if (notes !== undefined)           { updates.push('notes = ?');              values.push(notes); }
  if (intervalDays !== undefined)    { updates.push('interval_days = ?');      values.push(intervalDays); }
  if (clientProfileId !== undefined) { updates.push('client_profile_id = ?'); values.push(clientProfileId); }
  if (clientName !== undefined)      { updates.push('client_name = ?');        values.push(clientName); }
  if (priority !== undefined)        { updates.push('priority = ?');           values.push(priority); }
  if (lastGeneratedAt !== undefined) { updates.push('last_generated_at = ?'); values.push(lastGeneratedAt); }

  if (updates.length === 0) { res.json({ ok: true }); return; }
  values.push(req.params.id);

  db.prepare(`UPDATE task_templates SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

// DELETE /api/task-templates/:id
router.delete('/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM task_templates WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

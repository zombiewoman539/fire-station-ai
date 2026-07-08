import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db';
import crypto from 'crypto';

const router = Router();

function rowToView(row: any): object {
  return {
    id: row.id,
    owner_id: 'local',
    org_id: null,
    scope: row.scope,
    name: row.name,
    dashboard_kind: row.dashboard_kind,
    config: typeof row.config === 'string' ? JSON.parse(row.config || '{}') : row.config,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// GET /api/saved-views
router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM saved_views ORDER BY updated_at DESC').all();
  res.json(rows.map(rowToView));
});

// POST /api/saved-views
router.post('/', (req: Request, res: Response) => {
  const { name, dashboardKind, config, scope } = req.body as {
    name?: string;
    dashboardKind?: string;
    config?: unknown;
    scope?: string;
  };
  if (!name) { res.status(400).json({ error: 'name required' }); return; }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO saved_views (id, name, dashboard_kind, config, scope, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    dashboardKind ?? 'advisor',
    JSON.stringify(config ?? {}),
    scope ?? 'personal',
    now,
    now,
  );

  const row = db.prepare('SELECT * FROM saved_views WHERE id = ?').get(id);
  res.status(201).json(rowToView(row));
});

// PUT /api/saved-views/:id
router.put('/:id', (req: Request, res: Response) => {
  const { name, config } = req.body as { name?: string; config?: unknown };
  const updates: string[] = ['updated_at = ?'];
  const values: unknown[] = [new Date().toISOString()];

  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (config !== undefined) { updates.push('config = ?'); values.push(JSON.stringify(config)); }
  values.push(req.params.id);

  db.prepare(`UPDATE saved_views SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

// DELETE /api/saved-views/:id
router.delete('/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM saved_views WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

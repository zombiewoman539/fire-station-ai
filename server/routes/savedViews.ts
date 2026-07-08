import { Router } from 'express';
import type { Request, Response } from 'express';
import { readCollection, writeCollection } from '../db';
import crypto from 'crypto';

const router = Router();
const COL = 'saved_views';

function rowToView(row: any): object {
  return {
    id: row.id,
    owner_id: 'local',
    org_id: null,
    scope: row.scope ?? 'personal',
    name: row.name,
    dashboard_kind: row.dashboard_kind,
    config: row.config ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// GET /api/saved-views
router.get('/', (_req: Request, res: Response) => {
  const rows = readCollection(COL).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  res.json(rows.map(rowToView));
});

// POST /api/saved-views
router.post('/', (req: Request, res: Response) => {
  const { name, dashboardKind, config, scope } = req.body as any;
  if (!name) { res.status(400).json({ error: 'name required' }); return; }
  const now = new Date().toISOString();
  const row = { id: crypto.randomUUID(), name, dashboard_kind: dashboardKind ?? 'advisor', config: config ?? {}, scope: scope ?? 'personal', created_at: now, updated_at: now };
  const all = readCollection(COL);
  all.push(row);
  writeCollection(COL, all);
  res.status(201).json(rowToView(row));
});

// PUT /api/saved-views/:id
router.put('/:id', (req: Request, res: Response) => {
  const { name, config } = req.body as any;
  const all = readCollection(COL);
  const row = all.find(r => r.id === req.params.id);
  if (row) {
    if (name !== undefined) row.name = name;
    if (config !== undefined) row.config = config;
    row.updated_at = new Date().toISOString();
    writeCollection(COL, all);
  }
  res.json({ ok: true });
});

// DELETE /api/saved-views/:id
router.delete('/:id', (req: Request, res: Response) => {
  writeCollection(COL, readCollection(COL).filter(r => r.id !== req.params.id));
  res.json({ ok: true });
});

export default router;

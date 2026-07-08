import { Router } from 'express';
import type { Request, Response } from 'express';
import { readCollection, writeCollection } from '../db';
import crypto from 'crypto';

const router = Router();
const COL = 'profiles';

function active(rows: any[]) {
  return rows
    .filter(r => !r.deleted_at)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function rowToProfile(row: any): object {
  return {
    id: row.id,
    name: row.name,
    user_id: 'local',
    inputs: row.inputs ?? {},
    tags: row.tags ?? [],
    meta: row.meta ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? null,
  };
}

// GET /api/profiles
router.get('/', (_req: Request, res: Response) => {
  res.json(active(readCollection(COL)).map(rowToProfile));
});

// GET /api/profiles/paged?page=0&pageSize=50
router.get('/paged', (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page ?? '0'), 10);
  const pageSize = parseInt(String(req.query.pageSize ?? '50'), 10);
  const all = active(readCollection(COL));
  const slice = all.slice(page * pageSize, (page + 1) * pageSize);
  res.json({ data: slice.map(rowToProfile), hasMore: all.length > (page + 1) * pageSize });
});

// GET /api/profiles/deleted
router.get('/deleted', (_req: Request, res: Response) => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const deleted = readCollection(COL)
    .filter(r => r.deleted_at && r.deleted_at >= cutoff)
    .sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
  res.json(deleted.map(rowToProfile));
});

// GET /api/profiles/:id
router.get('/:id', (req: Request, res: Response) => {
  const row = readCollection(COL).find(r => r.id === req.params.id && !r.deleted_at);
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(rowToProfile(row));
});

// POST /api/profiles
router.post('/', (req: Request, res: Response) => {
  const { name, inputs, tags, meta } = req.body as any;
  if (!name) { res.status(400).json({ error: 'name required' }); return; }
  const now = new Date().toISOString();
  const row = { id: crypto.randomUUID(), name, inputs: inputs ?? {}, tags: tags ?? [], meta: meta ?? {}, created_at: now, updated_at: now, deleted_at: null };
  const all = readCollection(COL);
  all.push(row);
  writeCollection(COL, all);
  res.status(201).json(rowToProfile(row));
});

// PUT /api/profiles/:id
router.put('/:id', (req: Request, res: Response) => {
  const { name, inputs, tags, meta } = req.body as any;
  const now = new Date().toISOString();
  const all = readCollection(COL);
  const idx = all.findIndex(r => r.id === req.params.id);
  if (idx >= 0) {
    if (name !== undefined) all[idx].name = name;
    if (inputs !== undefined) all[idx].inputs = inputs;
    if (tags !== undefined) all[idx].tags = tags;
    if (meta !== undefined) all[idx].meta = meta;
    all[idx].updated_at = now;
  } else {
    all.push({ id: req.params.id, name: name ?? 'New Client', inputs: inputs ?? {}, tags: tags ?? [], meta: meta ?? {}, created_at: now, updated_at: now, deleted_at: null });
  }
  writeCollection(COL, all);
  res.json(rowToProfile(all.find(r => r.id === req.params.id)));
});

// PATCH /api/profiles/:id/rename
router.patch('/:id/rename', (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name) { res.status(400).json({ error: 'name required' }); return; }
  const all = readCollection(COL);
  const row = all.find(r => r.id === req.params.id);
  if (row) { row.name = name; row.updated_at = new Date().toISOString(); writeCollection(COL, all); }
  res.json({ ok: true });
});

// DELETE /api/profiles/:id — soft delete
router.delete('/:id', (req: Request, res: Response) => {
  const all = readCollection(COL);
  const row = all.find(r => r.id === req.params.id);
  if (row) { row.deleted_at = new Date().toISOString(); writeCollection(COL, all); }
  res.json({ ok: true });
});

// POST /api/profiles/:id/restore
router.post('/:id/restore', (req: Request, res: Response) => {
  const all = readCollection(COL);
  const row = all.find(r => r.id === req.params.id);
  if (row) { row.deleted_at = null; writeCollection(COL, all); }
  res.json({ ok: true });
});

export function purgeExpiredDeletions(): void {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const all = readCollection(COL);
  writeCollection(COL, all.filter(r => !r.deleted_at || r.deleted_at >= cutoff));
}

export default router;

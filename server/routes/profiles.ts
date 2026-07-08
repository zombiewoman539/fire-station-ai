import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db';
import crypto from 'crypto';

const router = Router();

function rowToProfile(row: any): object {
  return {
    id: row.id,
    name: row.name,
    user_id: 'local',
    inputs: JSON.parse(row.inputs || '{}'),
    tags: JSON.parse(row.tags || '[]'),
    meta: JSON.parse(row.meta || '{}'),
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? null,
  };
}

// GET /api/profiles — list active (non-deleted)
router.get('/', (_req: Request, res: Response) => {
  const rows = db
    .prepare('SELECT * FROM client_profiles WHERE deleted_at IS NULL ORDER BY updated_at DESC')
    .all();
  res.json(rows.map(rowToProfile));
});

// GET /api/profiles/paged?page=0&pageSize=50
router.get('/paged', (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page ?? '0'), 10);
  const pageSize = parseInt(String(req.query.pageSize ?? '50'), 10);
  const offset = page * pageSize;

  const total = (
    db
      .prepare('SELECT COUNT(*) as count FROM client_profiles WHERE deleted_at IS NULL')
      .get() as { count: number }
  ).count;

  const rows = db
    .prepare(
      'SELECT * FROM client_profiles WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT ? OFFSET ?',
    )
    .all(pageSize, offset);

  res.json({ data: rows.map(rowToProfile), hasMore: total > offset + pageSize });
});

// GET /api/profiles/deleted — soft-deleted within the last 7 days
router.get('/deleted', (_req: Request, res: Response) => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const rows = db
    .prepare(
      'SELECT * FROM client_profiles WHERE deleted_at IS NOT NULL AND deleted_at >= ? ORDER BY deleted_at DESC',
    )
    .all(cutoff);
  res.json(rows.map(rowToProfile));
});

// GET /api/profiles/:id
router.get('/:id', (req: Request, res: Response) => {
  const row = db
    .prepare('SELECT * FROM client_profiles WHERE id = ? AND deleted_at IS NULL')
    .get(req.params.id);
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(rowToProfile(row));
});

// POST /api/profiles — create
router.post('/', (req: Request, res: Response) => {
  const { name, inputs, tags, meta } = req.body as {
    name?: string;
    inputs?: unknown;
    tags?: unknown;
    meta?: unknown;
  };
  if (!name) { res.status(400).json({ error: 'name required' }); return; }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO client_profiles (id, name, inputs, tags, meta, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    JSON.stringify(inputs ?? {}),
    JSON.stringify(tags ?? []),
    JSON.stringify(meta ?? {}),
    now,
    now,
  );

  const row = db.prepare('SELECT * FROM client_profiles WHERE id = ?').get(id);
  res.status(201).json(rowToProfile(row));
});

// PUT /api/profiles/:id — upsert/save
router.put('/:id', (req: Request, res: Response) => {
  const { name, inputs, tags, meta } = req.body as {
    name?: string;
    inputs?: unknown;
    tags?: unknown;
    meta?: unknown;
  };
  const now = new Date().toISOString();

  const existing = db
    .prepare('SELECT id FROM client_profiles WHERE id = ?')
    .get(req.params.id);

  if (existing) {
    const updates: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (inputs !== undefined) { updates.push('inputs = ?'); values.push(JSON.stringify(inputs)); }
    if (tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(tags)); }
    if (meta !== undefined) { updates.push('meta = ?'); values.push(JSON.stringify(meta)); }
    values.push(req.params.id);

    db.prepare(`UPDATE client_profiles SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  } else {
    db.prepare(`
      INSERT INTO client_profiles (id, name, inputs, tags, meta, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.id,
      name ?? 'New Client',
      JSON.stringify(inputs ?? {}),
      JSON.stringify(tags ?? []),
      JSON.stringify(meta ?? {}),
      now,
      now,
    );
  }

  const row = db.prepare('SELECT * FROM client_profiles WHERE id = ?').get(req.params.id);
  res.json(rowToProfile(row));
});

// PATCH /api/profiles/:id/rename
router.patch('/:id/rename', (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name) { res.status(400).json({ error: 'name required' }); return; }
  db.prepare('UPDATE client_profiles SET name = ?, updated_at = ? WHERE id = ?').run(
    name,
    new Date().toISOString(),
    req.params.id,
  );
  res.json({ ok: true });
});

// DELETE /api/profiles/:id — soft delete
router.delete('/:id', (req: Request, res: Response) => {
  db.prepare('UPDATE client_profiles SET deleted_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    req.params.id,
  );
  res.json({ ok: true });
});

// POST /api/profiles/:id/restore
router.post('/:id/restore', (req: Request, res: Response) => {
  db.prepare('UPDATE client_profiles SET deleted_at = NULL WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Purge soft-deleted records older than 7 days (runs automatically on list)
export function purgeExpiredDeletions(): void {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM client_profiles WHERE deleted_at IS NOT NULL AND deleted_at < ?').run(cutoff);
}

export default router;

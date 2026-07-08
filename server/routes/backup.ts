import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { DATA_DIR, readCollection } from '../db';

const router = Router();

const COLLECTIONS = ['profiles', 'saved-views', 'tasks', 'task-templates'] as const;

// GET /api/backup/status — last modified times per collection
router.get('/status', (_req, res) => {
  const files: Record<string, string | null> = {};
  for (const name of COLLECTIONS) {
    const fp = path.join(DATA_DIR, `${name}.json`);
    if (fs.existsSync(fp)) {
      files[name] = fs.statSync(fp).mtime.toISOString();
    } else {
      files[name] = null;
    }
  }
  // Latest mtime across all files
  const mtimes = Object.values(files).filter(Boolean) as string[];
  const lastUpdated = mtimes.length
    ? mtimes.reduce((a, b) => (a > b ? a : b))
    : null;
  res.json({ lastUpdated, files });
});

// GET /api/backup/export — download full backup as JSON
router.get('/export', (_req, res) => {
  const data: Record<string, any[]> = {};
  for (const name of COLLECTIONS) {
    data[name] = readCollection(name);
  }

  const backup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data,
  };

  const filename = `firestation-backup-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(backup, null, 2));
});

export default router;

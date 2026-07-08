import express from 'express';
import type { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { requireAuth } from './auth';
import { refreshLicenseIfDue } from './license';
import { purgeExpiredDeletions } from './routes/profiles';
import authRouter from './routes/auth';
import profilesRouter from './routes/profiles';
import savedViewsRouter from './routes/savedViews';
import tasksRouter from './routes/tasks';
import taskTemplatesRouter from './routes/taskTemplates';
import calculateRouter from './routes/calculate';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Auth routes — no session required
app.use('/api/auth', authRouter);

// All other API routes require a valid session
app.use('/api/profiles', requireAuth, profilesRouter);
app.use('/api/saved-views', requireAuth, savedViewsRouter);
app.use('/api/tasks', requireAuth, tasksRouter);
app.use('/api/task-templates', requireAuth, taskTemplatesRouter);
app.use('/api/calculate', requireAuth, calculateRouter);

// In a pkg binary, __dirname is a virtual snapshot path; the real build folder
// sits next to the executable on disk.
const isPkg = !!(process as any).pkg;
const BUILD_DIR = isPkg
  ? path.join(path.dirname(process.execPath), 'build')
  : path.join(__dirname, '..', 'build');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':  'font/ttf',
  '.map':  'application/json',
};

app.use((req: Request, res: Response) => {
  const ext = path.extname(req.path);
  const filePath = path.join(BUILD_DIR, req.path);

  // Serve known static asset if it exists
  if (ext && fs.existsSync(filePath)) {
    res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
    res.send(fs.readFileSync(filePath));
    return;
  }

  // Serve index.html for all other paths (SPA client-side routing)
  const indexPath = path.join(BUILD_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(fs.readFileSync(indexPath, 'utf8'));
  } else {
    res.status(404).send('App not built — run npm run build');
  }
});

app.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`FIRE Station running at ${url}`);
  refreshLicenseIfDue().catch(() => {});
  purgeExpiredDeletions();
  const cmd = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
  exec(cmd, () => {});
});

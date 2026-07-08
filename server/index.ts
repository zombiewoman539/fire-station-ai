import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { exec } from 'child_process';
import { requireAuth } from './auth';
import { refreshLicenseIfDue } from './license';
import { purgeExpiredDeletions } from './routes/profiles';
import authRouter from './routes/auth';
import profilesRouter from './routes/profiles';
import savedViewsRouter from './routes/savedViews';
import tasksRouter from './routes/tasks';
import taskTemplatesRouter from './routes/taskTemplates';

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

// Serve React build in production
const BUILD_DIR = path.join(__dirname, '..', 'build');
app.use(express.static(BUILD_DIR));
app.get('/*splat', (_req, res) => {
  res.sendFile(path.join(BUILD_DIR, 'index.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`FIRE Station running at ${url}`);
  refreshLicenseIfDue().catch(() => {});
  purgeExpiredDeletions();
  const cmd = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
  exec(cmd, () => {});
});

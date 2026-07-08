import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { getSetting, setSetting } from './db';

const SESSIONS = new Map<string, { createdAt: number }>();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function createSession(): string {
  const token = crypto.randomBytes(32).toString('hex');
  SESSIONS.set(token, { createdAt: Date.now() });
  return token;
}

export function destroySession(token: string): void {
  SESSIONS.delete(token);
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const session = SESSIONS.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    SESSIONS.delete(token);
    return false;
  }
  return true;
}

export async function setPassword(password: string): Promise<void> {
  const hash = await bcrypt.hash(password, 12);
  setSetting('password_hash', hash);
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = getSetting('password_hash');
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export function hasPassword(): boolean {
  return getSetting('password_hash') !== null;
}

export function isFirstRun(): boolean {
  return getSetting('license_key') === null || getSetting('password_hash') === null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.session as string | undefined;
  if (!isValidSession(token)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
}

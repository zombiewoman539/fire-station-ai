import fs from 'fs';
import path from 'path';
import os from 'os';

export const DATA_DIR = path.join(os.homedir(), 'Documents', 'FIRE Station');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(name: string): string {
  return path.join(DATA_DIR, `${name}.json`);
}

function readJson<T>(name: string, fallback: T): T {
  const fp = filePath(name);
  if (!fs.existsSync(fp)) return fallback;
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return fallback; }
}

function writeJson(name: string, data: unknown): void {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf8');
}

// ── Collections ────────────────────────────────────────────────────────────────

export function readCollection(name: string): any[] {
  return readJson<any[]>(name, []);
}

export function writeCollection(name: string, data: any[]): void {
  writeJson(name, data);
}

// ── Settings (key-value store) ────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const settings = readJson<Record<string, string>>('settings', {});
  return settings[key] ?? null;
}

export function setSetting(key: string, value: string): void {
  const settings = readJson<Record<string, string>>('settings', {});
  settings[key] = value;
  writeJson('settings', settings);
}

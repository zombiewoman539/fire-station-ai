import { ClientProfile } from '../profileTypes';
import { FireInputs } from '../types';
import { defaultInputs } from '../defaults';

const STORAGE_KEY = 'fire-profiles';
const ACTIVE_KEY = 'fire-active-profile';

function readAll(): ClientProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(profiles: ClientProfile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function listProfiles(): ClientProfile[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getProfile(id: string): ClientProfile | null {
  return readAll().find(p => p.id === id) || null;
}

export function saveProfile(profile: ClientProfile): void {
  const profiles = readAll();
  const idx = profiles.findIndex(p => p.id === profile.id);
  const updated = { ...profile, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    profiles[idx] = updated;
  } else {
    profiles.push(updated);
  }
  writeAll(profiles);
}

export function deleteProfile(id: string): void {
  writeAll(readAll().filter(p => p.id !== id));
  if (getActiveProfileId() === id) {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

export function renameProfile(id: string, newName: string): void {
  const profile = getProfile(id);
  if (profile) {
    saveProfile({ ...profile, name: newName });
  }
}

export function createProfile(name: string, inputs?: FireInputs): ClientProfile {
  const profile: ClientProfile = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    inputs: inputs || { ...defaultInputs },
  };
  saveProfile(profile);
  return profile;
}

export function duplicateProfile(sourceId: string, newName: string): ClientProfile | null {
  const source = getProfile(sourceId);
  if (!source) return null;
  return createProfile(newName, JSON.parse(JSON.stringify(source.inputs)));
}

export function setActiveProfileId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function exportProfile(profile: ClientProfile): string {
  return JSON.stringify(profile, null, 2);
}

export function importProfile(json: string): ClientProfile {
  const parsed = JSON.parse(json);
  // Re-generate ID and timestamps so imports don't collide
  const profile: ClientProfile = {
    id: crypto.randomUUID(),
    name: parsed.name || 'Imported Client',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    inputs: parsed.inputs || defaultInputs,
  };
  saveProfile(profile);
  return profile;
}

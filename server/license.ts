import { getSetting, setSetting } from './db';
import os from 'os';
import crypto from 'crypto';

const APP_VERSION = '1.0.0';
const LICENSE_SERVER = 'https://license.firestation.app/verify';
const GRACE_DAYS = 7;

function getMachineId(): string {
  let id = getSetting('machine_id');
  if (!id) {
    id = crypto
      .createHash('sha256')
      .update(os.hostname() + os.platform() + os.arch())
      .digest('hex')
      .slice(0, 32);
    setSetting('machine_id', id);
  }
  return id;
}

export function isLicenseValid(): boolean {
  const valid = getSetting('license_valid');
  if (valid === 'true') return true;

  // Grace period: if we have a key and checked within GRACE_DAYS, still valid
  const lastChecked = getSetting('license_last_checked');
  if (lastChecked && getSetting('license_key')) {
    const daysSince = (Date.now() - new Date(lastChecked).getTime()) / 86400000;
    if (daysSince <= GRACE_DAYS) return true;
  }

  return false;
}

export function getLicenseTier(): string {
  return getSetting('license_tier') ?? 'pro';
}

export function getLicenseExpiry(): string | null {
  return getSetting('license_expires_at');
}

export async function verifyLicenseKey(
  key: string,
): Promise<{ valid: boolean; tier: string; expiresAt: string | null }> {
  // Dev bypass — never reaches production license server
  if (key.trim().toUpperCase() === 'DEV-LOCAL') {
    const result = { valid: true, tier: 'pro', expiresAt: '2099-12-31T00:00:00.000Z' };
    setSetting('license_key', key.trim());
    setSetting('license_valid', 'true');
    setSetting('license_tier', result.tier);
    setSetting('license_expires_at', result.expiresAt);
    setSetting('license_last_checked', new Date().toISOString());
    return result;
  }

  try {
    const res = await fetch(LICENSE_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, machineId: getMachineId(), version: APP_VERSION }),
    });
    if (!res.ok) return { valid: false, tier: 'pro', expiresAt: null };

    const data = (await res.json()) as { valid: boolean; tier: string; expiresAt: string | null };

    if (data.valid) {
      setSetting('license_key', key);
      setSetting('license_valid', 'true');
      setSetting('license_tier', data.tier ?? 'pro');
      setSetting('license_expires_at', data.expiresAt ?? '');
      setSetting('license_last_checked', new Date().toISOString());
    }

    return data;
  } catch {
    // Can't reach license server — accept if this key was previously validated
    const cachedKey = getSetting('license_key');
    if (cachedKey === key && getSetting('license_valid') === 'true') {
      return { valid: true, tier: getLicenseTier(), expiresAt: getLicenseExpiry() };
    }
    return { valid: false, tier: 'pro', expiresAt: null };
  }
}

export async function refreshLicenseIfDue(): Promise<void> {
  const key = getSetting('license_key');
  if (!key) return;

  const lastChecked = getSetting('license_last_checked');
  if (lastChecked) {
    const daysSince = (Date.now() - new Date(lastChecked).getTime()) / 86400000;
    if (daysSince < GRACE_DAYS) return;
  }

  try {
    const res = await fetch(LICENSE_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, machineId: getMachineId(), version: APP_VERSION }),
    });
    if (!res.ok) return;

    const data = (await res.json()) as { valid: boolean; tier: string; expiresAt: string | null };
    setSetting('license_valid', String(data.valid));
    if (data.tier) setSetting('license_tier', data.tier);
    if (data.expiresAt) setSetting('license_expires_at', data.expiresAt);
    setSetting('license_last_checked', new Date().toISOString());
  } catch {
    // Offline — grace period applies via isLicenseValid()
  }
}

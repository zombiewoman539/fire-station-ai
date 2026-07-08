import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  createSession, destroySession, isValidSession,
  setPassword, verifyPassword, isFirstRun,
} from '../auth';
import { verifyLicenseKey, getLicenseTier, getLicenseExpiry, isLicenseValid } from '../license';
import { getSetting } from '../db';

const router = Router();
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

router.get('/status', (req: Request, res: Response) => {
  const token = req.cookies?.session as string | undefined;
  res.json({
    authenticated: isValidSession(token),
    firstRun: isFirstRun(),
    hasLicense: getSetting('license_key') !== null,
    licenseValid: isLicenseValid(),
    tier: getLicenseTier(),
    expiresAt: getLicenseExpiry(),
    licenseKey: getSetting('license_key') ? '••••••••' : null,
  });
});

router.post('/login', async (req: Request, res: Response) => {
  const { password } = req.body as { password?: string };
  if (!password) { res.status(400).json({ error: 'Password required' }); return; }

  const ok = await verifyPassword(password);
  if (!ok) { res.status(401).json({ error: 'Invalid password' }); return; }

  const token = createSession();
  res.cookie('session', token, { httpOnly: true, sameSite: 'strict', maxAge: SESSION_MAX_AGE });
  res.json({ ok: true });
});

router.post('/logout', (req: Request, res: Response) => {
  const token = req.cookies?.session as string | undefined;
  if (token) destroySession(token);
  res.clearCookie('session');
  res.json({ ok: true });
});

// First-run: step 1 = validate license key; step 2 = set password
router.post('/setup', async (req: Request, res: Response) => {
  const { licenseKey, password } = req.body as { licenseKey?: string; password?: string };

  if (licenseKey) {
    const result = await verifyLicenseKey(licenseKey);
    if (!result.valid) {
      res.status(400).json({ error: 'Invalid or expired license key' });
      return;
    }
    res.json({ ok: true, tier: result.tier, expiresAt: result.expiresAt });
    return;
  }

  if (password) {
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }
    await setPassword(password);
    const token = createSession();
    res.cookie('session', token, { httpOnly: true, sameSite: 'strict', maxAge: SESSION_MAX_AGE });
    res.json({ ok: true });
    return;
  }

  res.status(400).json({ error: 'licenseKey or password required' });
});

router.post('/change-password', async (req: Request, res: Response) => {
  const token = req.cookies?.session as string | undefined;
  if (!isValidSession(token)) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword required' });
    return;
  }

  const ok = await verifyPassword(currentPassword);
  if (!ok) { res.status(401).json({ error: 'Current password incorrect' }); return; }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  await setPassword(newPassword);
  res.json({ ok: true });
});

export default router;

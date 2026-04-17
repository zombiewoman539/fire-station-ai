import { InsurancePolicy } from './types';

const PERIOD_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  'semi-annual': 6,
  annual: 12,
};

/**
 * Given a base due date and frequency, advance by the recurrence period until
 * we land on the next occurrence that is >= today.
 * Returns null if no valid base date is provided.
 */
export function nextOccurrence(baseISO: string | null, frequency: string): Date | null {
  if (!baseISO) return null;
  const periodMonths = PERIOD_MONTHS[frequency] ?? 12;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const base = new Date(baseISO);
  let next = new Date(base);

  // Advance by full periods until we reach today or beyond
  while (next < today) {
    next = new Date(next);
    next.setMonth(next.getMonth() + periodMonths);
  }

  return next;
}

/**
 * Days until the next occurrence (negative = overdue, 0 = today).
 */
export function daysUntilNext(baseISO: string | null, frequency: string): number | null {
  const next = nextOccurrence(baseISO, frequency);
  if (!next) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Whether a policy's premium payment period is still active.
 * - whole-life: always active
 * - limited: active only if today is before commencementDate + premiumLimitedYears
 *   Falls back to premiumNextDueDate as the reference if commencementDate is missing.
 */
export function isPremiumActive(policy: InsurancePolicy): boolean {
  if (policy.premiumPaymentTerm !== 'limited') return true;
  if (!policy.premiumLimitedYears || policy.premiumLimitedYears <= 0) return true;

  const refISO = policy.commencementDate ?? policy.premiumNextDueDate;
  if (!refISO) return true; // no reference date — assume still active

  const ref = new Date(refISO);
  const payUntil = new Date(ref);
  payUntil.setFullYear(payUntil.getFullYear() + policy.premiumLimitedYears);

  return new Date() < payUntil;
}

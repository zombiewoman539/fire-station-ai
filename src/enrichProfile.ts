import { ClientProfile } from './profileTypes';
import { calculate } from './calculations';
import { FireResults } from './types';
import { computeInsurance, InsuranceSummary } from './insuranceCompute';
import { Task } from './services/taskService';
import { daysUntilNext, isPremiumActive, nextOccurrence } from './premiumUtils';

/** Anything we can derive from a profile that filters / columns might need. Computed once per profile. */
export interface EnrichedProfile {
  profile: ClientProfile;
  results: FireResults;

  // Demographics
  liveAge: number;
  annualIncome: number;

  // FIRE
  fireOnTrack: boolean;
  fireGap: number | null;        // null if on-track
  fireSurplus: number | null;    // null if shortfall
  wealthAtRetirement: number;

  // Insurance summary (death/CI/ECI/TPD gaps + signal score etc.)
  insurance: InsuranceSummary;
  totalDeathSA: number;
  totalPremiumPA: number;
  hasMissingInsurance: boolean;
  hasMissingEstate: boolean;

  // Activity
  daysSinceMeeting: number | null;     // null if never met
  daysUntilReview: number | null;      // null if no nextReviewDate; negative = overdue
  reviewOverdue: boolean;
  hasOpenTask: boolean;
  hasNotes: boolean;
  meetingCount: number;

  // Premiums (for the "due-soon" built-in)
  nearestDueDays: number | null;       // min daysUntil across in-force premiums in the next 90d

  // Source metadata for sorting
  daysSinceUpdate: number;             // since profile.updatedAt

  // Manager-view extras (only present when viewed from ManagerDashboardPage)
  advisorUserId?: string;
  advisorEmail?: string;
}

function getLiveAge(profile: ClientProfile): number {
  const dob = profile.inputs.personal?.dateOfBirth;
  if (dob) {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--;
    return age;
  }
  return profile.inputs.personal?.currentAge ?? 0;
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

const FREQ_MULT: Record<string, number> = { monthly: 12, quarterly: 4, 'semi-annual': 2, annual: 1 };

interface EnrichOptions {
  /** Tasks for this caller; filtered to clientProfileId === profile.id when looking up hasOpenTask. */
  tasks: Task[];
}

export function enrichProfile(profile: ClientProfile, opts: EnrichOptions): EnrichedProfile {
  const results = calculate(profile.inputs);
  const liveAge = getLiveAge(profile);
  const policies = profile.inputs.policies ?? [];
  const inForce = policies.filter(p => p.policyStatus === 'in-force');
  const totalDeathSA = inForce.reduce((s, p) => s + (p.deathSumAssured || 0), 0);
  const totalPremiumPA = inForce.reduce((s, p) => s + (p.premiumAmount || 0) * (FREQ_MULT[p.premiumFrequency] || 12), 0);
  const hasMissingInsurance = inForce.length === 0 || totalDeathSA === 0;
  const ep = profile.inputs.estatePlanning;
  const hasMissingEstate = !ep?.lpa || !ep?.will;

  const daysSinceMeeting = daysSince(profile.lastMeetingDate);
  const reviewDate = profile.nextReviewDate ? new Date(profile.nextReviewDate) : null;
  const reviewOverdue = reviewDate ? reviewDate < new Date() : false;
  const daysUntilReview = reviewDate
    ? Math.ceil((reviewDate.getTime() - Date.now()) / 86400000)
    : null;

  const noteEntries = profile.noteEntries ?? [];
  const hasNotes = noteEntries.length > 0;
  const meetingCount = noteEntries.filter(e => e.meetingDate).length;

  const ownTasks = opts.tasks.filter(t => t.clientProfileId === profile.id);
  const hasOpenTask = ownTasks.some(t => t.status === 'todo');

  const inForceDates = inForce
    .filter(p => p.premiumNextDueDate && isPremiumActive(p))
    .map(p => daysUntilNext(p.premiumNextDueDate, p.premiumFrequency))
    .filter((d): d is number => d !== null);
  const nearestDueDays = inForceDates.length > 0 ? Math.min(...inForceDates) : null;

  const daysSinceUpdate = daysSince(profile.updatedAt) ?? 0;
  const insurance = computeInsurance(profile.inputs, daysSinceUpdate);

  return {
    profile,
    results,
    liveAge,
    annualIncome: profile.inputs.income?.annualIncome ?? 0,
    fireOnTrack: results.onTrack,
    fireGap: results.onTrack ? null : (results.fireNumber - results.wealthAtRetirement),
    fireSurplus: results.onTrack ? (results.wealthAtRetirement - results.fireNumber) : null,
    wealthAtRetirement: results.wealthAtRetirement,
    insurance,
    totalDeathSA,
    totalPremiumPA,
    hasMissingInsurance,
    hasMissingEstate,
    daysSinceMeeting,
    daysUntilReview,
    reviewOverdue,
    hasOpenTask,
    hasNotes,
    meetingCount,
    nearestDueDays,
    daysSinceUpdate,
    advisorUserId: (profile as any).advisorUserId as string | undefined,
    advisorEmail: (profile as any).advisorEmail as string | undefined,
  };
}

export function enrichProfiles(profiles: ClientProfile[], opts: EnrichOptions): EnrichedProfile[] {
  return profiles.map(p => enrichProfile(p, opts));
}

// Re-export shared helpers other components may want
export { getLiveAge, daysSince, nextOccurrence };

import { ClientProfile } from './profileTypes';
import { FireResults } from './types';
import { InsuranceSummary } from './insuranceCompute';
import { Task } from './services/taskService';
import { daysUntilNext, isPremiumActive, nextOccurrence } from './premiumUtils';

export interface EnrichedProfile {
  profile: ClientProfile;
  results: FireResults;

  liveAge: number;
  annualIncome: number;

  fireOnTrack: boolean;
  fireGap: number | null;
  fireSurplus: number | null;
  wealthAtRetirement: number;

  insurance: InsuranceSummary;
  totalDeathSA: number;
  totalPremiumPA: number;
  hasMissingInsurance: boolean;
  hasMissingEstate: boolean;

  daysSinceMeeting: number | null;
  daysUntilReview: number | null;
  reviewOverdue: boolean;
  hasOpenTask: boolean;
  hasNotes: boolean;
  meetingCount: number;

  nearestDueDays: number | null;
  daysSinceUpdate: number;

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

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

const FREQ_MULT: Record<string, number> = { monthly: 12, quarterly: 4, 'semi-annual': 2, annual: 1 };

const NULL_RESULTS: FireResults = {
  yearlyData: [],
  wealthAtRetirement: 0,
  fireNumber: 0,
  fireNumberBreakdown: {
    grossRetirementExpenses: 0,
    inflatedRetirementExpenses: 0,
    inflationRate: 2.5,
    yearsToRetirement: 0,
    streamIncomeAtRetirement: 0,
    netDrawdownNeeded: 0,
    withdrawalRate: 3.5,
    inflationBuffer: 10,
  },
  yearsToBuild: null,
  onTrack: false,
};

const NULL_INSURANCE: InsuranceSummary = {
  totalDeath: 0, totalTPD: 0, totalCI: 0, totalECI: 0,
  deathGap: 0, tpdGap: 0, ciGap: 0, eciGap: 0,
  coverageTargetSource: { death: 'benchmark', tpd: 'benchmark', ci: 'benchmark', eci: 'benchmark' },
  recommended: { death: 0, tpd: 0, ci: 0, eci: 0 },
  annualPremium: 0,
  signalScore: 0,
  hasMSL: null, hasISP: null, hasRider: null, ispWardClass: '',
};

interface EnrichOptions {
  tasks: Task[];
}

// _computed is injected by the server's GET /api/profiles response
interface ProfileWithComputed extends ClientProfile {
  _computed?: {
    onTrack: boolean;
    yearsToBuild: number | null;
    wealthAtRetirement: number;
    fireNumber: number;
    moneyRunsOutAge?: number;
    insurance: InsuranceSummary;
  } | null;
}

export function enrichProfile(profile: ProfileWithComputed, opts: EnrichOptions): EnrichedProfile {
  const c = (profile as ProfileWithComputed)._computed;

  const results: FireResults = c ? {
    yearlyData: [],
    wealthAtRetirement: c.wealthAtRetirement,
    fireNumber: c.fireNumber,
    fireNumberBreakdown: NULL_RESULTS.fireNumberBreakdown,
    yearsToBuild: c.yearsToBuild,
    onTrack: c.onTrack,
    moneyRunsOutAge: c.moneyRunsOutAge,
  } : NULL_RESULTS;

  const insurance: InsuranceSummary = c?.insurance ?? NULL_INSURANCE;

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

export function enrichProfiles(profiles: ProfileWithComputed[], opts: EnrichOptions): EnrichedProfile[] {
  return profiles.map(p => enrichProfile(p, opts));
}

export { getLiveAge, daysSince as daysSinceDate, nextOccurrence };

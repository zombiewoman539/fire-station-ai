import { FilterChip, FilterField } from './savedViewsTypes';
import { EnrichedProfile } from './enrichProfile';

/** Resolves a profile + field → comparable scalar / boolean / null. */
function getFieldValue(row: EnrichedProfile, field: FilterField): number | boolean | string | null {
  switch (field) {
    case 'age':              return row.liveAge;
    case 'income':           return row.annualIncome;
    case 'fireOnTrack':      return row.fireOnTrack;
    case 'fireGap':          return row.fireGap;            // null when on-track
    case 'deathGap':         return row.insurance.deathGap;
    case 'ciGap':            return row.insurance.ciGap;
    case 'eciGap':           return row.insurance.eciGap;
    case 'tpdGap':           return row.insurance.tpdGap;
    case 'signalScore':      return row.insurance.signalScore;
    case 'hasIsp':           return row.insurance.hasISP;     // null = not filled in yet
    case 'hasRider':         return row.insurance.hasRider;
    case 'daysSinceMeeting': return row.daysSinceMeeting;     // null = never met
    case 'daysUntilReview':  return row.daysUntilReview;
    case 'hasOpenTask':      return row.hasOpenTask;
    case 'hasNotes':         return row.hasNotes;
    case 'nextPremiumDueDays': return row.nearestDueDays;       // null = no in-force premium in next 90d
    case 'advisor':          return row.advisorUserId ?? null;
    default:                 return null;
  }
}

function evaluateChip(row: EnrichedProfile, chip: FilterChip): boolean {
  // Tags are an array on the profile, not a scalar — handle them outside the scalar-value switch.
  if (chip.field === 'tag') {
    const tags = (row.profile.tags ?? []).map(t => t.toLowerCase());
    const target = (typeof chip.value === 'string' ? chip.value : '').toLowerCase();
    if (!target) return chip.op === 'notIn';
    const present = tags.includes(target);
    return chip.op === 'in' ? present : !present;
  }

  const v = getFieldValue(row, chip.field);

  // Null handling: a profile without the field generally fails the predicate,
  // EXCEPT for 'isNot true' on a null boolean (= "not yes", which null satisfies).
  switch (chip.op) {
    case 'between': {
      if (typeof v !== 'number') return false;
      const [lo, hi] = chip.value as [number, number];
      return v >= lo && v <= hi;
    }
    case 'gt': {
      if (typeof v !== 'number') return false;
      return v > (chip.value as number);
    }
    case 'lt': {
      if (typeof v !== 'number') return false;
      return v < (chip.value as number);
    }
    case 'eq': {
      return v === chip.value;
    }
    case 'is': {
      // For tri-state booleans (hasISP/hasRider can be null), `is true` excludes null.
      return v === chip.value;
    }
    case 'isNot': {
      return v !== chip.value;
    }
    case 'olderThan': {
      // For daysSinceMeeting: "older than N days" means daysSinceMeeting > N (or null = never met → also satisfies)
      const n = chip.value as number;
      if (chip.field === 'daysSinceMeeting' && v === null) return true;
      if (typeof v !== 'number') return false;
      return v > n;
    }
    case 'within': {
      // For daysSinceMeeting: "met within N days"; for daysUntilReview / nextPremiumDueDays: "due within N days"
      const n = chip.value as number;
      if (typeof v !== 'number') return false;
      if (chip.field === 'daysSinceMeeting') return v <= n;
      if (chip.field === 'daysUntilReview') return v >= 0 && v <= n;
      if (chip.field === 'nextPremiumDueDays') return v >= 0 && v <= n;
      return v >= 0 && v <= n;
    }
    case 'overdue': {
      // Past due: < 0 days. Meaningful for daysUntilReview AND nextPremiumDueDays.
      if (chip.field === 'daysUntilReview' || chip.field === 'nextPremiumDueDays') {
        return typeof v === 'number' && v < 0;
      }
      return false;
    }
    default:
      return false;
  }
}

/** Pure: applies all chips with AND semantics. */
export function applyFilters(rows: EnrichedProfile[], chips: FilterChip[]): EnrichedProfile[] {
  if (chips.length === 0) return rows;
  return rows.filter(row => chips.every(chip => evaluateChip(row, chip)));
}

/** Convenience predicate for the search box (case-insensitive substring on name + advisor email). */
export function applySearch(rows: EnrichedProfile[], q: string): EnrichedProfile[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(row => {
    const name = row.profile.name.toLowerCase();
    const advisorEmail = (row.advisorEmail ?? '').toLowerCase();
    return name.includes(needle) || advisorEmail.includes(needle);
  });
}

/** Sort comparator factory — keys here mirror the column-header sort keys in ClientTable. */
export function compareRows(
  a: EnrichedProfile, b: EnrichedProfile,
  sortBy: string, dir: 'asc' | 'desc',
): number {
  const av = sortKeyValue(a, sortBy);
  const bv = sortKeyValue(b, sortBy);
  if (av === bv) return 0;
  if (av === null || av === undefined) return 1;
  if (bv === null || bv === undefined) return -1;
  if (av < bv) return dir === 'asc' ? -1 : 1;
  return dir === 'asc' ? 1 : -1;
}

function sortKeyValue(row: EnrichedProfile, key: string): number | string | null {
  switch (key) {
    case 'name':           return row.profile.name.toLowerCase();
    case 'age':            return row.liveAge;
    case 'retirementAge':  return row.profile.inputs.personal?.retirementAge ?? null;
    case 'income':         return row.annualIncome;
    case 'fireOnTrack':    return row.fireOnTrack ? 1 : 0;
    case 'wealth':         return row.wealthAtRetirement;
    case 'fireGap':        return row.fireGap ?? (row.fireSurplus !== null ? -row.fireSurplus : -Infinity);
    case 'coverage':       return row.totalDeathSA;
    case 'deathGap':       return row.insurance.deathGap;
    case 'ciGap':          return row.insurance.ciGap;
    case 'eciGap':         return row.insurance.eciGap;
    case 'tpdGap':         return row.insurance.tpdGap;
    case 'signalScore':    return row.insurance.signalScore;
    case 'lastSeen':       return row.daysSinceMeeting ?? Number.MAX_SAFE_INTEGER;
    case 'lastUpdated':    return row.daysSinceUpdate;
    default:               return null;
  }
}
